import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { HUDLabel, StatusBadge } from '../tactical';

const BAR_COLORS = {
  strength: 'bg-strength',
  intellect: 'bg-intellect',
  discipline: 'bg-discipline',
  creativity: 'bg-creativity',
  social: 'bg-social',
};

export default function FacilityCard({ facility, index = 0, glow = false }) {
  const reduced = useReducedMotion();
  const { name, route, icon: Icon, stat, kicker, badge, lit, action = 'Enter', bars, deploy } = facility;
  const barMax = facility.barMax || 100;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.06 * index }}
      className="flex h-full"
    >
      <Link
        to={route}
        aria-label={`${name} — ${action}`}
        className="group relative block w-full rounded-md transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tact"
      >
        <div
          className={`tact-clip relative flex h-full flex-col gap-2 overflow-hidden rounded-md border p-3 transition-colors duration-200 ${
            lit
? 'border-warning/25 bg-surface hover:border-warning/60'
              : 'border-line bg-surface/80 hover:border-warning/40'
            } ${lit && glow ? 'shadow-[0_0_18px_rgba(217,164,65,0.1)]' : ''}`}
        >
          {lit && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-warning/70 to-transparent"
            />
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border ${
                  lit ? 'border-warning/30 bg-warning/10 text-warning' : 'border-line bg-surface-2 text-steel'
                }`}
              >
                <Icon size={14} />
              </span>
              <HUDLabel tone={lit ? 'warning' : 'steel'} className="truncate">
                {name}
              </HUDLabel>
            </div>
            <StatusBadge status={badge.status} label={badge.label} className="shrink-0" />
          </div>

          <div className="min-w-0">
            <p className="tnum font-display text-lg leading-tight tracking-tight text-text">
              {stat}
            </p>
            <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
              {kicker}
            </p>
          </div>

          {bars && (
            <div className="space-y-1.5 border-t border-line pt-2">
              {bars.map(({ key, label, value }) => (
                <div key={key}>
                  <div className="mb-0.5 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-3">
                      {label}
                    </span>
                    <span className="tnum font-mono text-[11px] text-text">{value}</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-[1px] bg-surface-3">
                    <div
                      className={`h-full ${BAR_COLORS[key] || 'bg-tact'}`}
                      style={{ width: `${Math.max(0, Math.min(100, (value / (barMax || 100)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {deploy && (
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-3">
                Daily Deployment
              </span>
              <span className="tnum font-mono text-[11px] font-semibold text-text">
                {deploy.done} / {deploy.total}
              </span>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-line pt-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2 transition-colors group-hover:text-warning">
              [ {action} ]
            </span>
            <ArrowRight
              size={12}
              className="text-warning transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}