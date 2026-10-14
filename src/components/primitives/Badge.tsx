import type { ReactNode } from 'react';
import type { Difficulty } from '@/types';
import { cn } from '@/utils/cn';

type Tone = 'neutral' | 'cyan' | 'violet' | 'pink' | 'lime' | 'amber' | 'red' | 'ghost';

const TONE: Record<Tone, string> = {
  neutral: 'border-line/80 bg-surface/70 text-ink-dim',
  cyan: 'border-accent-cyan/35 bg-accent-cyan/10 text-accent-cyan',
  violet: 'border-accent-violet/35 bg-accent-violet/10 text-accent-violet',
  pink: 'border-accent-pink/35 bg-accent-pink/10 text-accent-pink',
  lime: 'border-accent-lime/35 bg-accent-lime/10 text-accent-lime',
  amber: 'border-accent-amber/35 bg-accent-amber/10 text-accent-amber',
  red: 'border-accent-red/40 bg-accent-red/10 text-accent-red',
  ghost: 'border-transparent bg-ink-faint/10 text-ink-faint',
};

export interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: Tone;
  readonly className?: string;
  /** Big-O badges use mono + slightly wider tracking. */
  readonly mono?: boolean;
  readonly title?: string;
}

export function Badge({ children, tone = 'neutral', className, mono = false, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium leading-5',
        mono && 'font-mono tracking-tight',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const DIFFICULTY_TONE: Record<Difficulty, Tone> = {
  easy: 'lime',
  medium: 'amber',
  hard: 'red',
};

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <Badge tone={DIFFICULTY_TONE[difficulty]} className={cn('capitalize', className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {difficulty}
    </Badge>
  );
}

/** Big-O badge with hover-revealed best/avg/worst, if supplied. */
export function ComplexityBadge({
  value,
  label,
  tone = 'violet',
  className,
}: {
  value: string;
  label?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Badge tone={tone} mono className={className} title={label}>
      {label ? <span className="text-ink-faint">{label}</span> : null}
      <span className="font-semibold">{value}</span>
    </Badge>
  );
}
