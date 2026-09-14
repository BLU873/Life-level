import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, AlertCircle, Coins, UserCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';
import Toast from '../components/ui/Toast';
import OperatorVisual from '../components/OperatorVisual';
import {
  TacticalPanel,
  HUDLabel,
  RarityBadge,
  StatusBadge,
  SectionHeader,
  TacticalButton,
  RankBadge,
  tacticalButtonClasses,
} from '../components/tactical';

const TYPE_OPTIONS = [
  { key: 'ALL', label: 'All' },
  { key: 'PROFILE_FRAME', label: 'Frames' },
  { key: 'THEME', label: 'Themes' },
  { key: 'BADGE', label: 'Badges' },
];

const TYPE_LABEL = {
  PROFILE_FRAME: 'Frame',
  THEME: 'Theme',
  BADGE: 'Badge',
};

const SLOT_ORDER = ['PROFILE_FRAME', 'THEME', 'BADGE'];

export default function Loadout() {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [inventory, setInventory] = useState([]);
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [equippingId, setEquippingId] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.all([api.get('/inventory'), api.get('/character')])
      .then(([inv, ch]) => {
        if (cancelled) return;
        setInventory(inv.data.data.items);
        setCharacter(ch.data.data.character);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not load your loadout. Make sure the API is running.');
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

  const equippedByType = useMemo(() => {
    const map = {};
    for (const type of SLOT_ORDER) map[type] = [];
    for (const owned of inventory) {
      if (owned.isEquipped) map[owned.item.type]?.push(owned);
    }
    return map;
  }, [inventory]);

  const filtered = useMemo(
    () => (filter === 'ALL' ? inventory : inventory.filter((o) => o.item.type === filter)),
    [inventory, filter]
  );

  return (
    <div className="mx-auto max-w-6xl">
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
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

      {!loading && !pageError && (
        <>
          <section className="tact-brackets tact-scan relative isolate overflow-hidden rounded-md border border-line bg-surface">
            <OperatorVisual level={character?.level} operatorName={user?.username || 'Operator'} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080706] via-[#080706]/75 to-[#080706]/20" />

            <div className="relative z-10 flex min-h-[150px] flex-col justify-center gap-3 p-4 sm:min-h-[170px] sm:p-6">
              <HUDLabel tone="warning">Loadout // Current</HUDLabel>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="font-ui text-2xl font-bold uppercase tracking-[0.1em] text-text sm:text-3xl">
                    {user?.username || 'Operator'}
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
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-text-2">Status // Armed</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {character && (
                    <div className="flex items-center gap-1.5 rounded-[3px] border border-warning/30 bg-black/30 px-2 py-1 font-mono text-xs text-text-2">
                      <Coins size={14} className="text-warning" />
                      <span className="tnum text-warning">{character.gold?.toLocaleString()}</span>
                      <span className="hidden uppercase tracking-[0.16em] text-text-3 sm:inline">Gold</span>
                    </div>
                  )}
                  <Link to="/character" className={tacticalButtonClasses('ghost', 'sm')}>
                    <UserCircle size={13} />
                    View character
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {SLOT_ORDER.map((type) => (
                <TacticalPanel key={type} brackets className="flex min-h-[120px] flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <HUDLabel>{TYPE_LABEL[type]}</HUDLabel>
                    <StatusBadge
                      status={equippedByType[type].length ? 'ready' : 'locked'}
                      label={equippedByType[type].length ? 'Equipped' : 'Empty'}
                    />
                  </div>
                  {equippedByType[type].length > 0 ? (
                    <div className="mt-1 flex flex-col gap-2">
                      {equippedByType[type].map((owned) => (
                        <div key={owned.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-ui text-sm font-medium text-text">{owned.item.name}</p>
                            <div className="mt-0.5">
                              <RarityBadge rarity={owned.item.rarity} />
                            </div>
                          </div>
                          <TacticalButton
                            variant="ghost"
                            size="sm"
                            disabled={equippingId === owned.id}
                            onClick={() => handleUnequip(owned)}
                          >
                            {equippingId === owned.id ? <><Loader2 size={13} className="animate-spin" aria-hidden="true" />Unequipping…</> : 'Unequip'}
                          </TacticalButton>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">Empty slot</p>
                      <Link to="/shop" className={tacticalButtonClasses('ghost', 'sm')}>
                        <Plus size={13} />
                        Browse Shop
                      </Link>
                    </div>
                  )}
                </TacticalPanel>
              ))}
            </div>
          </motion.div>

          <div className="mt-3">
            <SectionHeader
              index="01"
              title="Collection"
              tone="warning"
              action={
                <div className="flex flex-wrap gap-1">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFilter(opt.key)}
                      aria-pressed={filter === opt.key}
                      className={`
                        rounded-[3px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]
                        transition-colors duration-150
                        ${
                          filter === opt.key
                            ? 'border-warning/50 bg-warning/10 text-warning'
                            : 'border-line bg-surface-2 text-text-3 hover:text-text-2'
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              }
            />

            {filtered.length === 0 ? (
              <TacticalPanel className="mt-3 flex flex-col items-center gap-3 py-10 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-2">
                  {inventory.length === 0 ? 'No equipment yet' : 'No items in this category'}
                </p>
                {inventory.length === 0 && (
                  <>
                    <p className="text-sm text-text-3">Earn gold by completing operations, then spend it in the arsenal.</p>
                    <Link to="/shop" className={tacticalButtonClasses('primary', 'sm')}>
                      <Coins size={13} />
                      Browse Shop
                    </Link>
                  </>
                )}
              </TacticalPanel>
            ) : (
              <motion.div layout className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map((owned) => {
                    const { item, isEquipped } = owned;
                    const busy = equippingId === owned.id;
                    return (
                      <motion.div
                        key={owned.id}
                        layout
                        initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.22 }}
                      >
                        <TacticalPanel
                          className={`flex h-full min-h-[168px] flex-col gap-3 ${
                            isEquipped ? 'border-warning/50 bg-warning/5' : ''
                          }`}
                          brackets={isEquipped}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-ui text-sm font-medium text-text">{item.name}</p>
                              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
                                {TYPE_LABEL[item.type] || item.type}
                              </p>
                            </div>
                            <RarityBadge rarity={item.rarity} />
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-text-2">{item.description}</p>
                          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                            {isEquipped ? (
                              <StatusBadge status="ready" label="Equipped" />
                            ) : (
                              <StatusBadge status="available" label="Available" />
                            )}
                            {isEquipped ? (
                              <TacticalButton
                                variant="steel"
                                size="sm"
                                disabled={busy}
                                onClick={() => handleUnequip(owned)}
                              >
                                {busy ? <><Loader2 size={13} className="animate-spin" aria-hidden="true" />Unequipping…</> : 'Unequip'}
                              </TacticalButton>
                            ) : (
                              <TacticalButton
                                variant="primary"
                                size="sm"
                                disabled={busy}
                                onClick={() => handleEquip(owned)}
                              >
                                {busy ? <><Loader2 size={13} className="animate-spin" aria-hidden="true" />Equipping…</> : 'Equip'}
                              </TacticalButton>
                            )}
                          </div>
                        </TacticalPanel>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </>
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