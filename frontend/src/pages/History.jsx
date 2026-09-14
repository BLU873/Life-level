import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Coins, TrendingUp, Flame, AlertCircle, Clock, Trophy, Crosshair } from 'lucide-react';
import api from '../services/api';
import { timeAgo } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { TacticalPanel, TacticalButton, tacticalButtonClasses } from '../components/tactical';

const DIFFICULTY_BADGE = {
  EASY: 'default',
  MEDIUM: 'gold',
  HARD: 'red',
};

function HistoryRow({ entry }) {
  const leveledUp = entry.levelAfter > entry.levelBefore;
  const streakChanged = entry.streakBefore !== entry.streakAfter;
  let metadata = null;
  try {
    metadata = entry.metadata ? JSON.parse(entry.metadata) : null;
  } catch {
    metadata = null;
  }

  const isAchievementUnlock = entry.type === 'ACHIEVEMENT_UNLOCK';

  return (
    <div className="flex items-start gap-3 py-3.5">
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isAchievementUnlock
            ? 'bg-warning/10 text-warning'
            : leveledUp
              ? 'bg-accent/10 text-accent'
              : 'bg-surface-2 text-text-3'
        }`}
      >
        {isAchievementUnlock ? <Trophy size={16} /> : leveledUp ? <TrendingUp size={16} /> : <Zap size={16} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium text-text">{entry.description}</p>
          {isAchievementUnlock && <Badge variant="gold">Achievement</Badge>}
          {!isAchievementUnlock && metadata?.difficulty && (
            <Badge variant={DIFFICULTY_BADGE[metadata.difficulty] || 'default'}>{metadata.difficulty}</Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-text-2">
          {!isAchievementUnlock && entry.xpChange > 0 && <span className="tnum">+{entry.xpChange} XP</span>}
          {!isAchievementUnlock && entry.goldChange > 0 && (
            <span className="tnum inline-flex items-center gap-1 text-warning">
              <Coins size={13} />
              +{entry.goldChange}
            </span>
          )}
          {!isAchievementUnlock && entry.attributeChange > 0 && entry.attributeType && (
            <span className="text-accent">
              +{entry.attributeChange} {entry.attributeType}
            </span>
          )}
          {!isAchievementUnlock && leveledUp && (
            <span className="tnum text-accent">
              Level {entry.levelBefore} &rarr; {entry.levelAfter}
            </span>
          )}
          {!isAchievementUnlock && streakChanged && (
            <span className="tnum inline-flex items-center gap-1 text-warning">
              <Flame size={13} />
              streak {entry.streakBefore} &rarr; {entry.streakAfter}
            </span>
          )}
        </div>
      </div>

      <span className="shrink-0 pt-0.5 text-xs text-text-3">{timeAgo(entry.createdAt)}</span>
    </div>
  );
}

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    api
      .get('/activity', { params: { limit: 50 } })
      .then((res) => {
        if (!cancelled) setItems(res.data.data.items);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not load your activity. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Activity // Record"
        title="Activity"
        description="Every operation you have completed, newest first."
      />

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!loading && pageError && (
        <TacticalPanel variant="danger" className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <AlertCircle size={22} />
          </div>
          <p className="font-medium text-text">{pageError}</p>
          <TacticalButton variant="steel" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </TacticalButton>
        </TacticalPanel>
      )}

      {!loading && !pageError && items.length === 0 && (
        <TacticalPanel className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-text-3">
            <Clock size={22} />
          </div>
          <p className="font-medium text-text">No activity yet</p>
          <p className="max-w-xs text-sm text-text-2">
            Complete an operation and your earned XP, gold and attribute gains will show up here.
          </p>
          <Link to="/quests" className={tacticalButtonClasses('ghost', 'sm')}>
            <Crosshair size={13} />
            Open War Room
          </Link>
        </TacticalPanel>
      )}

      {!loading && !pageError && items.length > 0 && (
        <TacticalPanel brackets className="flex flex-col divide-y divide-line">
          {items.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} />
          ))}
        </TacticalPanel>
      )}
    </div>
  );
}