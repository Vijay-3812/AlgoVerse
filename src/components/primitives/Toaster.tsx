import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type ToastTone } from '@/store/toastStore';
import { Icon, type IconName } from './Icon';
import { cn } from '@/utils/cn';

const TONE_STYLE: Record<ToastTone, { border: string; icon: IconName; dot: string }> = {
  info: { border: 'border-accent-cyan/40', icon: 'info', dot: 'bg-accent-cyan' },
  success: { border: 'border-accent-lime/40', icon: 'check', dot: 'bg-accent-lime' },
  warning: { border: 'border-accent-amber/40', icon: 'warning', dot: 'bg-accent-amber' },
  error: { border: 'border-accent-red/45', icon: 'warning', dot: 'bg-accent-red' },
};

/**
 * Toast viewport. Mounted once in the shell, pinned bottom-right, polite to
 * screen readers (`aria-live="polite"`) and never blocks the visualiser.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const style = TONE_STYLE[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className={cn(
                'glass-strong pointer-events-auto relative overflow-hidden rounded-xl border px-3.5 py-3',
                style.border,
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className={cn('mt-0.5 flex h-5 w-5 items-center justify-center rounded-md', style.dot, 'bg-opacity-20')}>
                  <Icon name={style.icon} size={13} className="text-bg" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-0.5 text-2xs leading-relaxed text-ink-dim">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface hover:text-ink"
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
              {toast.durationMs > 0 ? (
                <motion.span
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: toast.durationMs / 1000, ease: 'linear' }}
                  style={{ transformOrigin: 'left' }}
                  className={cn('absolute inset-x-0 bottom-0 h-px', style.dot)}
                />
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
