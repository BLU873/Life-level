import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import CharacterReveal, { PRODUCT_IMAGE } from '../components/landing/CharacterReveal';
import '../styles/landing.css';

const EASE = [0.16, 1, 0.3, 1];

const SPECS = [
  ['Quests', 'Every goal is a quest'],
  ['Attributes', 'Strength · Mind · Focus'],
  ['XP', 'Earn it on every win'],
  ['Streaks', 'Consecutive days of progress'],
];

export default function Landing() {
  const reduced = useReducedMotion();

  const rise = (delay) =>
    reduced
      ? { initial: false }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease: EASE, delay },
        };

  return (
    <div className="entry">
      <section className="entry-hero">
        <CharacterReveal />

        <div className="entry-hero__ui">
          <div className="entry-hero__left">
            <div className="entry-hero__copy">
              <motion.p {...rise(0.2)} className="ln-eyebrow">
                LIFE//LEVEL
              </motion.p>

              <motion.h1 {...rise(0.28)} className="entry-hero__headline">
                <span>Turn real life</span>
                <span className="entry-hero__headline-soft">into progress.</span>
              </motion.h1>

              <motion.p {...rise(0.44)} className="entry-hero__sub">
                Turn everyday goals into quests. Earn XP. Build your attributes.
                Level up through consistency.
              </motion.p>

              <motion.div {...rise(0.58)} className="entry-hero__actions">
                <Link to="/signup" className="ln-cta">
                  Get started
                  <span className="ln-cta__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
                <Link to="/login" className="ln-cta-ghost">
                  I already have an account
                </Link>
              </motion.div>
            </div>

            <motion.article {...rise(0.7)} className="entry-card">
              <div
                className="entry-card__thumb"
                style={{ backgroundImage: `url("${PRODUCT_IMAGE}")` }}
                aria-hidden="true"
              />
              <h2 className="entry-card__name">LIFE//LEVEL</h2>
              <p className="entry-card__desc">Every completed quest levels up your character.</p>
            </motion.article>
          </div>

          <motion.div
            {...rise(0.48)}
            className="entry-hero__page"
            aria-hidden="true"
          >
            01 — LIFE//LEVEL
          </motion.div>

          <motion.div {...rise(0.78)} className="entry-hero__specs">
            <h3>Core loop</h3>
            {SPECS.map(([label, value]) => (
              <div className="spec-row" key={label}>
                <span className="spec-label">{label}</span>
                <span className="spec-value">{value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}