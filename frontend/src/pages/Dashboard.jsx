import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Zap,
  Coins,
  Flame,
  TrendingUp,
  Inbox,
  AlertCircle,
  Crosshair,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useQuestCompletion } from '../hooks/useQuestCompletion';
import { timeAgo } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Toast from '../components/ui/Toast';
import CompletionModal from '../components/CompletionModal';

const ATTRIBUTES = [
  { key: 'intellect', label: 'Intellect', dot: 'bg-intellect' },
  { key: 'strength', label: 'Strength', dot: 'bg-strength' },
  { key: 'discipline', label: 'Discipline', dot: 'bg-discipline' },
  { key: 'creativity', label: 'Creativity', dot: 'bg-creativity' },
  { key: 'social', label: 'Social', dot: 'bg-social' },
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

const DIFFICULTY_BADGE = {
  EASY: 'default',
  MEDIUM: 'gold',
  HARD: 'red',
};

function StatCard({ label, icon: Icon, iconClass = 'text-text-2', children }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-text-2">
        <Icon size={15} className={iconClass} />
        {label}
      </div>
      <div className="min-h-[30px]">{children}</div>
    </Card>
  );
}

function ActivityEntry({ entry }) {
  const leveledUp = entry.levelAfter > entry.levelBefore;
  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          leveledUp ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-text-3'
        }`}
      >
        {leveledUp ? <TrendingUp size={15} /> : <Zap size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text">{entry.description}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[13px] text-text-2">
          {entry.xpChange > 0 && <span className="tnum">+{entry.xpChange} XP</span>}
          {entry.goldChange > 0 && <span className="tnum text-warning">+{entry.goldChange} gold</span>}
          {entry.attributeChange > 0 && (
            <span className="text-accent">
              +{entry.attributeChange} {entry.attributeType}
            </span>
          )}
          {leveledUp && (
            <span className="text-accent">
              Level {entry.levelBefore} &rarr; {entry.levelAfter}
            </span>
          )}
        </p>
      </div>
      <span className="shrink-0 pt-0.5 text-xs text-text-3">{timeAgo(entry.createdAt)}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [character, setCharacter] = useState(null);
  const [quests, setQuests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState(null);

  const { completingId, result: completionResult, completeQuest, clearResult } = useQuestCompletion({
    onComplete: () => setReloadKey((k) => k + 1),
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.all([
      api.get('/character'),
      api.get('/quests', { params: { status: 'active' } }),
      api.get('/activity', { params: { limit: 6 } }),
    ])
      .then(([ch, qs, act]) => {
        if (cancelled) return;
        setCharacter(ch.data.data.character);
        setQuests(qs.data.data.quests);
        setActivity(act.data.data.items);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not load your dashboard. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function notify(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function handleComplete(quest) {
    try {
      await completeQuest(quest);
    } catch (err) {
      notify(err.response?.data?.error || 'Could not complete the quest.', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Welcome back, ${user?.username}`}
        description="Here is where your day comes together."
        actions={
          <Link to="/quests">
            <Button>
              <Plus size={16} />
              New quest
            </Button>
          </Link>
        }
      />

      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      )}

      {!loading && pageError && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <AlertCircle size={22} />
          </div>
          <p className="font-medium text-text">{pageError}</p>
          <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </Button>
        </Card>
      )}

      {!loading && !pageError && character && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Level" icon={Crosshair} iconClass="text-accent">
              <p className="tnum text-3xl font-semibold tracking-tight text-text">{character.level}</p>
            </StatCard>

            <StatCard label="XP" icon={Zap} iconClass="text-accent">
              <div className="space-y-1.5 pt-1">
                <div className="xp-track">
                  <div
                    className="xp-fill"
                    style={{ width: `${Math.min(100, character.progressPercentage)}%` }}
                  />
                </div>
                <p className="text-[13px] text-text-2">
                  {character.xpRequiredForNextLevel - character.xpIntoCurrentLevel} XP to next level
                </p>
              </div>
            </StatCard>

            <StatCard label="Gold" icon={Coins} iconClass="text-warning">
              <p className="tnum text-3xl font-semibold tracking-tight text-text">{character.gold}</p>
            </StatCard>

            <StatCard label="Day streak" icon={Flame} iconClass="text-warning">
              <p className="tnum text-3xl font-semibold tracking-tight text-text">{character.currentStreak}</p>
              <p className="text-[13px] text-text-2">Longest {character.longestStreak}</p>
            </StatCard>
          </div>

          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-text">Attributes</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {ATTRIBUTES.map(({ key, label, dot }) => (
                <div key={key} className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                  <div className="min-w-0">
                    <p className="text-[13px] text-text-2">{label}</p>
                    <p className="tnum text-lg font-semibold tracking-tight text-text">{character[key]}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight text-text">Active quests</h2>
                <span className="text-xs text-text-3">{quests.length}</span>
              </div>

              <div className="mt-2 divide-y divide-line">
                {quests.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-text-3">
                      <Inbox size={18} />
                    </div>
                    <p className="text-sm text-text-2">No active quests yet.</p>
                    <Link to="/quests" className="text-[13px] font-medium text-accent hover:text-accent-2">
                      Create your first quest
                    </Link>
                  </div>
                )}
                {quests.map((q) => (
                  <div key={q.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{q.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <Badge variant="default">{CATEGORY_LABEL[q.category] || q.category}</Badge>
                        <Badge variant={DIFFICULTY_BADGE[q.difficulty] || 'default'}>
                          {q.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={completingId === q.id}
                      onClick={() => handleComplete(q)}
                    >
                      Complete
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight text-text">Recent activity</h2>
                <Link
                  to="/history"
                  className="flex items-center gap-0.5 text-xs font-medium text-accent hover:text-accent-2"
                >
                  View all
                  <ArrowRight size={12} />
                </Link>
              </div>

              <div className="mt-1 divide-y divide-line">
                {activity.length === 0 && (
                  <p className="py-8 text-center text-sm text-text-2">No activity yet. Complete a quest to get started.</p>
                )}
                {activity.map((entry) => (
                  <ActivityEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      <CompletionModal result={completionResult} onClose={clearResult} />
      <Toast
        message={toast?.message}
        type={toast?.type}
        isVisible={!!toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}