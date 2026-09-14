import { motion, useReducedMotion } from 'framer-motion';
import { Check, Coins, Medal, Target, Zap } from 'lucide-react';
import { HUDLabel, StatusBadge, TacticalPanel } from '../tactical';

const SHORT_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const EARN_TYPES = new Set(['QUEST_COMPLETION', 'GOAL_CLAIM', 'ROUTINE_COMPLETE', 'FOCUS_COMPLETE']);

function formatDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`;
}

function minutesLabel(seconds) {
  const mins = Math.round(seconds / 60);
  return mins < 60 ? `${mins} MIN` : `${Math.floor(mins / 60)}H ${mins % 60}M`;
}

function StatusLabel({ state }) {
  if (state === 'active' || state === 'today') {
    return <StatusBadge status="ready" label="Operational" />;
  }
  if (state === 'missed') {
    return <StatusBadge status="warning" label="No Activity" />;
  }
  if (state === 'future') {
    return <StatusBadge status="pending" label="Future Date" />;
  }
  return <StatusBadge status="muted" label="Outside Record" />;
}

function StatKv({ label, value, accent = 'text-text' }) {
  return (
    <div className="min-w-0">
      <HUDLabel tone="steel">{label}</HUDLabel>
      <p className={`tnum mt-1 font-mono text-sm ${accent}`}>{value}</p>
    </div>
  );
}

export default function CampaignDayDetail({
  dateKey,
  state,
  calendarEntry,
  activityRows = [],
  achievements = [],
}) {
  const reduced = useReducedMotion();

  const completed = calendarEntry?.quests ?? 0;
  const focusSeconds = calendarEntry?.focusSeconds ?? 0;
  const routines = calendarEntry?.routines ?? 0;
  const goals = calendarEntry?.goals ?? 0;
  const hasFieldRecord = completed > 0 || focusSeconds > 0 || routines > 0 || goals > 0;

  const operationRows = activityRows.filter((r) => r.type === 'QUEST_COMPLETION');
  const xpEarned = activityRows.reduce((sum, r) => (EARN_TYPES.has(r.type) ? sum + (r.xpChange || 0) : sum), 0);
  const goldEarned = activityRows.reduce(
    (sum, r) => (EARN_TYPES.has(r.type) && (r.goldChange || 0) > 0 ? sum + r.goldChange : sum),
    0
  );

  const isOperational = hasFieldRecord || operationRows.length > 0;

  return (
    <div className="tact-clip border border-line bg-surface">
      <div className="border-b border-line px-4 py-2.5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-text-2">
          Campaign Log // {formatDateKey(dateKey)}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusLabel state={state} />
        </div>
      </div>

      {!isOperational && state !== 'outside' && state !== 'future' ? (
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-10 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-3">
            No field activity recorded
          </p>
          <p className="mt-2 text-sm text-text-3">
            This day carries no marker in your campaign record.
          </p>
        </motion.div>
      ) : state === 'outside' || state === 'future' ? (
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-10 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-3">
            {state === 'future' ? 'Date not yet reached' : 'Outside recorded window'}
          </p>
          <p className="mt-2 text-sm text-text-3">
            {state === 'future'
              ? 'No data can exist for a date that has not happened.'
              : 'Your recorded campaign does not extend this far back.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5 px-4 py-4"
        >
          {operationRows.length > 0 && (
            <TacticalPanel className="p-0">
              <div className="flex items-center gap-2 px-3 pt-2.5">
                <Target size={13} className="text-tact" />
                <HUDLabel tone="steel">Operations</HUDLabel>
                <span className="ml-auto tnum font-mono text-[10px] text-text-3">{operationRows.length}</span>
              </div>
              <ul className="mt-1 divide-y divide-line">
                {operationRows.slice(0, 12).map((row) => (
                  <li key={row.id} className="flex items-start gap-2 px-3 py-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-tact" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-text">
                        {row.quest?.title || row.description?.replace('Completed quest ', '"').replace(/"?$/, '"') || 'Operation complete'}
                      </p>
                      {row.attributeType && row.attributeChange > 0 && (
                        <p className="tnum font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                          +{row.attributeChange} {row.attributeType}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {operationRows.length > 12 && (
                <p className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                  +{operationRows.length - 12} more recorded
                </p>
              )}
            </TacticalPanel>
          )}

          {(xpEarned > 0 || goldEarned > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-start gap-1 border border-line rounded-[6px] p-3">
                <HUDLabel tone="steel">XP Earned</HUDLabel>
                <p className="tnum flex items-center gap-1.5 font-mono text-lg leading-none text-tact">
                  <Zap size={14} />
                  +{xpEarned}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 border border-line rounded-[6px] p-3">
                <HUDLabel tone="steel">Gold Earned</HUDLabel>
                <p className="tnum flex items-center gap-1.5 font-mono text-lg leading-none text-warning">
                  <Coins size={14} />
                  +{goldEarned}
                </p>
              </div>
            </div>
          )}

          {achievements.length > 0 && (
            <div>
              <div className="flex items-center gap-2">
                <Medal size={13} className="text-warning" />
                <HUDLabel tone="steel">Achievement Unlocked</HUDLabel>
              </div>
              <ul className="mt-1.5 space-y-1.5">
                {achievements.map((ach) => (
                  <li
                    key={ach.id}
                    className="flex items-center gap-2 border border-warning/20 rounded-[6px] bg-warning/5 px-2.5 py-1.5"
                  >
                    <span className="font-mono text-xs text-text">{ach.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasFieldRecord && (
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
              {completed > 0 && <StatKv label="Operations" value={completed} />}
              {focusSeconds > 0 && (
                <StatKv
                  label="Focus Time"
                  value={minutesLabel(focusSeconds)}
                  accent="text-text-2"
                />
              )}
              {routines > 0 && <StatKv label="Routines" value={routines} />}
              {goals > 0 && <StatKv label="Goal Claims" value={goals} />}
              {completed === 0 && focusSeconds === 0 && routines === 0 && goals === 0 && (
                <StatKv label="Recorded" value="Ledger only" accent="text-text-3" />
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}