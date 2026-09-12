import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, ScrollText, TrendingUp, Flame } from 'lucide-react';
import Button from '../components/ui/Button';

const features = [
  {
    icon: ScrollText,
    title: 'Quests',
    body: 'Turn everyday goals into quests with clear rewards and meaningful XP.',
  },
  {
    icon: TrendingUp,
    title: 'Progression',
    body: 'A clean level curve and five attributes that make progress tangible.',
  },
  {
    icon: Flame,
    title: 'Streaks',
    body: 'Small, consistent wins build the momentum that changes how you work.',
  },
];

const ease = [0.32, 0.72, 0, 1];

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
            <Crosshair size={16} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-text">
            LIFE<span className="mx-px text-text-3">//</span>LEVEL
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-text-2"
        >
          RPG productivity, done properly
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.05 }}
          className="mt-6 font-display text-4xl font-semibold tracking-tight text-text md:text-6xl md:leading-[1.05]"
        >
          Level up your <span className="text-accent">real life</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="mt-5 max-w-xl text-base leading-relaxed text-text-2 md:text-lg"
        >
          LIFE//LEVEL turns daily tasks into quests, progress into levels, and
          consistency into character.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.15 }}
          className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
        >
          <Link to="/signup" className="sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">Start your journey</Button>
          </Link>
          <Link to="/login" className="sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">Sign in</Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.25 }}
          className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card card-hover p-5">
              <Icon size={18} className="text-accent" />
              <h3 className="mt-3 text-sm font-semibold text-text">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-2">{body}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line py-6 text-center text-xs text-text-3">
        LIFE//LEVEL — a calmer way to keep score with yourself.
      </footer>
    </div>
  );
}