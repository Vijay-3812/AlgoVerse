import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { ReactNode } from 'react';
import { useSpotlight } from '@/hooks/useSpotlight';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/utils/cn';

export interface TiltCardProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** Max rotation in degrees. 6 is tasteful; 14 is a fairground. */
  readonly maxTilt?: number;
  readonly spotlightRadius?: number;
}

/**
 * 3D hover card: pointer position → perspective rotateX/rotateY (spring-damped)
 * plus a radial spotlight that follows the cursor.
 *
 * Only `transform` and two CSS variables animate, and the whole effect is
 * skipped under `prefers-reduced-motion`. The wrapper stays a plain div so any
 * content (a link, a button group) can live inside without event conflicts.
 */
export function TiltCard({ children, className, maxTilt = 6, spotlightRadius = 380 }: TiltCardProps) {
  const reduced = usePrefersReducedMotion();
  const spotlight = useSpotlight<HTMLDivElement>(spotlightRadius);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springConfig = { stiffness: 220, damping: 24, mass: 0.6 };
  const sx = useSpring(px, springConfig);
  const sy = useSpring(py, springConfig);

  const rotateY = useTransform(sx, [0, 1], [-maxTilt, maxTilt]);
  const rotateX = useTransform(sy, [0, 1], [maxTilt, -maxTilt]);
  const transform = useMotionTemplate`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;

  return (
    <motion.div
      ref={spotlight.ref}
      style={reduced ? undefined : { transform }}
      onPointerMove={(event) => {
        spotlight.onPointerMove(event);
        if (reduced) return;
        const rect = event.currentTarget.getBoundingClientRect();
        px.set((event.clientX - rect.left) / rect.width);
        py.set((event.clientY - rect.top) / rect.height);
      }}
      onPointerLeave={() => {
        spotlight.onPointerLeave();
        px.set(0.5);
        py.set(0.5);
      }}
      whileHover={reduced ? undefined : { z: 10 }}
      className={cn('spotlight preserve-3d group relative', className)}
    >
      {children}
    </motion.div>
  );
}
