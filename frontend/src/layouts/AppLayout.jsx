import { Suspense } from 'react';
import { Outlet, Navigate, NavLink, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Skeleton from '../components/ui/Skeleton';
import {
  LayoutDashboard,
  Scroll,
  UserCircle,
  Swords,
  Trophy,
  CalendarDays,
  RadioTower,
  ShoppingBag,
  Clock,
  Settings,
  Crosshair,
  Castle,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';

const NAV_ACTIVE = {
  '/dashboard': 'bg-accent-command/10 text-accent-command',
  '/outpost': 'bg-accent-outpost/10 text-accent-outpost',
  '/quests': 'bg-accent-operations/10 text-accent-operations',
  '/character': 'bg-accent-character/10 text-accent-character',
  '/loadout': 'bg-accent-loadout/10 text-accent-loadout',
  '/achievements': 'bg-accent-achievements/10 text-accent-achievements',
  '/campaign': 'bg-accent-campaign/10 text-accent-campaign',
  '/intel': 'bg-accent-intel/10 text-accent-intel',
};

const NAV_ACTIVE_MOBILE = {
  '/dashboard': 'text-accent-command',
  '/outpost': 'text-accent-outpost',
  '/quests': 'text-accent-operations',
  '/character': 'text-accent-character',
  '/loadout': 'text-accent-loadout',
  '/achievements': 'text-accent-achievements',
  '/campaign': 'text-accent-campaign',
  '/intel': 'text-accent-intel',
};

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Command' },
  { to: '/outpost', icon: Castle, label: 'Outpost' },
  { to: '/quests', icon: Scroll, label: 'Operations' },
  { to: '/character', icon: UserCircle, label: 'Character' },
  { to: '/loadout', icon: Swords, label: 'Loadout' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
  { to: '/campaign', icon: CalendarDays, label: 'Campaign' },
  { to: '/intel', icon: RadioTower, label: 'Intel' },
  { to: '/shop', icon: ShoppingBag, label: 'Shop' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
        <Crosshair size={15} />
      </div>
      {!compact && (
        <span className="font-display text-[15px] tracking-tight text-text">
          LIFE<span className="mx-px text-text-3">//</span>LEVEL
        </span>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { user, loading, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Skeleton className="h-[70vh] w-full max-w-6xl" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar — hidden on mobile */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-14 items-center px-5">
          <Link
            to="/outpost"
            aria-label="Outpost // Base — your operational headquarters"
            className="rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tact"
          >
            <BrandMark />
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 pt-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 rounded-lg px-3 h-9 text-[13.5px] font-ui font-medium
                transition-colors duration-150
                ${isActive
                  ? NAV_ACTIVE[to] || 'bg-surface-2 text-text'
                  : 'text-text-2 hover:bg-surface-2 hover:text-text'
                }
              `}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          >
            <span className="flex items-center gap-2.5">
              {resolvedTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              Theme
            </span>
            <span className="text-xs capitalize text-text-3">{resolvedTheme}</span>
          </button>

          <div className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-semibold text-text-2">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{user.username}</p>
              <p className="truncate text-xs text-text-3">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md p-1.5 text-text-3 transition-colors hover:bg-danger/10 hover:text-danger"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <Link
            to="/outpost"
            aria-label="Outpost // Base — your operational headquarters"
            className="flex items-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tact"
          >
            <BrandMark compact />
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              to="/settings"
              aria-label="Settings"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-semibold text-text-2 transition-colors hover:text-text"
            >
              {user.username?.[0]?.toUpperCase()}
            </Link>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="p-4 pb-24 md:p-8 md:pb-8"
        >
          <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
            <Outlet />
          </Suspense>
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-7">
          {navItems
            .filter((i) => i.to !== '/settings' && i.to !== '/history' && i.to !== '/shop' && i.to !== '/outpost')
            .map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `
                  flex min-w-0 flex-col items-center gap-1 px-0.5 py-2 text-[9px] font-ui font-medium
                  transition-colors duration-150
                  ${isActive ? NAV_ACTIVE_MOBILE[to] || 'text-accent' : 'text-text-3 hover:text-text-2'}
                `}
              >
                <Icon size={18} />
                <span className="max-w-full truncate">{label}</span>
              </NavLink>
            ))}
        </div>
      </nav>
    </div>
  );
}