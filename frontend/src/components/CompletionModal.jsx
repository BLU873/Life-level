import { motion, useReducedMotion } from 'framer-motion';
import Modal from './ui/Modal';
import { Zap, Coins, Flame, ArrowRight, Trophy, Shield, Crosshair, ChevronRight } from 'lucide-react';
import { HUDLabel, StatusBadge, TacticalButton, ProgressBar } from './tactical';
import { getCharacterVisual, getOperatorEvolution } from '../lib/characterVisual';

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
    <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-line bg-surface-2 px-3 py-1.5 font-mono text-sm font-semibold text-text">
      <Icon size={14} className={iconClass} />
      {label}
    </span>
  );
}

function AttributeChip({ className, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 font-mono text-sm font-semibold ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export default function CompletionModal({ result, onClose }) {
  const reduced = useReducedMotion();
  if (!result) return null;

  const { quest, completion, progression, streak, newAchievements } = result;
  const leveledUp = !!progression?.leveledUp;
  const operatorEvolution = leveledUp ? getOperatorEvolution(progression.levelBefore, progression.levelAfter) : [];
  const attrChipClass = ATTRIBUTE_CHIP[completion?.attributeGained] || 'border-line bg-surface-2 text-text';
  const attrLabel = `${completion?.attributePoints ? `+${completion.attributePoints} ` : ''}${formatAttribute(completion?.attributeGained)}`;
  const showGold = (completion?.goldEarned ?? 0) > 0;

  return (
    <Modal isOpen onClose={onClose} title={null} description={null} size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-success/30 bg-success/10 text-success">
            <Crosshair size={20} />
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-steel">
              Operations // War Room
            </p>
            <h2 className="mt-1 font-ui text-lg font-bold uppercase tracking-[0.12em] text-text">
              Operation Complete
            </h2>
            <div className="mt-2 flex justify-center">
              <StatusBadge status="ready" label="Deployment Successful" />
            </div>
          </div>

          {quest?.title && (
            <div className="w-full border-y border-line py-3">
              <HUDLabel tone="steel">Operation</HUDLabel>
              <p className="mt-1 break-words text-base font-medium leading-snug text-text">{quest.title}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <RewardChip icon={Zap} iconClass="text-tact" label={`+${completion?.xpEarned ?? 0} XP`} />
            {showGold && <RewardChip icon={Coins} iconClass="text-warning" label={`+${completion?.goldEarned ?? 0} GOLD`} />}
            {(completion?.attributePoints ?? 0) > 0 && <AttributeChip className={attrChipClass} label={attrLabel} />}
          </div>

          {leveledUp && (
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 260 }}
              className="tact-clip w-full border border-tact/30 bg-tact/5 px-4 py-3"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tact">Level up</p>
              <div className="mt-1 flex items-center justify-center gap-2 font-display text-xl tracking-tight text-text">
                <span className="tnum">Lv {String(progression.levelBefore).padStart(2, '0')}</span>
                <ArrowRight size={16} className="text-text-3" />
                <span className="tnum text-tact">Lv {String(progression.levelAfter).padStart(2, '0')}</span>
              </div>
              <p className="mt-1 font-atmospheric text-[13px] text-text-2">Keep showing up, operator.</p>
            </motion.div>
          )}

          {operatorEvolution.length > 0 && operatorEvolution.map((milestone) => (
            <motion.div
              key={milestone}
              initial={reduced ? false : { opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 260 }}
              className="tact-clip w-full overflow-hidden border border-warning/30 bg-warning/5"
            >
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-warning">
                  Operator Evolution
                </p>
                <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-2">
                  <span className="tnum">Lv {String(milestone).padStart(2, '0')}</span>
                  <ChevronRight size={12} className="text-warning" />
                  <span className="tnum text-warning">{String(milestone + 1).padStart(2, '0')}+</span>
                </span>
              </div>
              <img
                src={getCharacterVisual(milestone)}
                alt={`Operator evolution: new operator visual unlocked at level ${milestone}`}
                draggable={false}
                className="h-28 w-full border-t border-warning/20 object-cover object-center"
              />
              <p className="border-t border-warning/20 px-4 py-2 text-center text-[12px] text-text-2">
                New operator visual unlocked at level {milestone}
              </p>
            </motion.div>
          ))}

          {streak && streak.streakChanged && streak.current > 1 && (
            <p className="flex items-center gap-1.5 text-[13px] text-text-2">
              <Flame size={14} className="text-tact" />
              <span className="tnum">{streak.current} day streak</span>
            </p>
          )}

          {newAchievements?.length > 0 && (
            <div className="w-full space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tact">Achievement Unlocked</p>
              {newAchievements.map((achievement) => (
                <div
                  key={achievement.code}
                  className="tact-clip flex items-center gap-3 rounded-[6px] border border-tact/40 bg-tact/5 px-3 py-2.5 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-tact/30 bg-tact/10 text-tact">
                    <Trophy size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{achievement.name}</p>
                    <p className="truncate text-[12px] text-text-2">{achievement.description}</p>
                  </div>
                  <Shield size={11} className="shrink-0 text-tact" />
                </div>
              ))}
            </div>
          )}

          {result.dailyProgress && result.dailyProgress.totalQuests > 0 && (
            <div className="w-full border-t border-line pt-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <HUDLabel tone="steel">Today&apos;s Arc</HUDLabel>
                <span className="tnum font-mono text-xs text-text">
                  <b className="tnum">{result.dailyProgress.completedQuests}</b>
                  <span className="text-text-3"> / {result.dailyProgress.totalQuests} deployed</span>
                </span>
              </div>
              <ProgressBar
                value={result.dailyProgress.completedQuests}
                max={Math.max(1, result.dailyProgress.totalQuests)}
                color={result.dailyProgress.isComplete ? 'success' : 'tact'}
                segments={result.dailyProgress.totalQuests > 0 ? result.dailyProgress.totalQuests : 4}
              />
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-3">
                +{result.dailyProgress.xpEarned} XP earned today
              </p>
            </div>
          )}

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <TacticalButton type="button" variant="primary" size="lg" className="w-full" onClick={onClose}>
              Acknowledge
            </TacticalButton>
          </motion.div>
        </div>
    </Modal>
  );
}