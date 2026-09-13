import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { LogOut, Monitor, Moon, Sun, UserCircle, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isSoundEnabled, setSoundEnabled } from '../utils/sound';

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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Settings</h1>
        <p className="mt-1 text-sm text-text-2">Manage your account and preferences.</p>
      </header>

      <div className="space-y-5">
        {/* Account */}
        <section className="card p-6">
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
        </section>

        {/* Appearance */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold tracking-tight text-text">Appearance</h2>
          <p className="mt-1 text-[13px] text-text-2">Choose how LIFE//LEVEL looks on this device.</p>

          <div className="mt-4 inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setPreference(value)}
                className={`
                  flex h-8 items-center gap-2 rounded-md px-3.5 text-[13px] font-medium
                  transition-colors duration-150
                  ${preference === value
                    ? 'bg-surface text-text shadow-card'
                    : 'text-text-2 hover:text-text'
                  }
                `}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Celebrations */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold tracking-tight text-text">Celebrations</h2>
          <p className="mt-1 text-[13px] text-text-2">
            Play short sounds when you complete quests, level up, or unlock achievements.
          </p>

          <div className="mt-4 inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
            <button
              type="button"
              onClick={handleSoundToggle}
              aria-pressed={soundsOn}
              className={`
                flex h-8 items-center gap-2 rounded-md px-3.5 text-[13px] font-medium
                transition-colors duration-150
                ${soundsOn
                  ? 'bg-surface text-text shadow-card'
                  : 'text-text-2 hover:text-text'
                }
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
                flex h-8 items-center gap-2 rounded-md px-3.5 text-[13px] font-medium
                transition-colors duration-150
                ${!soundsOn
                  ? 'bg-surface text-text shadow-card'
                  : 'text-text-2 hover:text-text'
                }
              `}
            >
              <VolumeX size={15} />
              Off
            </button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold tracking-tight text-text">Session</h2>
          <p className="mt-1 text-[13px] text-text-2">
            Log out of LIFE//LEVEL on this device.
          </p>
          <div className="mt-4">
            <Button variant="danger" onClick={handleLogout}>
              <LogOut size={16} />
              Log out
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}