import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Monitor, Moon, Sun, UserCircle, Volume2, VolumeX } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isSoundEnabled, setSoundEnabled } from '../utils/sound';
import { TacticalPanel, TacticalButton } from '../components/tactical';

const themeOptions = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();
  const [soundsOn, setSoundsOn] = useState(isSoundEnabled);

  function handleSoundToggle() {
    const next = !soundsOn;
    setSoundsOn(next);
    setSoundEnabled(next);
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader
        kicker="System // Preferences"
        title="Settings"
        description="Manage your account and preferences."
      />

      {/* Quick controls — the single primary row for identity, theme, sign out */}
      <TacticalPanel>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-semibold text-text-2"
            >
              {user?.username?.[0]?.toUpperCase() || <UserCircle size={18} />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">{user?.username}</p>
              <p className="truncate text-xs text-text-3">{user?.email}</p>
            </div>
          </div>
          <div
            role="group"
            aria-label="Color theme"
            className="flex shrink-0 rounded-[4px] border border-line bg-surface p-0.5"
          >
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPreference(value)}
                aria-pressed={preference === value}
                aria-label={`${label} theme`}
                title={`${label} theme`}
                className={`
                  inline-flex h-8 items-center gap-1.5 rounded-[3px] px-2.5 font-mono text-[11px] uppercase tracking-[0.16em]
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tact/40
                  ${preference === value ? 'bg-tact/10 text-tact' : 'text-text-2 hover:text-text'}
                `}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <TacticalButton
            variant="danger"
            size="sm"
            onClick={handleLogout}
            aria-label="Log out"
            className="shrink-0"
          >
            <LogOut size={14} />
            Log out
          </TacticalButton>
        </div>
      </TacticalPanel>

      <div className="space-y-5">
        {/* Sound */}
        <TacticalPanel>
          <h2 className="text-sm font-semibold tracking-tight text-text">Sound</h2>
          <p className="mt-1 text-[13px] text-text-2">
            Play short sounds when you complete operations, level up, or unlock achievements.
          </p>

          <div className="mt-4 inline-flex rounded-[4px] border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={handleSoundToggle}
              aria-pressed={soundsOn}
              className={`
                inline-flex h-8 items-center gap-2 rounded-[3px] px-3 font-mono text-[11px] uppercase tracking-[0.16em]
                transition-colors duration-150
                ${soundsOn ? 'bg-tact/10 text-tact' : 'text-text-2 hover:text-text'}
              `}
            >
              <Volume2 size={15} />
              On
            </button>
            <button
              type="button"
              onClick={handleSoundToggle}
              aria-pressed={!soundsOn}
              className={`
                inline-flex h-8 items-center gap-2 rounded-[3px] px-3 font-mono text-[11px] uppercase tracking-[0.16em]
                transition-colors duration-150
                ${!soundsOn ? 'bg-tact/10 text-tact' : 'text-text-2 hover:text-text'}
              `}
            >
              <VolumeX size={15} />
              Off
            </button>
          </div>
        </TacticalPanel>
      </div>
    </div>
  );
}