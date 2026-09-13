/**
 * Phase 8 E2E suite — runs against a live API server on a dedicated test.db.
 * 27 numbered assertions (Daily Arc 1-4, Weekly 5-8, Achievements 9-15,
 * Progression 16-21, Security/Persistence 22-27) plus a regression block.
 *
 * Prerequisites (see run-phase8.ps1):
 *   - DATABASE_URL points at a migrated+seeded test.db
 *   - the API server is running (BASE_URL below)
 */
const { PrismaClient } = require('@prisma/client');
const { levelFromTotalXP } = require('../src/config/constants');

const BASE = process.env.BASE_URL || 'http://localhost:4999/api';
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, cond, extra = '') {
  if (cond) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${extra ? ` :: ${extra}` : ''}`);
    console.log(`  FAIL ${name}${extra ? ` :: ${extra}` : ''}`);
  }
}

function section(title) {
  console.log(`\n## ${title}`);
}

async function raw(method, path, { cookie, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') };
}

async function signup(prefix) {
  const u = `${prefix.slice(0, 6)}_${String(Date.now()).slice(-10)}_${Math.floor(Math.random() * 1e6)}`;
  const r = await raw('POST', '/auth/signup', {
    body: { username: u, email: `${u}@test.io`, password: 'secret123' },
  });
  if (r.status !== 201) throw new Error(`signup failed: ${r.status} ${JSON.stringify(r.json)}`);
  return { cookie: r.setCookie.split(';')[0], userId: r.json.data.user.id, username: u, email: `${u}@test.io` };
}

async function createQuest(cookie, over = {}) {
  const r = await raw('POST', '/quests', {
    cookie,
    body: { title: 'Test quest', category: 'STUDY', difficulty: 'EASY', ...over },
  });
  if (r.status !== 201) throw new Error(`createQuest failed: ${r.status}`);
  return r.json.data.quest;
}

async function completeQuest(cookie, id) {
  const r = await raw('POST', `/quests/${id}/complete`, { cookie });
  return { status: r.status, json: r.json };
}

// Local-time, monotonic day helpers (mirror of src/utils/date.js).
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function dayKey(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function dateDaysAgo(n, hour = 12) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}
const TODAY_KEY = dayKey(startOfToday());

async function main() {
  const stateExtra = {};
  let restarters = {};
  // ------------------------------------------------- Phase 8 numbered tests
  section('1-4 Today Arc');
  {
    const arc = await signup('arc');
    const ch0 = await raw('GET', '/character', { cookie: arc.cookie });
    const dp0 = ch0.json.data.dailyProgress;
    assert('1: zero-quest day is a clear empty state', !dp0.isComplete && dp0.totalQuests === 0 && dp0.completedQuests === 0 && dp0.remainingQuests === 0 && dp0.completionPercentage === 0 && typeof dp0.attributeChanges === 'object');

    const q1 = await createQuest(arc.cookie, { title: 'Only quest' });
    const ch1 = await raw('GET', '/character', { cookie: arc.cookie });
    const dp1 = ch1.json.data.dailyProgress;
    assert('2: one planned quest → 0/1, remaining 1', dp1.totalQuests === 1 && dp1.completedQuests === 0 && dp1.remainingQuests === 1 && !dp1.isComplete);

    const q2 = await createQuest(arc.cookie, { title: 'Second' });
    const q3 = await createQuest(arc.cookie, { title: 'Third' });
    await completeQuest(arc.cookie, q1.id);
    const ch2 = await raw('GET', '/character', { cookie: arc.cookie });
    const dp2 = ch2.json.data.dailyProgress;
    assert('3: partial 1/3 → 33%, 2 remaining', dp2.completedQuests === 1 && dp2.remainingQuests === 2 && dp2.completionPercentage === 33 && !dp2.isComplete);

    const r4a = await completeQuest(arc.cookie, q2.id);
    const r4b = await completeQuest(arc.cookie, q3.id);
    const ch3 = await raw('GET', '/character', { cookie: arc.cookie });
    const dp3 = ch3.json.data.dailyProgress;
    assert('4: full arc → complete, 100%, xp/gold > 0', dp3.isComplete && dp3.completionPercentage === 100 && dp3.xpEarned > 0 && dp3.goldEarned > 0 && Array.isArray(r4b.json.data.newAchievements) && !!r4b.json.data.dailyProgress);
  }

  section('5-8 Weekly');
  {
    const wa = await signup('weeka');
    const begin = await raw('GET', '/activity/weekly', { cookie: wa.cookie });
    assert('5: weekly shape with 7 daily buckets', begin.json.data.daily.length === 7 && begin.json.data.questsCompleted === 0 && !!begin.json.data.weekStart && typeof begin.json.data.attributes === 'object');

    await createQuest(wa.cookie, { title: 'W1', difficulty: 'MEDIUM' });
    await createQuest(wa.cookie, { title: 'W2', difficulty: 'MEDIUM' });
    const done = await createQuest(wa.cookie, { title: 'W3', difficulty: 'MEDIUM' });
    await completeQuest(wa.cookie, done.id);
    const second = await raw('GET', '/quests', { cookie: wa.cookie });
    const w1 = second.json.data.quests.find((q) => q.title === 'W1');
    await completeQuest(wa.cookie, w1.id);
    const wk = await raw('GET', '/activity/weekly', { cookie: wa.cookie });
    const sumXp = wk.json.data.daily.reduce((s, d) => s + d.xpEarned, 0);
    const todayBucket = wk.json.data.daily.find((d) => d.date === TODAY_KEY);
    assert('6: 2 MEDIUM → 200 XP, 40 gold, today bucket 2, sums match', wk.json.data.questsCompleted === 2 && wk.json.data.xpEarned === 200 && wk.json.data.goldEarned === 40 && todayBucket.questsCompleted === 2 && sumXp === wk.json.data.xpEarned);

    // Cross-week deterministic isolation: move one completion to today-7.
    const wb = await signup('weekb');
    const b1 = await createQuest(wb.cookie, { title: 'A', difficulty: 'MEDIUM' });
    const b2 = await createQuest(wb.cookie, { title: 'B', difficulty: 'MEDIUM' });
    await completeQuest(wb.cookie, b1.id);
    await completeQuest(wb.cookie, b2.id);
    const wbCompletions = await prisma.questCompletion.findMany({ where: { userId: wb.userId }, orderBy: { completedAt: 'asc' } });
    await prisma.questCompletion.update({ where: { id: wbCompletions[0].id }, data: { completedAt: dateDaysAgo(7) } });

    const cur = await raw('GET', '/activity/weekly', { cookie: wb.cookie });
    const prevKey = dayKey(dateDaysAgo(7));
    const prev = await raw('GET', `/activity/weekly?date=${prevKey}`, { cookie: wb.cookie });
    const prevBucket = prev.json.data.daily.find((d) => d.date === prevKey);
    assert('7: moved completion leaves the current week', cur.json.data.questsCompleted === 1 && cur.json.data.xpEarned === 100 && cur.json.data.activeDays === 1);
    assert('8: backdated completion lands in the prior week bucket', prev.json.data.questsCompleted === 1 && prevBucket && prevBucket.questsCompleted === 1 && prevBucket.xpEarned === 100);
  }

  section('9-15 Achievements');
  {
    const first = await signup('achfirst');
    const fq = await createQuest(first.cookie, { title: 'F1' });
    const fr = await completeQuest(first.cookie, fq.id);
    const fCodes = (fr.json.data.newAchievements || []).map((a) => a.code);
    assert('9: FIRST_STEP unlocks on the first completion', fCodes.includes('FIRST_STEP'));
    const ach = await raw('GET', '/achievements', { cookie: first.cookie });
    const fDef = ach.json.data.achievements.find((a) => a.code === 'FIRST_STEP');
    assert('9b: /api/achievements reflects the unlock', !!fDef.unlockedAt);

    const days = await signup('achdays');
    const dayQuests = [];
    for (let i = 0; i < 7; i += 1) dayQuests.push(await createQuest(days.cookie, { title: `D${i}` }));
    for (let i = 0; i < 6; i += 1) await completeQuest(days.cookie, dayQuests[i].id);
    const dayComp = await prisma.questCompletion.findMany({ where: { userId: days.userId }, orderBy: { completedAt: 'asc' } });
    for (let i = 0; i < 6; i += 1) await prisma.questCompletion.update({ where: { id: dayComp[i].id }, data: { completedAt: dateDaysAgo(i + 1) } });
    const r7 = await completeQuest(days.cookie, dayQuests[6].id);
    const dCodes = (r7.json.data.newAchievements || []).map((a) => a.code);
    assert('10: SHOWING_UP unlocks after 7 distinct active days', dCodes.includes('SHOWING_UP'));
    const showCount = await prisma.userAchievement.count({ where: { userId: days.userId, achievement: { code: 'SHOWING_UP' } } });
    assert('10b: exactly one SHOWING_UP row', showCount === 1);

    const scholar = await signup('achscholar');
    await prisma.character.update({ where: { userId: scholar.userId }, data: { intellect: 500 } });
    const sq = await createQuest(scholar.cookie, { title: 'S1' });
    const sr = await completeQuest(scholar.cookie, sq.id);
    const sCodes = (sr.json.data.newAchievements || []).map((a) => a.code);
    assert('11: SCHOLAR unlocks at 500 Intellect', sCodes.includes('SCHOLAR'));

    const builder = await signup('achbuilder');
    const bq = [];
    for (let i = 0; i < 10; i += 1) bq.push(await createQuest(builder.cookie, { title: `B${i}`, category: 'CODING' }));
    for (let i = 0; i < 9; i += 1) {
      const r = await completeQuest(builder.cookie, bq[i].id);
      if (i === 8) {
        const codes = (r.json.data.newAchievements || []).map((a) => a.code);
        assert('12: BUILDER not yet granted at 9 CODING quests', !codes.includes('BUILDER'));
      }
    }
    const r10 = await completeQuest(builder.cookie, bq[9].id);
    const bCodes = (r10.json.data.newAchievements || []).map((a) => a.code);
    assert('12: BUILDER unlocks at 10 CODING quests', bCodes.includes('BUILDER'));

    const bal = await signup('achbal');
    await prisma.character.update({ where: { userId: bal.userId }, data: { intellect: 2, strength: 2, discipline: 2 } });
    const blq = await createQuest(bal.cookie, { title: 'BL' });
    const blr = await completeQuest(bal.cookie, blq.id);
    const blCodes = (blr.json.data.newAchievements || []).map((a) => a.code);
    assert('13: BALANCED unlocks with 3 attributes raised', blCodes.includes('BALANCED'));

    const con = await signup('achcon');
    await prisma.character.update({ where: { userId: con.userId }, data: { longestStreak: 14 } });
    const cq = await createQuest(con.cookie, { title: 'C1' });
    const cr = await completeQuest(con.cookie, cq.id);
    const cCodes = (cr.json.data.newAchievements || []).map((a) => a.code);
    assert('14: CONSISTENT unlocks at a 14-day streak', cCodes.includes('CONSISTENT'));

    const fq2 = await createQuest(first.cookie, { title: 'F2' });
    const fr2 = await completeQuest(first.cookie, fq2.id);
    const f2Codes = (fr2.json.data.newAchievements || []).map((a) => a.code);
    const firstCount = await prisma.userAchievement.count({ where: { userId: first.userId, achievement: { code: 'FIRST_STEP' } } });
    assert('15: achievements never unlock twice', !f2Codes.includes('FIRST_STEP') && firstCount === 1);
  }

  section('16-21 Progression');
  {
    const lvl = await signup('lvl');
    for (let i = 0; i < 6; i += 1) {
      const q = await createQuest(lvl.cookie, { title: `L${i}` });
      const r = await completeQuest(lvl.cookie, q.id);
      const expectedLevel = levelFromTotalXP(r.json.data.character.totalXP);
      const levelOk = r.json.data.character.level === expectedLevel;
      const progressOk = r.json.data.progression.levelAfter === expectedLevel;
      if (i === 5) {
        assert('16: cumulative XP aligns with the level engine', levelOk && progressOk && r.json.data.progression.leveledUp && r.json.data.progression.levelAfter === 2);
        const hp = await prisma.xpHistory.findMany({ where: { userId: lvl.userId, type: 'QUEST_COMPLETION' }, orderBy: { createdAt: 'asc' } });
        const lastHp = hp[hp.length - 1];
        assert('16b: level-up recorded in XP history', lastHp.levelBefore === 1 && lastHp.levelAfter === 2 && lastHp.newLevel === 2);
      } else if (i === 4) {
        assert('16c: level-up only on the crossing completion', !r.json.data.progression.leveledUp);
      }
    }

    const re = await signup('rew');
    const e = await createQuest(re.cookie, { title: 'E', difficulty: 'EASY' });
    const m = await createQuest(re.cookie, { title: 'M', difficulty: 'MEDIUM' });
    const h = await createQuest(re.cookie, { title: 'H', difficulty: 'HARD' });
    assert('17: rewards derived server-side', e.xpReward === 50 && e.goldReward === 10 && m.xpReward === 100 && m.goldReward === 20 && h.xpReward === 150 && h.goldReward === 30);

    const cr1 = await completeQuest(re.cookie, e.id);
    const dup = await completeQuest(re.cookie, e.id);
    assert('18: duplicate completion is atomic 409', dup.status === 409 && dup.json.error.code === 'QUEST_ALREADY_COMPLETED' && dup.json.success === false);
    const dupCount = await prisma.questCompletion.count({ where: { questId: e.id } });
    assert('18b: no partial credits on conflict', dupCount === 1 && cr1.json.data.character.gold === 10);

    const st = await signup('streak');
    const s1 = await createQuest(st.cookie, { title: 'S1' });
    const s2 = await createQuest(st.cookie, { title: 'S2' });
    const s3 = await createQuest(st.cookie, { title: 'S3' });
    const rS1 = await completeQuest(st.cookie, s1.id);
    const rS2 = await completeQuest(st.cookie, s2.id);
    assert('19: same-day completion does not double the streak', rS1.json.data.character.currentStreak === 1 && rS2.json.data.character.currentStreak === 1);
    await prisma.character.update({ where: { userId: st.userId }, data: { lastActiveDate: dateDaysAgo(1, 8) } });
    const rS3 = await completeQuest(st.cookie, s3.id);
    assert('19b: next-day completion extends the streak', rS3.json.data.character.currentStreak === 2 && rS3.json.data.character.longestStreak === 2);

    const at = await signup('attr');
    const aq = await createQuest(at.cookie, { title: 'A1', category: 'CODING' });
    const ar = await completeQuest(at.cookie, aq.id);
    assert('20: attribute gains map to the character', ar.json.data.completion.attributeChange === 2 && ar.json.data.completion.attributeType === 'INTELLECT' && ar.json.data.character.intellect === 3);

    const go = await signup('gold');
    for (let i = 0; i < 6; i += 1) {
      const q = await createQuest(go.cookie, { title: `G${i}` });
      await completeQuest(go.cookie, q.id);
    }
    const shop = await raw('GET', '/shop', { cookie: go.cookie });
    assert('21: 6 x EASY yields 60 gold in the catalogue view', shop.json.data.gold === 60);
    const cheapest = shop.json.data.items.slice().sort((a, b) => a.price - b.price)[0];
    const poor = await raw('POST', `/shop/${cheapest.id}/purchase`, { cookie: go.cookie });
    assert('21b: purchase above balance → INSUFFICIENT_GOLD', poor.status === 409 && poor.json.error.code === 'INSUFFICIENT_GOLD');
    await prisma.character.update({ where: { userId: go.userId }, data: { gold: 500 } });
    const buy = await raw('POST', `/shop/${cheapest.id}/purchase`, { cookie: go.cookie });
    assert('21c: purchase deducts gold atomically', buy.json.data.boughtItem.id === cheapest.id && buy.json.data.gold === 500 - cheapest.price);
    const inv = await raw('GET', '/inventory', { cookie: go.cookie });
    const owned = inv.json.data.items.find((i) => i.item.id === cheapest.id);
    const equip = await raw('POST', `/inventory/${owned.id}/equip`, { cookie: go.cookie });
    assert('21d: equip toggles isEquipped', equip.json.data.item.isEquipped === true);
    const unequip = await raw('POST', `/inventory/${owned.id}/unequip`, { cookie: go.cookie });
    assert('21e: unequip toggles back', unequip.json.data.item.isEquipped === false);
  }

  section('22-27 Security & Persistence');
  {
    const anon = await raw('GET', '/character', {});
    assert('22: unauthenticated requests are rejected with an envelope', anon.status === 401 && anon.json.success === false && anon.json.error.code === 'AUTH_REQUIRED');

    const alice = await signup('alice');
    const bob = await signup('bob');
    restarters = { email: alice.email, password: 'secret123', questTitle: 'Shared?' };
    const aq = await createQuest(alice.cookie, { title: 'Shared?', difficulty: 'MEDIUM' });
    await completeQuest(alice.cookie, aq.id);
    const steal = await completeQuest(bob.cookie, aq.id);
    assert('23: cross-user completion returns the same 404', steal.status === 404 && steal.json.error.code === 'QUEST_NOT_FOUND');
    const bobAct = await raw('GET', '/activity', { cookie: bob.cookie });
    const bobAch = await raw('GET', '/achievements', { cookie: bob.cookie });
    assert('23b: no activity or achievement leakage', bobAct.json.data.items.length === 0 && bobAch.json.data.achievements.every((a) => !a.unlockedAt));

    const bobWeek = await raw('GET', '/activity/weekly', { cookie: bob.cookie });
    assert('24: weekly progress is per-user', bobWeek.json.data.questsCompleted === 0 && bobWeek.json.data.xpEarned === 0);

    const me = await raw('GET', '/auth/me', { cookie: alice.cookie });
    const badId = await completeQuest(alice.cookie, 'not-a-real-id');
    assert('25: success/error envelopes everywhere', me.status === 200 && me.json.success === true && !!me.json.data.user && badId.status === 404 && badId.json.success === false && !!badId.json.error.code && !!badId.json.error.message);

    const achHistory = await prisma.xpHistory.findMany({ where: { userId: alice.userId } });
    const achRows = await prisma.userAchievement.count({ where: { userId: alice.userId } });
    assert('26: achievements + XP history persist in the DB', achHistory.some((h) => h.type === 'ACHIEVEMENT_UNLOCK') && achRows === 1);

    const arc = await signup('arc2');
    await createQuest(arc.cookie, { title: 'P', difficulty: 'MEDIUM' });
    const pQ = await createQuest(arc.cookie, { title: 'P2', difficulty: 'MEDIUM' });
    await completeQuest(arc.cookie, pQ.id);
    const arcCh = await raw('GET', '/character', { cookie: arc.cookie });
    const arcWk = await raw('GET', '/activity/weekly', { cookie: arc.cookie });
    const sumMatch = arcWk.json.data.daily.reduce((s, d) => s + d.xpEarned, 0) === arcWk.json.data.xpEarned;
    assert('27: daily/weekly recomputation stays consistent', arcCh.json.data.dailyProgress.completionPercentage === 50 && sumMatch && arcCh.json.data.character.rank?.code === 'BEGINNER');
  }

  section('Regression (extra)');
  {
    const u = await signup('reg');
    const q = await createQuest(u.cookie, { title: 'R1', category: 'FITNESS', difficulty: 'MEDIUM' });
    const one = await raw('GET', `/quests/${q.id}`, { cookie: u.cookie });
    assert('quest get returns owned quest', one.status === 200 && one.json.data.quest.id === q.id);
    const upd = await raw('PUT', `/quests/${q.id}`, { cookie: u.cookie, body: { title: 'Renamed', difficulty: 'HARD' } });
    assert('quest update recomputes rewards', upd.json.data.quest.title === 'Renamed' && upd.json.data.quest.xpReward === 150);
    const del = await raw('DELETE', `/quests/${q.id}`, { cookie: u.cookie });
    assert('quest delete succeeds', del.status === 200 && del.json.data.message);
    const gone = await raw('GET', `/quests/${q.id}`, { cookie: u.cookie });
    assert('deleted quest returns 404', gone.status === 404);
    const inv = await raw('GET', '/inventory', { cookie: u.cookie });
    assert('inventory list shape', inv.status === 200 && Array.isArray(inv.json.data.items));
    const mal = await raw('GET', '/activity?limit=banana', { cookie: u.cookie });
    assert('activity ignores garbage limit', mal.status === 200 && Array.isArray(mal.json.data.items));
    const lt = await raw('GET', '/activity?limit=7', { cookie: u.cookie });
    assert('activity respects a sane limit', lt.json.data.items.length <= 7);
  }

  section('Focus sessions');
  {
    const foc = await signup('focus');
    const start = await raw('POST', '/focus', { cookie: foc.cookie, body: { mode: 'POMODORO', plannedSeconds: 1500 } });
    assert('focus: start creates an ACTIVE session', start.status === 201 && start.json.data.session.status === 'ACTIVE' && start.json.data.session.mode === 'POMODORO' && start.json.data.session.plannedSeconds === 1500);
    const sessionId = start.json.data.session.id;

    const dupStart = await raw('POST', '/focus', { cookie: foc.cookie, body: { mode: 'FLOW' } });
    assert('focus: concurrent start is rejected with 409', dupStart.status === 409 && dupStart.json.error.code === 'FOCUS_ALREADY_RUNNING');

    const badMode = await raw('POST', '/focus', { cookie: (await signup('focx')).cookie, body: { mode: 'banana' } });
    assert('focus: invalid mode → 400', badMode.status === 400);

    const paused = await raw('POST', `/focus/${sessionId}/pause`, { cookie: foc.cookie });
    assert('focus: pause flips to PAUSED', paused.status === 200 && paused.json.data.session.status === 'PAUSED');
    const resumed = await raw('POST', `/focus/${sessionId}/resume`, { cookie: foc.cookie });
    assert('focus: resume flips back to ACTIVE', resumed.status === 200 && resumed.json.data.session.status === 'ACTIVE');

    const done = await raw('POST', `/focus/${sessionId}/complete`, { cookie: foc.cookie });
    assert('focus: complete closes the session', done.status === 200 && done.json.data.session.status === 'COMPLETED' && !!done.json.data.session.completedAt);
    assert('focus: completion grants the flat reward', done.json.data.rewards.xp === 10 && done.json.data.rewards.gold === 2 && done.json.data.character.gold === 2);
    const focusHistory = await prisma.xpHistory.findFirst({ where: { userId: foc.userId, type: 'FOCUS_COMPLETE' } });
    assert('focus: completion is ledgered', !!focusHistory && focusHistory.xpChange === 10 && focusHistory.goldChange === 2);

    const again = await raw('POST', `/focus/${sessionId}/complete`, { cookie: foc.cookie });
    assert('focus: double-complete → 409', again.status === 409 && again.json.error.code === 'FOCUS_CLOSED');

    // Direct fetch session persistence + focus history route.
    const hist = await raw('GET', '/focus/history', { cookie: foc.cookie });
    assert('focus: history route reports the completed session', hist.status === 200 && hist.json.data.sessionsCompleted === 1 && typeof hist.json.data.today.seconds === 'number');

    // FOCUSED achievement: 4 more completions (5 total).
    let focusedUnlocked = null;
    for (let i = 0; i < 4; i += 1) {
      const s = await raw('POST', '/focus', { cookie: foc.cookie, body: { mode: 'FLOW' } });
      const c = await raw('POST', `/focus/${s.json.data.session.id}/complete`, { cookie: foc.cookie });
      focusedUnlocked = focusedUnlocked || ((c.json.data.newAchievements || []).map((a) => a.code).includes('FOCUSED') ? true : null);
    }
    assert('FOCUSED unlocks after 5 completed sessions', focusedUnlocked === true);
    stateExtra.focus = { email: foc.email, password: 'secret123' };
  }

  section('Goals');
  {
    const go = await signup('goalx');
    const g0 = await raw('GET', '/goals', { cookie: go.cookie });
    assert('goals: defaults service shape', g0.json.data.daily.goal === 3 && g0.json.data.weekly.goal === 15 && g0.json.data.daily.claimed === false && g0.json.data.daily.canClaim === false);

    const early = await raw('POST', '/goals/daily/claim', { cookie: go.cookie });
    assert('goals: claiming before reaching → 409', early.status === 409 && early.json.error.code === 'GOAL_NOT_COMPLETE');

    for (let i = 0; i < 3; i += 1) {
      const q = await createQuest(go.cookie, { title: `G${i}` });
      await completeQuest(go.cookie, q.id);
    }
    const g1 = await raw('GET', '/goals', { cookie: go.cookie });
    assert('goals: daily is complete after 3 quests', g1.json.data.daily.isComplete && g1.json.data.daily.completed === 3 && g1.json.data.daily.canClaim === true);

    const claim = await raw('POST', '/goals/daily/claim', { cookie: go.cookie });
    assert('goals: daily claim grants reward once', claim.status === 200 && claim.json.data.rewards.xp === 50 && claim.json.data.rewards.gold === 10 && claim.json.data.character.gold === 3 * 10 + 10);

    const again = await raw('POST', '/goals/daily/claim', { cookie: go.cookie });
    assert('goals: second claim same day → 409', again.status === 409 && again.json.error.code === 'GOAL_ALREADY_CLAIMED');

    const claimHist = await prisma.xpHistory.findFirst({ where: { userId: go.userId, type: 'GOAL_CLAIM', metadata: JSON.stringify({ scope: 'DAILY' }) } });
    assert('goals: claim lands in the ledger', !!claimHist && claimHist.goldChange === 10);

    const set2 = await raw('PUT', '/goals', { cookie: go.cookie, body: { daily: 5, weekly: 20 } });
    assert('goals: targets can be updated server-side', set2.json.data.character.dailyQuestGoal === 5 && set2.json.data.character.weeklyQuestGoal === 20);
    const badSet = await raw('PUT', '/goals', { cookie: go.cookie, body: { daily: 0, weekly: 20 } });
    assert('goals: invalid target → 400', badSet.status === 400);
    stateExtra.goals = { email: go.email, password: 'secret123', dailyGoal: 5, weeklyGoal: 20, dailyClaimed: true };

    // WEEK_WARRIOR: set low weekly goal, complete one quest.
    const ww = await signup('wwarrior');
    await prisma.character.update({ where: { userId: ww.userId }, data: { weeklyQuestGoal: 1 } });
    const wq = await createQuest(ww.cookie, { title: 'WW1' });
    const wr = await completeQuest(ww.cookie, wq.id);
    assert('WEEK_WARRIOR unlocks from a completed weekly goal', (wr.json.data.newAchievements || []).map((a) => a.code).includes('WEEK_WARRIOR'));
  }

  section('Routines');
  {
    const ru = await signup('routinex');
    const created = await raw('POST', '/routines', {
      cookie: ru.cookie,
      body: { name: 'Mornings', period: 'MORNING', items: [{ title: 'Drink water' }, { title: 'Stretch' }] },
    });
    assert('routines: create with items', created.status === 201 && created.json.data.routine.items.length === 2 && created.json.data.routine.period === 'MORNING');
    const routineId = created.json.data.routine.id;
    const itemIds = created.json.data.routine.items.map((i) => i.id);

    const list1 = await raw('GET', '/routines', { cookie: ru.cookie });
    const first = list1.json.data.routines.find((r) => r.id === routineId);
    assert('routines: list reports today flags', first && first.items.every((i) => i.completedToday === false));

    const tick = await raw('POST', `/routines/${routineId}/items/${itemIds[0]}/complete`, { cookie: ru.cookie });
    assert('routines: ticking an item records activity', tick.status === 200 && tick.json.data.alreadyCompleted === false);

    const tick2 = await raw('POST', `/routines/${routineId}/items/${itemIds[0]}/complete`, { cookie: ru.cookie });
    const routineTicks = await prisma.xpHistory.count({ where: { userId: ru.userId, type: 'ROUTINE_COMPLETE' } });
    assert('routines: re-tick same day stays idempotent', tick2.json.data.alreadyCompleted === true && routineTicks === 1);

    // ROUTINED needs 7 distinct routine days — backdate ticks for 6 more.
    const tx = [];
    for (let i = 1; i <= 6; i += 1) {
      await prisma.xpHistory.create({
        data: {
          userId: ru.userId,
          type: 'ROUTINE_COMPLETE',
          description: 'Historical routine tick',
          createdAt: dateDaysAgo(i, 9),
          metadata: JSON.stringify({ routineId, itemId: itemIds[0], period: 'MORNING' }),
        },
      });
    }

    const added = await raw('POST', `/routines/${routineId}/items`, { cookie: ru.cookie, body: { title: 'Journal' } });
    assert('routines: add item', added.status === 201);

    const reorder = await raw('PUT', `/routines/${routineId}/items/order`, { cookie: ru.cookie, body: { itemIds: [added.json.data.item.id, itemIds[1], itemIds[0]] } });
    assert('routines: reorder items', reorder.status === 200 && reorder.json.data.items[0].id === added.json.data.item.id);

    const rq = await createQuest(ru.cookie, { title: 'Trig' });
    const rr = await completeQuest(ru.cookie, rq.id);
    assert('ROUTINED unlocks after 7 routine days', (rr.json.data.newAchievements || []).map((a) => a.code).includes('ROUTINED'));

    const badPer = await raw('POST', '/routines', { cookie: (await signup('routy')).cookie, body: { name: 'X', period: 'NIGHT' } });
    assert('routines: invalid period → 400', badPer.status === 400);

    const del = await raw('DELETE', `/routines/${routineId}`, { cookie: ru.cookie });
    assert('routines: delete succeeds', del.status === 200);
    const gone = await raw('GET', '/routines', { cookie: ru.cookie });
    assert('routines: deleted routine is gone', !gone.json.data.routines.some((r) => r.id === routineId));
  }

  section('Journeys & challenges');
  {
    const jr = await signup('journeyx');
    const created = await raw('POST', '/journeys', { cookie: jr.cookie, body: { title: '30 days of coding', totalDays: 30, kind: 'JOURNEY' } });
    assert('journeys: create journey', created.status === 201 && created.json.data.journey.kind === 'JOURNEY' && created.json.data.journey.totalDays === 30);
    const jId = created.json.data.journey.id;

    const chal = await raw('POST', '/journeys', { cookie: jr.cookie, body: { title: '7-day push', totalDays: 7, kind: 'CHALLENGE' } });
    assert('journeys: create challenge', chal.status === 201 && chal.json.data.journey.kind === 'CHALLENGE');

    const badKind = await raw('POST', '/journeys', { cookie: jr.cookie, body: { title: 'X', totalDays: 5, kind: 'SPRINT' } });
    assert('journeys: invalid kind → 400', badKind.status === 400);

    const list0 = await raw('GET', '/journeys', { cookie: jr.cookie });
    const prog0 = list0.json.data.journeys.find((j) => j.id === jId);
    assert('journeys: fresh program has day 1 and 0% progress', prog0.currentDay === 1 && prog0.progressPercentage === 0 && prog0.complete === false);

    const jq = await createQuest(jr.cookie, { title: 'Day 1' });
    const jr2 = await completeQuest(jr.cookie, jq.id);
    const prog1 = (await raw('GET', '/journeys', { cookie: jr.cookie })).json.data.journeys.find((j) => j.id === jId);
    assert('journeys: a real quest advances progress', prog1.activeDays === 1 && prog1.progressPercentage > 0 && prog1.progressPercentage <= 4);
    assert('JOURNEY_STARTED unlocks on the first triggering action', (jr2.json.data.newAchievements || []).map((a) => a.code).includes('JOURNEY_STARTED'));

    const del = await raw('DELETE', `/journeys/${jId}`, { cookie: jr.cookie });
    assert('journeys: delete succeeds', del.status === 200);
    const gone = await raw('GET', '/journeys', { cookie: jr.cookie });
    assert('journeys: deleted program is gone', !gone.json.data.journeys.some((j) => j.id === jId));
  }

  section('Custom rewards');
  {
    const rw = await signup('rewardx');
    const small = await raw('POST', '/rewards', { cookie: rw.cookie, body: { name: 'Movie night', cost: 250 } });
    assert('rewards: create', small.status === 201 && small.json.data.reward.cost === 250);
    const rewardId = small.json.data.reward.id;

    const badCost = await raw('POST', '/rewards', { cookie: rw.cookie, body: { name: 'X', cost: 5 } });
    assert('rewards: cost below floor → 400', badCost.status === 400);

    const need = await raw('POST', `/rewards/${rewardId}/redeem`, { cookie: rw.cookie });
    assert('rewards: redeem above balance → 409', need.status === 409 && need.json.error.code === 'INSUFFICIENT_GOLD');

    // Balance just enough for a single 250-cost redemption.
    await prisma.character.update({ where: { userId: rw.userId }, data: { gold: 250 } });
    const ok = await raw('POST', `/rewards/${rewardId}/redeem`, { cookie: rw.cookie });
    assert('rewards: atomic redeem deducts exact gold', ok.status === 200 && ok.json.data.character.gold === 0);
    const redeemHist = await prisma.xpHistory.findFirst({ where: { userId: rw.userId, type: 'REWARD_REDEEMED' } });
    assert('rewards: redemption is ledgered as a spend', !!redeemHist && redeemHist.goldChange === -250);

    const low = await raw('POST', `/rewards/${rewardId}/redeem`, { cookie: rw.cookie });
    assert('rewards: no negative balance, second redeem → 409', low.status === 409 && low.json.error.code === 'INSUFFICIENT_GOLD');

    const rap = await raw('POST', `/rewards/${rewardId}/redeem`, { cookie: (await signup('rob')).cookie });
    assert('rewards: cross-user redeem → 404', rap.status === 404 && rap.json.error.code === 'REWARD_NOT_FOUND');

    const del = await raw('DELETE', `/rewards/${rewardId}`, { cookie: rw.cookie });
    assert('rewards: delete succeeds', del.status === 200);

    const kept = await raw('POST', '/rewards', { cookie: rw.cookie, body: { name: 'Second reward', cost: 60 } });
    stateExtra.rewards = { email: rw.email, password: 'secret123', rewardTitle: 'Second reward' };
  }

  section('Avatar & identity');
  {
    const av = await signup('avatarx');
    const pres = await raw('PUT', '/character/avatar', { cookie: av.cookie, body: { key: 'ronin' } });
    assert('avatar: preset selection', pres.status === 200 && pres.json.data.character.avatarKey === 'ronin' && pres.json.data.character.avatarImage === null);

    const badKey = await raw('PUT', '/character/avatar', { cookie: av.cookie, body: { key: 'dragon' } });
    assert('avatar: unknown preset → 400', badKey.status === 400);

    // 1x1 red PNG as a data URI (~178 bytes decoded).
    const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const up = await raw('PUT', '/character/avatar/upload', { cookie: av.cookie, body: { image: tiny } });
    assert('avatar: upload sets custom key', up.status === 200 && up.json.data.character.avatarKey === 'custom' && up.json.data.character.avatarImage === tiny);
    const ch = await raw('GET', '/character', { cookie: av.cookie });
    assert('avatar: upload reflects in the character profile', ch.json.data.character.avatarKey === 'custom' && !!ch.json.data.character.avatarImage);
    stateExtra.avatar = { email: av.email, password: 'secret123', expectedKey: 'custom' };

    const tama = await raw('PUT', '/character/avatar/upload', { cookie: av.cookie, body: { image: 'not-a-data-uri' } });
    assert('avatar: malformed image → 400', tama.status === 400);

    // Clear test runs on a throwaway user so `av` keeps its custom avatar for
    // the restart persistence check.
    const av2 = await signup('avatary');
    const clear = await raw('DELETE', '/character/avatar', { cookie: av2.cookie });
    assert('avatar: clear falls back to turtle', clear.status === 200 && clear.json.data.character.avatarKey === 'turtle');
  }

  section('New achievements & calendar');
  {
    const mo = await signup('masterofone');
    await prisma.character.update({ where: { userId: mo.userId }, data: { discipline: 400 } });
    const mq = await createQuest(mo.cookie, { title: 'M1' });
    const mr = await completeQuest(mo.cookie, mq.id);
    assert('MASTER_OF_ONE unlocks with a 400 attribute', (mr.json.data.newAchievements || []).map((a) => a.code).includes('MASTER_OF_ONE'));

    const cal = await signup('calx');
    await createQuest(cal.cookie, { title: 'C1' });
    await createQuest(cal.cookie, { title: 'C2' });
    const c1 = await createQuest(cal.cookie, { title: 'C3' });
    await completeQuest(cal.cookie, c1.id);
    const fs = await raw('POST', '/focus', { cookie: cal.cookie }).then((x) => x.json.data.session);
    await raw('POST', `/focus/${fs.id}/complete`, { cookie: cal.cookie });
    const calData = await raw('GET', '/calendar?days=30', { cookie: cal.cookie });
    const today = calData.json.data.calendar[calData.json.data.calendar.length - 1];
    assert('calendar: aggregates quests and focus for today', today.quests === 1 && today.focusSeconds >= 0 && today.date === TODAY_KEY);
    assert('calendar: shape is ordered and bounded', calData.json.data.days === 30 && calData.json.data.calendar.length === 30);
  }

  console.log(`\nPASS ${passed} / ${passed + failed}`);

  // State for the restart persistence check (orchestrated by run-phase8.js).
  // ALWAYS the last thing this script does (after every section has run).
  require('fs').writeFileSync(
    require('path').join(__dirname, 'state.json'),
    JSON.stringify({ ...stateExtra, ...restarters }, null, 2)
  );
  if (failed > 0) {
    console.log('Failures:\n  - ' + failures.join('\n  - '));
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal test error:', err);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exitCode = 1;
});