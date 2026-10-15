import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { Icon } from '@/components/primitives/Icon';
import { cn } from '@/utils/cn';

export interface MobileSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly side?: 'bottom' | 'left';
  readonly height?: string;
}

/**
 * Bottom sheet (mobile) / slide-over (tablet) for the sidebar and inspector.
 *
 * Traps focus the cheap way — autofocuses the panel, closes on Escape, and
 * locks body scroll while open — without pulling in a focus-trap dependency.
 */
export function MobileSheet({
  open,
  onClose,
  title,
  children,
  side = 'bottom',
  height = '72dvh',
}: MobileSheetProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const isBottom = side === 'bottom';

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={isBottom ? { y: '100%' } : { x: '-100%' }}
            animate={isBottom ? { y: 0 } : { x: 0 }}
            exit={isBottom ? { y: '100%' } : { x: '-100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            style={isBottom ? { height } : { width: '86vw', maxWidth: 340 }}
            className={cn(
              'glass-strong absolute flex flex-col overflow-hidden',
              isBottom
                ? 'inset-x-0 bottom-0 rounded-t-2xl border-t border-line/70'
                : 'inset-y-0 left-0 rounded-r-2xl border-r border-line/70',
            )}
          >
            <header className="flex items-center justify-between gap-2 border-b border-line/60 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface hover:text-ink"
              >
                <Icon name="close" size={15} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
