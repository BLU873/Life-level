import { useState, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ExternalLink, RadioTower, RefreshCw, WifiOff } from 'lucide-react';
import api from '../services/api';
import { timeAgo } from '../utils/format';
import Skeleton from '../components/ui/Skeleton';
import {
  TacticalPanel,
  HUDLabel,
  StatusBadge,
  SectionHeader,
  TacticalButton,
} from '../components/tactical';

const CATEGORIES = ['TECH', 'CODING', 'SPORTS', 'FITNESS', 'GAMING'];

function IntelImage({ item, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!item.image || failed) {
    return (
      <div
        aria-hidden="true"
        className={`flex w-full items-center justify-center border-b border-line bg-surface-2 ${className}`}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-steel">
          {item.category} // No Feed
        </span>
      </div>
    );
  }
  return (
    <div className={`w-full overflow-hidden border-b border-line ${className}`}>
      <img
        src={item.image}
        alt={item.title}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}

function IntelCard({ item }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Read: ${item.title} (${item.source})`}
      className="group flex flex-col overflow-hidden border border-line bg-surface transition-colors duration-150 hover:border-info/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40"
    >
      <div className="aspect-[16/9]">
        <IntelImage item={item} className="h-full" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-steel">
            {item.category} // Intel
          </span>
          <span className="shrink-0 font-mono text-[10px] text-text-3">
            {item.publishedAt ? timeAgo(item.publishedAt) : ''}
          </span>
        </div>
        <h3 className="line-clamp-2 font-ui text-sm font-medium leading-snug text-text group-hover:text-info">
          {item.title}
        </h3>
        {item.description && (
          <p className="line-clamp-3 text-[13px] leading-normal text-text-2">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2">
          <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            Source // {item.source}
          </span>
          <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-info">
            Read Intel
            <ExternalLink size={11} />
          </span>
        </div>
      </div>
    </a>
  );
}

function FeaturedIntel({ item }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Read featured: ${item.title} (${item.source})`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tact/40"
    >
      <TacticalPanel brackets className="transition-colors duration-150 group-hover:border-tact/40">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <StatusBadge status="ready" label={item.category} />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
            {item.publishedAt ? timeAgo(item.publishedAt) : ''}
          </span>
        </div>

        <div className="aspect-[16/9] w-full sm:aspect-[21/9]">
          <IntelImage item={item} className="h-full" />
        </div>

        <div className="pt-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel">
            Featured Transmission
          </p>
          <h2 className="mt-1.5 font-atmospheric text-xl font-semibold leading-tight text-text sm:text-2xl">
            {item.title}
          </h2>
          {item.description && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-2">{item.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
              Source // {item.source}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-info">
              Read Intel
              <ExternalLink size={13} />
            </span>
          </div>
        </div>
      </TacticalPanel>
    </a>
  );
}

function CategorySelector({ active, onChange, disabled }) {
  const options = ['ALL', ...CATEGORIES];
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Intel category">
      {options.map((cat) => {
        const isActive = active === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            disabled={disabled}
            aria-pressed={isActive}
            className={`
              h-8 rounded-[4px] border px-3 font-mono text-[10px] uppercase tracking-[0.16em]
              transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tact/40
              disabled:cursor-not-allowed disabled:opacity-50
              ${isActive
                ? 'border-info/50 bg-info/10 text-info'
                : 'border-line bg-surface text-text-2 hover:border-line-2 hover:text-text'}
            `}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

function IntelSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-72 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export default function Intel() {
  const reduced = useReducedMotion();
  const [items, setItems] = useState([]);
  const [failedCategories, setFailedCategories] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    api
      .get('/intel', { params: { limit: 40 } })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.data.items || []);
        setFailedCategories(res.data.data.failedCategories || []);
        setFetchedAt(res.data.data.fetchedAt || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageError(err.response?.data?.error || 'Could not reach the intel feed. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    if (activeCategory === 'ALL') return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await api.get('/intel', { params: { limit: 40, refresh: '1' } });
      setItems(res.data.data.items || []);
      setFailedCategories(res.data.data.failedCategories || []);
      setFetchedAt(res.data.data.fetchedAt || null);
    } catch {
      setPageError('The intel link is offline right now. Try again shortly.');
    } finally {
      setRefreshing(false);
    }
  }

  const online = !pageError && !loading && !!fetchedAt;
  const lastUpdated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="mx-auto max-w-6xl">
      {loading && <IntelSkeleton />}

      {!loading && pageError && (
        <TacticalPanel variant="danger" className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <WifiOff size={22} />
          </div>
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-text">
            Intel Link // Offline
          </p>
          <p className="max-w-sm text-sm text-text-2">{pageError}</p>
          <TacticalButton variant="steel" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Retry transmission
          </TacticalButton>
        </TacticalPanel>
      )}

      {!loading && !pageError && (
        <div className="space-y-3">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TacticalPanel>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-info/30 bg-info/10 text-info">
                    <RadioTower size={18} />
                  </div>
                  <div>
                    <h1 className="font-ui text-sm font-semibold uppercase tracking-[0.2em] text-text">
                      Intel // Briefing
                    </h1>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                      Field Intelligence
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <StatusBadge status={online ? 'ready' : 'danger'} label={online ? 'Online' : 'Offline'} />
                  {lastUpdated && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                      Updated // {lastUpdated}
                    </span>
                  )}
                  <TacticalButton variant="steel" size="sm" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    Refresh Intel
                  </TacticalButton>
                </div>
              </div>
            </TacticalPanel>
          </motion.div>

          <CategorySelector
            active={activeCategory}
            onChange={setActiveCategory}
            disabled={loading}
          />

          {online && failedCategories.length > 0 && (
            <TacticalPanel>
              <div className="flex flex-wrap items-center gap-2">
                <HUDLabel tone="steel">Some channels offline</HUDLabel>
                <span className="font-mono text-[10px] text-text-2">
                  {failedCategories.join(' · ')}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                  Other channels remain live
                </span>
              </div>
            </TacticalPanel>
          )}

          {!loading && !pageError && items.length === 0 && (
            <TacticalPanel className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-2 text-steel">
                <AlertCircle size={22} />
              </div>
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-text">
                Intel // No Transmissions
              </p>
              <p className="max-w-sm text-sm text-text-3">
                {failedCategories.length > 0
                  ? 'All channels are currently silent. Pull a fresh transmission to retry.'
                  : 'The feed returned no intelligence right now. Pull a fresh transmission to retry.'}
              </p>
              <TacticalButton variant="steel" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Refresh Intel
              </TacticalButton>
            </TacticalPanel>
          )}

          {featured && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <FeaturedIntel item={featured} />
            </motion.div>
          )}

          {filtered.length === 0 && items.length > 0 && (
            <TacticalPanel className="py-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-3">
                No {activeCategory} transmissions in this batch
              </p>
              <p className="mt-1.5 text-sm text-text-3">
                Select another channel or refresh the intel link.
              </p>
            </TacticalPanel>
          )}

          {rest.length > 0 && (
            <TacticalPanel brackets>
              <SectionHeader index="01" title="Latest Intelligence" tone="info" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((item) => (
                  <IntelCard key={item.id} item={item} />
                ))}
              </div>
            </TacticalPanel>
          )}
        </div>
      )}
    </div>
  );
}