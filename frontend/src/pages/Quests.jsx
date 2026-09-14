import { useState, useEffect, useMemo, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  Crosshair,
  AlertCircle,
  Inbox,
  Flame,
  Coins,
  CalendarClock,
  Trash2,
} from 'lucide-react';
import api from '../services/api';
import { playSound } from '../utils/sound';
import { useQuestCompletion } from '../hooks/useQuestCompletion';
import { isFocusConflict, focusConflictMessage } from '../hooks/useFocusTimer';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import Toast from '../components/ui/Toast';
import CompletionModal from '../components/CompletionModal';
import OperationCard from '../components/operations/OperationCard';
import {
  TacticalPanel,
  HUDLabel,
  StatusBadge,
  SectionHeader,
  ProgressBar,
  TacticalButton,
} from '../components/tactical';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  DIFFICULTIES,
  ATTRIBUTE_LABEL,
} from '../components/operations/constants';

const ATTRIBUTE_ORDER = ['intellect', 'strength', 'discipline', 'creativity', 'social'];

function HudCell({ label, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <HUDLabel tone="steel">{label}</HUDLabel>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Select({ label, error, className = '', children, ...props }) {
  const selectId = useId();
  const errorId = useId();
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={selectId} className="block font-mono text-[11px] uppercase tracking-[0.18em] text-steel">{label}</label>}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`
          h-10 w-full rounded-[4px] border border-line bg-surface px-3.5 text-sm text-text
          transition-all duration-150
          focus:border-tact/60 focus:outline-none focus:ring-2 focus:ring-tact/25
          ${error ? 'border-danger focus:border-danger focus:ring-danger/25' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <p id={errorId} className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

const FOCUS_PRESETS = [15, 25, 45, 60, 90];

function OperationFormModal({ mode, quest, onClose, onSaved, notify }) {
  const [title, setTitle] = useState(quest?.title ?? '');
  const [description, setDescription] = useState(quest?.description ?? '');
  const [category, setCategory] = useState(quest?.category ?? 'STUDY');
  const [difficulty, setDifficulty] = useState(quest?.difficulty ?? 'EASY');
  const [isRecurring, setIsRecurring] = useState(quest?.isRecurring ?? false);
  const [focusEnabled, setFocusEnabled] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Operation title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { title: title.trim(), description: description.trim(), category, difficulty, isRecurring };
      if (mode === 'edit') {
        // Editing never starts, resets or touches a focus timer.
        await api.put(`/quests/${quest.id}`, payload);
        notify('Operation updated.');
      } else {
        const created = (await api.post('/quests', payload)).data.data.quest;
        playSound('operation-created');
        // The timer starts ONLY after the operation was created successfully.
        let message = 'Operation created.';
        let messageType = 'success';
        if (focusEnabled) {
          try {
            await api.post('/focus', {
              plannedSeconds: focusMinutes * 60,
              questId: created.id,
            });
            message = `Operation created. Focus timer started (${focusMinutes} MIN).`;
          } catch (focusErr) {
            message = isFocusConflict(focusErr)
              ? `Operation created. ${focusConflictMessage()}`
              : 'Operation created. Focus timer could not start.';
            messageType = 'error';
          }
        }
        notify(message, messageType);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || (mode === 'edit' ? 'Could not update the operation.' : 'Could not create the operation.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'edit' ? 'Edit operation' : 'Create operation'}
      description={
        mode === 'edit'
          ? 'Update operation parameters. Rewards are recalculated from category and difficulty.'
          : 'Rewards are calculated from category and difficulty.'
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <div role="alert" className="rounded-[4px] border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">{error}</div>
        )}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Finish the API docs"
          maxLength={120}
          autoFocus
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this operation involve?"
          maxLength={500}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Operation class" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-2 select-none">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-line bg-surface accent-tact"
          />
          Recurring operation
        </label>
        {mode === 'create' && (
          <div className="space-y-2.5 rounded-[4px] border border-line bg-surface-2/50 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span id="focus-timer-label" className="font-mono text-[11px] uppercase tracking-[0.18em] text-steel">
                Focus timer
              </span>
              <div className="flex rounded-[4px] border border-line bg-surface p-0.5" role="group" aria-labelledby="focus-timer-label">
                {[
                  { value: false, label: 'No' },
                  { value: true, label: 'Yes' },
                ].map(({ value, label }) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={focusEnabled === value}
                    onClick={() => setFocusEnabled(value)}
                    className={`
                      rounded-[3px] px-4 h-9 font-mono text-[11px] uppercase tracking-[0.16em]
                      transition-colors duration-150
                      ${focusEnabled === value ? 'bg-tact/10 text-tact' : 'text-text-2 hover:text-text'}
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {focusEnabled && (
              <div className="space-y-2">
                <span id="focus-duration-label" className="block font-mono text-[11px] uppercase tracking-[0.18em] text-steel">
                  Duration
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="focus-duration-label">
                  {FOCUS_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      aria-pressed={focusMinutes === mins}
                      onClick={() => setFocusMinutes(mins)}
                      className={`
                        tnum rounded-[4px] border px-3 h-10 font-mono text-[11px] uppercase tracking-[0.14em]
                        transition-colors duration-150
                        ${
                          focusMinutes === mins
                            ? 'border-tact/60 bg-tact/10 text-tact'
                            : 'border-line bg-surface text-text-2 hover:text-text'
                        }
                      `}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                  Timer starts on creation · track it live on Command
                </p>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <TacticalButton type="button" variant="steel" size="sm" onClick={onClose}>
            Cancel
          </TacticalButton>
          <TacticalButton type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create operation'}
          </TacticalButton>
        </div>
      </form>
    </Modal>
  );
}

function EmptyZone({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-line bg-surface-2 text-steel">
        <Icon size={20} />
      </div>
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-text-2">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-text-3">{body}</p>
      </div>
      {action}
    </div>
  );
}

function DailyDeployment({ dailyProgress, streak }) {
  const total = dailyProgress?.totalQuests ?? 0;
  const done = dailyProgress?.completedQuests ?? 0;
  const attributes = dailyProgress?.attributeChanges ?? {};
  const attributeRows = ATTRIBUTE_ORDER.filter((key) => attributes[key] > 0);

  return (
    <TacticalPanel brackets>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-tact/30 bg-tact/10 text-tact">
          <CalendarClock size={16} />
        </div>
        <div>
          <HUDLabel tone="steel">Daily Deployment</HUDLabel>
          <p className="mt-0.5 text-sm text-text-2">Today&apos;s Arc</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <HUDLabel tone="steel">{total > 0 ? 'Arc Status' : 'Arc Clear'}</HUDLabel>
          <span className="tnum font-mono text-xs text-text">
            <b className="tnum text-base text-text">{done}</b>
            <span className="text-text-3"> / {total} operations</span>
          </span>
        </div>
        <ProgressBar
          value={done}
          max={Math.max(1, total)}
          color={dailyProgress?.isComplete ? 'success' : 'tact'}
          segments={total > 0 ? total : 4}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div>
          <HUDLabel tone="steel">XP Today</HUDLabel>
          <p className="tnum mt-1 font-mono text-sm text-tact">+{dailyProgress?.xpEarned ?? 0}</p>
        </div>
        <div>
          <HUDLabel tone="steel">Gold Today</HUDLabel>
          <p className="tnum mt-1 font-mono text-sm text-warning">+{dailyProgress?.goldEarned ?? 0}</p>
        </div>
        <div>
          <HUDLabel tone="steel">Streak</HUDLabel>
          <p className="tnum mt-1 flex items-center gap-1 font-mono text-sm text-text">
            <Flame size={13} className="text-tact" />
            {streak ?? 0}d
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-line pt-4">
        {attributeRows.length === 0 && (
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
            No attribute growth recorded today
          </p>
        )}
        {attributeRows.map((key) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <HUDLabel tone="steel">{ATTRIBUTE_LABEL[key] || key}</HUDLabel>
            <span className="tnum font-mono text-sm text-text">+{attributes[key]}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        {dailyProgress?.isComplete ? (
          <StatusBadge status="ready" label="Arc Complete" />
        ) : total > 0 ? (
          <StatusBadge status="active" label={`${dailyProgress.remainingQuests} Remaining`} />
        ) : (
          <StatusBadge status="available" label="Nothing Planned" />
        )}
      </div>
    </TacticalPanel>
  );
}

export default function Quests() {
  const reduced = useReducedMotion();
  const [quests, setQuests] = useState([]);
  const [character, setCharacter] = useState(null);
  const [dailyProgress, setDailyProgress] = useState(null);
  const [focusSession, setFocusSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState(null);
  const [deletingQuest, setDeletingQuest] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { completingId, result: completionResult, completeQuest, clearResult } = useQuestCompletion({
    onComplete: () => setReloadKey((k) => k + 1),
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.all([
      api.get('/quests', { params: { status: 'all' } }),
      api.get('/character'),
      api.get('/focus').catch(() => null),
    ])
      .then(([q, c, f]) => {
        if (cancelled) return;
        setQuests(q.data.data.quests || []);
        setCharacter(c.data.data.character);
        setDailyProgress(c.data.data.dailyProgress);
        setFocusSession(f?.data?.data?.session || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setQuests([]);
        setCharacter(null);
        setDailyProgress(null);
        setPageError(err.response?.data?.error || 'Could not load the war room. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const activeQuests = useMemo(() => quests.filter((q) => !q.isCompleted), [quests]);
  const completedQuests = useMemo(() => quests.filter((q) => q.isCompleted), [quests]);

  const activeByCategory = useMemo(
    () => (categoryFilter ? activeQuests.filter((q) => q.category === categoryFilter) : activeQuests),
    [activeQuests, categoryFilter]
  );
  const completedByCategory = useMemo(
    () => (categoryFilter ? completedQuests.filter((q) => q.category === categoryFilter) : completedQuests),
    [completedQuests, categoryFilter]
  );

  // Protocol grouping — a presentational layer over REAL operation data.
  // Active operations are grouped by their real category (class). Each group
  // shows genuine class progress (recorded vs total on the board). No
  // sequencing, prerequisites or gating is implied.
  const protocolGroups = useMemo(() => {
    const byCategory = new Map();
    for (const q of activeByCategory) {
      const list = byCategory.get(q.category) || [];
      list.push(q);
      byCategory.set(q.category, list);
    }
    const groups = Array.from(byCategory.entries()).map(([category, ops]) => ({
      category,
      ops,
      total: quests.filter((q) => q.category === category).length,
      done: quests.filter((q) => q.category === category && q.isCompleted).length,
    }));
    const order = CATEGORIES.map((c) => c.value);
    groups.sort((a, b) => b.ops.length - a.ops.length || order.indexOf(a.category) - order.indexOf(b.category));
    return groups;
  }, [activeByCategory, quests]);

  const showActiveZone = statusFilter !== 'completed';
  const showCompletedZone = statusFilter !== 'active';

  function notify(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }

  function openCreate() {
    setEditingQuest(null);
    setFormOpen(true);
  }

  function openEdit(quest) {
    setEditingQuest(quest);
    setFormOpen(true);
  }

  async function handleComplete(quest) {
    try {
      await completeQuest(quest);
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify(err.response?.data?.error || 'Could not complete the operation.', 'error');
    }
  }

async function handleDeleteConfirm() {
  if (!deletingQuest) return;
  setDeleteBusy(true);
  try {
    await api.delete(`/quests/${deletingQuest.id}`);
    notify('Operation deleted.');
    setDeletingQuest(null);
    setReloadKey((k) => k + 1);
  } catch (err) {
    notify(err.response?.data?.error || 'Could not delete the operation.', 'error');
  } finally {
    setDeleteBusy(false);
  }
}

function ProtocolSection({ group, index, completingId, focusSession, onEdit, onDelete, onComplete }) {
  const label = CATEGORY_LABEL[group.category] || group.category;
  const classStatus = group.total > 0 && group.done >= group.total ? 'ready' : group.done > 0 ? 'active' : 'available';
  const classProgress = group.total > 0 ? Math.round((group.done / group.total) * 100) : 0;

  return (
    <TacticalPanel brackets>
      <SectionHeader
        index={index}
        title={`${label} // Protocol`}
        action={
          <span className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge status="active" label={`${group.ops.length} Active`} />
            <StatusBadge status={classStatus} label={`${group.done} / ${group.total} Recorded`} />
          </span>
        }
      />
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={group.done} max={Math.max(1, group.total)} color={classStatus === 'ready' ? 'success' : 'tact'} segments={Math.max(1, group.total)} />
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">{classProgress}%</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {group.ops.map((q) => (
          <OperationCard
            key={q.id}
            quest={q}
            busy={completingId === q.id}
            focusBadge={
              focusSession && focusSession.questId === q.id
                ? {
                    minutes: Math.max(1, Math.round((focusSession.plannedSeconds ?? 0) / 60)),
                    live: focusSession.status === 'ACTIVE',
                  }
                : null
            }
            onEdit={() => onEdit(q)}
            onDelete={() => onDelete(q)}
            onComplete={() => onComplete(q)}
          />
        ))}
      </div>
    </TacticalPanel>
  );
}

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <TacticalPanel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-tact/30 bg-tact/10 text-tact">
                <Crosshair size={18} />
              </div>
              <div>
                <h1 className="font-ui text-sm font-semibold uppercase tracking-[0.2em] text-text">
                  Operations // War Room
                </h1>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                  Real-world operations · deploy when complete
                </p>
              </div>
            </div>
            <TacticalButton variant="primary" size="sm" onClick={openCreate}>
              <Plus size={14} />
              Create Operation
            </TacticalButton>
          </div>
        </TacticalPanel>
      </motion.div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      )}

      {!loading && pageError && (
        <TacticalPanel variant="danger" className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <AlertCircle size={22} />
          </div>
          <p className="font-medium text-text">{pageError}</p>
          <TacticalButton variant="steel" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </TacticalButton>
        </TacticalPanel>
      )}

      {!loading && !pageError && (
        <div className="space-y-3">
          <TacticalPanel>
            <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-steel">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" style={reduced ? { animation: 'none' } : undefined} />
                War Room // Online
              </div>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-text-3 sm:inline">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-4">
              <HudCell label="Active Operations">
                <p className="tnum font-display text-xl leading-none text-text">
                  {activeQuests.length}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">deploy ready</p>
              </HudCell>
              <HudCell label="Completed">
                <p className="tnum font-display text-xl leading-none text-text">
                  {character?.totalQuestsCompleted ?? '—'}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">lifetime</p>
              </HudCell>
              <HudCell label="Today">
                <p className="tnum font-display text-xl leading-none text-text">
                  {dailyProgress?.completedQuests ?? '—'}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">recorded</p>
              </HudCell>
              <HudCell label="Streak">
                <p className="tnum flex items-center gap-1.5 font-display text-xl leading-none text-text">
                  <Flame size={16} className="text-tact" />
                  {character?.currentStreak ?? '—'}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">current days</p>
              </HudCell>
            </div>
          </TacticalPanel>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-[4px] border border-line bg-surface p-0.5">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                  className={`
                    rounded-[3px] px-3 h-8 font-mono text-[11px] uppercase tracking-[0.16em]
                    transition-colors duration-150
                    ${statusFilter === value ? 'bg-tact/10 text-tact' : 'text-text-2 hover:text-text'}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by operation class"
              className="h-8 max-w-full rounded-[4px] border border-line bg-surface px-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-2 transition-colors focus:border-tact/60 focus:outline-none"
            >
              <option value="">All classes</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {quests.length === 0 && (
            <TacticalPanel className="py-12">
              <EmptyZone
                icon={Inbox}
                title="War Room Clear"
                body="No operations on the board yet. Create your first operation."
                action={
                  <TacticalButton variant="primary" size="sm" onClick={openCreate}>
                    <Plus size={13} />
                    Create Operation
                  </TacticalButton>
                }
              />
            </TacticalPanel>
          )}

          {quests.length > 0 && (
            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="order-2 min-w-0 space-y-3 lg:order-1">
                {showActiveZone && (
                  activeByCategory.length === 0 ? (
                    <TacticalPanel brackets>
                      <SectionHeader
                        index="01"
                        title="Active Operations"
                        action={<StatusBadge status="available" label="0 Active" />}
                      />
                      <EmptyZone
                        icon={Crosshair}
                        title="No Active Operations"
                        body="Command is clear. Create your next operation or loosen the class filter."
                        action={
                          <TacticalButton variant="ghost" size="sm" onClick={openCreate}>
                            <Plus size={13} />
                            Create Operation
                          </TacticalButton>
                        }
                      />
                    </TacticalPanel>
                  ) : (
                    protocolGroups.map((group, i) => (
                      <ProtocolSection
                        key={group.category}
                        group={group}
                        index={String(i + 1).padStart(2, '0')}
                        completingId={completingId}
                        focusSession={focusSession}
                        onEdit={openEdit}
                        onDelete={setDeletingQuest}
                        onComplete={handleComplete}
                      />
                    ))
                  )
                )}

                {showCompletedZone && (
                  <TacticalPanel brackets>
                    <SectionHeader
                      index={showActiveZone ? String(protocolGroups.length + 1).padStart(2, '0') : '01'}
                      title="Completed Operations"
                      action={<StatusBadge status="ready" label={`${completedByCategory.length} Recorded`} />}
                    />
                    {completedByCategory.length === 0 ? (
                      <EmptyZone
                        icon={Inbox}
                        title="No Completed Operations"
                        body="Your campaign starts here. Deploy an operation to record your first victory."
                      />
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {completedByCategory.map((q) => (
                          <OperationCard key={q.id} quest={q} />
                        ))}
                      </div>
                    )}
                  </TacticalPanel>
                )}
              </div>

              <aside className="order-1 space-y-3 lg:order-2 lg:sticky lg:top-4">
                <DailyDeployment dailyProgress={dailyProgress} streak={character?.currentStreak} />
              </aside>
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <OperationFormModal
          key={editingQuest ? editingQuest.id : 'new'}
          mode={editingQuest ? 'edit' : 'create'}
          quest={editingQuest}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            setReloadKey((k) => k + 1);
          }}
          notify={notify}
        />
      )}

      <Modal
        isOpen={!!deletingQuest}
        onClose={() => setDeletingQuest(null)}
        title="Delete operation"
        description="This permanently deletes the operation and its completion history."
        size="sm"
      >
        <div className="space-y-4">
          {deletingQuest && (
            <p className="text-sm text-text-2">
              Are you sure you want to scrub{' '}
              <span className="font-medium text-text">{deletingQuest.title}</span> from the board?
            </p>
          )}
          <div className="flex justify-end gap-2">
            <TacticalButton variant="steel" size="sm" onClick={() => setDeletingQuest(null)}>
              Cancel
            </TacticalButton>
            <TacticalButton variant="danger" size="sm" disabled={deleteBusy} onClick={handleDeleteConfirm}>
              <Trash2 size={14} />
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </TacticalButton>
          </div>
        </div>
      </Modal>

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