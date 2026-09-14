import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '../tactical';

export default function FacilityRow({ facility, index = 0, glow = false }) {
  const { name, route, icon: Icon, stat, kicker, badge, lit } = facility;

  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-8 h-px w-3 -translate-y-1/2 bg-steel/30"
      />
      <Link
        to={route}
        aria-label={`${name} — enter`}
        className="group relative flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3 transition-colors duration-200 hover:border-warning/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tact"
      >
        <span
          className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border ${
            lit ? 'border-warning/40 bg-warning/10 text-warning' : 'border-line bg-surface-2 text-steel'
          } ${lit && glow ? 'ring-1 ring-warning/30' : ''}`}
        >
          <Icon size={16} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
            {kicker}
          </span>
          <span className="block truncate text-sm font-semibold text-text">{name}</span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={badge.status} label={badge.label} />
          <span className="tnum font-mono text-[10px] uppercase tracking-[0.12em] text-text-2">
            {stat}
          </span>
        </span>

        <ChevronRight size={16} className="shrink-0 text-text-3 transition-transform group-hover:translate-x-0.5 group-hover:text-warning" />
      </Link>
    </li>
  );
}