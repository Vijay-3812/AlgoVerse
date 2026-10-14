import { motion } from 'framer-motion';
import type { Complexity, MetricsSnapshot } from '@/types';
import { Badge, ComplexityBadge } from '@/components/primitives/Badge';
import { cn } from '@/utils/cn';
import { formatCount } from '@/utils/format';

export interface ComplexityPanelProps {
  readonly complexity: Complexity;
  /** Live counters, shown next to their theoretical bounds. */
  readonly metrics: MetricsSnapshot;
  readonly steps: number;
  readonly generationMs: number;
}

interface Row {
  readonly label: string;
  readonly value: string;
  readonly tone: 'cyan' | 'violet' | 'pink' | 'lime' | 'amber';
}

/**
 * Tailwind cannot see dynamically-built class names, so every colour variant
 * is spelled out here instead of interpolated (`text-accent-${tone}` would be
 * purged and silently render unstyled).
 */
const TONE_TEXT: Record<Row['tone'], string> = {
  cyan: 'text-accent-cyan',
  violet: 'text-accent-violet',
  pink: 'text-accent-pink',
  lime: 'text-accent-lime',
  amber: 'text-accent-amber',
};

/**
 * The "Complexity" tab: the Big-O badge set (best / average / worst) plus the
 * live counters that prove them — you can watch comparisons stay under
 * `n log n` in real time, which is the point of building this thing at all.
 */
export function ComplexityPanel({ complexity, metrics, steps, generationMs }: ComplexityPanelProps) {
  const rows: Row[] = [
    { label: 'Comparisons', value: formatCount(metrics.comparisons), tone: 'amber' },
    { label: 'Swaps', value: formatCount(metrics.swaps), tone: 'pink' },
    { label: 'Writes', value: formatCount(metrics.writes), tone: 'violet' },
    { label: 'Reads', value: formatCount(metrics.reads), tone: 'cyan' },
    { label: 'Recursive calls', value: formatCount(metrics.calls), tone: 'violet' },
    { label: 'Max depth', value: formatCount(metrics.depth), tone: 'lime' },
  ];

  return (
    <div className="scroll-y h-full space-y-5 p-4">
      <section className="space-y-3">
        <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-faint">Time</h3>
        <div className="grid grid-cols-1 gap-2">
          {(
            [
              ['Best', complexity.time.best, 'lime'],
              ['Average', complexity.time.average, 'cyan'],
              ['Worst', complexity.time.worst, 'red'],
            ] as const
          ).map(([label, value, tone], index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.28 }}
              className="flex items-center justify-between rounded-lg border border-line/60 bg-surface/40 px-3 py-2"
            >
              <span className="text-xs text-ink-dim">{label}</span>
              <ComplexityBadge value={value} tone={tone} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-faint">Space</h3>
        <div className="flex items-center gap-2">
          <ComplexityBadge value={complexity.space} tone="violet" />
          {complexity.stable === undefined ? null : (
            <Badge tone={complexity.stable ? 'lime' : 'amber'}>{complexity.stable ? 'stable' : 'unstable'}</Badge>
          )}
          {complexity.kind ? <Badge tone="neutral">{complexity.kind}</Badge> : null}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Live counters
        </h3>
        <dl className="grid grid-cols-2 gap-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className={cn(
                'rounded-lg border border-line/60 bg-surface/40 px-3 py-2 transition-colors',
              )}
            >
              <dt className="text-2xs uppercase tracking-wide text-ink-faint">{row.label}</dt>
              <dd className={cn('font-mono text-sm tabular-nums', TONE_TEXT[row.tone])}>{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-2xs leading-relaxed text-ink-faint">
          {formatCount(steps)} trace steps · generated in {generationMs < 1 ? '<1' : Math.round(generationMs)} ms
        </p>
      </section>

      {complexity.notes?.length ? (
        <section className="space-y-2">
          <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-faint">Notes</h3>
          <ul className="space-y-1.5">
            {complexity.notes.map((note) => (
              <li key={note} className="flex gap-2 text-2xs leading-relaxed text-ink-dim">
                <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-violet" />
                {note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
