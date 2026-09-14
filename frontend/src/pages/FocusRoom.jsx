import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Users, Plus, LogIn, LogOut, Copy, Check, AlertCircle, Crosshair } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';
import Toast from '../components/ui/Toast';
import Input from '../components/ui/Input';
import {
  TacticalPanel,
  HUDLabel,
  SectionHeader,
  TacticalButton,
} from '../components/tactical';
import RoomSessionPanel from '../components/focus/RoomSessionPanel';
import { playSound } from '../utils/sound';

const CREATE_MINUTES = [15, 25, 45, 60, 90];

// Presence contract with the server: heartbeat every 20s, ONLINE while the
// server saw this client within the last 60s, room state polled every 15s.
// No sockets by design — worst case is graceful staleness, never a dead wire.
const HEARTBEAT_MS = 20000;
const POLL_MS = 15000;

function MemberRow({ member }) {
  const online = member.status === 'ONLINE';
  return (
    <li className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${online ? 'bg-success' : 'bg-steel/50'}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="truncate font-ui text-[15px] font-semibold text-text">{member.displayName}</span>
          <span className="tnum shrink-0 font-mono text-[11px] text-text-3">{member.publicId}</span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
          {online ? 'Online' : 'Offline'}
          {member.isOwner && ' · Owner'}
        </p>
        <p className="mt-1.5 break-words text-sm leading-snug text-text-2">
          {member.goal || <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-3">No active goal.</span>}
        </p>
      </div>
    </li>
  );
}

function ModePills({ value, onChange, disabled, labelledBy }) {
  return (
    <div className="flex rounded-[4px] border border-line bg-surface p-0.5" role="group" aria-labelledby={labelledBy}>
      {[
        { value: 'SHARED', label: 'Shared Agenda' },
        { value: 'INDIVIDUAL', label: 'Individual Goals' },
      ].map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          disabled={disabled}
          onClick={() => onChange(v)}
          className={`
            rounded-[3px] px-4 h-9 font-mono text-[11px] uppercase tracking-[0.16em]
            transition-colors duration-150 disabled:opacity-50
            ${value === v ? 'bg-tact/10 text-tact' : 'text-text-2 hover:text-text'}
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function DurationPills({ value, onChange, disabled, labelledBy }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-labelledby={labelledBy}>
      {CREATE_MINUTES.map((mins) => (
        <button
          key={mins}
          type="button"
          aria-pressed={value === mins}
          disabled={disabled}
          onClick={() => onChange(mins)}
          className={`
            tnum rounded-[4px] border px-3 h-10 font-mono text-[11px] uppercase tracking-[0.14em]
            transition-colors duration-150 disabled:opacity-50
            ${value === mins ? 'border-tact/60 bg-tact/10 text-tact' : 'border-line bg-surface text-text-2 hover:text-text'}
          `}
        >
          {mins} min
        </button>
      ))}
    </div>
  );
}

function RoomSettings({ room, notify, onSaved }) {
  const [name, setName] = useState(room.name || '');
  const [mode, setMode] = useState(room.agendaMode === 'SHARED' ? 'SHARED' : 'INDIVIDUAL');
  const [agenda, setAgenda] = useState(room.agendaText || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(null);

  async function saveSetup(e) {
    e?.preventDefault();
    if (saving) return;
    setSaving('setup');
    try {
      const res = await api.put(`/focus-rooms/${room.roomCode}`, {
        name: name.trim(),
        agendaMode: mode,
        agendaText: mode === 'SHARED' ? agenda.trim() : '',
      });
      onSaved(res.data.data.room);
      notify('Room updated.');
    } catch (err) {
      notify(err.response?.data?.error || 'Could not update the room.', 'error');
    } finally {
      setSaving(null);
    }
  }

  async function savePassword(e) {
    e?.preventDefault();
    if (saving || !password) return;
    setSaving('password');
    try {
      const res = await api.put(`/focus-rooms/${room.roomCode}/password`, { password });
      onSaved(res.data.data.room);
      setPassword('');
      notify('Room password updated.');
    } catch (err) {
      notify(err.response?.data?.error || 'Could not update the password.', 'error');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3" onSubmit={saveSetup}>
        <Input
          label="Room name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
          autoComplete="off"
        />
        <div className="space-y-1.5">
          <span id={`mode-${room.roomCode}`} className="block font-mono text-[11px] uppercase tracking-[0.18em] text-steel">
            Agenda mode
          </span>
          <ModePills value={mode} onChange={setMode} disabled={saving !== null} labelledBy={`mode-${room.roomCode}`} />
        </div>
        {mode === 'SHARED' && (
          <Input
            label="Shared agenda"
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            maxLength={200}
            placeholder="e.g. Complete Arrays + Linked Lists"
            autoComplete="off"
          />
        )}
        <TacticalButton type="submit" variant="steel" size="md" className="w-full sm:w-auto" disabled={saving !== null}>
          {saving === 'setup' ? 'Saving…' : 'Save Room'}
        </TacticalButton>
      </form>
      <form className="space-y-3 border-t border-line pt-4" onSubmit={savePassword}>
        <Input
          label="New room password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={72}
          required
          autoComplete="new-password"
          hint="Members already inside stay inside."
        />
        <TacticalButton type="submit" variant="steel" size="md" className="w-full sm:w-auto" disabled={saving !== null || !password}>
          {saving === 'password' ? 'Updating…' : 'Change Password'}
        </TacticalButton>
      </form>
    </div>
  );
}

function GoalSelect({ quests, value, onChange, disabled, id }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-mono text-[11px] uppercase tracking-[0.18em] text-steel">
        Public goal (optional)
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="h-10 w-full rounded-[4px] border border-line bg-surface px-3.5 text-sm text-text transition-all duration-150 focus:border-tact/60 focus:outline-none focus:ring-2 focus:ring-tact/25 disabled:opacity-50"
      >
        <option value="">No active goal</option>
        {quests.map((q) => (
          <option key={q.id} value={q.id}>
            {q.title.slice(0, 80)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FocusRoom() {
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false); // bootstrap /mine done
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinGoal, setJoinGoal] = useState(null);
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createMode, setCreateMode] = useState('INDIVIDUAL');
  const [createAgenda, setCreateAgenda] = useState('');
  const [createMinutes, setCreateMinutes] = useState(25);
  // Session-duration choice per created room (prefills the READY panel;
  // never auto-starts — starting stays an explicit host action).
  const [sessionDefaults, setSessionDefaults] = useState({});
  const [roomGoal, setRoomGoal] = useState(null); // selected goal id for updates
  const [goalSynced, setGoalSynced] = useState(true);
  const [quests, setQuests] = useState([]);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // When the currently displayed room/session snapshot arrived (anchors the
  // shared countdown between server polls so refresh never resets truth).
  const [roomAt, setRoomAt] = useState(() => Date.now());
  const [sessionBusy, setSessionBusy] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const roomCodeRef = useRef(null);
  const pollGuard = useRef(false);

  function adoptRoom(next) {
    setRoom(next);
    setRoomAt(Date.now());
  }

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadMine = useCallback(async () => {
    try {
      const res = await api.get('/focus-rooms/mine');
      return res.data.data.room || null;
    } catch {
      return null;
    }
  }, []);

  const loadQuests = useCallback(async () => {
    try {
      const res = await api.get('/quests', { params: { status: 'active' } });
      setQuests(res.data.data.quests || []);
    } catch {
      setQuests([]);
    }
  }, []);

  // Bootstrap: am I already inside a room (refresh-safe, no duplicates)?
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.all([loadMine(), loadQuests()]).then(([mine]) => {
      if (cancelled) return;
      adoptRoom(mine);
      roomCodeRef.current = mine ? mine.roomCode : null;
      setCheckedIn(true);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setPageError('Could not load the focus room. Make sure the API is running.');
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, loadMine, loadQuests]);

  // Keep roomCodeRef in sync for interval callbacks.
  useEffect(() => {
    roomCodeRef.current = room ? room.roomCode : null;
  }, [room]);

  // Initialize the goal picker from the member's own displayed goal (matched
  // by title against their active operations). No quest ids cross the wire.
  useEffect(() => {
    if (!room || roomGoal !== null || !goalSynced || quests.length === 0) return;
    const mine = room.members.find((m) => user?.playerTag && m.publicId === `@${user.playerTag}`);
    if (!mine?.goal) return;
    const match = quests.find((q) => q.title === mine.goal);
    if (match) setRoomGoal(match.id);
  }, [room, roomGoal, goalSynced, quests, user]);

  // Presence heartbeat + state poll while inside a room.
  useEffect(() => {
    if (!room) return undefined;
    let cancelled = false;

    async function beat() {
      if (cancelled || pollGuard.current) return;
      const code = roomCodeRef.current;
      if (!code) return;
      try {
        const res = await api.post(`/focus-rooms/${code}/heartbeat`, {});
        if (!cancelled) adoptRoom(res.data.data.room);
      } catch (err) {
        if (!cancelled && err?.response?.status === 404) {
          // Removed, room closed, or membership expired — fall back cleanly.
          const mine = await loadMine();
          if (!cancelled) adoptRoom(mine);
        }
      }
    }

    async function poll() {
      if (cancelled || pollGuard.current) return;
      const code = roomCodeRef.current;
      if (!code) return;
      try {
        const res = await api.get(`/focus-rooms/${code}`);
        if (!cancelled) adoptRoom(res.data.data.room);
      } catch (err) {
        if (!cancelled && err?.response?.status === 404) {
          const mine = await loadMine();
          if (!cancelled) adoptRoom(mine);
        }
      }
    }

    pollGuard.current = false;
    beat();
    const beatId = window.setInterval(beat, HEARTBEAT_MS);
    const pollId = window.setInterval(poll, POLL_MS);
    function onVisible() {
      if (document.visibilityState === 'visible') beat();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(beatId);
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [room ? room.roomCode : null, loadMine]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e) {
    e?.preventDefault();
    if (busy) return;
    setBusy('create');
    try {
      const res = await api.post('/focus-rooms', {
        name: createName.trim(),
        password: createPassword,
        agendaMode: createMode,
        agendaText: createMode === 'SHARED' ? createAgenda.trim() : '',
      });
      const created = res.data.data.room;
      adoptRoom(created);
      setSessionDefaults((m) => ({ ...m, [created.roomCode]: createMinutes }));
      // Clear secrets immediately; the password lives server-side (hashed) only.
      setCreateName('');
      setCreatePassword('');
      setCreateAgenda('');
      setJoinCode('');
      // Exactly once, on the success path only.
      playSound('focus-room-created');
      notify(`Room ${created.name} created.`);
    } catch (err) {
      notify(err.response?.data?.error || 'Could not create the room.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin(e) {
    e?.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code || busy) return;
    setBusy('join');
    try {
      const res = await api.post('/focus-rooms/join', { code, questId: joinGoal, password: joinPassword });
      adoptRoom(res.data.data.room);
      setJoinCode('');
      setJoinPassword('');
      setJoinGoal(null);
      notify(res.data.data.rejoined ? `Rejoined room ${code}.` : `Joined room ${code}.`);
    } catch (err) {
      notify(err.response?.data?.error || 'Could not join the room.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleLeave() {
    const code = roomCodeRef.current;
    if (!code || busy) return;
    setBusy('leave');
    try {
      await api.post(`/focus-rooms/${code}/leave`, {});
      pollGuard.current = true;
      adoptRoom(null);
      setRoomGoal(null);
      setGoalSynced(true);
      notify(`Left room ${code}.`);
    } catch (err) {
      if (err?.response?.status === 404) {
        adoptRoom(null);
      } else {
        notify(err.response?.data?.error || 'Could not leave the room.', 'error');
      }
    } finally {
      pollGuard.current = false;
      setBusy(null);
    }
  }

  async function handleGoalChange(questId) {
    const code = roomCodeRef.current;
    setRoomGoal(questId);
    if (!code || busy) {
      setGoalSynced(false);
      return;
    }
    setBusy('goal');
    try {
      const res = await api.post(`/focus-rooms/${code}/heartbeat`, { questId });
      adoptRoom(res.data.data.room);
      setGoalSynced(true);
    } catch (err) {
      setGoalSynced(false);
      notify(err.response?.data?.error || 'Could not update the goal.', 'error');
    } finally {
      setBusy(null);
    }
  }

  function sessionMessage(err, fallback) {
    const bodyError = err?.response?.data?.error;
    if (typeof bodyError === 'string') return bodyError;
    if (typeof bodyError?.message === 'string') return bodyError.message;
    return fallback;
  }

  async function sessionAction(action, durationSeconds) {
    const code = roomCodeRef.current;
    if (!code || sessionBusy) return;
    setSessionBusy(action);
    setSessionError('');
    try {
      const path =
        action === 'start'
          ? `/focus-rooms/${code}/session`
          : `/focus-rooms/${code}/session/${action}`;
      const res = await api.post(path, action === 'start' ? { durationSeconds } : {});
      adoptRoom(res.data.data.room);
    } catch (err) {
      if (err?.response?.status === 404) {
        const mine = await loadMine();
        adoptRoom(mine);
      } else {
        setSessionError(sessionMessage(err, `Could not ${action} the shared session.`));
      }
    } finally {
      setSessionBusy(null);
    }
  }

  // Re-poll when the local display reaches zero: the server lazily persists
  // COMPLETED and the fresh snapshot picks it up.
  const handleSessionExpired = useCallback(async () => {
    const code = roomCodeRef.current;
    if (!code || pollGuard.current) return;
    try {
      const res = await api.get(`/focus-rooms/${code}`);
      adoptRoom(res.data.data.room);
    } catch {
      // Next scheduled poll will retry.
    }
  }, []);

  async function handleCopy() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.roomCode);
    } catch {
      // Clipboard API unavailable (permissions, insecure context) — legacy path.
      try {
        const ta = document.createElement('textarea');
        ta.value = room.roomCode;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        notify('Copy failed — long-press the code to copy it.', 'error');
        return;
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !checkedIn) {
    return (
      <div className="mx-auto max-w-6xl space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="mx-auto max-w-6xl">
        <TacticalPanel variant="danger" className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <AlertCircle size={22} />
          </div>
          <p className="font-medium text-text">{pageError}</p>
          <TacticalButton variant="steel" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </TacticalButton>
        </TacticalPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <TacticalPanel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-violet-400/30 bg-violet-500/10 text-violet-200">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-ui text-sm font-semibold uppercase tracking-[0.2em] text-text">
                  Focus Room{room ? ` // ${room.name || room.roomCode}` : ''}
                </h1>
                <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                  {room ? `Room // ${room.roomCode} · ${room.onlineCount} operator${room.onlineCount === 1 ? '' : 's'} online` : 'Shared workspace'}
                </p>
              </div>
            </div>
            {room && (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="tnum select-all rounded-[4px] border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-sm tracking-[0.2em] text-text">
                  {room.roomCode}
                </span>
                <TacticalButton variant="steel" size="sm" onClick={handleCopy} aria-label="Copy room code">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </TacticalButton>
              </div>
            )}
          </div>
        </TacticalPanel>
      </motion.div>

      {room && (
        <TacticalPanel className="min-w-0">
          <HUDLabel tone="steel">Room Agenda</HUDLabel>
          {room.agendaMode === 'SHARED' ? (
            room.agendaText ? (
              <p className="mt-1.5 break-words font-ui text-lg font-semibold uppercase tracking-[0.08em] text-text">
                {room.agendaText}
              </p>
            ) : (
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text-3">
                Shared agenda — empty.
              </p>
            )
          ) : (
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text-3">
              Individual goals
            </p>
          )}
        </TacticalPanel>
      )}

      {!room ? (
        <div className="grid items-start gap-3 md:grid-cols-2">
          <TacticalPanel brackets>
            <SectionHeader index="01" title="Create Room" />
            <form className="mt-3 space-y-3" onSubmit={handleCreate}>
              <Input
                label="Room name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. DSA GRIND"
                maxLength={60}
                required
                autoComplete="off"
              />
              <Input
                label="Password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                maxLength={72}
                required
                autoComplete="new-password"
                hint="Shared with friends so they can join."
              />
              <div className="space-y-1.5">
                <span id="create-mode" className="block font-mono text-[11px] uppercase tracking-[0.18em] text-steel">
                  Agenda mode
                </span>
                <ModePills value={createMode} onChange={setCreateMode} disabled={busy !== null} labelledBy="create-mode" />
              </div>
              {createMode === 'SHARED' && (
                <Input
                  label="Shared agenda"
                  value={createAgenda}
                  onChange={(e) => setCreateAgenda(e.target.value)}
                  placeholder="e.g. Complete Arrays + Linked Lists"
                  maxLength={200}
                  autoComplete="off"
                />
              )}
              <div className="space-y-1.5">
                <span id="create-duration" className="block font-mono text-[11px] uppercase tracking-[0.18em] text-steel">
                  Session duration
                </span>
                <DurationPills value={createMinutes} onChange={setCreateMinutes} disabled={busy !== null} labelledBy="create-duration" />
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                  Prefills the session timer. Nothing starts yet.
                </p>
              </div>
              <TacticalButton type="submit" variant="violet" size="md" className="w-full sm:w-auto" disabled={busy !== null}>
                <Plus size={14} />
                {busy === 'create' ? 'Creating…' : 'Create Room'}
              </TacticalButton>
            </form>
          </TacticalPanel>

          <TacticalPanel brackets>
            <SectionHeader index="02" title="Join Room" />
            <form className="mt-3 space-y-3" onSubmit={handleJoin}>
              <Input
                label="Room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="e.g. V7K9P"
                maxLength={6}
                required
                autoComplete="off"
              />
              <Input
                label="Password"
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                maxLength={72}
                required
                autoComplete="off"
              />
              <GoalSelect id="join-goal" quests={quests} value={joinGoal || ''} onChange={setJoinGoal} disabled={busy !== null} />
              <TacticalButton type="submit" variant="steel" size="md" className="w-full sm:w-auto" disabled={busy !== null || !joinCode.trim()}>
                <LogIn size={14} />
                {busy === 'join' ? 'Joining…' : 'Join Room'}
              </TacticalButton>
            </form>
          </TacticalPanel>

          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3 md:col-span-2">
            Create a room or join an active room.
          </p>
        </div>
      ) : (
        <>
          <TacticalPanel brackets>
            <SectionHeader
              index="01"
              title="Operators Present"
              action={
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-2">
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-success"
                    aria-hidden="true"
                    style={reduced ? { animation: 'none' } : undefined}
                  />
                  <span className="tnum">{room.onlineCount} / {room.memberCount} online</span>
                </span>
              }
            />
            {room.members.length <= 1 ? (
              <p className="mt-3 rounded-[6px] border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-text-3">
                Waiting for operators.
              </p>
            ) : null}
            <ul className="mt-1 divide-y divide-line">
              {room.members.map((m) => (
                <MemberRow key={m.publicId} member={m} />
              ))}
            </ul>
          </TacticalPanel>

          <RoomSessionPanel
            key={room.roomCode}
            session={room.session || null}
            sessionSeenAt={roomAt}
            isHost={room.isOwner}
            defaultMinutes={sessionDefaults[room.roomCode] ?? 25}
            busy={sessionBusy}
            error={sessionError}
            onStart={(durationSeconds) => sessionAction('start', durationSeconds)}
            onPause={() => sessionAction('pause')}
            onResume={() => sessionAction('resume')}
            onStop={() => sessionAction('stop')}
            onExpired={handleSessionExpired}
          />

          <TacticalPanel>
            <SectionHeader index="02" title="Your Public Goal" />
            <div className="mt-3">
              <GoalSelect
                id="room-goal"
                quests={quests}
                value={roomGoal || ''}
                onChange={handleGoalChange}
                disabled={busy === 'goal'}
              />
              {!goalSynced && (
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-warning">
                  Goal not synced — still trying.
                </p>
              )}
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                Shown to the room from one of your active operations.
              </p>
            </div>
          </TacticalPanel>

          {room.isOwner && (
            <TacticalPanel brackets>
              <SectionHeader index="03" title="Room Settings" />
              <div className="mt-3">
                <RoomSettings
                  key={room.roomCode}
                  room={room}
                  notify={notify}
                  onSaved={adoptRoom}
                />
              </div>
            </TacticalPanel>
          )}

          <TacticalButton variant="danger" size="md" className="w-full sm:w-auto" disabled={busy !== null} onClick={handleLeave}>
            <LogOut size={14} />
            {busy === 'leave' ? 'Leaving…' : 'Leave Room'}
          </TacticalButton>

          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
            <Crosshair size={12} />
            Leaving never touches your operations or progression.
          </p>
        </>
      )}

      <Toast
        message={toast?.message}
        type={toast?.type}
        isVisible={!!toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

