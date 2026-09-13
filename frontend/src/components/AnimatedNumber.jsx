import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Animates from the previous rendered value to the new authoritative value.
// The final displayed value is always exactly the backend value — never faked.
export default function AnimatedNumber({ value, duration = 0.8 }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion()) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    if (from === value) return;
    let rafId = 0;
    const start = performance.now();
    const step = (t) => {
      const progress = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (value - from) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return <span className="tnum">{display.toLocaleString()}</span>;
}