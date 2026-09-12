import { motion } from 'framer-motion';
import Modal from './ui/Modal';
import { CheckCircle2, Zap, Coins, Flame, ArrowRight } from 'lucide-react';

const ATTRIBUTE_CHIP = {
  INTELLECT: 'border-intellect/20 bg-intellect/10 text-intellect',
  STRENGTH: 'border-strength/20 bg-strength/10 text-strength',
  DISCIPLINE: 'border-discipline/20 bg-discipline/10 text-discipline',
  CREATIVITY: 'border-creativity/20 bg-creativity/10 text-creativity',
  SOCIAL: 'border-social/20 bg-social/10 text-social',
};

function formatAttribute(attr) {
  if (!attr) return 'Attribute';
  return attr.charAt(0) + attr.slice(1).toLowerCase();
}

function RewardChip({ icon: Icon, iconClass, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm font-semibold text-text">
      <Icon size={14} className={iconClass} />
      {label}
    </span>
  );
}

function AttributeChip({ className, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export default function CompletionModal({ result, onClose }) {
  if (!result) return null;

  const { completion, progression, streak } = result;
  const leveledUp = !!progression?.leveledUp;
  const attrChipClass = ATTRIBUTE_CHIP[completion?.attributeGained] || 'border-line bg-surface-2 text-text';
  const attrLabel = `${completion?.attributePoints ? `+${completion.attributePoints} ` : ''}${formatAttribute(completion?.attributeGained)}`;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={null}
      description={null}
      size="sm"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
          <CheckCircle2 size={24} />
        </div>

        {leveledUp ? (
          <div className="w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 260 }}
              className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Level up</p>
              <div className="mt-1 flex items-center justify-center gap-2 text-xl font-semibold tracking-tight text-text">
                <span className="tnum">Level {progression.levelBefore}</span>
                <ArrowRight size={16} className="text-text-3" />
                <span className="tnum text-accent">Level {progression.levelAfter}</span>
              </div>
            </motion.div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-text">Quest complete</h2>
            <p className="mt-1 text-sm text-text-2">Your progress has been recorded.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <RewardChip icon={Zap} iconClass="text-accent" label={`+${completion.xpEarned} XP`} />
          <RewardChip icon={Coins} iconClass="text-warning" label={`+${completion.goldEarned} gold`} />
          <AttributeChip className={attrChipClass} label={attrLabel} />
        </div>

        {streak && streak.streakChanged && streak.current > 1 && (
          <p className="flex items-center gap-1.5 text-[13px] text-text-2">
            <Flame size={14} className="text-warning" />
            {streak.current} day streak
          </p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent shadow-sm transition-colors hover:bg-accent-2"
          >
            Continue
          </button>
        </motion.div>
      </div>
    </Modal>
  );
}