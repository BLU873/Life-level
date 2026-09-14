import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Zap,
  Coins,
  Flame,
  Trophy,
  AlertCircle,
  Check,
  Target,
  CalendarCheck,
  TrendingUp,
  Swords,
  Shield,
  Sparkles,
  ArrowRight,
  Castle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';
import OperatorVisual from '../components/OperatorVisual';
import { preloadOperatorVisuals } from '../lib/characterVisual';
import {
  TacticalPanel,
  HUDLabel,
  StatBar,
  StatusBadge,
  SectionHeader,
  ProgressBar,
  RankBadge,
  TacticalButton,
} from '../components/tactical';

const ATTRIBUTES = [
  { key: 'strength', label: 'Strength', color: 'strength' },
  { key: 'intellect', label: 'Intelligence', color: 'intellect' },
  { key: 'discipline', label: 'Discipline', color: 'discipline' },
  { key: 'creativity', label: 'Creativity', color: 'creativity' },
  { key: 'social', label: 'Social', color: 'social' },
];

const LOADOUT_KEYS = {
  PROFILE_FRAME: 'Frame',
  THEME: 'Theme',
  BADGE: 'Badge',
};

function HudCell({ label, icon: Icon, iconClass = 'text-text-2', value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2">
        <Icon size={16} className={iconClass} />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">{label}</p>
        <p className="tnum text-lg font-semibold tracking-tight text-text">{value}</p>
      </div>
    </div>
  );
}

export default function Character() {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [character, setCharacter] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.all([api.get('/character'), api.get('/inventory'), api.get('/achievements')])
      .then(([ch, inv, ach]) => {
        if (cancelled) return;
        setCharacter(ch.data.data.character);
        setInventory(inv.data.data.items);
        setAchievements(ach.data.data.achievements);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not load your character. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const equippedByType = useMemo(() => {
    if (!inventory.length) return {};
    return inventory
      .filter((i) => i.isEquipped)
      .reduce((acc, i) => {
        (acc[i.item.type] = acc[i.item.type] || []).push(i);
        return acc;
      }, {});
  }, [inventory]);

  const statCap = useMemo(() => {
    if (!character) return 100;
    const peak = Math.max(
      100,
      character.strength,
      character.intellect,
      character.discipline,
      character.creativity,
      character.social
    );
    return Math.ceil(peak / 50) * 50;
  }, [character]);

  const operatorName = user?.username || character?.displayName || 'Operator';

  useEffect(() => {
    if (character) preloadOperatorVisuals(character.level);
  }, [character]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-[420px] w-full" />
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
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
          <p className="font-medium text-text">Character data unavailable.</p>
          <p className="text-sm text-text-2">{pageError}</p>
          <TacticalButton variant="steel" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </TacticalButton>
        </TacticalPanel>
      </div>
    );
  }

  if (!character) return null;

  const hasAnyEquipped = Object.keys(equippedByType).length > 0;
  const xpComplete = (character.xpRequiredForNextLevel || 0) > 0 && character.xpIntoCurrentLevel >= character.xpRequiredForNextLevel;

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      {/* 00 // OPERATOR ID */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <TacticalPanel brackets className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <HUDLabel tone="command">Character // Operator</HUDLabel>
            <h1 className="font-ui mt-1 text-3xl font-bold uppercase tracking-[0.08em] text-text sm:text-4xl">
              {operatorName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <RankBadge rankName={character.rank?.name || 'Operative'} level={character.level ?? 1} />
              <span className="font-mono text-xs text-text-2">
                LEVEL <span className="tnum font-bold text-text">{character.level}</span>
              </span>
              <StatusBadge status="active" label="Active" />
              <Link
                to="/outpost"
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-steel transition-colors hover:text-tact"
              >
                <Castle size={12} />
                Base // Outpost
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          <div className="w-full max-w-sm shrink-0">
            <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-text-2">
              <span className="uppercase tracking-[0.16em] text-text-3">Experience</span>
              <span className="tnum">
                <span className="font-semibold text-text">{character.xpIntoCurrentLevel}</span> / {character.xpRequiredForNextLevel}
              </span>
            </div>
            <ProgressBar
              value={character.xpIntoCurrentLevel}
              max={character.xpRequiredForNextLevel}
              color={xpComplete ? 'success' : 'tact'}
            />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
              <span className="tnum">{character.progressPercentage}%</span> to level {character.level + 1}
            </p>
          </div>
        </TacticalPanel>
      </motion.div>

      {/* 01 // CHARACTER VISUAL — large premium artwork */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="tact-brackets tact-scan relative isolate overflow-hidden rounded-md border border-line bg-surface"
      >
        <OperatorVisual level={character.level} operatorName={operatorName} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080706] via-[#080706]/10 to-[#080706]/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(8,7,6,0.55)_100%)]" />

        <div className="relative z-10 flex h-[300px] items-end justify-between gap-3 p-4 sm:h-[440px] sm:p-6">
          <HUDLabel tone="cream">Character // {operatorName}</HUDLabel>
          <StatusBadge status="active" label="Online" />
        </div>
      </motion.section>

      {/* 02 // COMBAT PROFILE + 03 // OPERATOR STATUS */}
      <div className="grid gap-3 md:grid-cols-2">
        <TacticalPanel brackets>
          <SectionHeader index="02" title="Combat Profile" />
          <div className="mt-4 grid gap-4">
            {ATTRIBUTES.map(({ key, label, color }, i) => (
              <motion.div
                key={key}
                initial={reduced ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              >
                <StatBar label={label} value={character[key] || 0} max={statCap} color={color} />
              </motion.div>
            ))}
          </div>
          {character.strongestAttribute && (
            <div className="mt-5 flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2">
              <Target size={14} className="shrink-0 text-success" />
              <p className="text-[13px] text-text-2">
                Strongest attribute:{' '}
                <span className="font-medium capitalize text-text">{character.strongestAttribute}</span>
              </p>
            </div>
          )}
        </TacticalPanel>

        <TacticalPanel brackets>
          <SectionHeader index="03" title="Operator Status" />
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
            <HudCell label="Total XP" icon={Zap} iconClass="text-tact" value={<span className="tnum">{character.totalXP?.toLocaleString()}</span>} />
            <HudCell label="Gold" icon={Coins} iconClass="text-warning" value={<span className="tnum">{character.gold?.toLocaleString()}</span>} />
            <HudCell label="Current streak" icon={Flame} iconClass="text-warning" value={<span className="tnum">{character.currentStreak}</span>} />
            <HudCell label="Longest streak" icon={Trophy} iconClass="text-creativity" value={<span className="tnum">{character.longestStreak}</span>} />
            <HudCell label="Operations completed" icon={Check} iconClass="text-success" value={<span className="tnum">{character.totalQuestsCompleted}</span>} />
            <HudCell label="Active days" icon={CalendarCheck} iconClass="text-intellect" value={<span className="tnum">{character.activeDays}</span>} />
          </div>
          {character.fastestGrowingAttribute && (
            <div className="mt-5 flex items-center gap-2 rounded-md border border-warning/20 bg-warning/5 px-3 py-2">
              <TrendingUp size={14} className="shrink-0 text-warning" />
              <p className="text-[13px] text-text-2">
                Fastest growing: <span className="font-medium capitalize text-text">{character.fastestGrowingAttribute}</span>
              </p>
            </div>
          )}
        </TacticalPanel>
      </div>

      {/* 04 // CURRENT LOADOUT */}
      <TacticalPanel brackets>
        <SectionHeader
          index="04"
          title="Current Loadout"
          action={
            <Link to="/loadout">
              <TacticalButton variant="steel" size="sm">
                <Swords size={13} />
                Manage loadout
              </TacticalButton>
            </Link>
          }
        />
        <div className="mt-4">
          {!hasAnyEquipped ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-line bg-surface-2/60 py-8 text-center">
              <Shield size={20} className="text-steel" />
              <p className="text-sm text-text-2">No equipment assigned. Equip items from your loadout.</p>
              <Link to="/loadout">
                <TacticalButton variant="primary" size="sm">
                  Open loadout
                </TacticalButton>
              </Link>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(equippedByType).map(([type, items]) => (
                <div key={type} className="rounded-md border border-line bg-surface-2/60 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
                    {LOADOUT_KEYS[type] || type}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {items.map((i) => (
                      <span
                        key={i.id}
                        className="inline-flex items-center gap-1 rounded-[3px] border border-line-2 bg-surface px-2 py-0.5 text-xs text-text"
                      >
                        <Sparkles size={10} className="text-tact" />
                        {i.item.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TacticalPanel>

      {/* 05 // ACHIEVEMENTS */}
      <TacticalPanel brackets>
        <SectionHeader
          index="05"
          title="Achievements"
          action={
            <Link
              to="/achievements"
              className="flex items-center gap-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-tact hover:text-tact-2"
            >
              View collection
              <ArrowRight size={12} />
            </Link>
          }
        />
        <div className="mt-2">
          {achievements.length === 0 && (
            <p className="py-4 text-sm text-text-2">No achievements yet. Complete operations to earn them.</p>
          )}
          {achievements.map((a) => {
            const unlocked = !!a.unlockedAt;
            return (
              <div key={a.code} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                    unlocked ? 'border-warning/30 bg-warning/10 text-warning' : 'border-line bg-surface-2 text-text-3'
                  }`}
                >
                  <Trophy size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{a.name}</p>
                  <p className="truncate text-[13px] text-text-2">{a.description}</p>
                </div>
                {unlocked ? (
                  <StatusBadge status="ready" label="Unlocked" />
                ) : (
                  <StatusBadge status="locked" label="Locked" />
                )}
              </div>
            );
          })}
        </div>
      </TacticalPanel>
    </div>
  );
}