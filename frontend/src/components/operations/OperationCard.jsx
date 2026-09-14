import { motion, useReducedMotion } from 'framer-motion';
import { Pencil, Trash2, Zap, Coins, CheckCircle2, Repeat2, Crosshair, Loader2, Shield, Timer } from 'lucide-react';
import { timeAgo } from '../../utils/format';
import { TacticalButton, HUDLabel, StatusBadge } from '../tactical';
import { CATEGORY_LABEL, DIFFICULTY_LABEL, DIFFICULTY_STATUS, DIFFICULTY_ATTRIBUTE_POINTS, ATTRIBUTE_NAME } from './constants';

export default function OperationCard({ quest, busy, focusBadge, onEdit, onDelete, onComplete }) {
  const reduced = useReducedMotion();
  const categoryLabel = CATEGORY_LABEL[quest.category] || quest.category;
  const difficultyLabel = DIFFICULTY_LABEL[quest.difficulty] || quest.difficulty;
  const attributeReward = quest.attribute ? `${DIFFICULTY_ATTRIBUTE_POINTS[quest.difficulty] ?? 2} ${ATTRIBUTE_NAME[quest.attribute] || quest.attribute}` : '';
  const now = new Date();
  const created = new Date(quest.createdAt);
  const createdToday =
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate();

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="tact-clip flex flex-col overflow-hidden border border-line bg-surface transition-colors duration-150 hover:border-tact/40 focus-within:border-tact/40"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-4 py-2">
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
          {categoryLabel} // Operation
        </span>
        {!quest.isCompleted && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit operation ${quest.title}`}
              className="rounded-md p-1.5 text-text-3 transition-colors hover:bg-surface-3 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tact/40"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete operation ${quest.title}`}
              className="rounded-md p-1.5 text-text-3 transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={quest.isCompleted ? 'ready' : 'active'} label={quest.isCompleted ? 'Completed' : 'Active'} />
          <StatusBadge status={DIFFICULTY_STATUS[quest.difficulty] || 'available'} label={difficultyLabel} />
          {quest.isRecurring && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-2">
              <Repeat2 size={11} className="text-tact" />
              Recurring
            </span>
          )}
          {!quest.isCompleted && createdToday && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-tact">
              <span className="h-1.5 w-1.5 rounded-full bg-tact" aria-hidden="true" />
              New // Today
            </span>
          )}
          {focusBadge && (
            <span className="tnum inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-2">
              <Timer size={11} className={focusBadge.live ? 'text-success' : 'text-warning'} />
              {focusBadge.live ? 'Focus Active' : `Focus ${focusBadge.minutes} min`}
            </span>
          )}
        </div>

        <h3 className="min-w-0 font-ui text-[15px] font-semibold leading-snug text-text">{quest.title}</h3>

        {quest.description && (
          <div>
            <HUDLabel tone="steel">Objective</HUDLabel>
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-text-2">{quest.description}</p>
          </div>
        )}

        <div className="mt-auto pt-1">
          <HUDLabel tone="steel">Reward</HUDLabel>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <span className="tnum inline-flex items-center gap-1 font-mono text-sm text-tact">
              <Zap size={13} />
              +{quest.xpReward} XP
            </span>
            {quest.goldReward > 0 && (
              <span className="tnum inline-flex items-center gap-1 font-mono text-sm text-warning">
                <Coins size={13} />
                +{quest.goldReward} GOLD
              </span>
            )}
            {!quest.isCompleted && attributeReward && (
              <span className="tnum inline-flex items-center gap-1 font-mono text-sm text-text-2">
                <Shield size={13} className="text-text-3" />
                +{attributeReward}
              </span>
            )}
          </div>
        </div>
      </div>

      {quest.isCompleted ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
            <CheckCircle2 size={13} className="text-success" />
            Recorded
          </span>
          {quest.completedAt && (
            <span className="shrink-0 font-mono text-[10px] text-text-3">{timeAgo(quest.completedAt)}</span>
          )}
        </div>
      ) : (
        <div className="border-t border-line px-4 py-3">
          <TacticalButton
            variant="primary"
            size="sm"
            disabled={busy}
            onClick={onComplete}
            className="w-full"
          >
            {busy ? (
              <>
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                Completing…
              </>
            ) : (
              <>
                <Crosshair size={13} />
                Complete
              </>
            )}
          </TacticalButton>
        </div>
      )}
    </motion.article>
  );
}