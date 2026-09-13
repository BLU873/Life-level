const STORAGE_KEY = 'll-celebration-sounds';

export const SOUNDS = {
  'quest-complete': '/sounds/quest-complete.wav',
  'focus-complete': '/sounds/focus-complete.wav',
  achievement: '/sounds/achievement.wav',
  'level-up': '/sounds/level-up.wav',
};

const audioCache = new Map();

export function isSoundEnabled() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // ignore storage errors
  }
}

export function playSound(type) {
  if (!isSoundEnabled()) return;
  const src = SOUNDS[type];
  if (!src) return;
  try {
    let audio = audioCache.get(type);
    if (!audio) {
      audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0.7;
      audioCache.set(type, audio);
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // audio unavailable — celebrations stay visual
  }
}

// One backend completion response = one celebration sequence.
// quest-complete → level-up → achievement (staggered, never simultaneous).
export function playCelebrationSound(data) {
  playSound('quest-complete');
  if (data?.progression?.leveledUp) {
    window.setTimeout(() => playSound('level-up'), 450);
  }
  if (data?.newAchievements?.length) {
    window.setTimeout(() => playSound('achievement'), 900);
  }
}