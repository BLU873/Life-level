import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Castle,
  Scroll,
  Dumbbell,
  Swords,
  CalendarDays,
  RadioTower,
  Trophy,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/format';
import Skeleton from '../components/ui/Skeleton';
import FacilityRow from '../components/outpost/FacilityRow';
import { getOutpostTier } from '../lib/outpostTier';
import {
  TacticalPanel,
  HUDLabel,
  StatusBadge,
  ProgressBar,
  RankBadge,
  SectionHeader,
  TacticalButton,
} from '../components/tactical';

const ATTRIBUTE_LABEL = {
  intellect: 'Intellect',
  strength: 'Strength',
  discipline: 'Discipline',
  creativity: 'Creativity',
  social: 'Social',
};

function OperatorMeta({ label, value, className = '' }) {
  return (
    <div className={className}>
      <HUDLabel tone="steel">{label}</HUDLabel>
      <p className="tnum mt-1 max-w-[220px] truncate font-mono text-sm font-semibold text-text">
        {value}
      </p>
    </div>
  );
}

function CommandCenter({ character, rank, tier }) {
  const reduced = useReducedMotion();
  const level = character.level ?? 1;
  const xpInto = character.xpIntoCurrentLevel ?? 0;
  const xpNeed = character.xpRequiredForNextLevel ?? 1;
  const pct = xpNeed > 0 ? Math.round((xpInto / xpNeed) * 100) : 0;
  const complete = xpInto >= xpNeed;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover="hover"
      variants={{ hover: { y: -2 } }}
    >
      <Link
        to="/dashboard"
        aria-label="Command Center — enter"
        className="group relative block rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tact"
      >
        <div
          className={`tact-clip tact-brackets relative flex h-full flex-col gap-4 overflow-hidden rounded-md border bg-surface p-5 ${tier.coreBorderClass} ${tier.coreHaloClass}`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(229,106,31,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(229,106,31,0.08) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
              opacity: tier.gridOpacity,
            }}
          />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-tact/40 bg-tact/15 text-tact">
                <Castle size={16} />
              </span>
              <HUDLabel tone="tact">Command Center</HUDLabel>
            </div>
            <span aria-hidden="true" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-success" style={reduced ? { animation: 'none' } : undefined} />
          </div>

          <div className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">Base status</p>
              <p className="tnum font-display leading-none text-text">
                <span className="text-5xl sm:text-6xl">{level}</span>
                <span className="text-lg font-mono text-text-3"> /lvl</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <RankBadge rankName={rank} level={level} />
                <span className="tnum font-mono text-[11px] uppercase tracking-[0.12em] text-text-2">
                  Streak // {character.currentStreak ?? 0}d
                </span>
              </div>
            </div>
            <div className="shrink-0">
              <StatusBadge status="active" label="System // Online" />
            </div>
          </div>

          <div className="relative">
            <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-text-2">
              <span className="uppercase tracking-[0.16em] text-text-3">Experience</span>
              <span className="tnum">
                <span className="font-semibold text-text">{xpInto}</span> / {xpNeed}
              </span>
            </div>
            <ProgressBar value={xpInto} max={xpNeed} color={complete ? 'success' : 'tact'} />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
              <span className="tnum">{pct}%</span> to level {level + 1}
            </p>
          </div>

          <div className="relative mt-auto flex items-center justify-between border-t border-line pt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2 transition-colors group-hover:text-tact">
              [ Enter Base ]
            </span>
            <ArrowRight size={14} className="text-tact transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function StatusRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">{label}</span>
      <span className="tnum font-mono text-sm font-semibold text-text">{value}</span>
    </div>
  );
}

export default function Outpost() {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [character, setCharacter] = useState(null);
  const [dailyProgress, setDailyProgress] = useState(null);
  const [activeOps, setActiveOps] = useState(0);
  const [equipped, setEquipped] = useState(0);
  const [achUnlocked, setAchUnlocked] = useState(0);
  const [achTotal, setAchTotal] = useState(0);
  const [activity, setActivity] = useState([]);
  const [headline, setHeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.all([
      api.get('/character'),
      api.get('/quests', { params: { status: 'active' } }),
      api.get('/inventory'),
      api.get('/achievements'),
      api.get('/activity', { params: { limit: 4 } }),
    ])
      .then(([ch, qs, inv, ach, act]) => {
        if (cancelled) return;
        setCharacter(ch.data.data.character);
        setDailyProgress(ch.data.data.dailyProgress);
        setActiveOps(qs.data.data.quests?.length || 0);
        setEquipped((inv.data.data.items || []).filter((i) => i.isEquipped).length);
        const achs = ach.data.data.achievements || [];
        setAchUnlocked(achs.filter((a) => a.unlockedAt).length);
        setAchTotal(achs.length);
        setActivity(act.data.data.items || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not load your outpost. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setHeadline(null);
    api
      .get('/intel', { params: { limit: 1 } })
      .then((res) => {
        if (cancelled) return;
        const items = res.data.data.items || [];
        setHeadline(items[0]?.title || null);
      })
      .catch(() => {
        if (!cancelled) setHeadline(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const topAttr = useMemo(() => {
    if (!character) return { label: '—', value: 0 };
    let best = 'strength';
    let bestVal = -1;
    Object.keys(ATTRIBUTE_LABEL).forEach((k) => {
      const v = character[k] || 0;
      if (v > bestVal) {
        best = k;
        bestVal = v;
      }
    });
    return { label: (ATTRIBUTE_LABEL[best] || best).toUpperCase(), value: bestVal };
  }, [character]);

  const topAttrs = useMemo(() => {
    if (!character) return [];
    return Object.keys(ATTRIBUTE_LABEL)
      .map((key) => ({ key, label: ATTRIBUTE_LABEL[key] || key, value: character[key] || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [character]);

  const attrBarMax = useMemo(() => {
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

  const facilities = useMemo(() => {
    if (!character) return [];
    const streak = character.currentStreak || 0;
    const opsReady = activeOps >= 3;
    const done = dailyProgress?.completedQuests || 0;
    const total = dailyProgress?.totalQuests || 0;
    const level = character.level ?? 1;
    const command = {
      id: 'command',
      name: 'Command Center',
      route: '/dashboard',
      icon: Castle,
      stat: `${level} /lvl`,
      kicker: 'Base core // systems online',
      badge: { status: 'active', label: 'Online' },
      lit: true,
      status: 'online',
      action: 'Enter Base',
    };
    const operations = {
      id: 'operations',
      name: 'Operations Room',
      route: '/quests',
      icon: Scroll,
      stat: `${activeOps} ACTIVE`,
      kicker: activeOps > 0 ? 'Deployments live on the board' : 'Command is clear',
      badge: {
        status: activeOps > 0 ? (opsReady ? 'active' : 'warning') : 'available',
        label: activeOps > 0 ? (opsReady ? 'Ready' : 'Low Activity') : 'Standby',
      },
      lit: activeOps > 0,
      status: activeOps > 0 ? 'active' : 'standby',
      deploy: { done, total },
      action: 'Enter War Room',
    };
    const training = {
      id: 'training',
      name: 'Training Bay',
      route: '/character',
      icon: Dumbbell,
      stat: `${topAttr.label} ${topAttr.value}`,
      kicker: 'Attributes // operator build',
      badge: { status: 'active', label: 'Online' },
      lit: true,
      status: 'online',
      bars: topAttrs,
      barMax: attrBarMax,
      action: 'Open Character',
    };
    const armory = {
      id: 'armory',
      name: 'Armory',
      route: '/loadout',
      icon: Swords,
      stat: `${equipped} EQUIPPED`,
      kicker: equipped > 0 ? 'Loadout engaged' : 'Equip gear in the loadout',
      badge: {
        status: equipped > 0 ? 'active' : 'available',
        label: equipped > 0 ? 'Active' : 'Available',
      },
      lit: equipped > 0,
      status: equipped > 0 ? 'active' : 'standby',
      action: 'Open Loadout',
    };
    const achievements = {
      id: 'achievements',
      name: 'Achievement Wall',
      route: '/achievements',
      icon: Trophy,
      stat: `${achUnlocked} / ${achTotal} UNLOCKED`,
      kicker: achUnlocked > 0 ? 'Achievements recorded' : 'Earn achievements through play',
      badge: {
        status: achUnlocked > 0 ? 'active' : 'available',
        label: achUnlocked > 0 ? 'Active' : 'Available',
      },
      lit: achUnlocked > 0,
      status: achUnlocked > 0 ? 'active' : 'standby',
      action: 'View Achievements',
    };
    const campaign = {
      id: 'campaign',
      name: 'Campaign Room',
      route: '/campaign',
      icon: CalendarDays,
      stat: streak > 0 ? `${streak}D STREAK` : 'AT READY',
      kicker: `${character.activeDays || 0} ACTIVE DAYS`,
      badge: {
        status: streak > 0 ? 'active' : 'available',
        label: streak > 0 ? 'Active' : 'Ready',
      },
      lit: streak > 0,
      status: streak > 0 ? 'active' : 'standby',
      action: 'Open Campaign',
    };
    const intel = {
      id: 'intel',
      name: 'Intel Hub',
      route: '/intel',
      icon: RadioTower,
      stat: headline ? 'INTEL // ONLINE' : 'INTEL // STANDBY',
      kicker: headline || 'No transmissions',
      badge: {
        status: headline ? 'active' : 'available',
        label: headline ? 'Online' : 'Standby',
      },
      lit: Boolean(headline),
      status: headline ? 'online' : 'standby',
      action: 'Open Intel',
    };
    return [command, operations, training, armory, achievements, campaign, intel];
  }, [character, activeOps, equipped, achUnlocked, achTotal, headline, topAttr, topAttrs, attrBarMax, dailyProgress]);

  const litCount = facilities.filter((f) => f.lit).length;

  const operatorName = user?.username || character?.displayName || 'Operator';
  const rank = character?.rank?.name || 'Operative';
  const tier = getOutpostTier(character?.level);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-3 min-w-0">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!loading && pageError) {
    return (
      <div className="mx-auto max-w-6xl min-w-0">
        <TacticalPanel variant="danger" className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <AlertCircle size={22} />
          </div>
          <p className="font-medium text-text">Outpost data unavailable.</p>
          <p className="text-sm text-text-2">{pageError}</p>
          <TacticalButton variant="steel" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </TacticalButton>
        </TacticalPanel>
      </div>
    );
  }

  if (!character) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-3 min-w-0">
      {/* 00 // OUTPOST ID */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <TacticalPanel brackets className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <HUDLabel tone="outpost">Outpost // Base</HUDLabel>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-ui text-3xl font-bold uppercase tracking-[0.08em] text-text sm:text-4xl">
                Outpost
              </h1>
              <span
                className={`rounded-[3px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${tier.tagClass}`}
              >
                {tier.label}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
              <OperatorMeta label="Operator" value={operatorName} />
              <OperatorMeta label="Rank" value={rank} />
              <OperatorMeta label="Level" value={String(character.level ?? '—')} />
              <div className="pb-0.5">
                <StatusBadge status="active" label="Status // Active" />
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm shrink-0">
            <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-text-2">
              <span className="uppercase tracking-[0.16em] text-text-3">Experience</span>
              <span className="tnum">
                <span className="font-semibold text-text">{character.xpIntoCurrentLevel}</span> /{' '}
                {character.xpRequiredForNextLevel}
              </span>
            </div>
            <ProgressBar
              value={character.xpIntoCurrentLevel}
              max={character.xpRequiredForNextLevel}
              color={character.xpIntoCurrentLevel >= character.xpRequiredForNextLevel ? 'success' : 'tact'}
            />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
              <span className="tnum">{character.progressPercentage}%</span> to level {character.level + 1}
            </p>
          </div>
        </TacticalPanel>
      </motion.div>

      {/* 01 // COMMAND CENTER */}
      <CommandCenter character={character} rank={rank} tier={tier} />

      {/* 02 // FACILITY NETWORK */}
      <TacticalPanel className="min-w-0">
        <SectionHeader
          index="02"
          title="Facility Network"
          tone="warning"
          action={
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-success"
                aria-hidden="true"
                style={reduced ? { animation: 'none' } : undefined}
              />
              Grid // {litCount}/{facilities.length} Lit
            </span>
          }
        />
        <div aria-label="Facility network" className="mt-3">
          <div className="hidden flex-wrap gap-2 lg:flex">
            {facilities.map((f) => {
              const FIcon = f.icon;
              return (
                <Link
                  key={f.id}
                  to={f.route}
                  className={[
                    'flex items-center gap-2 rounded-[4px] border px-2.5 py-1.5',
                    'font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-150',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tact',
                    f.lit
                      ? 'border-line bg-surface text-text-2 hover:border-warning/40 hover:text-text'
                      : 'border-line bg-surface-2/60 text-text-3 hover:border-line-2',
                  ].join(' ')}
                >
                  <FIcon size={12} className={f.lit ? 'text-warning' : ''} />
                  <span className="max-w-[130px] truncate">{f.name}</span>
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${f.lit ? 'bg-success' : 'bg-steel'}`}
                  />
                </Link>
              );
            })}
          </div>
          <ul className="space-y-2 lg:hidden">
            {facilities
              .filter((f) => f.id !== 'command')
              .map((f, i) => (
                <FacilityRow key={f.id} facility={f} index={i} glow={tier.facilityGlow} />
              ))}
          </ul>
        </div>
      </TacticalPanel>

      {/* 03 // OUTPOST STATUS */}
      <TacticalPanel brackets className="min-w-0">
        <SectionHeader index="03" title="Outpost Status" />
        <div className="mt-2 divide-y divide-line">
          <StatusRow label="Base Tier" value={tier.label} />
          <StatusRow label="Level" value={String(character.level ?? '—')} />
          <StatusRow label="Rank" value={rank} />
          <StatusRow label="Current Streak" value={`${character.currentStreak ?? 0}d`} />
          <StatusRow label="Active Operations" value={String(activeOps)} />
          <StatusRow label="Achievements" value={`${achUnlocked} / ${achTotal}`} />
          <StatusRow label="Equipped" value={String(equipped)} />
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
            Grid Illumination
          </span>
          <StatusBadge
            status={litCount >= 4 ? 'active' : 'warning'}
            label={`${litCount} / ${facilities.length} Facilities Lit`}
          />
        </div>
      </TacticalPanel>

      {/* 04 // LATEST FIELD ACTIVITY */}
      <TacticalPanel className="min-w-0">
        <SectionHeader
          index="04"
          title="Latest Field Activity"
          action={
            <Link
              to="/history"
              className="flex shrink-0 items-center gap-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-tact hover:text-tact-2"
            >
              Full
              <ArrowRight size={11} />
            </Link>
          }
        />
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-text-3">No field activity recorded yet.</p>
        ) : (
          <div className="mt-2 divide-y divide-line">
            {activity.map((e) => (
              <div key={e.id} className="flex items-start gap-2.5 py-2.5">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tact/70" />
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug text-text-2">{e.description}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-3">
                    {timeAgo(e.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </TacticalPanel>
    </div>
  );
}