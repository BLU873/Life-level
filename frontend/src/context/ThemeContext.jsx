import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'll-theme';

const ThemeContext = createContext(null);

function getSystem() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // ignore storage errors
  }
  return 'system';
}

function resolve(preference) {
  if (preference === 'system') return getSystem();
  return preference;
}

function applyTheme(resolved) {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolve(readPreference()));

  useEffect(() => {
    applyTheme(resolvedTheme);

    // Follow OS changes only while the user has not chosen an explicit theme.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (readPreference() === 'system') setResolvedTheme(getSystem());
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [resolvedTheme]);

  const setPreference = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    setPreferenceState(next);
    setResolvedTheme(resolve(next));
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setPreference]);

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}