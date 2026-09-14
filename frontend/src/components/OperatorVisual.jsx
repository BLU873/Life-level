import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { getCharacterVisual } from '../lib/characterVisual';

export default function OperatorVisual({ level, operatorName, alt }) {
  const reduced = useReducedMotion();
  const src = level != null ? getCharacterVisual(level) : null;
  if (!src) return null;

  const label = alt || `${operatorName || 'Operator'} operator visual, level ${level}`;

  return (
    <AnimatePresence initial={false}>
      <motion.img
        key={src}
        src={src}
        alt={label}
        role="img"
        aria-label={label}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? undefined : { opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </AnimatePresence>
  );
}