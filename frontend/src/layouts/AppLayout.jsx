import { Outlet, Navigate, NavLink, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Skeleton from '../components/ui/Skeleton';
import {
  LayoutDashboard,
  Scroll,
  UserCircle,
  ShoppingBag,
  Clock,
  Settings,
  Crosshair,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/quests', icon: Scroll, label: 'Quests' },
  { to: '/character', icon: UserCircle, label: 'Character' },
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
        <span className="text-[15px] font-semibold tracking-tight text-text">
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
    navigate('/login');
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar — hidden on mobile */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-14 items-center px-5">
          <BrandMark />
        </div>

        <nav className="flex-1 space-y-0.5 px-3 pt-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 rounded-lg px-3 h-9 text-[13.5px] font-medium
                transition-colors duration-150
                ${isActive
                  ? 'bg-accent/10 text-accent'
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
          <BrandMark compact />
          <div className="flex items-center gap-1.5">
            <button
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
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex flex-col items-center gap-1 py-2 text-[11px] font-medium
                transition-colors duration-150
                ${isActive ? 'text-accent' : 'text-text-3 hover:text-text-2'}
              `}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}