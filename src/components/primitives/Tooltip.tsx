import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TooltipProps {
  readonly label: ReactNode;
  readonly shortcut?: string;
  readonly side?: 'top' | 'bottom' | 'right' | 'left';
  readonly children: ReactNode;
  /** Wrap in a span instead of a button — for text triggers. */
  readonly className?: string;
  readonly delayMs?: number;
}

const SIDE_CLASS: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  bottom: 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  right: 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2',
  left: 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2',
};

const ORIGIN: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom center',
  bottom: 'top center',
  right: 'left center',
  left: 'right center',
};

/**
 * Accessible tooltip: shows on hover *and* keyboard focus, is wired to the
 * trigger with `aria-describedby`, and animates from the trigger's edge.
 */
export function Tooltip({ label, shortcut, side = 'top', children, className, delayMs = 120 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const id = useId();

  const show = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delayMs);
  }, [delayMs]);

  const hide = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setOpen(false);
  }, []);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      <AnimatePresence>
        {open ? (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: ORIGIN[side] }}
            className={cn(
              'pointer-events-none absolute z-50 flex items-center gap-2 whitespace-nowrap rounded-lg border border-line/80',
              'bg-elevated/95 px-2.5 py-1.5 text-2xs font-medium text-ink shadow-lg backdrop-blur-md',
              SIDE_CLASS[side],
            )}
          >
            {label}
            {shortcut ? <kbd className="kbd">{shortcut}</kbd> : null}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
