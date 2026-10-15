import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Page transitions: blur + scale + fade, never a hard cut.
 *
 * `mode="wait"` means the outgoing page finishes before the incoming one
 * mounts — which also guarantees a visualiser's rAF loops and pointer
 * listeners are torn down before the next page's are created (no two algorithms
 * animating at once). The `motion.div` owns only transform/opacity/filter, so
 * the whole transition stays on the compositor.
 */
export function RouteTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12, scale: 0.995, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, scale: 0.995, filter: 'blur(8px)' }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {outlet as ReactNode}
      </motion.div>
    </AnimatePresence>
  );
}

/** Stagger container/child variants reused by every page. */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
} as const;

export const staggerChild = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;
