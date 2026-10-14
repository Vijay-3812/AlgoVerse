import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { DEMO_BARS, barHeight, buildDemoReel } from '@/utils/demoReel';
import { Icon } from '@/components/primitives/Icon';

const VALUE_BY_ID = new Map(DEMO_BARS.map((bar) => [bar.id, bar.value]));

/**
 * The hero stage: a tilt-reactive glass "screenshot" of the product, cycling a
 * pre-recorded sorting reel with FLIP bar swaps.
 *
 * Mouse position drives a small perspective rotation (springs, ±5°) and the
 * reel advances on its own loop — that combination is what sells "this thing is
 * alive" in the first 400ms of the page. Under reduced motion the reel holds a
 * single frame and the tilt is off.
 */
export function HeroStage() {
  const reduced = useReducedMotion();
  const reel = useMemo(() => buildDemoReel(), []);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (reduced) return undefined;
    const id = window.setInterval(() => {
      setFrameIndex((index) => (index + 1) % reel.length);
    }, 420);
    return () => window.clearInterval(id);
  }, [reel.length, reduced]);

  const frame = reel[frameIndex] ?? reel[0];

  // Pointer parallax: two motion values feed one transform template.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 140, damping: 20, mass: 0.7 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);
  const rotateY = useTransform(sx, [0, 1], [-7, 7]);
  const rotateX = useTransform(sy, [0, 1], [6, -6]);
  const orbX = useTransform(sx, [0, 1], [18, -18]);
  const orbY = useTransform(sy, [0, 1], [14, -14]);
  const transform = useMotionTemplate`perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  return (
    <div
      className="relative"
      onPointerMove={(event) => {
        if (reduced) return;
        const rect = event.currentTarget.getBoundingClientRect();
        px.set((event.clientX - rect.left) / rect.width);
        py.set((event.clientY - rect.top) / rect.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      <motion.div
        style={reduced ? undefined : { transform }}
        className="glass-strong relative overflow-hidden rounded-3xl border-line/70 p-5"
      >
        {/* top chrome */}
        <div className="flex items-center gap-2 pb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-pink/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent-lime/70" />
          <span className="ml-3 font-mono text-2xs text-ink-faint">bubble-sort · 10 items · 1.0×</span>
          <span className="ml-auto flex items-center gap-1 rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-2 py-0.5 text-2xs text-accent-cyan">
            <Icon name="play" size={10} filled />
            replaying trace
          </span>
        </div>

        {/* bar stage */}
        <div className="relative flex h-44 items-end justify-between gap-1.5 rounded-xl border border-line/50 bg-bg/40 px-3 pb-3 pt-4">
          {frame.order.map((id) => {
            const value = VALUE_BY_ID.get(id) ?? 0;
            const isActive = frame.active.includes(id);
            const isSorted = frame.order.indexOf(id) >= frame.order.length - frame.sorted;
            return (
              <motion.div
                key={id}
                layout
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                className="relative flex-1 rounded-md"
                style={{
                  height: `${barHeight(value) * 100}%`,
                  background: isActive
                    ? 'linear-gradient(180deg, rgb(var(--c-pink)), rgb(var(--c-violet)))'
                    : isSorted
                      ? 'linear-gradient(180deg, rgb(var(--c-lime)), rgb(var(--c-cyan) / 0.6))'
                      : 'linear-gradient(180deg, rgb(var(--c-cyan) / 0.85), rgb(var(--c-violet) / 0.5))',
                  boxShadow: isActive ? '0 0 24px -2px rgb(var(--c-pink) / 0.7)' : '0 0 18px -8px rgb(var(--c-cyan) / 0.8)',
                }}
              >
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] text-ink-faint">
                  {value}
                </span>
              </motion.div>
            );
          })}

          {/* scanline sweep */}
          {reduced ? null : (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-accent-cyan/8 to-transparent"
              animate={{ y: ['-100%', '340%'] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>

        {/* caption + metrics */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 truncate font-mono text-2xs text-ink-dim">
            <span className="text-accent-cyan">›</span> {frame.caption}
          </p>
          <div className="flex items-center gap-3 font-mono text-2xs text-ink-faint">
            <span>cmp {reel.slice(0, frameIndex + 1).filter((f) => f.caption.startsWith('compare')).length}</span>
            <span>swp {reel.slice(0, frameIndex + 1).filter((f) => f.caption.startsWith('swap')).length}</span>
            <span className="text-accent-lime">{frame.sorted}/10 sorted</span>
          </div>
        </div>
      </motion.div>

      {/* floating decorative orbs, parallaxed against the card */}
      {reduced ? null : (
        <>
          <motion.span
            aria-hidden
            style={{ x: orbX, y: orbY }}
            className="pointer-events-none absolute -left-6 -top-6 h-16 w-16 rounded-2xl border border-accent-cyan/30 bg-accent-cyan/5 backdrop-blur-sm"
          />
          <motion.span
            aria-hidden
            style={{ x: orbY, y: orbX }}
            className="pointer-events-none absolute -bottom-5 right-8 h-12 w-12 animate-float rounded-full border border-accent-pink/30 bg-accent-pink/5 backdrop-blur-sm"
          />
        </>
      )}
    </div>
  );
}
