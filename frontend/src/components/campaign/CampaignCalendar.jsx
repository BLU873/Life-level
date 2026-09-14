import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

export function dayKey(value) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isActiveDay(entry) {
  return !!entry && (entry.quests > 0 || entry.focusSeconds > 0 || entry.routines > 0 || entry.goals > 0);
}

function stateLabel(state) {
  switch (state) {
    case 'active':
      return 'active day';
    case 'today':
      return 'today, active day';
    case 'missed':
      return 'no activity';
    case 'future':
      return 'future date';
    case 'outside':
      return 'outside recorded campaign';
    default:
      return 'date';
  }
}

export default function CampaignCalendar({
  calendarMap,
  viewedMonth,
  selectedDay,
  windowStartKey,
  todayKey,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  canGoPrev,
  canGoNext,
}) {
  const reduced = useReducedMotion();
  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first

  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ key: `pad-${i}`, pad: true });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = dayKey(new Date(year, month, day));
    const entry = calendarMap.get(key);
    const active = isActiveDay(entry);

    let state = 'missed';
    if (key > todayKey) state = 'future';
    else if (key === todayKey) state = 'today';
    else if (key < windowStartKey) state = 'outside';
    else if (active) state = 'active';

    const selected = key === selectedDay;
    cells.push({ key, day, state, entry, selected });
  }

  const title = `${MONTH_NAMES[month].toUpperCase()} // ${year}`;

  return (
    <div className="tact-clip border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-text-2">
          {title}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            disabled={!canGoPrev}
            aria-label="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-steel transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            disabled={!canGoNext}
            aria-label="Next month"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-steel transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="px-2 pb-2 pt-2">
        <div className="grid grid-cols-7 gap-0.5">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-text-3"
            >
              {d}
            </div>
          ))}

          {cells.map((cell) => {
            if (cell.pad) {
              return <div key={cell.key} aria-hidden="true" />;
            }

            return (
              <motion.button
                key={cell.key}
                type="button"
                onClick={() => onSelectDay(cell.key)}
                initial={reduced ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18 }}
                aria-label={`${MONTH_NAMES[month]} ${cell.day}, ${year} — ${stateLabel(cell.state)}`}
                aria-pressed={cell.selected}
                disabled={cell.state === 'future' || cell.state === 'outside'}
                className={`
                  group relative mx-auto flex aspect-square w-full max-w-[44px] flex-col items-center justify-center gap-1
                  rounded-[6px] transition-colors duration-100
                  ${cell.state === 'future' || cell.state === 'outside'
                    ? 'cursor-default'
                    : 'cursor-pointer hover:bg-surface-2'
                  }
                  ${cell.selected
                    ? 'bg-tact/10 ring-1 ring-tact/40'
                    : ''
                  }
                `}
              >
                <span
                  className={`
                    tnum text-sm font-medium leading-none
                    ${cell.state === 'today'
                      ? 'text-tact'
                      : cell.state === 'active'
                        ? 'text-text'
                        : cell.state === 'future' || cell.state === 'outside'
                          ? 'text-surface-3/50'
                          : 'text-text-3'
                    }
                  `}
                >
                  {cell.day}
                </span>

                {cell.state === 'active' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-tact" />
                )}
                {cell.state === 'today' && (
                  <span className="relative flex h-3 w-3 items-center justify-center">
                    <span className="absolute h-full w-full rounded-full border border-tact/50" />
                    <span className="h-1.5 w-1.5 rounded-full bg-tact" />
                  </span>
                )}
                {cell.state === 'missed' && (
                  <span className="h-1 w-1 rounded-sm bg-surface-3/70" />
                )}
                {cell.state === 'future' && <span className="h-1 w-1 rounded-sm bg-surface-3/30" />}
                {cell.state === 'outside' && <span className="h-1 w-1 rounded-full bg-surface-3/20" />}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2">
        <LegendDot className="bg-tact" label="Active" />
        <LegendDot className="bg-text-3" label="Missed" />
        <LegendRetReticle label="Today" />
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.18em] text-steel">
          One day, one mark
        </span>
      </div>
    </div>
  );
}

function LegendDot({ className, label }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-text-3">
      <span className={`h-1.5 w-1.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function LegendRetReticle({ label }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-text-3">
      <span className="flex h-3 w-3 items-center justify-center">
        <span className="h-full w-full rounded-full border border-tact/50" />
      </span>
      {label}
    </span>
  );
}