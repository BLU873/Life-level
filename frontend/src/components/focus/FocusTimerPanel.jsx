import { useReducedMotion } from 'framer-motion';
import { Timer, Pause, Play, Square } from 'lucide-react';
import { TacticalPanel, HUDLabel, TacticalButton } from '../tactical';
import { formatCountdown } from '../../hooks/useFocusTimer';

/**
 * FocusTimerPanel — compact live focus readout for the Command page.
 *
 * Renders nothing when no session is active (no fake 00:00 / INACTIVE).
 * The countdown digits are aria-hidden; screen readers get a polite status
 * line at whole-minute granularity (never every second).
 */
export default function FocusTimerPanel({ timer, questTitle }) {
  const reduced = useReducedMotion();
  const { session, busy, error, remaining, justCompleted, clearCompleted, pause, resume, stop } = timer;

  if (justCompleted) {
    const mins = Math.max(1, Math.round((justCompleted.totalSeconds ?? 0) / 60));
    return (
      <TacticalPanel className="min-w-0 border-success/30">
        <div className="flex items-center gap-2">
          <Timer size={14} className="shrink-0 text-success" />
          <HUDLabel tone="success">Focus // Complete</HUDLabel>
        </div>
        <p className="mt-1.5 truncate font-ui text-sm font-semibold uppercase tracking-[0.1em] text-text">
          {mins} minute{mins === 1 ? '' : 's'} secured
        </p>
        <p className="tnum mt-1 font-mono text-xs text-text-2" role="status">
          +{justCompleted.rewards?.xp ?? 0} XP · +{justCompleted.rewards?.gold ?? 0} GOLD
        </p>
        <div className="mt-3">
          <TacticalButton variant="steel" size="md" onClick={clearCompleted} className="w-full sm:w-auto">
            Dismiss
          </TacticalButton>
        </div>
      </TacticalPanel>
    );
  }

  if (!session) return null;

  const paused = session.status === 'PAUSED';
  const working = busy !== null;

  return (
    <TacticalPanel className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Timer size={14} className="shrink-0 text-text-2" />
          <HUDLabel tone="steel">{paused ? 'Focus // Paused' : 'Focus // Operation Active'}</HUDLabel>
        </div>
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${paused ? 'bg-warning' : 'animate-pulse bg-success'}`}
          style={reduced ? { animation: 'none' } : undefined}
        />
      </div>

      {questTitle && (
        <p className="mt-1.5 truncate font-ui text-sm font-semibold uppercase tracking-[0.1em] text-text">
          {questTitle}
        </p>
      )}

      <p
        aria-hidden="true"
        className="tnum mt-1 font-mono text-4xl font-semibold leading-none tracking-tight text-text"
      >
        {formatCountdown(remaining)}
      </p>
      <span className="sr-only" role="status">
        {paused
          ? `Focus timer paused, ${Math.max(1, Math.ceil(remaining / 60))} minutes remaining.`
          : `Focus timer running, about ${Math.max(1, Math.ceil(remaining / 60))} minutes remaining.`}
      </span>

      {error && (
        <p className="mt-2 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {paused ? (
          <TacticalButton variant="steel" size="md" disabled={working} onClick={resume}>
            <Play size={13} />
            {busy === 'resume' ? 'Resuming…' : 'Resume'}
          </TacticalButton>
        ) : (
          <TacticalButton variant="steel" size="md" disabled={working} onClick={pause}>
            <Pause size={13} />
            {busy === 'pause' ? 'Pausing…' : 'Pause'}
          </TacticalButton>
        )}
        <TacticalButton variant="danger" size="md" disabled={working} onClick={stop}>
          <Square size={13} />
          {busy === 'stop' ? 'Stopping…' : 'Stop'}
        </TacticalButton>
      </div>
    </TacticalPanel>
  );
}
