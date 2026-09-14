import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Zap,
  Coins,
  Flame,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Trophy,
  Crosshair,
  CalendarDays,
  RadioTower,
  Castle,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/format';
import { playSound } from '../utils/sound';
import { useFocusTimer } from '../hooks/useFocusTimer';
import FocusTimerPanel from '../components/focus/FocusTimerPanel';
import Skeleton from '../components/ui/Skeleton';
import AuthenticatedHero from '../components/dashboard/AuthenticatedHero';
import {
  TacticalPanel,
  HUDLabel,
  StatBar,
  StatusBadge,
  SectionHeader,
  ProgressBar,
  RankBadge,
  TacticalButton,
  tacticalButtonClasses,
} from '../components/tactical';

const ATTRIBUTES = [
  { key: 'intellect', label: 'Intellect', color: 'intellect' },
  { key: 'strength', label: 'Strength', color: 'strength' },
  { key: 'discipline', label: 'Discipline', color: 'discipline' },
  { key: 'creativity', label: 'Creativity', color: 'creativity' },
  { key: 'social', label: 'Social', color: 'social' },
];

const CATEGORY_LABEL = {
  STUDY: 'Study',
  CODING: 'Coding',
  FITNESS: 'Fitness',
  HEALTH: 'Health',
  CREATIVE: 'Creative',
  SOCIAL: 'Social',
  PERSONAL: 'Personal',
};

function HudCell({ label, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <HUDLabel tone="steel">{label}</HUDLabel>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function TopHud({ character, username }) {
  const reduced = useReducedMotion();
  const xpInto = character.xpIntoCurrentLevel ?? 0;
  const xpNeed = character.xpRequiredForNextLevel ?? 1;

  return (
    <div className="tact-clip border border-line bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-steel">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" style={reduced ? { animation: 'none' } : undefined} />
          System // Online
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-text-3 sm:inline">
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-3 lg:grid-cols-6">
        <HudCell label="Operator" className="col-span-2 sm:col-span-1">
          <p className="truncate font-mono text-sm text-text">{username}</p>
        </HudCell>
        <HudCell label="Rank">
          <RankBadge rankName={character.rank?.name || 'Operative'} level={character.level ?? 1} />
        </HudCell>
        <HudCell label="Level">
          <p className="tnum font-display text-xl leading-none text-text">
            {character.level ?? '—'}
          </p>
        </HudCell>
        <HudCell label="XP">
          <p className="tnum font-mono text-sm text-text">
            {xpInto}
            <span className="text-text-3"> / {xpNeed}</span>
          </p>
          <ProgressBar value={xpInto} max={xpNeed} color="tact" className="mt-1.5" />
        </HudCell>
        <HudCell label="Streak">
          <p className="tnum flex items-center gap-1.5 font-mono text-sm text-text">
            <Flame size={14} className="text-tact" />
            {character.currentStreak ?? 0}
            <span className="text-text-3">d</span>
          </p>
        </HudCell>
        <HudCell label="Gold">
          <p className="flex items-center gap-1.5 font-mono text-sm text-text">
            <Coins size={14} className="text-warning" />
            {character.gold?.toLocaleString() ?? '—'}
          </p>
        </HudCell>
      </div>
    </div>
  );
}

function ActivityEntry({ entry }) {
  const leveledUp = entry.levelAfter > entry.levelBefore;
  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border ${
          leveledUp ? 'border-warning/30 bg-warning/5 text-warning' : 'border-line bg-surface-2 text-steel'
        }`}
      >
        {leveledUp ? <TrendingUp size={15} /> : <Zap size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text">{entry.description}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono text-[11px] text-text-3">
          {entry.xpChange > 0 && <span className="tnum text-tact">+{entry.xpChange} XP</span>}
          {entry.goldChange > 0 && <span className="tnum text-warning">+{entry.goldChange} GOLD</span>}
          {entry.attributeChange > 0 && (
            <span className="tnum">
              +{entry.attributeChange} {entry.attributeType}
            </span>
          )}
          {leveledUp && (
            <span className="tnum text-warning">
              LVL {entry.levelBefore}&rarr;{entry.levelAfter}
            </span>
          )}
        </p>
      </div>
      <span className="shrink-0 pt-0.5 font-mono text-xs text-text-3">{timeAgo(entry.createdAt)}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [character, setCharacter] = useState(null);
  const [dailyProgress, setDailyProgress] = useState(null);
  const [quests, setQuests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [intelItems, setIntelItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const focusTimer = useFocusTimer();

  // Established focus-session completion sound (ships with the app, unused until now).
  useEffect(() => {
    if (focusTimer.justCompleted) playSound('focus-complete');
  }, [focusTimer.justCompleted]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.all([
      api.get('/character'),
      api.get('/quests', { params: { status: 'active' } }),
      api.get('/activity', { params: { limit: 6 } }),
      api.get('/achievements'),
      api.get('/calendar', { params: { days: 7 } }),
    ])
      .then(([ch, qs, act, ach, cal]) => {
        if (cancelled) return;
        setCharacter(ch.data.data.character);
        setDailyProgress(ch.data.data.dailyProgress);
        setQuests(qs.data.data.quests);
        setActivity(act.data.data.items);
        setAchievements(ach.data.data.achievements);
        setCalendarDays(cal.data.data.calendar);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not load your command center. Make sure the API is running.');
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
    setIntelItems([]);
    api
      .get('/intel', { params: { limit: 3 } })
      .then((res) => {
        if (!cancelled) setIntelItems(res.data.data.items || []);
      })
      .catch(() => {
        if (!cancelled) setIntelItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const arcSegments = dailyProgress?.totalQuests > 0 ? dailyProgress.totalQuests : 4;

  const focusQuestTitle = focusTimer.session?.questId
    ? quests.find((q) => q.id === focusTimer.session.questId)?.title || null
    : null;
  const showFocusPanel = Boolean(focusTimer.session || focusTimer.justCompleted);

  return (
    <div className="dash-page">
      <div className="dash-hero-wrap">
        <AuthenticatedHero character={character} dailyProgress={dailyProgress} loading={loading} />
      </div>

      <div className="mx-auto max-w-6xl">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        )}

        {!loading && pageError && (
          <TacticalPanel variant="danger" className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <AlertCircle size={22} />
            </div>
            <p className="font-medium text-text">{pageError}</p>
            <TacticalButton variant="steel" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </TacticalButton>
          </TacticalPanel>
        )}

        {!loading && !pageError && character && (
          <div className="space-y-3">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <TopHud character={character} username={user?.username} />
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04 }}
            >
              <TacticalPanel brackets>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-warning/30 bg-warning/10 text-warning">
                      <Castle size={16} />
                    </div>
                    <div>
                      <HUDLabel tone="steel">Outpost // Base</HUDLabel>
                      <p className="text-sm text-text-2">Your operational headquarters.</p>
                    </div>
                  </div>
                  <Link
                    to="/outpost"
                    className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-tact hover:text-tact-2"
                  >
                    Enter Outpost
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </TacticalPanel>
            </motion.div>

            {achievements.length > 0 && (() => {
              const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
              const total = achievements.length;
              return (
                <TacticalPanel>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-warning/30 bg-warning/10 text-warning">
                        <Trophy size={16} />
                      </div>
                      <div>
                        <HUDLabel tone="steel">Achievement // Records</HUDLabel>
                        <p className="text-sm text-text-2">
                          <span className="tnum font-semibold text-text">{unlockedCount}</span>
                          <span className="text-text-3"> / {total} unlocked</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden w-24 sm:block">
                        <ProgressBar value={unlockedCount} max={Math.max(1, total)} color="warning" />
                      </div>
                      <Link
                        to="/achievements"
                        className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-tact hover:text-tact-2"
                      >
                        View
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </TacticalPanel>
              );
            })()}

            {calendarDays.length > 0 && (() => {
              const active = calendarDays.filter(
                (d) => d.quests > 0 || d.focusSeconds > 0 || d.routines > 0 || d.goals > 0
              ).length;
              const monthLabel = new Date().toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
              return (
                <TacticalPanel>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-line bg-surface-2 text-steel">
                        <CalendarDays size={16} />
                      </div>
                      <div>
                        <HUDLabel tone="steel">Campaign // {monthLabel}</HUDLabel>
                        <p className="text-sm text-text-2">
                          <span className="tnum font-semibold text-text">{character?.currentStreak ?? 0}d</span>
                          <span className="text-text-3"> streak · {active} active in 7</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden items-center gap-1 sm:flex">
                        {calendarDays.map((d) => {
                          const isActive = d.quests > 0 || d.focusSeconds > 0 || d.routines > 0 || d.goals > 0;
                          return (
                            <span
                              key={d.date}
                              aria-hidden="true"
                              className={`h-2 w-2 rounded-full ${isActive ? 'bg-warning' : 'bg-surface-3/50'}`}
                            />
                          );
                        })}
                      </div>
                      <Link
                        to="/campaign"
                        className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-tact hover:text-tact-2"
                      >
                        View
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </TacticalPanel>
              );
            })()}

            {intelItems.length > 0 && (
              <TacticalPanel>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-info/30 bg-info/10 text-info">
                      <RadioTower size={16} />
                    </div>
                    <div>
                      <HUDLabel tone="steel">Intel // Briefing</HUDLabel>
                      <p className="text-sm text-text-3">Latest field transmissions</p>
                    </div>
                  </div>
                  <Link
                    to="/intel"
                    className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-tact hover:text-tact-2"
                  >
                    Open
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="mt-2 divide-y divide-line">
                  {intelItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-3 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] text-text-2 group-hover:text-tact">
                          {item.title}
                        </span>
                        <ExternalLink
                          size={12}
                          className="shrink-0 text-text-3 transition-colors group-hover:text-tact"
                        />
                      </span>
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-steel">
                        {item.category}
                      </span>
                    </a>
                  ))}
                </div>
              </TacticalPanel>
            )}

            {showFocusPanel && (
              <FocusTimerPanel timer={focusTimer} questTitle={focusQuestTitle} />
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <TacticalPanel brackets className="order-2 md:order-1">
                <SectionHeader index="01" title="Attributes" />
                <div className="mt-4 space-y-4">
                  {ATTRIBUTES.map(({ key, label, color }) => (
                    <div key={key}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <HUDLabel tone="steel">{label}</HUDLabel>
                        <span className="tnum font-mono text-sm text-text">{character[key] ?? 0}</span>
                      </div>
                      <StatBar value={character[key] ?? 0} max={100} color={color} showValue={false} />
                    </div>
                  ))}
                </div>
              </TacticalPanel>

              <TacticalPanel brackets className="order-1 md:order-2">
                <SectionHeader
                  index="02"
                  title="Active Operations"
                  action={
                    <Link to="/quests" className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-tact hover:text-tact-2">
                      War Room
                      <ArrowRight size={12} />
                    </Link>
                  }
                />
                <div className="mt-3 divide-y divide-line">
                  {quests.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-line bg-surface-2 text-steel">
                        <Crosshair size={18} />
                      </div>
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-2">
                          No active operations
                        </p>
                      </div>
                      <Link to="/quests" className={tacticalButtonClasses('ghost', 'sm')}>
                        Open War Room
                      </Link>
                    </div>
                  )}
                  {quests.length > 0 && (
                    <>
                      <div className="mt-1.5 mb-1">
                        <StatusBadge status="active" label={`${quests.length} Active`} />
                      </div>
                      {quests.slice(0, 3).map((q) => (
                        <Link key={q.id} to="/quests" className="group flex items-center justify-between gap-3 py-2.5">
                          <span className="min-w-0 truncate text-sm text-text-2 group-hover:text-tact">
                            {q.title}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
                            {CATEGORY_LABEL[q.category] || q.category}
                          </span>
                        </Link>
                      ))}
                      {quests.length > 3 && (
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                          +{quests.length - 3} more in the war room
                        </p>
                      )}
                    </>
                  )}
                </div>
              </TacticalPanel>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TacticalPanel>
                <SectionHeader index="03" title="Daily Operations" />
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <HUDLabel tone="steel">Today&apos;s Arc</HUDLabel>
                      <span className="font-mono text-xs text-text">
                        <b className="tnum text-base text-text">{dailyProgress?.completedQuests ?? 0}</b>
                        <span className="text-text-3"> / {dailyProgress?.totalQuests ?? 0} complete</span>
                      </span>
                    </div>
                    <ProgressBar
                      value={dailyProgress?.completedQuests ?? 0}
                      max={Math.max(1, dailyProgress?.totalQuests ?? 1)}
                      color={dailyProgress?.isComplete ? 'success' : 'tact'}
                      segments={arcSegments}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-line pt-4">
                    <div>
                      <HUDLabel tone="steel">XP Earned</HUDLabel>
                      <p className="tnum mt-1 font-mono text-sm text-tact">
                        +{dailyProgress?.xpEarned ?? 0}
                      </p>
                    </div>
                    <div>
                      <HUDLabel tone="steel">Gold</HUDLabel>
                      <p className="tnum mt-1 font-mono text-sm text-warning">
                        +{dailyProgress?.goldEarned ?? 0}
                      </p>
                    </div>
                    <div>
                      <HUDLabel tone="steel">Streak</HUDLabel>
                      <p className="tnum mt-1 flex items-center gap-1 font-mono text-sm text-text">
                        <Flame size={13} className="text-tact" />
                        {character.currentStreak ?? 0}d
                      </p>
                    </div>
                  </div>
                </div>
              </TacticalPanel>

              <TacticalPanel>
                <SectionHeader
                  index="04"
                  title="Progression"
                  action={
                    <Link
                      to="/history"
                      className="flex items-center gap-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-tact hover:text-tact-2"
                    >
                      View all
                      <ArrowRight size={12} />
                    </Link>
                  }
                />
                <div className="mt-2 divide-y divide-line">
                  {activity.length === 0 && (
                    <p className="py-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-text-3">
                      No activity yet. Complete an operation.
                    </p>
                  )}
                  {activity.map((entry) => (
                    <ActivityEntry key={entry.id} entry={entry} />
                  ))}
                </div>
              </TacticalPanel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}