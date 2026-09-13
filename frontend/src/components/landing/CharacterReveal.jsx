import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export const HERO_BASE_IMAGE =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260831_115955_2a9adb39-5e9b-4ced-96e2-6900eabe3de9.png&w=1920&q=85';

export const HERO_REVEAL_IMAGE =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260831_123709_183f0065-efb2-4bb2-a849-13aaa5af2f3f.png&w=1920&q=85';

export const PRODUCT_IMAGE =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260831_121937_3f02b5a0-5b86-43d9-b30e-03c5e46632e7.png&w=1920&q=85';

function spotlightRadius() {
  const w = window.innerWidth;
  if (w < 480) return 120;
  if (w < 720) return 160;
  return 260;
}

export default function CharacterReveal() {
  const frameRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const el = frameRef.current;
    if (!el) return;

    let rafId = 0;
    let pending = { x: -1200, y: -1200 };
    let last = { x: -9999, y: -9999 };

    const apply = () => {
      rafId = 0;
      el.style.setProperty('--spot-x', `${pending.x}px`);
      el.style.setProperty('--spot-y', `${pending.y}px`);
      el.style.setProperty('--spot-r', `${spotlightRadius()}px`);
    };

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (Math.abs(x - last.x) < 3 && Math.abs(y - last.y) < 3) return;
      last = { x, y };
      pending = { x, y };
      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduced]);

  return (
    <div ref={frameRef} className={reduced ? 'hero-image' : 'hero-image hero-image--live'}>
      <div className="hero-image__base" style={{ backgroundImage: `url("${HERO_BASE_IMAGE}")` }} />
      <div className="hero-image__reveal" style={{ backgroundImage: `url("${HERO_REVEAL_IMAGE}")` }} />
    </div>
  );
}