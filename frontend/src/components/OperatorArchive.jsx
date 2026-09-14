import { useState, useMemo } from 'react';
import { Lock } from 'lucide-react';
import Modal from './ui/Modal';
import { TacticalPanel, SectionHeader, HUDLabel, TacticalButton } from './tactical';
import { getArchiveMilestones, getCurrentMilestone } from '../lib/characterVisual';

function rangeLabel(entry) {
  const pad = (n) => String(n).padStart(2, '0');
  if (entry.maxLevel == null) return `LEVEL ${entry.minLevel}+`;
  if (entry.minLevel === entry.maxLevel) return `LEVEL ${pad(entry.minLevel)}`;
  return `LEVEL ${pad(entry.minLevel)}–${pad(entry.maxLevel)}`;
}

function statusOf(entry, currentMin) {
  if (entry.minLevel === currentMin) return 'current';
  return entry.minLevel <= currentMin ? 'unlocked' : 'locked';
}

function statusText(entry, status) {
  if (status === 'current') return 'Current';
  if (status === 'unlocked') return `Unlocked at level ${entry.minLevel}`;
  return `Unlocks at level ${entry.minLevel}`;
}

/**
 * OperatorArchive — the operator evolution collection (Phase 20).
 *
 * All milestone data derives from getArchiveMilestones(), which reads the
 * SAME tier table as getCharacterVisual(): the archive can never disagree
 * with the live visual. No lore, rarity, stats, or equip mechanics —
 * progression display only. The current operator stays dominant above.
 */
export default function OperatorArchive({ level }) {
  const [selected, setSelected] = useState(null);
  const milestones = useMemo(() => getArchiveMilestones(), []);
  const currentMin = getCurrentMilestone(level ?? 1);
  const next = milestones.find((m) => m.minLevel > (level ?? 1));

  return (
    <TacticalPanel brackets>
      <SectionHeader index="06" title="Operator Archive" />

      <div className="mt-3 rounded-[6px] border border-line bg-surface-2/60 px-3 py-2.5">
        {next ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-2">
            <span className="text-steel">Next operator // Level {next.minLevel}</span>
            <span className="tnum text-text"> — {next.minLevel - (level ?? 1)} level{(next.minLevel - (level ?? 1)) === 1 ? '' : 's'} to unlock</span>
          </p>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-warning">
            Maximum operator tier // Level 40+
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {milestones.map((m) => {
          const status = statusOf(m, currentMin);
          const locked = status === 'locked';
          const isCurrent = status === 'current';
          return (
            <button
              key={m.minLevel}
              type="button"
              onClick={() => setSelected(m)}
              aria-label={`${m.label}, ${statusText(m, status).toLowerCase()}`}
              className={`
                group relative flex min-w-0 flex-col overflow-hidden rounded-md border text-left
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tact/40
                ${isCurrent ? 'border-tact/50' : 'border-line hover:border-line-2'}
              `}
            >
              <span className="relative block aspect-square w-full overflow-hidden bg-surface-2">
                <img
                  src={m.src}
                  alt=""
                  loading={isCurrent ? 'eager' : 'lazy'}
                  className={`h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] ${
                    locked ? 'grayscale brightness-[.72]' : ''
                  }`}
                />
                {locked && (
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-[6px] border border-line bg-surface/85 text-text-2">
                    <Lock size={13} aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
                <span className="truncate font-display text-[13px] tracking-tight text-text">
                  {m.label}
                </span>
                <span className="tnum font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                  {rangeLabel(m)}
                </span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                    isCurrent ? 'text-tact' : locked ? 'text-text-3' : 'text-text-2'
                  }`}
                >
                  {isCurrent ? '● Current' : locked ? '○ Locked' : '○ Unlocked'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? selected.label : 'Operator'}
        description={selected ? rangeLabel(selected) : undefined}
        size="sm"
      >
        {selected &&
          (() => {
            const status = statusOf(selected, currentMin);
            return (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-md border border-line">
                  <img
                    src={selected.src}
                    alt={`${selected.label}, ${statusText(selected, status).toLowerCase()}`}
                    className={`h-44 w-full object-cover ${status === 'locked' ? 'grayscale brightness-[.72]' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <HUDLabel tone="steel">Status</HUDLabel>
                    <span
                      className={`font-mono text-[11px] uppercase tracking-[0.16em] ${
                        status === 'current' ? 'text-tact' : status === 'locked' ? 'text-text-3' : 'text-text-2'
                      }`}
                    >
                      {status === 'current' ? 'Current' : status === 'locked' ? 'Locked' : 'Unlocked'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
                    <HUDLabel tone="steel">{status === 'locked' ? 'Unlocks at' : 'Unlocked at'}</HUDLabel>
                    <span className="tnum font-mono text-[11px] uppercase tracking-[0.16em] text-text">
                      Level {selected.minLevel}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <TacticalButton variant="steel" size="sm" onClick={() => setSelected(null)}>
                    Close
                  </TacticalButton>
                </div>
              </div>
            );
          })()}
      </Modal>
    </TacticalPanel>
  );
}
