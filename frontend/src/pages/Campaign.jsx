import { useState, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CalendarDays } from 'lucide-react';
import api from '../services/api';
import Skeleton from '../components/ui/Skeleton';
import {
  TacticalPanel,
  HUDLabel,
  SectionHeader,
  RankBadge,
  TacticalButton,
} from '../components/tactical';
import CampaignCalendar, { dayKey, startOfMonth, addMonths } from '../components/campaign/CampaignCalendar';
import CampaignDayDetail from '../components/campaign/CampaignDayDetail';

const CALENDAR_WINDOW = 366;
const EARN_TYPES = new Set(['QUEST_COMPLETION', 'GOAL_CLAIM', 'ROUTINE_COMPLETE', 'FOCUS_COMPLETE']);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isActiveDay(entry) {
  return !!entry && (entry.quests > 0 || entry.focusSeconds > 0 || entry.routines > 0 || entry.goals > 0);
}

function deriveState(key, entry, todayKey, windowStartKey) {
  if (key > todayKey) return 'future';
  if (key === todayKey) return todayKey >= windowStartKey ? 'today' : 'missed';
  if (key < windowStartKey) return 'outside';
  return isActiveDay(entry) ? 'active' : 'missed';
}

function groupActivity(items) {
  const map = new Map();
  for (const item of items) {
    const key = dayKey(new Date(item.createdAt));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function groupAchievements(items) {
  const map = new Map();
  for (const item of items) {
    if (!item.unlockedAt) continue;
    const key = dayKey(new Date(item.unlockedAt));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function HeaderCell({ label, value, accent = 'text-text' }) {
  return (
    <div className="min-w-0">
      <HUDLabel tone="steel">{label}</HUDLabel>
      <p className={`tnum mt-1 font-mono text-lg leading-none ${accent}`}>{value}</p>
    </div>
  );
}

export default function Campaign() {
  const reduced = useReducedMotion();
  const [calendarDays, setCalendarDays] = useState([]);
  const [character, setCharacter] = useState(null);
  const [activity, setActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [viewedMonth, setViewedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.all([
      api.get('/calendar', { params: { days: CALENDAR_WINDOW } }),
      api.get('/character'),
      api.get('/activity', { params: { limit: 100 } }),
      api.get('/achievements'),
    ])
      .then(([calRes, chRes, actRes, achRes]) => {
        if (cancelled) return;
        setCalendarDays(calRes.data.data.calendar);
        setCharacter(chRes.data.data.character);
        setActivity(actRes.data.data.items);
        setAchievements(achRes.data.data.achievements);
        const todayKey = dayKey(new Date());
        setSelectedDay((prev) => prev || todayKey);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not load campaign record. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const todayKey = dayKey(new Date());
  const windowStartKey = calendarDays.length > 0 ? calendarDays[0].date : todayKey;
  const calendarMap = useMemo(() => new Map(calendarDays.map((d) => [d.date, d])), [calendarDays]);
  const activityByDay = useMemo(() => groupActivity(activity), [activity]);
  const achievementsByDay = useMemo(() => groupAchievements(achievements), [achievements]);

  const windowStartDate = calendarDays.length > 0 ? new Date(`${windowStartKey}T12:00:00`) : startOfMonth(new Date());
  const earliestMonth = startOfMonth(windowStartDate);
  const canGoPrev = startOfMonth(viewedMonth).getTime() > earliestMonth.getTime();
  const canGoNext = viewedMonth.getTime() < startOfMonth(new Date()).getTime();

  const selectedEntry = selectedDay ? calendarMap.get(selectedDay) : null;
  const selectedState = selectedDay ? deriveState(selectedDay, selectedEntry, todayKey, windowStartKey) : null;
  const selectedRows = selectedDay ? (activityByDay.get(selectedDay) || []) : [];
  const selectedAchievements = selectedDay ? (achievementsByDay.get(selectedDay) || []) : [];

  const monthStats = useMemo(() => {
    const y = viewedMonth.getFullYear();
    const m = viewedMonth.getMonth();
    const within = (key) => {
      const [yy, mm] = key.split('-').map(Number);
      return yy === y && mm === m + 1;
    };

    let activeDays = 0;
    let missed = 0;
    let operations = 0;
    let focusSeconds = 0;
    let routines = 0;
    let goals = 0;

    for (const d of calendarDays) {
      if (!within(d.date)) continue;
      if (isActiveDay(d)) activeDays += 1;
      else if (d.date < todayKey) missed += 1;
      operations += d.quests;
      focusSeconds += d.focusSeconds;
      routines += d.routines;
      goals += d.goals;
    }

    const unlockedThisMonth = achievements.filter((a) => a.unlockedAt && within(dayKey(new Date(a.unlockedAt)))).length;

    let xp = null;
    if (activeDays === 0) {
      xp = 0;
    } else {
      const activeDates = calendarDays.filter((d) => within(d.date) && isActiveDay(d));
      const covered = activeDates.every((d) => (activityByDay.get(d.date) || []).length > 0);
      if (covered) {
        xp = activeDates.reduce((sum, d) => {
          const rows = activityByDay.get(d.date) || [];
          return sum + rows.reduce((s, r) => (EARN_TYPES.has(r.type) ? s + (r.xpChange || 0) : s), 0);
        }, 0);
      }
    }

    return {
      activeDays,
      missed,
      operations,
      focusMinutes: Math.round(focusSeconds / 60),
      routines,
      goals,
      unlockedThisMonth,
      xp,
      xpAvailable: xp !== null,
    };
  }, [calendarDays, viewedMonth, todayKey, achievements, activityByDay]);

  const monthLabel = `${MONTH_NAMES[viewedMonth.getMonth()].toUpperCase()} // ${viewedMonth.getFullYear()}`;

  return (
    <div className="mx-auto max-w-6xl">
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-3 md:grid-cols-[1fr_360px]">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
          <Skeleton className="h-32 w-full" />
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
            transition={{ duration: 0.3 }}
          >
            <TacticalPanel>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-warning/30 bg-warning/10 text-warning">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <h1 className="font-ui text-sm font-semibold uppercase tracking-[0.2em] text-text">
                      Campaign // Log
                    </h1>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                      {monthLabel}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  <HeaderCell label="Current Streak" value={`${character.currentStreak ?? 0}d`} accent="text-tact" />
                  <HeaderCell label="Longest Streak" value={`${character.longestStreak ?? 0}d`} accent="text-tact" />
                  <HeaderCell label="Campaign Days" value={character.activeDays ?? 0} accent="text-text" />
                  <div className="min-w-0">
                    <HUDLabel tone="steel">Level</HUDLabel>
                    <div className="mt-1">
                      <RankBadge rankName={character.rank?.name || 'Operative'} level={character.level ?? 1} />
                    </div>
                  </div>
                </div>
              </div>
            </TacticalPanel>
          </motion.div>

          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
            <CampaignCalendar
              calendarMap={calendarMap}
              viewedMonth={viewedMonth}
              selectedDay={selectedDay}
              windowStartKey={windowStartKey}
              todayKey={todayKey}
              onSelectDay={setSelectedDay}
              onPrevMonth={() => setViewedMonth((m) => addMonths(m, -1))}
              onNextMonth={() => setViewedMonth((m) => addMonths(m, 1))}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
            />

            {selectedDay && (
              <CampaignDayDetail
                dateKey={selectedDay}
                state={selectedState}
                calendarEntry={selectedEntry}
                activityRows={selectedRows}
                achievements={selectedAchievements}
              />
            )}
          </div>

          <TacticalPanel brackets>
            <SectionHeader index="01" title="Monthly Diagnostic" tone="warning" />
            {monthStats.activeDays === 0 && (
              <p className="mt-3 rounded-[6px] border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-text-3">
                No field activity recorded this month.
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 md:grid-cols-7">
              <HeaderCell label="Active Days" value={monthStats.activeDays} accent="text-tact" />
              <HeaderCell label="Missed Days" value={monthStats.missed} accent="text-text-3" />
              <HeaderCell label="Operations" value={monthStats.operations} accent="text-text" />
              <HeaderCell label="Focus Time" value={`${monthStats.focusMinutes}m`} accent="text-text" />
              <HeaderCell label="Routines" value={monthStats.routines} accent="text-text" />
              <HeaderCell label="Achievements" value={monthStats.unlockedThisMonth} accent="text-warning" />
              <HeaderCell
                label="Month XP"
                value={monthStats.xpAvailable ? `+${(monthStats.xp ?? 0).toLocaleString()}` : '—'}
                accent="text-tact"
              />
            </div>
          </TacticalPanel>
        </div>
      )}
    </div>
  );
}