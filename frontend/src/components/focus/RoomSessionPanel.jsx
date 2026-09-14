import { useState, useEffect } from 'react';
import { Timer, Play, Pause, Square } from 'lucide-react';
import { TacticalPanel, HUDLabel, TacticalButton } from '../tactical';
import { formatCountdown } from '../../hooks/useFocusTimer';

const PRESETS = [15, 25, 45, 60, 90];

/**
 * RoomSessionPanel — shared room countdown (Phase 19B).
 *
 * Distinct from the personal Operation timer: this countdown belongs to the
 * room, is server-authoritative, and all members observe the same state.
 * The local 1s interval only animates the display between server polls;
 * `sessionSeenAt` anchors it so refresh/navigation never resets the truth.
 */
function useDisplayRemaining(session, sessionSeenAt) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const running = session?.status === 'RUNNING';

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running, session?.startedAt]);

  if (!session || session.status === 'COMPLETED' || session.status === 'STOPPED') return 0;
  if (session.status === 'PAUSED') return Math.max(0, session.remainingSeconds ?? 0);
  if (!running) return Math.max(0, session.remainingSeconds ?? 0);
  const elapsed = Math.max(0, Math.floor((nowMs - (sessionSeenAt || nowMs)) / 1000));
  return Math.max(0, (session.remainingSeconds ?? 0) - elapsed);
}

function DurationPresets({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Session duration">
      {PRESETS.map((mins) => (
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

export default function RoomSessionPanel({
  session,
  sessionSeenAt,
  isHost,
  busy,
  error,
  onStart,
  onPause,
  onResume,
  onStop,
  onExpired,
  // Prefill chosen at room creation (remounts per room via key).
  // Never auto-starts — starting stays an explicit host action.
  defaultMinutes = 25,
}) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [startingNew, setStartingNew] = useState(false);
  const remaining = useDisplayRemaining(session, sessionSeenAt);

  // When the local display hits zero on a running session, ask the parent to
  // re-poll: the server lazily persists COMPLETED and the poll picks it up.
  useEffect(() => {
    if (session?.status === 'RUNNING' && remaining <= 0) onExpired?.();
  }, [session?.status, remaining, onExpired]);

  const status = session?.status || null;
  const showReady = !status || status === 'STOPPED' || (status === 'COMPLETED' && startingNew);

  return (
    <TacticalPanel brackets className="min-w-0">
      <div className="flex items-center gap-2">
        <Timer size={14} className="shrink-0 text-text-2" />
        <HUDLabel tone="steel">
          {status === 'RUNNING' && 'Focus Session // Live'}
          {status === 'PAUSED' && 'Focus Session // Paused'}
          {status === 'COMPLETED' && !startingNew && 'Focus Session // Complete'}
          {showReady && 'Focus Session // Ready'}
        </HUDLabel>
      </div>

      {showReady ? (
        <div className="mt-3 space-y-3">
          <p aria-hidden="true" className="tnum font-mono text-4xl font-semibold leading-none tracking-tight text-text">
            {formatCountdown(minutes * 60)}
          </p>
          {isHost ? (
            <>
              <DurationPresets value={minutes} onChange={setMinutes} disabled={busy !== null} />
              <TacticalButton
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                disabled={busy !== null}
                onClick={() => {
                  setStartingNew(false);
                  onStart(minutes * 60);
                }}
              >
                <Play size={13} />
                {busy === 'start' ? 'Starting…' : startingNew ? 'Start New Session' : 'Start Session'}
              </TacticalButton>
            </>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-3">
              Waiting for host
            </p>
          )}
        </div>
      ) : status === 'COMPLETED' ? (
        <div className="mt-3 space-y-3">
          <p aria-hidden="true" className="tnum font-mono text-4xl font-semibold leading-none tracking-tight text-text">
            00:00
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-success" role="status">
            Session complete
          </p>
          {isHost && (
            <TacticalButton variant="steel" size="md" className="w-full sm:w-auto" onClick={() => setStartingNew(true)}>
              <Play size={13} />
              Start New Session
            </TacticalButton>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p aria-hidden="true" className="tnum font-mono text-4xl font-semibold leading-none tracking-tight text-text">
            {formatCountdown(remaining)}
          </p>
          <span className="sr-only" role="status">
            {status === 'PAUSED'
              ? `Shared session paused, ${Math.max(1, Math.ceil(remaining / 60))} minutes remaining.`
              : `Shared session running, about ${Math.max(1, Math.ceil(remaining / 60))} minutes remaining.`}
          </span>
          {status === 'RUNNING' && (
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-2">
              All operators deployed
            </p>
          )}
          {isHost ? (
            <div className="grid grid-cols-2 gap-2">
              {status === 'PAUSED' ? (
                <TacticalButton variant="steel" size="md" disabled={busy !== null} onClick={onResume}>
                  <Play size={13} />
                  {busy === 'resume' ? 'Resuming…' : 'Resume'}
                </TacticalButton>
              ) : (
                <TacticalButton variant="steel" size="md" disabled={busy !== null} onClick={onPause}>
                  <Pause size={13} />
                  {busy === 'pause' ? 'Pausing…' : 'Pause'}
                </TacticalButton>
              )}
              <TacticalButton variant="danger" size="md" disabled={busy !== null} onClick={onStop}>
                <Square size={13} />
                {busy === 'stop' ? 'Stopping…' : 'Stop'}
              </TacticalButton>
            </div>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-3">
              {status === 'PAUSED' ? 'Session paused' : 'Session in progress'}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
    </TacticalPanel>
  );
}
