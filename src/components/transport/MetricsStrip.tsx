import { AnimatePresence, motion } from 'framer-motion';
import type { AnyStep, Complexity, MetricsSnapshot, PlaybackStatus } from '@/types';
import { AnimatedNumber } from '@/components/primitives/AnimatedNumber';
import { Badge, ComplexityBadge } from '@/components/primitives/Badge';
import { Icon, type IconName } from '@/components/primitives/Icon';
import { cn } from '@/utils/cn';
import { formatCount } from '@/utils/format';

export interface MetricsStripProps {
  readonly step: AnyStep | null;
  readonly metrics: MetricsSnapshot;
  readonly complexity: Complexity | null;
  readonly status: PlaybackStatus;
  readonly className?: string;
}

interface Counter {
  readonly key: keyof MetricsSnapshot;
  readonly label: string;
  readonly icon: IconName;
  readonly color: string;
}

/** The six counters every algorithm shares — the trace system's payoff. */
const COUNTERS: readonly Counter[] = [
  { key: 'comparisons', label: 'Compares', icon: 'sliders', color: 'text-accent-amber' },
  { key: 'swaps', label: 'Swaps', icon: 'shuffle', color: 'text-accent-pink' },
  { key: 'writes', label: 'Writes', icon: 'download', color: 'text-accent-violet' },
  { key: 'reads', label: 'Reads', icon: 'search', color: 'text-accent-cyan' },
  { key: 'calls', label: 'Calls', icon: 'layers', color: 'text-accent-violet' },
  { key: 'depth', label: 'Depth', icon: 'stack', color: 'text-accent-lime' },
];

const STATUS_TONE: Record<PlaybackStatus, { tone: 'cyan' | 'amber' | 'lime' | 'ghost'; label: string }> = {
  idle: { tone: 'ghost', label: 'ready' },
  playing: { tone: 'cyan', label: 'playing' },
  paused: { tone: 'amber', label: 'paused' },
  completed: { tone: 'lime', label: 'complete' },
};

/**
 * Bottom strip: live narration + the counters + the Big-O badge.
 *
 * This is where the architecture shows off — no algorithm had to be told how to
 * count its own comparisons; every generator got it from `TraceBuilder.bump`.
 */
export function MetricsStrip({ step, metrics, complexity, status, className }: MetricsStripProps) {
  const state = STATUS_TONE[status];

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Badge tone={state.tone} className="shrink-0">
          <span
            aria-hidden
            className={cn('h-1.5 w-1.5 rounded-full bg-current', status === 'playing' && 'animate-pulse')}
          />
          {state.label}
        </Badge>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={step?.index ?? -1}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="truncate text-xs text-ink-dim"
              title={step?.description}
            >
              {step?.description ?? 'Nothing loaded yet.'}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <dl className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {COUNTERS.map((counter) => (
          <div key={counter.key} className="flex items-center gap-1.5" title={counter.label}>
            <Icon name={counter.icon} size={12} className={counter.color} />
            <dt className="sr-only">{counter.label}</dt>
            <dd className={cn('font-mono text-xs tabular-nums', counter.color)}>
              <AnimatedNumber value={metrics[counter.key]} format={formatCount} />
            </dd>
          </div>
        ))}
      </dl>

      {complexity ? (
        <div className="hidden items-center gap-1.5 md:flex">
          <ComplexityBadge label="avg" value={complexity.time.average} tone="cyan" />
          <ComplexityBadge label="space" value={complexity.space} tone="violet" />
        </div>
      ) : null}
    </div>
  );
}
