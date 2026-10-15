import { motion } from 'framer-motion';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

type MotionSafeDivProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

export interface GlassPanelProps extends MotionSafeDivProps {
  readonly children: ReactNode;
  /** `strong` = more opaque (floating bars), `plain` = no blur (perf escape hatch). */
  readonly variant?: 'default' | 'strong' | 'plain';
  /** Animated conic gradient border — reserve for hero moments. */
  readonly gradient?: boolean;
  readonly padded?: boolean;
  readonly radius?: 'md' | 'lg' | 'xl' | '2xl';
  /** Set false to disable the entry animation (e.g. inside AnimatePresence). */
  readonly animateIn?: boolean;
}

const RADIUS: Record<NonNullable<GlassPanelProps['radius']>, string> = {
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl',
};

/**
 * The one surface primitive. Glass, hairline border, inner highlight and (very
 * subtle) noise all come from CSS variables, so this component never needs to
 * know which theme is active.
 */
export function GlassPanel({
  children,
  className,
  variant = 'default',
  gradient = false,
  padded = true,
  radius = 'lg',
  animateIn = false,
  ...rest
}: GlassPanelProps) {
  const surface = cn(
    'relative overflow-hidden',
    RADIUS[radius],
    variant === 'strong' ? 'glass-strong' : variant === 'plain' ? 'bg-surface/70 border border-line/70' : 'glass',
    padded && 'p-4',
    className,
  );

  const body = (
    <>
      {/* top inner highlight — reads as a light source above the panel */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60"
      />
      {children}
    </>
  );

  if (gradient) {
    return (
      <div className={cn('gradient-border', RADIUS[radius], className)} {...rest}>
        <div className={cn('gradient-border__inner relative overflow-hidden', padded && 'p-4')}>{body}</div>
      </div>
    );
  }

  if (!animateIn) {
    return (
      <div className={surface} {...rest}>
        {body}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={surface}
      {...rest}
    >
      {body}
    </motion.div>
  );
}

/** Section heading used inside panels: eyebrow + title + optional action. */
export function PanelHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-2xs font-medium uppercase tracking-[0.18em] text-ink-faint">{eyebrow}</p>
        ) : null}
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
      </div>
      {action}
    </div>
  );
}
