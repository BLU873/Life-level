const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { ApiError } = require('../utils/apiError');

const BCRYPT_ROUNDS = 10;

/**
 * Focus Rooms (squad foundation).
 *
 * Temporary shared workspaces with server-authoritative presence. There is no
 * realtime socket layer by design: clients heartbeat on a short interval and
 * poll room state, which degrades to graceful staleness instead of dead
 * connections and works behind any host without sticky sessions.
 *
 * Privacy: room payloads expose ONLY public identity (display name + player
 * tag), presence status, an owner flag, and goal titles resolved live from
 * quests the member owns that are still active. No emails, user ids, quest
 * ids, or tokens ever leave the server in room responses.
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const MAX_MEMBERS = 12;
// ONLINE while seen within the last minute; heartbeat interval is 20s.
const ONLINE_AFTER_MS = 60 * 1000;
// Stale heartbeats are lazily auto-left (no scheduler needed).
const STALE_AUTO_LEAVE_MS = 10 * 60 * 1000;
// Abuse guards (application-level; no rate-limit infra exists yet).
const CREATE_LIMIT_PER_DAY = 5;
const JOIN_LIMIT_PER_HOUR = 30;

function randomCode() {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function isCodeFormat(value) {
  return /^[A-Z2-9]{4,6}$/.test(value);
}

const AGENDA_MODES = ['SHARED', 'INDIVIDUAL'];
const ROOM_NAME_MAX = 60;
const ROOM_PASSWORD_MIN = 4;
const ROOM_PASSWORD_MAX = 72; // bcrypt input limit
const AGENDA_TEXT_MAX = 200;

function validateRoomName(value) {
  const name = String(value ?? '').trim();
  if (!name) throw ApiError.badRequest('ROOM_NAME_REQUIRED', 'Room name is required.');
  if (name.length > ROOM_NAME_MAX) {
    throw ApiError.badRequest('ROOM_NAME_INVALID', `Room name must be ${ROOM_NAME_MAX} characters or fewer.`);
  }
  return name;
}

function validateRoomPassword(value) {
  const password = String(value ?? '');
  if (!password) throw ApiError.badRequest('ROOM_PASSWORD_REQUIRED', 'Room password is required.');
  if (password.length < ROOM_PASSWORD_MIN || password.length > ROOM_PASSWORD_MAX) {
    throw ApiError.badRequest(
      'ROOM_PASSWORD_INVALID',
      `Room password must be between ${ROOM_PASSWORD_MIN} and ${ROOM_PASSWORD_MAX} characters.`
    );
  }
  return password;
}

function validateAgendaMode(value) {
  if (!AGENDA_MODES.includes(value)) {
    throw ApiError.badRequest('ROOM_MODE_INVALID', 'Agenda mode must be SHARED or INDIVIDUAL.');
  }
  return value;
}

function validateAgendaText(value) {
  const text = String(value ?? '').trim();
  if (text.length > AGENDA_TEXT_MAX) {
    throw ApiError.badRequest('ROOM_AGENDA_INVALID', `Shared agenda must be ${AGENDA_TEXT_MAX} characters or fewer.`);
  }
  return text;
}

function tagFor(username, randomizeLetters = false) {
  const clean = String(username || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letters = randomizeLetters
    ? Array.from({ length: 3 }, () => CODE_ALPHABET[Math.floor(Math.random() * 24)])
    : (clean + 'XXX').slice(0, 3);
  const digits = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${letters}${digits}`;
}

/** Lazily backfill the public player tag (nullable for zero-downtime rollout). */
async function ensurePlayerTag(userId, tx = prisma) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, username: true, playerTag: true } });
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');
  if (user.playerTag) return user.playerTag;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = tagFor(user.username, attempt >= 6);
    try {
      const updated = await tx.user.update({ where: { id: userId }, data: { playerTag: candidate }, select: { playerTag: true } });
      return updated.playerTag;
    } catch (err) {
      if (err?.code !== 'P2002') throw err;
    }
  }
  throw ApiError.conflict('TAG_EXHAUSTED', 'Could not assign a player tag. Try again.');
}

async function activeMembership(userId, tx = prisma) {
  return tx.roomMembership.findFirst({
    where: { userId, leftAt: null, room: { isActive: true } },
    include: { room: true },
  });
}

async function activeMemberCount(roomId, tx = prisma) {
  return tx.roomMembership.count({ where: { roomId, leftAt: null } });
}

/** Earliest-joined active member inherits ownership (deterministic). */
async function transferOwnership(roomId, tx) {
  const heir = await tx.roomMembership.findFirst({
    where: { roomId, leftAt: null },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
    select: { userId: true },
  });
  if (!heir) {
    await tx.focusRoom.update({ where: { id: roomId }, data: { isActive: false, closedAt: new Date() } });
    return null;
  }
  await tx.focusRoom.update({ where: { id: roomId }, data: { ownerId: heir.userId } });
  return heir.userId;
}

/** Lazily auto-leave members whose heartbeat expired (called on every room read). */
async function expireStale(roomId, tx) {
  const cutoff = new Date(Date.now() - STALE_AUTO_LEAVE_MS);
  const stale = await tx.roomMembership.findMany({
    where: { roomId, leftAt: null, lastSeenAt: { lt: cutoff } },
    select: { id: true, userId: true },
  });
  for (const m of stale) {
    await tx.roomMembership.update({ where: { id: m.id }, data: { leftAt: new Date() } });
    const room = await tx.focusRoom.findUnique({ where: { id: roomId }, select: { ownerId: true } });
    if (room && room.ownerId === m.userId) {
      await transferOwnership(roomId, tx);
    }
  }
  const remaining = await activeMemberCount(roomId, tx);
  if (remaining === 0) {
    await tx.focusRoom.update({ where: { id: roomId }, data: { isActive: false, closedAt: new Date() } });
  }
}

async function resolveGoalTitle(memberUserId, goalQuestId, tx) {
  if (!goalQuestId) return null;
  const quest = await tx.quest.findFirst({
    where: { id: goalQuestId, userId: memberUserId, isCompleted: false },
    select: { title: true },
  });
  return quest ? quest.title : null;
}

async function validateGoalQuest(userId, questId, tx) {
  const quest = await tx.quest.findFirst({ where: { id: questId, userId } });
  if (!quest) throw ApiError.notFound('QUEST_NOT_FOUND', 'Quest not found.');
  if (quest.isCompleted) throw ApiError.badRequest('ROOM_GOAL_INVALID', 'Only an active Operation can be a room goal.');
  return quest.id;
}

/**
 * Shared room sessions (Phase 19B). One ACTIVE (RUNNING/PAUSED) session per
 * room, fully server-authoritative: remaining time derives from persisted
 * timestamps, never from the client. Terminal rows (COMPLETED/STOPPED) are
 * history. Completion grants NOTHING — no XP, gold, streaks, achievements.
 */
const SESSION_PRESETS = [900, 1500, 2700, 3600, 5400];
const SESSION_DEFAULT_SECONDS = 1500;
const SESSION_ACTIVE = ['RUNNING', 'PAUSED'];

function sessionRemaining(session, nowMs = Date.now()) {
  if (!session) return 0;
  const banked = session.bankedSeconds ?? 0;
  if (session.status === 'PAUSED') return Math.max(0, session.durationSeconds - banked);
  if (session.status !== 'RUNNING') return 0;
  const elapsed = Math.max(0, Math.floor((nowMs - new Date(session.startedAt).getTime()) / 1000));
  return Math.max(0, session.durationSeconds - banked - elapsed);
}

function publicSession(session, nowMs = Date.now()) {
  if (!session) return null;
  return {
    status: session.status,
    durationSeconds: session.durationSeconds,
    remainingSeconds: sessionRemaining(session, nowMs),
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
  };
}

async function findActiveSession(roomId, tx = prisma) {
  return tx.roomSession.findFirst({
    where: { roomId, status: { in: SESSION_ACTIVE } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

/**
 * Lazy natural completion. Runs on every room read, so the persisted state
 * is truthful even when zero clients are watching: completedAt is the true
 * deadline, not the observation moment.
 */
async function materializeSession(roomId, tx) {
  const s = await findActiveSession(roomId, tx);
  if (!s || s.status !== 'RUNNING') return s;
  if (sessionRemaining(s) > 0) return s;
  const deadline = new Date(new Date(s.startedAt).getTime() + (s.durationSeconds - s.bankedSeconds) * 1000);
  return tx.roomSession.update({
    where: { id: s.id },
    data: { bankedSeconds: s.durationSeconds, status: 'COMPLETED', completedAt: deadline },
  });
}

/** Most recent session for display (active preferred, else last terminal). */
async function visibleSession(roomId, tx = prisma) {
  await materializeSession(roomId, tx);
  return tx.roomSession.findFirst({
    where: { roomId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

/** Host gate: member first (404 oracle), then ownership (403). */
async function requireHost(userId, code, tx) {
  let room = await tx.focusRoom.findFirst({ where: { code, isActive: true } });
  if (!room) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  await expireStale(room.id, tx);
  room = await tx.focusRoom.findFirst({ where: { code, isActive: true } });
  if (!room) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  const membership = await tx.roomMembership.findFirst({ where: { roomId: room.id, userId, leftAt: null } });
  if (!membership) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  if (room.ownerId !== userId) throw ApiError.forbidden('ROOM_NOT_HOST', 'Only the room host controls the shared session.');
  return { room, membership };
}

async function startSession(userId, rawCode, durationSeconds = SESSION_DEFAULT_SECONDS) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  if (!Number.isInteger(durationSeconds) || !SESSION_PRESETS.includes(durationSeconds)) {
    throw ApiError.badRequest('ROOM_DURATION_INVALID', `Duration must be one of: ${SESSION_PRESETS.join(', ')} seconds.`);
  }
  return prisma.$transaction(async (tx) => {
    const { room } = await requireHost(userId, code, tx);
    if (await findActiveSession(room.id, tx)) {
      throw ApiError.conflict('ROOM_SESSION_ACTIVE', 'This room already has an active session.');
    }
    await tx.roomSession.create({
      data: { roomId: room.id, durationSeconds, status: 'RUNNING', startedAt: new Date() },
    });
    return roomPayload(room.id, userId, tx);
  });
}

async function pauseSession(userId, rawCode) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  return prisma.$transaction(async (tx) => {
    const { room } = await requireHost(userId, code, tx);
    const s = await materializeSession(room.id, tx);
    if (!s || s.status !== 'RUNNING') {
      throw ApiError.conflict('SESSION_NOT_RUNNING', 'Only a running session can be paused.');
    }
    const increment = Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000));
    await tx.roomSession.update({
      where: { id: s.id },
      data: { bankedSeconds: s.bankedSeconds + increment, status: 'PAUSED' },
    });
    return roomPayload(room.id, userId, tx);
  });
}

async function resumeSession(userId, rawCode) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  return prisma.$transaction(async (tx) => {
    const { room } = await requireHost(userId, code, tx);
    const s = await findActiveSession(room.id, tx);
    if (!s || s.status !== 'PAUSED') {
      throw ApiError.conflict('SESSION_NOT_PAUSED', 'Only a paused session can be resumed.');
    }
    await tx.roomSession.update({
      where: { id: s.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
    return roomPayload(room.id, userId, tx);
  });
}

async function stopSession(userId, rawCode) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  return prisma.$transaction(async (tx) => {
    const { room } = await requireHost(userId, code, tx);
    const s = await materializeSession(room.id, tx);
    if (!s || (s.status !== 'RUNNING' && s.status !== 'PAUSED')) {
      throw ApiError.conflict('SESSION_CLOSED', 'There is no active session to stop.');
    }
    const increment =
      s.status === 'RUNNING'
        ? Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000))
        : 0;
    await tx.roomSession.update({
      where: { id: s.id },
      data: { bankedSeconds: s.bankedSeconds + increment, status: 'STOPPED' },
    });
    return roomPayload(room.id, userId, tx);
  });
}

/** Minimal public room payload. Never leaks emails, ids, or tokens. */
async function roomPayload(roomId, viewerId, tx = prisma) {
  const room = await tx.focusRoom.findUnique({
    where: { id: roomId },
    include: {
      memberships: {
        where: { leftAt: null },
        include: {
          user: { select: { username: true, playerTag: true, character: { select: { displayName: true } } } },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
  if (!room || !room.isActive) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  await ensurePlayerTag(viewerId, tx);

  const now = Date.now();
  const members = [];
  for (const m of room.memberships) {
    const tag = m.user.playerTag || (await ensurePlayerTag(m.userId, tx));
    members.push({
      displayName: m.user.character?.displayName || m.user.username,
      publicId: `@${tag}`,
      status: now - new Date(m.lastSeenAt).getTime() <= ONLINE_AFTER_MS ? 'ONLINE' : 'OFFLINE',
      goal: await resolveGoalTitle(m.userId, m.goalQuestId, tx),
      isOwner: room.ownerId === m.userId,
      joinedAt: m.joinedAt,
    });
  }
  members.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'ONLINE' ? -1 : 1;
    return new Date(a.joinedAt) - new Date(b.joinedAt);
  });

  const session = await visibleSession(roomId, tx);

  return {
    roomCode: room.code,
    // Identity/agenda are owner-authored room content, safe for members.
    // The password hash is NEVER included.
    name: room.name || 'SQUAD ROOM',
    agendaMode: AGENDA_MODES.includes(room.agendaMode) ? room.agendaMode : 'INDIVIDUAL',
    agendaText: room.agendaText || '',
    createdAt: room.createdAt,
    isOwner: room.ownerId === viewerId,
    onlineCount: members.filter((m) => m.status === 'ONLINE').length,
    memberCount: members.length,
    members: members.map(({ joinedAt, ...rest }) => rest),
    session: publicSession(session),
  };
}

async function requireMembership(userId, code, tx = prisma) {
  const room = await tx.focusRoom.findFirst({ where: { code, isActive: true }, select: { id: true } });
  if (!room) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  await expireStale(room.id, tx);
  const membership = await tx.roomMembership.findFirst({
    where: { roomId: room.id, userId, leftAt: null },
  });
  if (!membership) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  return { room, membership };
}

async function createRoom(userId, { name, password, agendaMode = 'INDIVIDUAL', agendaText = '' } = {}) {
  const cleanName = validateRoomName(name);
  const cleanPassword = validateRoomPassword(password);
  const cleanMode = validateAgendaMode(agendaMode);
  const cleanAgenda = validateAgendaText(agendaText);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const createdToday = await prisma.focusRoom.count({ where: { ownerId: userId, createdAt: { gte: dayAgo } } });
  if (createdToday >= CREATE_LIMIT_PER_DAY) {
    throw ApiError.conflict('ROOM_CREATE_LIMIT', 'Room creation limit reached. Try again tomorrow.');
  }
  if (await activeMembership(userId)) {
    throw ApiError.conflict('ROOM_ALREADY_INSIDE', 'Leave your current room before creating a new one.');
  }

  const passwordHash = await bcrypt.hash(cleanPassword, BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    let code = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = randomCode();
      const taken = await tx.focusRoom.findUnique({ where: { code: candidate }, select: { id: true } });
      if (!taken) {
        code = candidate;
        break;
      }
    }
    if (!code) throw ApiError.conflict('ROOM_CODE_EXHAUSTED', 'Could not allocate a room code. Try again.');

    const room = await tx.focusRoom.create({
      data: { code, ownerId: userId, name: cleanName, passwordHash, agendaMode: cleanMode, agendaText: cleanAgenda },
    });
    await tx.roomMembership.create({ data: { roomId: room.id, userId, lastSeenAt: new Date() } });
    await ensurePlayerTag(userId, tx);
    return roomPayload(room.id, userId, tx);
  });
}

async function joinRoom(userId, rawCode, questId = undefined, password = undefined) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentJoins = await prisma.roomMembership.count({ where: { userId, joinedAt: { gte: hourAgo } } });
  if (recentJoins >= JOIN_LIMIT_PER_HOUR) {
    throw ApiError.conflict('ROOM_JOIN_LIMIT', 'Too many join attempts. Try again later.');
  }

  return prisma.$transaction(async (tx) => {
    const room = await tx.focusRoom.findFirst({ where: { code, isActive: true } });
    if (!room) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
    await expireStale(room.id, tx);

    const existing = await tx.roomMembership.findFirst({ where: { roomId: room.id, userId, leftAt: null } });
    if (existing) {
      // Idempotent rejoin: optionally refresh the public goal, never duplicate.
      // No password needed — membership already proves access (refresh-safe).
      if (questId !== undefined) {
        const nextGoal = questId === null ? null : await validateGoalQuest(userId, questId, tx);
        await tx.roomMembership.update({ where: { id: existing.id }, data: { goalQuestId: nextGoal, lastSeenAt: new Date() } });
      } else {
        await tx.roomMembership.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
      }
      return { room: await roomPayload(room.id, userId, tx), rejoined: true };
    }

    // Password gate BEFORE any write: no partial membership on failure.
    // Legacy rooms without a hash stay open (backward compatible).
    if (room.passwordHash) {
      const ok = await bcrypt.compare(String(password ?? ''), room.passwordHash);
      if (!ok) throw ApiError.forbidden('ROOM_PASSWORD_INVALID', 'Incorrect room password.');
    }

    if (await activeMembership(userId, tx)) {
      throw ApiError.conflict('ROOM_ALREADY_INSIDE', 'Leave your current room before joining another.');
    }
    if ((await activeMemberCount(room.id, tx)) >= MAX_MEMBERS) {
      throw ApiError.conflict('ROOM_FULL', 'This room is full.');
    }

    const goal = questId === null || questId === undefined ? null : await validateGoalQuest(userId, questId, tx);
    await tx.roomMembership.create({
      data: { roomId: room.id, userId, goalQuestId: goal, lastSeenAt: new Date() },
    });
    await ensurePlayerTag(userId, tx);
    return { room: await roomPayload(room.id, userId, tx), rejoined: false };
  });
}

async function getRoom(userId, rawCode) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  return prisma.$transaction(async (tx) => {
    await requireMembership(userId, code, tx);
    const room = await tx.focusRoom.findFirst({ where: { code, isActive: true }, select: { id: true } });
    return roomPayload(room.id, userId, tx);
  });
}

async function heartbeat(userId, rawCode, questId = undefined) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  return prisma.$transaction(async (tx) => {
    const { room, membership } = await requireMembership(userId, code, tx);
    const data = { lastSeenAt: new Date() };
    if (questId !== undefined) {
      data.goalQuestId = questId === null ? null : await validateGoalQuest(userId, questId, tx);
    }
    await tx.roomMembership.update({ where: { id: membership.id }, data });
    return roomPayload(room.id, userId, tx);
  });
}

async function leaveRoom(userId, rawCode) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  return prisma.$transaction(async (tx) => {
    const room = await tx.focusRoom.findFirst({ where: { code, isActive: true } });
    if (!room) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
    const membership = await tx.roomMembership.findFirst({ where: { roomId: room.id, userId, leftAt: null } });
    if (!membership) throw ApiError.notFound('ROOM_NOT_IN_ROOM', 'You are not in this room.');
    await tx.roomMembership.update({ where: { id: membership.id }, data: { leftAt: new Date() } });
    if (room.ownerId === userId) {
      await transferOwnership(room.id, tx);
    } else if ((await activeMemberCount(room.id, tx)) === 0) {
      await tx.focusRoom.update({ where: { id: room.id }, data: { isActive: false, closedAt: new Date() } });
    }
    return { left: true, code };
  });
}

/**
 * Owner-only room setup edits (name / agenda mode / shared agenda).
 * Never touches the shared session, memberships, or progression.
 */
async function updateRoom(userId, rawCode, { name, agendaMode, agendaText } = {}) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  if (name === undefined && agendaMode === undefined && agendaText === undefined) {
    throw ApiError.badRequest('ROOM_NOTHING_TO_UPDATE', 'Nothing to update.');
  }
  return prisma.$transaction(async (tx) => {
    const { room } = await requireHost(userId, code, tx);
    const data = {};
    if (name !== undefined) data.name = validateRoomName(name);
    if (agendaMode !== undefined) data.agendaMode = validateAgendaMode(agendaMode);
    if (agendaText !== undefined) data.agendaText = validateAgendaText(agendaText);
    await tx.focusRoom.update({ where: { id: room.id }, data });
    return roomPayload(room.id, userId, tx);
  });
}

/** Owner-only password rotation (bcrypt, same rounds as auth). */
async function changeRoomPassword(userId, rawCode, password) {
  const code = normalizeCode(rawCode);
  if (!isCodeFormat(code)) throw ApiError.notFound('ROOM_NOT_FOUND', 'Room not found.');
  const cleanPassword = validateRoomPassword(password);
  return prisma.$transaction(async (tx) => {
    const { room } = await requireHost(userId, code, tx);
    const passwordHash = await bcrypt.hash(cleanPassword, BCRYPT_ROUNDS);
    await tx.focusRoom.update({ where: { id: room.id }, data: { passwordHash } });
    return roomPayload(room.id, userId, tx);
  });
}

async function myRoom(userId) {
  const membership = await activeMembership(userId);
  if (!membership) return null;
  await prisma.$transaction(async (tx) => {
    await expireStale(membership.roomId, tx);
  });
  const stillInside = await prisma.roomMembership.findFirst({
    where: { roomId: membership.roomId, userId, leftAt: null },
  });
  if (!stillInside) return null;
  return roomPayload(membership.roomId, userId);
}

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  heartbeat,
  leaveRoom,
  updateRoom,
  changeRoomPassword,
  myRoom,
  ensurePlayerTag,
  normalizeCode,
  startSession,
  pauseSession,
  resumeSession,
  stopSession,
  sessionRemaining,
  MAX_MEMBERS,
  SESSION_PRESETS,
  SESSION_DEFAULT_SECONDS,
};
