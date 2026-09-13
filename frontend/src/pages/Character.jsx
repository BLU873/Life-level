import { useState, useEffect } from 'react';
import { Zap, Coins, Flame, Trophy, AlertCircle, UserCircle, Check, Medal, Target, CalendarCheck, TrendingUp } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toast from '../components/ui/Toast';

const ATTRIBUTES = [
  { key: 'intellect', label: 'Intellect', dot: 'bg-intellect' },
  { key: 'strength', label: 'Strength', dot: 'bg-strength' },
  { key: 'discipline', label: 'Discipline', dot: 'bg-discipline' },
  { key: 'creativity', label: 'Creativity', dot: 'bg-creativity' },
  { key: 'social', label: 'Social', dot: 'bg-social' },
];

const TYPE_LABEL = {
  PROFILE_FRAME: 'Profile frame',
  THEME: 'Theme',
  BADGE: 'Badge',
};

const RARITY_DOT = {
  COMMON: 'bg-text-3',
  UNCOMMON: 'bg-intellect',
  RARE: 'bg-warning',
  EPIC: 'bg-creativity',
};

function StatTile({ label, icon: Icon, iconClass = 'text-text-2', value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2">
        <Icon size={16} className={iconClass} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-text-2">{label}</p>
        <p className="tnum text-lg font-semibold tracking-tight text-text">{value}</p>
      </div>
    </div>
  );
}

export default function Character() {
  const [character, setCharacter] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [equippingId, setEquippingId] = useState(null);
  const [toast, setToast] = useState(null);

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

  function notify(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }

  function replaceInventoryItem(updated) {
    setInventory((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  async function handleEquip(ownedItem) {
    setEquippingId(ownedItem.id);
    try {
      const res = await api.post(`/inventory/${ownedItem.id}/equip`);
      replaceInventoryItem(res.data.data.item);
      notify(`${ownedItem.item.name} equipped.`);
    } catch (err) {
      notify(err.response?.data?.error || 'Could not equip the item.', 'error');
    } finally {
      setEquippingId(null);
    }
  }

  async function handleUnequip(ownedItem) {
    setEquippingId(ownedItem.id);
    try {
      const res = await api.post(`/inventory/${ownedItem.id}/unequip`);
      replaceInventoryItem(res.data.data.item);
      notify(`${ownedItem.item.name} unequipped.`);
    } catch (err) {
      notify(err.response?.data?.error || 'Could not unequip the item.', 'error');
    } finally {
      setEquippingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Character"
        description="Your level, attributes and growth."
      />

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
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
          <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-2 text-accent">
                <UserCircle size={32} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-text-2">Level</p>
                <p className="tnum text-4xl font-semibold tracking-tight text-text">{character.level}</p>
                {character.rank && (
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                    <Medal size={11} />
                    {character.rank.name}
                  </p>
                )}
              </div>
            </div>
            <div className="w-full flex-1">
              <div className="mb-1.5 flex items-baseline justify-between text-[13px] text-text-2">
                <span>
                  <span className="tnum font-semibold text-text">{character.xpIntoCurrentLevel}</span> /{' '}
                  <span className="tnum">{character.xpRequiredForNextLevel}</span> XP
                </span>
                <span className="tnum text-text-3">{character.progressPercentage}%</span>
              </div>
              <div className="xp-track">
                <div
                  className="xp-fill"
                  style={{ width: `${Math.min(100, character.progressPercentage)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-text-2">
                <span className="tnum">{character.xpRequiredForNextLevel - character.xpIntoCurrentLevel}</span> XP to
                reach level {character.level + 1}
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-5">
              <StatTile label="Total XP" icon={Zap} iconClass="text-accent" value={character.totalXP} />
            </Card>
            <Card className="p-5">
              <StatTile label="Gold" icon={Coins} iconClass="text-warning" value={character.gold} />
            </Card>
            <Card className="p-5">
              <StatTile label="Current streak" icon={Flame} iconClass="text-warning" value={character.currentStreak} />
            </Card>
            <Card className="p-5">
              <StatTile label="Longest streak" icon={Trophy} iconClass="text-accent" value={character.longestStreak} />
            </Card>
            <Card className="p-5">
              <StatTile label="Quests completed" icon={Check} iconClass="text-success" value={character.totalQuestsCompleted} />
            </Card>
            <Card className="p-5">
              <StatTile label="Active days" icon={CalendarCheck} iconClass="text-info" value={character.activeDays} />
            </Card>
            <Card className="p-5">
              <StatTile
                label="Strongest attribute"
                icon={Target}
                iconClass="text-accent"
                value={character.strongestAttribute ? character.strongestAttribute.toLowerCase() : '—'}
              />
            </Card>
            <Card className="p-5">
              <StatTile
                label="Fastest this week"
                icon={TrendingUp}
                iconClass="text-success"
                value={character.fastestGrowingAttribute ? character.fastestGrowingAttribute.toLowerCase() : '—'}
              />
            </Card>
          </div>

          <Card className="flex flex-col gap-1">
            <h2 className="mb-2 text-sm font-semibold tracking-tight text-text">Attributes</h2>
            {ATTRIBUTES.map(({ key, label, dot }) => (
              <div key={key} className="flex items-center justify-between border-b border-line py-3 last:border-b-0">
                <span className="flex items-center gap-2.5 text-sm text-text-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  {label}
                </span>
                <span className="tnum text-lg font-semibold tracking-tight text-text">{character[key]}</span>
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-1">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-text">Achievements</h2>
              <span className="tnum text-xs text-text-3">
                {achievements.filter((a) => a.unlockedAt).length}/{achievements.length}
              </span>
            </div>
            {achievements.length === 0 && (
              <p className="py-3 text-sm text-text-2">No achievements yet. Complete quests to earn them.</p>
            )}
            {achievements.map((a) => (
              <div key={a.code} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    a.unlockedAt ? 'bg-warning/10 text-warning' : 'bg-surface-2 text-text-3'
                  }`}
                >
                  <Trophy size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{a.name}</p>
                  <p className="truncate text-[13px] text-text-2">{a.description}</p>
                </div>
                {a.unlockedAt ? <Badge variant="gold">Unlocked</Badge> : <span className="text-xs text-text-3">Locked</span>}
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-1">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-text">Inventory</h2>
              <span className="text-xs text-text-3">{inventory.length}</span>
            </div>
            {inventory.length === 0 && (
              <p className="py-3 text-sm text-text-2">
                No items yet. Earn gold by completing quests and spend it in the Shop.
              </p>
            )}
            {inventory.map((ownedItem) => (
              <div
                key={ownedItem.id}
                className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${RARITY_DOT[ownedItem.item.rarity] || 'bg-text-3'}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{ownedItem.item.name}</p>
                    <p className="text-[13px] text-text-2">
                      {TYPE_LABEL[ownedItem.item.type] || ownedItem.item.type}
                      {ownedItem.quantity > 1 ? ` · x${ownedItem.quantity}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {ownedItem.isEquipped ? (
                    <>
                      <Badge variant="green">
                        <Check size={12} />
                        Equipped
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={equippingId === ownedItem.id}
                        onClick={() => handleUnequip(ownedItem)}
                      >
                        Unequip
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={equippingId === ownedItem.id}
                      onClick={() => handleEquip(ownedItem)}
                    >
                      Equip
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <Toast
        message={toast?.message}
        type={toast?.type}
        isVisible={!!toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}