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
    <div className="mx-auto max-w-2xl">
      <PageHeader
        kicker="System // Preferences"
        title="Settings"
        description="Manage your account and preferences."
      />

      <div className="space-y-5">
        {/* Account */}
        <TacticalPanel>
          <h2 className="text-sm font-semibold tracking-tight text-text">Account</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-sm font-semibold text-text-2">
              <UserCircle size={28} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">{user?.username}</p>
              <p className="truncate text-[13px] text-text-2">{user?.email}</p>
            </div>
          </div>
        </TacticalPanel>

        {/* Appearance */}
        <TacticalPanel>
          <h2 className="text-sm font-semibold tracking-tight text-text">Appearance</h2>
          <p className="mt-1 text-[13px] text-text-2">Choose how LIFE//LEVEL looks on this device.</p>

          <div className="mt-4 inline-flex rounded-[4px] border border-line bg-surface p-0.5">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPreference(value)}
                aria-pressed={preference === value}
                className={`
                  inline-flex h-8 items-center gap-2 rounded-[3px] px-3 font-mono text-[11px] uppercase tracking-[0.16em]
                  transition-colors duration-150
                  ${preference === value ? 'bg-tact/10 text-tact' : 'text-text-2 hover:text-text'}
                `}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </TacticalPanel>

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

        {/* Sign out */}
        <TacticalPanel>
          <h2 className="text-sm font-semibold tracking-tight text-text">Sign out</h2>
          <p className="mt-1 text-[13px] text-text-2">
            Log out of LIFE//LEVEL on this device.
          </p>
          <div className="mt-4">
            <TacticalButton variant="danger" onClick={handleLogout}>
              <LogOut size={16} />
              Log out
            </TacticalButton>
          </div>
        </TacticalPanel>
      </div>
    </div>
  );
}