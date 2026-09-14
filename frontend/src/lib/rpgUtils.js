/**
 * Client-side RPG display utilities.
 * These are for UI display only — the backend is the source of truth.
 */

export function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function getAttributeIcon(attribute) {
  const icons = {
    INTELLECT: 'Brain',
    STRENGTH: 'Dumbbell',
    DISCIPLINE: 'Target',
    CREATIVITY: 'Palette',
    SOCIAL: 'Users',
  };
  return icons[attribute] || 'Star';
}

export function getAttributeColor(attribute) {
  const colors = {
    INTELLECT: '#99652e',
    STRENGTH: '#b0462c',
    DISCIPLINE: '#a67921',
    CREATIVITY: '#a97a5b',
    SOCIAL: '#6f9057',
  };
  return colors[attribute] || '#c45a18';
}