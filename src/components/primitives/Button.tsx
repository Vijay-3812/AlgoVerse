import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useCallback, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cn } from '@/utils/cn';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly icon?: IconName;
  readonly iconPosition?: 'left' | 'right';
  readonly loading?: boolean;
  /** Slight attraction toward the cursor — 3px, not a gimmick. */
  readonly magnetic?: boolean;
  /** Click ripple from the pointer position. */
  readonly ripple?: boolean;
  readonly children?: ReactNode;
  /** Renders as an anchor when provided. */
  readonly href?: string;
}

const VARIANT: Record<Variant, string> = {
  primary:
    'text-bg bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-pink shadow-[0_10px_30px_-12px_rgb(var(--c-violet)/0.9)] hover:brightness-110',
  secondary: 'bg-surface/80 text-ink border border-line/80 hover:bg-surface hover:border-ink-faint/50',
  ghost: 'text-ink-dim hover:text-ink hover:bg-surface/60',
  outline: 'border border-line/80 text-ink hover:border-accent-cyan/60 hover:text-accent-cyan',
  danger: 'bg-accent-red/15 text-accent-red border border-accent-red/40 hover:bg-accent-red/25',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
};

interface Ripple {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

let rippleId = 0;

/**
 * Button with the full micro-interaction kit: magnetic pull, pointer-origin
 * ripple, gradient primary. All movement is transform/opacity only, is capped
 * at a few pixels, and is disabled under `prefers-reduced-motion`.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  magnetic = false,
  ripple = true,
  className,
  children,
  href,
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // Magnetic pull: pointer offset → small spring translation.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 260, damping: 22, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 260, damping: 22, mass: 0.4 });
  const x = useTransform(sx, (v) => (reduced ? 0 : v));
  const y = useTransform(sy, (v) => (reduced ? 0 : v));

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!magnetic || reduced) return;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const relX = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
      const relY = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
      px.set(relX * 6);
      py.set(relY * 5);
    },
    [magnetic, px, py, reduced],
  );

  const handlePointerLeave = useCallback(() => {
    px.set(0);
    py.set(0);
  }, [px, py]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !reduced) {
        const rect = event.currentTarget.getBoundingClientRect();
        rippleId += 1;
        const next: Ripple = {
          id: rippleId,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        setRipples((prev) => [...prev.slice(-2), next]);
        window.setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== next.id)), 620);
      }
      onClick?.(event);
    },
    [onClick, reduced, ripple],
  );

  const content = (
    <>
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icon && iconPosition === 'left' ? (
        <Icon name={icon} size={size === 'lg' ? 18 : 15} filled={icon === 'play'} />
      ) : null}
      {children}
      {icon && iconPosition === 'right' ? <Icon name={icon} size={size === 'lg' ? 18 : 15} /> : null}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ opacity: 0.4, scale: 0 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pointer-events-none absolute h-24 w-24 rounded-full bg-current/25"
          style={{ left: r.x - 48, top: r.y - 48 }}
        />
      ))}
    </>
  );

  const classes = cn(
    'relative inline-flex select-none items-center justify-center overflow-hidden font-medium',
    'transition-colors duration-200 ease-swift',
    'disabled:cursor-not-allowed disabled:opacity-45',
    VARIANT[variant],
    SIZE[size],
    className,
  );

  if (href) {
    return (
      <motion.a
        ref={ref}
        href={href}
        style={{ x, y }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={classes}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref}
      type={rest.type ?? 'button'}
      style={{ x, y }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      disabled={disabled || loading}
      className={classes}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {content}
    </motion.button>
  );
}
