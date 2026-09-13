import { Flame, Coins } from 'lucide-react';

function formatGold(value) {
  return Number(value || 0).toLocaleString();
}

export default function ProgressPreview({ character }) {
  if (!character) return null;

  const level = String(character.level || 1).padStart(2, '0');
  const xpInto = character.xpIntoCurrentLevel ?? 0;
  const xpReq = character.xpRequiredForNextLevel ?? 0;
  const pct =
    xpReq > 0 ? Math.max(0, Math.min(100, (xpInto / xpReq) * 100)) : 0;

  return (
    <div className="dash-preview">
      <div className="dash-preview__row">
        <span className="dash-preview__level">
          Level <b>{level}</b>
        </span>
        <span className="dash-preview__xp">
          {xpInto.toLocaleString()} / {xpReq.toLocaleString()} XP
        </span>
      </div>
      <div className="dash-preview__track" aria-hidden="true">
        <div className="dash-preview__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="dash-preview__stats">
        <span>
          <Flame size={13} style={{ color: 'var(--ember-2)', verticalAlign: '-2px', marginRight: '0.4rem' }} />
          {character.currentStreak ?? 0} day streak
        </span>
        <span>
          <Coins size={13} style={{ color: 'var(--ember-2)', verticalAlign: '-2px', marginRight: '0.4rem' }} />
          Gold {formatGold(character.gold)}
        </span>
      </div>
    </div>
  );
}