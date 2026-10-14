import { motion } from 'framer-motion';
import { useId } from 'react';
import { cn } from '@/utils/cn';

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: React.ReactNode;
}

export interface SegmentedProps<T extends string> {
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
  readonly ariaLabel?: string;
}

/**
 * Tab / toggle group with a shared-layout indicator that glides between
 * options (Framer Motion `layoutId`). Rendered as a proper ARIA tablist so
 * arrow keys and screen readers behave.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  className,
  ariaLabel,
}: SegmentedProps<T>) {
  const layoutId = useId();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-line/70 bg-surface/60 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-[10px] font-medium transition-colors duration-200',
              size === 'sm' ? 'h-7 px-2.5 text-2xs' : 'h-9 px-3.5 text-xs',
              active ? 'text-ink' : 'text-ink-faint hover:text-ink-dim',
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-[10px] border border-line/80 bg-elevated/85 shadow-sm"
              />
            ) : null}
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
