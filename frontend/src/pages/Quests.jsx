import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Zap,
  Coins,
  Inbox,
  AlertCircle,
  Repeat2,
} from 'lucide-react';
import api from '../services/api';
import { useQuestCompletion } from '../hooks/useQuestCompletion';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import Toast from '../components/ui/Toast';
import CompletionModal from '../components/CompletionModal';

const CATEGORIES = [
  { value: 'STUDY', label: 'Study' },
  { value: 'CODING', label: 'Coding' },
  { value: 'FITNESS', label: 'Fitness' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'CREATIVE', label: 'Creative' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'PERSONAL', label: 'Personal' },
];

const CATEGORY_BADGE = {
  STUDY: 'blue',
  CODING: 'accent',
  FITNESS: 'green',
  HEALTH: 'green',
  CREATIVE: 'pink',
  SOCIAL: 'default',
  PERSONAL: 'default',
};

const DIFFICULTIES = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

const DIFFICULTY_BADGE = {
  EASY: 'default',
  MEDIUM: 'gold',
  HARD: 'red',
};

function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-[13px] font-medium text-text-2">{label}</label>}
      <select
        aria-invalid={error ? true : undefined}
        className={`
          h-10 w-full rounded-lg bg-surface border border-line px-3.5 text-sm
          text-text transition-all duration-150
          focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25
          ${error ? 'border-danger focus:border-danger focus:ring-danger/25' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

function QuestCard({ quest, busy, onEdit, onDelete, onComplete }) {
  const categoryLabel = CATEGORIES.find((c) => c.value === quest.category)?.label || quest.category;
  const difficultyLabel = DIFFICULTIES.find((d) => d.value === quest.difficulty)?.label || quest.difficulty;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={CATEGORY_BADGE[quest.category] || 'default'}>{categoryLabel}</Badge>
          <Badge variant={DIFFICULTY_BADGE[quest.difficulty] || 'default'}>{difficultyLabel}</Badge>
          {quest.isRecurring && (
            <Badge variant="blue">
              <Repeat2 size={12} />
              Recurring
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 rounded-md p-1.5 text-text-3 transition-colors hover:bg-danger/10 hover:text-danger"
          aria-label="Delete quest"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="min-w-0">
        <h3 className="font-medium text-text">{quest.title}</h3>
        {quest.description && (
          <p className="mt-1 text-sm text-text-2 line-clamp-2">{quest.description}</p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[13px] text-text-2">
          <span className="inline-flex items-center gap-1">
            <Zap size={14} className="text-accent" />
            {quest.xpReward} XP
          </span>
          <span className="inline-flex items-center gap-1">
            <Coins size={14} className="text-warning" />
            {quest.goldReward}
          </span>
        </div>
        {quest.isCompleted ? (
          <Badge variant="green">
            <CheckCircle2 size={12} />
            Completed
          </Badge>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Pencil size={13} />
              Edit
            </Button>
            <Button variant="primary" size="sm" loading={busy} onClick={onComplete}>
              <CheckCircle2 size={13} />
              Complete
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function QuestFormModal({ mode, quest, onClose, onSaved, notify }) {
  const [title, setTitle] = useState(quest?.title ?? '');
  const [description, setDescription] = useState(quest?.description ?? '');
  const [category, setCategory] = useState(quest?.category ?? 'STUDY');
  const [difficulty, setDifficulty] = useState(quest?.difficulty ?? 'EASY');
  const [isRecurring, setIsRecurring] = useState(quest?.isRecurring ?? false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { title: title.trim(), description: description.trim(), category, difficulty, isRecurring };
      if (mode === 'edit') {
        await api.put(`/quests/${quest.id}`, payload);
      } else {
        await api.post('/quests', payload);
      }
      notify(mode === 'edit' ? 'Quest updated.' : 'Quest created.');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || (mode === 'edit' ? 'Could not update quest.' : 'Could not create quest.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'edit' ? 'Edit quest' : 'New quest'}
      description={
        mode === 'edit'
          ? 'Update the details below. Rewards are recalculated automatically.'
          : 'Rewards are calculated from category and difficulty.'
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="rounded-lg border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">{error}</div>
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
          placeholder="What does this quest involve?"
          maxLength={500}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
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
            className="h-4 w-4 rounded border-line bg-surface accent-accent"
          />
          Recurring quest
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {mode === 'edit' ? 'Save changes' : 'Create quest'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Quests() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState(null);
  const [deletingQuest, setDeletingQuest] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { completingId, result: completionResult, completeQuest, clearResult } = useQuestCompletion();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    api
      .get('/quests', {
        params: { status: statusFilter, ...(categoryFilter ? { category: categoryFilter } : {}) },
      })
      .then((res) => {
        if (!cancelled) setQuests(res.data.data.quests);
      })
      .catch((err) => {
        if (cancelled) return;
        setQuests([]);
        setPageError(err.response?.data?.error || 'Could not load quests. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, categoryFilter, reloadKey]);

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
      notify(err.response?.data?.error || 'Could not complete the quest.', 'error');
      setReloadKey((k) => k + 1);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingQuest) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/quests/${deletingQuest.id}`);
      notify('Quest deleted.');
      setDeletingQuest(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify(err.response?.data?.error || 'Could not delete the quest.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  }

  const hasQuests = quests.length > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Quests"
        description="Create, plan and complete your quests."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            New quest
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          {['active', 'completed'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`
                rounded-md px-3 h-8 text-[13px] font-medium capitalize transition-colors duration-150
                ${statusFilter === s ? 'bg-accent/10 text-accent' : 'text-text-2 hover:text-text'}
              `}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-8 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-text-2 transition-colors focus:border-accent focus:outline-none"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
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

      {!loading && !pageError && !hasQuests && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-text-3">
            <Inbox size={22} />
          </div>
          <p className="font-medium text-text">No {statusFilter === 'completed' ? 'completed' : 'active'} quests</p>
          <p className="max-w-xs text-sm text-text-2">
            {statusFilter === 'completed'
              ? 'Complete a quest to see it appear here.'
              : 'Start your journey by creating your first quest.'}
          </p>
          <Button onClick={openCreate}>
            <Plus size={16} />
            New quest
          </Button>
        </Card>
      )}

      {!loading && !pageError && hasQuests && (
        <div className="grid gap-3 sm:grid-cols-2">
          {quests.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              busy={completingId === q.id}
              onEdit={() => openEdit(q)}
              onDelete={() => setDeletingQuest(q)}
              onComplete={() => handleComplete(q)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <QuestFormModal
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
        title="Delete quest"
        description="This permanently deletes the quest and its completion history."
        size="sm"
      >
        <div className="space-y-4">
          {deletingQuest && (
            <p className="text-sm text-text-2">
              Are you sure you want to delete{' '}
              <span className="font-medium text-text">{deletingQuest.title}</span>?
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeletingQuest(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteBusy} onClick={handleDeleteConfirm}>
              <Trash2 size={15} />
              Delete
            </Button>
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