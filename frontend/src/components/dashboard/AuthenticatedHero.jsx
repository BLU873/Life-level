import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProgressPreview from './ProgressPreview';
import '../../styles/dashboard.css';

const EASE = [0.16, 1, 0.3, 1];

// Ninja-turtle-style character hero comes from the VANGUARD video asset.
const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_154941_df1a96e1-a06f-450c-bd02-d863414cc1a0.mp4';

function capitalize(value) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function MetaItem({ value, label }) {
  return (
    <div className="dash-meta">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function ArcCard({ dailyProgress }) {
  if (!dailyProgress) {
    return (
      <aside className="dash-card">
        <p className="dash-card__label">Today's Arc</p>
        <div className="dash-card__num">
          —<span> / —</span>
        </div>
        <p className="dash-card__status">Loading your progress</p>
      </aside>
    );
  }

  if (dailyProgress.totalQuests === 0) {
    return (
      <aside className="dash-card">
        <p className="dash-card__label">Today's Arc</p>
        <div className="dash-card__num">
          —<span> / 0</span>
        </div>
        <p className="dash-card__status">Nothing planned</p>
        <div className="dash-card__empty">
          <Link to="/quests">Plan your first quest →</Link>
        </div>
      </aside>
    );
  }

  const isComplete = !!dailyProgress.isComplete;
  return (
    <aside className="dash-card">
      <p className="dash-card__label">Today's Arc</p>
      <div className="dash-card__num">
        {dailyProgress.completedQuests}
        <span> / {dailyProgress.totalQuests}</span>
      </div>
      <p className={`dash-card__status${isComplete ? ' is-complete' : ''}`}>
        {isComplete ? 'Arc complete' : `${dailyProgress.remainingQuests} remaining`}
      </p>
      <div className="dash-card__rewards">
        <span>+{dailyProgress.xpEarned ?? 0} XP today</span>
        <span>+{dailyProgress.goldEarned ?? 0} gold today</span>
      </div>
    </aside>
  );
}

export default function AuthenticatedHero({ character, dailyProgress, loading }) {
  const { user } = useAuth();
  const reduced = useReducedMotion();

  const hasCharacter = !!character;
  const meta = {
    quests: hasCharacter ? character.totalQuestsCompleted ?? '—' : '—',
    attribute: hasCharacter ? capitalize(character.strongestAttribute) || '—' : '—',
    xp: hasCharacter ? (character.totalXP ?? 0).toLocaleString() : '—',
    streak: hasCharacter ? character.currentStreak ?? 0 : '—',
  };

  return (
    <section className="ll-overview dash-hero">
      <div className="dash-hero__media">
        <video
          className="dash-hero__video"
          src={HERO_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <div className="dash-hero__ui">
        <div className="dash-hero__top">
          <span className="dash-hero__brand">
            <span className="dash-hero__brand-mark" aria-hidden="true">//</span>
            LIFE//LEVEL
          </span>
          <span className="dash-hero__label">Your Journey</span>
        </div>

        <div className="dash-hero__body">
          <div className="dash-hero__copy">
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
              className="dash-hero__eyebrow"
            >
              {user?.username ? `Welcome back, ${user.username}` : loading ? 'Loading your journey' : 'Your journey'}
            </motion.p>

            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
              className="dash-hero__headline"
            >
              Your life.
              <span>Your progression.</span>
            </motion.h1>

            <motion.p
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.38 }}
              className="dash-hero__sub"
            >
              Every action you complete becomes measurable progress.
            </motion.p>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
            >
              <ProgressPreview character={character} />
            </motion.div>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.6 }}
          >
            <ArcCard dailyProgress={dailyProgress} />
          </motion.div>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.72 }}
          className="dash-hero__meta"
        >
          <MetaItem value={meta.quests} label="Quests" />
          <MetaItem value={meta.attribute} label="Attributes" />
          <MetaItem value={meta.xp} label="XP" />
          <MetaItem value={meta.streak} label="Streak" />
        </motion.div>

        <div className="dash-hero__cue" aria-hidden="true">
          <span className="dash-hero__cue-rule" />
          Scroll
          <ChevronDown size={14} strokeWidth={2} />
        </div>
      </div>
    </section>
  );
}