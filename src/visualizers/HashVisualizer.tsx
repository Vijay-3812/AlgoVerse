import { AnimatePresence, motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import type { HashBucketSnapshot, HashEntrySnapshot, HashSnapshot, VisualizerProps, VisualRole } from '@/types';
import { useAlgoSound } from '@/hooks/useAlgoSound';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { ROLE_COLOR } from '@/visual/roles';
import { cn } from '@/utils/cn';
import { VisualizerShell } from './shared';

/**
 * HASH TABLE VISUALIZER — buckets, chains, probes and the rehash shockwave.
 *
 * One renderer covers all four collision strategies because they differ only in
 * *which* bucket a key lands in, and that is data, not presentation: the probe
 * sequence arrives as `probePath`, so the renderer simply lights the buckets the
 * algorithm actually visited. Chaining shows entries as a linked row inside the
 * bucket; open addressing shows one entry per bucket, because that is what the
 * table physically is.
 *
 * Motion budget: buckets animate opacity/scale only (no height, no layout), so a
 * rehash of 32 buckets stays inside one frame.
 */

const SPRING = { type: 'spring', stiffness: 400, damping: 32, mass: 0.6 } as const;
const REDUCED = { duration: 0 } as const;

const LEGEND_ROLES: readonly VisualRole[] = ['active', 'compare', 'sorted', 'danger', 'ghost', 'muted'];

const PROBE_LABEL: Record<HashSnapshot['probeKind'], string> = {
  chaining: 'separate chaining',
  linear: 'linear probing',
  quadratic: 'quadratic probing',
  double: 'double hashing',
};

interface EntryChipProps {
  readonly entry: HashEntrySnapshot;
  readonly reduce: boolean;
}

const EntryChip = memo(function EntryChip({ entry, reduce }: EntryChipProps) {
  const color = ROLE_COLOR[entry.role ?? 'idle'];
  const active = entry.role !== undefined && entry.role !== 'idle';
  return (
    <motion.span
      layout
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: entry.role === 'ghost' ? 0.4 : 1, scale: 1 }}
      transition={reduce ? REDUCED : SPRING}
      className={cn(
        'relative flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-2xs',
        active ? 'border-transparent' : 'border-line/70',
      )}
      style={{
        borderColor: active ? color : undefined,
        color: active ? color : 'rgb(var(--c-ink-dim))',
        boxShadow: active ? `0 0 16px -6px ${color}` : 'none',
        background: active ? `color-mix(in srgb, ${color} 12%, transparent)` : 'transparent',
      }}
    >
      <span className="text-ink">{entry.key}</span>
      {entry.value !== undefined ? <span className="text-ink-faint">:{entry.value}</span> : null}
      {entry.probe !== undefined ? (
        <span className="rounded bg-surface/70 px-1 text-[9px] text-ink-faint">p{entry.probe}</span>
      ) : null}
    </motion.span>
  );
});

interface BucketProps {
  readonly bucket: HashBucketSnapshot;
  readonly probed: boolean;
  readonly reduce: boolean;
  readonly chained: boolean;
}

const Bucket = memo(function Bucket({ bucket, probed, reduce, chained }: BucketProps) {
  return (
    <motion.li
      layout
      initial={reduce ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reduce ? REDUCED : SPRING}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2 py-1.5',
        probed ? 'border-accent-cyan/60 bg-accent-cyan/5' : 'border-line/50',
      )}
    >
      <span
        className={cn(
          'flex h-6 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-2xs',
          probed ? 'border-accent-cyan/60 text-accent-cyan' : 'border-line/70 text-ink-faint',
        )}
      >
        {bucket.index}
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {bucket.entries.length === 0 ? (
          <span className="font-mono text-2xs text-ink-faint/60">∅</span>
        ) : (
          bucket.entries.map((entry, index) => (
            <span key={`${entry.key}-${index}`} className="flex items-center gap-1">
              {index > 0 && chained ? <span className="text-ink-faint">→</span> : null}
              <EntryChip entry={entry} reduce={reduce} />
            </span>
          ))
        )}
      </div>
    </motion.li>
  );
});

export function HashVisualizer({ step, index, progress, speed }: VisualizerProps<HashSnapshot, unknown>) {
  const state = step.state;
  const reduce = usePrefersReducedMotion();
  useAlgoSound({ kind: step.kind, stepIndex: index, progress });

  const probed = useMemo(() => new Set(state.probePath ?? []), [state.probePath]);
  const chained = state.probeKind === 'chaining';
  const load = Math.max(0, Math.min(1, state.loadFactor));

  return (
    <VisualizerShell
      caption={state.caption}
      badges={{
        ...state.badges,
        strategy: PROBE_LABEL[state.probeKind],
        load: load.toFixed(2),
        speed: `${speed}×`,
      }}
      roles={LEGEND_ROLES}
    >
      <div className="flex h-full w-full flex-col gap-2 px-3 py-2">
        {/* load-factor gauge */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs text-ink-faint">α</span>
          <div className="relative h-1.5 w-40 overflow-hidden rounded-full bg-surface/70">
            <motion.div
              className={cn('h-full rounded-full', load > 0.75 ? 'bg-accent-red' : load > 0.5 ? 'bg-accent-amber' : 'bg-accent-cyan')}
              animate={{ width: `${load * 100}%` }}
              transition={reduce ? REDUCED : SPRING}
            />
          </div>
          <span className={cn('font-mono text-2xs', load > 0.75 ? 'text-accent-red' : 'text-ink-faint')}>
            {load.toFixed(2)} {load > 0.75 ? '— rehash threshold' : ''}
          </span>
        </div>

        <ul className="scroll-y flex min-h-0 flex-1 flex-col gap-1">
          <AnimatePresence initial={false}>
            {state.buckets.map((bucket) => (
              <Bucket
                key={bucket.index}
                bucket={bucket}
                probed={probed.has(bucket.index)}
                reduce={reduce}
                chained={chained}
              />
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </VisualizerShell>
  );
}
