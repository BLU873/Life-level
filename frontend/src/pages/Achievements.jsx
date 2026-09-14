import { useState, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Lock, AlertCircle, Shield, Calendar, Medal, Crosshair } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import OperatorVisual from '../components/OperatorVisual';
import {
  TacticalPanel,
  HUDLabel,
  StatusBadge,
  SectionHeader,
  ProgressBar,
  RankBadge,
  TacticalButton,
} from '../components/tactical';

function formatUnlockDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function AchievementCard({ achievement, onSelect, reduced, index }) {
  const unlocked = !!achievement.unlockedAt;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(achievement)}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: reduced ? 0 : Math.min(index * 0.04, 0.4) }}
      className={`tact-clip group relative w-full overflow-hidden rounded-md border p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tact/40 ${
        unlocked
          ? 'border-tact/40 bg-surface hover:border-tact/70 hover:bg-surface-2'
          : 'border-line bg-surface-2/60 hover:border-steel/60 hover:bg-surface-2'
      }`}
      aria-label={`${achievement.name}: ${unlocked ? 'Unlocked' : 'Locked'}`}
    >
      {/* Corner brackets only for unlocked medals */}
      {unlocked && (
        <span className="pointer-events-none absolute -left-1 -top-1 h-3.5 w-3.5 border-l-2 border-t-2 border-warning" aria-hidden="true" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border ${
            unlocked
              ? 'border-warning/40 bg-warning/15 text-warning'
              : 'border-line bg-surface-3/80 text-steel'
          }`}
        >
          <Trophy size={17} />
        </div>
        <StatusBadge status={unlocked ? 'ready' : 'locked'} label={unlocked ? 'Unlocked' : 'Locked'} />
      </div>

      <p className={`mt-3 text-sm font-semibold ${unlocked ? 'text-text' : 'text-text-2'}`}>{achievement.name}</p>
      <p className={`mt-1 text-[13px] leading-snug ${unlocked ? 'text-text-2' : 'text-text-3'}`}>
        {achievement.description}
      </p>

      <div className="mt-4 flex items-center justify-between">
        {unlocked ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
            {achievement.unlockedAt ? `Earned // ${formatUnlockDate(achievement.unlockedAt)}` : 'Earned'}
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">Not earned yet</span>
        )}
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
            unlocked ? 'text-steel' : 'opacity-0 transition-opacity group-hover:opacity-60'
          }`}
        >
          Intel &rarr;
        </span>
      </div>
    </motion.button>
  );
}

export default function Achievements() {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [character, setCharacter] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.all([api.get('/character'), api.get('/achievements')])
      .then(([ch, ach]) => {
        if (cancelled) return;
        setCharacter(ch.data.data.character);
        setAchievements(ach.data.data.achievements);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not load your achievement collection. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const unlockedCount = useMemo(() => achievements.filter((a) => a.unlockedAt).length, [achievements]);
  const totalCount = achievements.length;
  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100 * 10) / 10 : 0;

  const recentUnlocks = useMemo(
    () => achievements.filter((a) => a.unlockedAt).sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)).slice(0, 5),
    [achievements]
  );

  const selectedAchievement = selected ? achievements.find((a) => a.id === selected.id) || null : null;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-3">
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && pageError) {
    return (
      <div className="mx-auto max-w-6xl">
        <TacticalPanel variant="danger" className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <AlertCircle size={22} />
          </div>
          <p className="font-medium text-text">Achievement data unavailable.</p>
          <p className="text-sm text-text-2">{pageError}</p>
          <TacticalButton variant="steel" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </TacticalButton>
        </TacticalPanel>
      </div>
    );
  }

  const operatorName = user?.username || character?.displayName || 'Operator';

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      {/* 00 // OPERATOR RECORD */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="tact-brackets tact-scan relative isolate overflow-hidden rounded-md border border-line bg-surface"
      >
        <OperatorVisual level={character?.level} operatorName={operatorName} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080706] via-[#080706]/75 to-[#080706]/20" />

        <div className="relative z-10 flex min-h-[150px] flex-col justify-center gap-3 p-4 sm:min-h-[170px] sm:p-6">
          <HUDLabel tone="warning">Achievement // Collection</HUDLabel>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-ui text-2xl font-bold uppercase tracking-[0.1em] text-text sm:text-3xl">
                {operatorName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                {character && (
                  <>
                    <RankBadge rankName={character.rank?.name || 'Operative'} level={character.level ?? 1} />
                    <span className="font-mono text-xs text-text-2">
                      LEVEL <span className="tnum font-bold text-text">{character.level}</span>
                    </span>
                  </>
                )}
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-text-2">Operator record</span>
              </div>
            </div>

            {character && (
              <div className="w-full max-w-xs shrink-0">
                <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-text-2">
                  <span className="uppercase tracking-[0.16em] text-text-3">Experience</span>
                  <span className="tnum">
                    {character.xpIntoCurrentLevel} / {character.xpRequiredForNextLevel}
                  </span>
                </div>
                <ProgressBar value={character.xpIntoCurrentLevel} max={character.xpRequiredForNextLevel} color="tact" />
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                  <span className="tnum">{character.progressPercentage}%</span> to level {character.level + 1}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* 01 // RECORD SUMMARY */}
      <TacticalPanel brackets>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-warning/40 bg-warning/10 text-warning">
              <Medal size={18} />
            </div>
            <div>
              <HUDLabel tone="steel">Unlocked</HUDLabel>
              <p className="text-2xl font-bold tracking-tight text-text">
                <span className="tnum text-warning">{unlockedCount}</span>
                <span className="tnum text-text-3"> / {totalCount}</span>
              </p>
            </div>
          </div>
          <div className="w-full max-w-sm">
            <div className="mb-1.5 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-text-3">
              <span>Completion</span>
              <span className="tnum text-text">{completionPct}%</span>
            </div>
            <ProgressBar value={unlockedCount} max={Math.max(1, totalCount)} color={unlockedCount === totalCount ? 'success' : 'warning'} />
          </div>
        </div>
      </TacticalPanel>

      {/* 02 // RECENT UNLOCKS (real unlock history only) */}
      {recentUnlocks.length > 0 && (
        <TacticalPanel>
          <SectionHeader index="02" title="Recent Unlocks" tone="warning" />
          <div className="mt-2 divide-y divide-line">
            {recentUnlocks.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a)}
                className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tact/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-warning/40 bg-warning/10 text-warning">
                  <Trophy size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{a.name}</p>
                  <p className="truncate text-[13px] text-text-2">{a.description}</p>
                </div>
                <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-steel sm:inline">
                  {formatUnlockDate(a.unlockedAt)}
                </span>
              </button>
            ))}
          </div>
        </TacticalPanel>
      )}

      {/* 03 // COLLECTION */}
      <div>
        <SectionHeader
          index="03"
          title="Collection"
          tone="warning"
          action={
            <span className="tnum font-mono text-xs text-text-3">
              {unlockedCount}/{totalCount} unlocked
            </span>
          }
        />
        {achievements.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-line bg-surface-2 text-steel">
              <Trophy size={20} />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-text-2">
                Collection Standby
              </p>
              <p className="mt-1 max-w-xs text-sm text-text-3">
                No achievements on record. Complete operations to earn your first.
              </p>
            </div>
            <Link to="/quests">
              <TacticalButton variant="ghost" size="sm">
                <Crosshair size={13} />
                Open War Room
              </TacticalButton>
            </Link>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((a, i) => (
              <AchievementCard key={a.id} achievement={a} index={i} reduced={reduced} onSelect={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* Detail view — only real fields */}
      <Modal
        isOpen={!!selectedAchievement}
        onClose={() => setSelected(null)}
        title={null}
        description={null}
        size="sm"
      >
        {selectedAchievement && (
          <div>
            <HUDLabel tone={selectedAchievement.unlockedAt ? 'warning' : 'steel'}>Achievement // Intel</HUDLabel>
            <div className="mt-3 flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border ${
                  selectedAchievement.unlockedAt
                    ? 'border-warning/40 bg-warning/15 text-warning'
                    : 'border-line bg-surface-3/80 text-steel'
                }`}
              >
                {selectedAchievement.unlockedAt ? <Trophy size={18} /> : <Lock size={16} />}
              </div>
              <div className="min-w-0">
                <h2 className="font-ui text-xl font-bold uppercase tracking-[0.08em] text-text">
                  {selectedAchievement.name}
                </h2>
                <p className="mt-1 text-sm text-text-2">{selectedAchievement.description}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <div className="flex items-center justify-between rounded-md border border-line bg-surface-2/60 px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">Status</span>
                {selectedAchievement.unlockedAt ? (
                  <StatusBadge status="ready" label="Unlocked" />
                ) : (
                  <StatusBadge status="locked" label="Locked" />
                )}
              </div>
              {selectedAchievement.unlockedAt && (
                <div className="flex items-center justify-between rounded-md border border-line bg-surface-2/60 px-3 py-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                    Unlock date
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-xs text-text">
                    <Calendar size={12} className="text-warning" />
                    {formatUnlockDate(selectedAchievement.unlockedAt)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border border-line bg-surface-2/60 px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">Identifier</span>
                <span className="tnum font-mono text-xs text-text-2">{selectedAchievement.code}</span>
              </div>
            </div>

            {!selectedAchievement.unlockedAt && (
              <p className="mt-4 flex items-center gap-2 rounded-md border border-line bg-surface-2/50 px-3 py-2 text-[13px] text-text-2">
                <Shield size={13} className="shrink-0 text-steel" />
                Keep completing operations. This achievement is still out in the field.
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <TacticalButton variant="steel" size="sm" onClick={() => setSelected(null)}>
                Close
              </TacticalButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}