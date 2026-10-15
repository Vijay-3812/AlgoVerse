import { useSpring } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

export interface AnimatedNumberProps {
  readonly value: number;
  readonly format?: (value: number) => string;
  readonly className?: string;
  /** Tabular figures stop the metric strip from jittering. */
  readonly tabular?: boolean;
}

/**
 * Ticking counter. Springs from the previous value to the new one; with
 * reduced motion it simply swaps. Uses one spring and one state update per
 * frame — cheap enough for a six-counter metrics strip at 60fps.
 */
export function AnimatedNumber({ value, format, className, tabular = true }: AnimatedNumberProps) {
  const reduced = usePrefersReducedMotion();
  const spring = useSpring(value, { stiffness: 210, damping: 26, mass: 0.5 });
  const [display, setDisplay] = useState(value);
  const lastValue = useRef(value);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    spring.set(value);
  }, [reduced, spring, value]);

  useEffect(() => {
    if (reduced) return;
    const unsubscribe = spring.on('change', (latest) => {
      const rounded = Math.round(latest);
      if (rounded !== lastValue.current) {
        lastValue.current = rounded;
        setDisplay(rounded);
      }
    });
    return () => unsubscribe();
  }, [reduced, spring]);

  return (
    <span className={cn(tabular && 'tabular-nums', className)}>
      {format ? format(display) : display}
    </span>
  );
}
