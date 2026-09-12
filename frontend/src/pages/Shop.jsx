import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, AlertCircle, ShoppingCart, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import Toast from '../components/ui/Toast';

const RARITY_BADGE = {
  COMMON: 'default',
  UNCOMMON: 'blue',
  RARE: 'gold',
  EPIC: 'pink',
};

const TYPE_LABEL = {
  PROFILE_FRAME: 'Profile frame',
  THEME: 'Theme',
  BADGE: 'Badge',
};

function GoldDisplay({ gold }) {
  return (
    <Card className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
        <Coins size={20} />
      </div>
      <div>
        <p className="text-[13px] text-text-2">Current Gold</p>
        <motion.p
          key={gold}
          initial={{ opacity: 0.6, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className="tnum text-xl font-semibold tracking-tight text-text"
        >
          {gold.toLocaleString()}
        </motion.p>
      </div>
    </Card>
  );
}

export default function Shop() {
  const [items, setItems] = useState([]);
  const [gold, setGold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [buyingId, setBuyingId] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    api
      .get('/shop')
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.data.items);
        setGold(res.data.data.gold);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not load the shop. Make sure the API is running.');
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

  async function handleConfirmPurchase() {
    if (!confirmItem) return;
    setConfirmBusy(true);
    try {
      const res = await api.post(`/shop/${confirmItem.id}/purchase`);
      setGold(res.data.data.gold);
      setItems((prev) =>
        prev.map((i) => (i.id === confirmItem.id ? { ...i, owned: true } : i))
      );
      notify(`${confirmItem.name} purchased.`);
      setConfirmItem(null);
    } catch (err) {
      notify(err.response?.data?.error || 'Purchase failed.', 'error');
      setConfirmItem(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  const availableItems = items.filter((i) => i.isAvailable);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Shop"
        description="Spend gold on cosmetic items."
      />

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-[72px] w-full" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
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

      {!loading && !pageError && (
        <>
          <GoldDisplay gold={gold} />

          {availableItems.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="font-medium text-text">Shop is empty</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableItems.map((item) => (
                <Card key={item.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={RARITY_BADGE[item.rarity] || 'default'}>
                        {item.rarity}
                      </Badge>
                      <Badge variant="default">{TYPE_LABEL[item.type] || item.type}</Badge>
                    </div>
                  </div>

                  <div className="min-h-[48px]">
                    <h3 className="font-medium text-text">{item.name}</h3>
                    <p className="mt-1 text-sm text-text-2 line-clamp-2">{item.description}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-text">
                      <Coins size={14} className="text-warning" />
                      <span className="tnum">{item.price.toLocaleString()}</span>
                    </span>
                    {item.owned ? (
                      <Badge variant="green">
                        <CheckCircle2 size={12} />
                        Owned
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setConfirmItem(item)}
                        disabled={gold < item.price}
                      >
                        <ShoppingCart size={13} />
                        {gold < item.price ? 'Too expensive' : 'Purchase'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={!!confirmItem}
        onClose={() => !confirmBusy && setConfirmItem(null)}
        title="Confirm purchase"
        description={confirmItem?.name}
        size="sm"
      >
        {confirmItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm">
              <span className="text-text-2">Your gold</span>
              <span className="tnum font-semibold text-text">{gold.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm">
              <span className="text-text-2">Price</span>
              <span className="tnum font-semibold text-warning">
                -{confirmItem.price.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm">
              <span className="text-text-2">After purchase</span>
              <span className="tnum font-semibold text-accent">
                {(gold - confirmItem.price).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setConfirmItem(null)} disabled={confirmBusy}>
                Cancel
              </Button>
              <Button loading={confirmBusy} onClick={handleConfirmPurchase}>
                <ShoppingCart size={14} />
                Purchase
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Toast
        message={toast?.message}
        type={toast?.type}
        isVisible={!!toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}