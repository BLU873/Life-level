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
  SectionHeader,
  TacticalButton,
} from '../components/tactical';
import RoomSessionPanel from '../components/focus/RoomSessionPanel';

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
  const [joinGoal, setJoinGoal] = useState(null);
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

  async function handleCreate() {
    if (busy) return;
    setBusy('create');
    try {
      const res = await api.post('/focus-rooms', {});
      adoptRoom(res.data.data.room);
      setJoinCode('');
      notify(`Room ${res.data.data.room.roomCode} created.`);
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
      const res = await api.post('/focus-rooms/join', { code, questId: joinGoal });
      adoptRoom(res.data.data.room);
      setJoinCode('');
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-tact/30 bg-tact/10 text-tact">
                <Users size={18} />
              </div>
              <div>
                <h1 className="font-ui text-sm font-semibold uppercase tracking-[0.2em] text-text">
                  Focus Room{room ? ` // ${room.roomCode}` : ''}
                </h1>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                  {room ? `${room.onlineCount} operator${room.onlineCount === 1 ? '' : 's'} online` : 'Shared workspace'}
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

      {!room ? (
        <div className="grid items-start gap-3 md:grid-cols-2">
          <TacticalPanel brackets>
            <SectionHeader index="01" title="Create Room" />
            <p className="mt-3 text-sm text-text-2">
              Open a room and share the code. You join automatically as owner.
            </p>
            <div className="mt-4">
              <TacticalButton variant="primary" size="md" className="w-full sm:w-auto" disabled={busy !== null} onClick={handleCreate}>
                <Plus size={14} />
                {busy === 'create' ? 'Creating…' : 'Create Room'}
              </TacticalButton>
            </div>
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
            session={room.session || null}
            sessionSeenAt={roomAt}
            isHost={room.isOwner}
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

