import { AnimatePresence, motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import type { ArraySnapshot, VisualizerProps, VisualRole } from '@/types';
import { buildHighlightIndex, roleForIndex, ROLE_COLOR } from '@/visual/roles';
import { useUiStore, type ArrayView } from '@/store/uiStore';
import { useAlgoSound } from '@/hooks/useAlgoSound';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/utils/cn';
import { VisualizerShell } from './shared';

/**
 * ---------------------------------------------------------------------------
 *  BAR VISUALIZER — the workhorse
 * ---------------------------------------------------------------------------
 *  Renders any `ArraySnapshot`: sorting, searching, strings, sliding windows,
 *  two pointers, prefix sums, counting/radix/bucket sort, monotonic stacks with
 *  an auxiliary row. Four views, cursor labels, window brackets, aux rows,
 *  FLIP swaps, a completion wave and optional Web Audio clicks.
 *
 *  Performance notes (the 500-element budget):
 *   • each bar is `memo`ised on primitives, so one step re-renders ~2 bars;
 *   • only `transform`, `height` and colours animate — no layout reads;
 *   • FLIP identity comes from `snapshot.ids`, so a swap is a real translation;
 *   • ≥120 items drops labels and switches to a single gradient per bar.
 */

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 } as const;
const REDUCED = { duration: 0 } as const;

/** How the value maps to a visual dimension, per view. */
const VIEW_LABEL: Record<ArrayView, string> = {
  bars: 'bars',
  dots: 'dots',
  circular: 'circular',
  spectrum: 'spectrum',
};

interface BarProps {
  readonly id: string;
  readonly value: number;
  readonly label?: string;
  readonly role: VisualRole;
  readonly ratio: number;
  readonly index: number;
  readonly showLabel: boolean;
  readonly view: ArrayView;
  readonly reduced: boolean;
  readonly widthPct: number;
  readonly playhead: boolean;
}

const Bar = memo(function Bar({
  value,
  label,
  role,
  ratio,
  index,
  showLabel,
  view,
  reduced,
  widthPct,
  playhead,
}: BarProps) {
  const color = ROLE_COLOR[role];
  const transition = reduced ? REDUCED : SPRING;

  if (view === 'circular') {
    // Radial layout: laid out around a circle, spokes grow outward.
    const angle = (index / Math.max(1, widthPct)) * Math.PI * 2;
    return (
      <motion.div
        layout
        transition={transition}
        className="absolute left-1/2 top-1/2 origin-left"
        style={{ rotate: `${(angle * 180) / Math.PI}deg` }}
      >
        <motion.div
          animate={{ width: `${12 + ratio * 34}%` }}
          transition={transition}
          className="h-[6px] rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}88` }}
        />
      </motion.div>
    );
  }

  if (view === 'dots') {
    return (
      <motion.div layout transition={transition} className="flex flex-1 items-end justify-center pb-1">
        <motion.span
          animate={
            reduced
              ? { scale: 0.55 + ratio * 0.75 }
              : { scale: 0.55 + ratio * 0.75, y: playhead ? -6 : 0 }
          }
          transition={transition}
          className="rounded-full"
          style={{
            width: '78%',
            aspectRatio: '1 / 1',
            background: color,
            boxShadow: `0 0 16px -2px ${color}`,
          }}
        />
      </motion.div>
    );
  }

  const isSpectrum = view === 'spectrum';
  const height = isSpectrum ? `${18 + ratio * 82}%` : `${Math.max(3, ratio * 100)}%`;
  const background = isSpectrum
    ? `linear-gradient(180deg, hsl(${(ratio * 280).toFixed(0)} 95% 62%), hsl(${(ratio * 280 + 40).toFixed(0)} 90% 45%))`
    : `linear-gradient(180deg, ${color}, ${color}b3)`;

  return (
    <motion.div
      layout
      transition={transition}
      className="relative flex flex-1 flex-col justify-end"
      style={{ minWidth: 0 }}
    >
      {showLabel ? (
        <span
          className="mb-1 text-center font-mono text-[10px] leading-none"
          style={{ color: role === 'idle' ? 'rgb(var(--c-ink-faint))' : color }}
        >
          {label ?? value}
        </span>
      ) : null}

      <motion.div
        /*
          Only the height animates here. Colour arrives through `background`
          (a gradient that reads the role token), and Framer would warn if we
          animated `backgroundColor` alongside a `background` shorthand — the
          two can disagree during a transition.
        */
        animate={{ height }}
        transition={transition}
        className={cn('w-full rounded-t-[4px] rounded-b-[2px]', playhead && 'ring-1 ring-white/40')}
        style={{
          background,
          boxShadow: role === 'idle' ? 'none' : `0 0 18px -6px ${color}`,
          minHeight: 2,
        }}
      />

      {showLabel && role !== 'idle' ? (
        <motion.span
          layout
          className="pointer-events-none absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
          style={{ background: color }}
        />
      ) : null}
    </motion.div>
  );
});

const LEGEND_ROLES: readonly VisualRole[] = [
  'idle',
  'compare',
  'swap',
  'pivot',
  'active',
  'sorted',
  'danger',
  'muted',
];

export function BarVisualizer({
  trace,
  step,
  index,
  progress,
  speed,
}: VisualizerProps<ArraySnapshot, unknown>) {
  const state = step.state;
  const view = useUiStore((s) => s.arrayView);
  const reduced = usePrefersReducedMotion();

  useAlgoSound({ kind: step.kind, stepIndex: index, progress });

  const highlight = useMemo(() => buildHighlightIndex(step.highlight), [step.highlight]);
  const values = state.values;
  const max = useMemo(() => Math.max(1, ...values), [values]);
  const min = useMemo(() => Math.min(...values, 0), [values]);

  const showLabels = values.length <= 48 || view === 'circular';
  const roles = useMemo(
    () =>
      values.map((_, i) => {
        if (state.sorted?.includes(i)) return 'sorted' as VisualRole;
        return roleForIndex(i, step, highlight);
      }),
    [highlight, state.sorted, step, values],
  );

  const playhead = highlight.primary;

  const windowStart = state.window?.[0] ?? null;
  const windowEnd = state.window?.[1] ?? null;

  const swarm = step.kind === 'complete' || step.kind === 'sorted';

  return (
    <VisualizerShell
      caption={state.caption}
      badges={{ ...state.badges, view: VIEW_LABEL[view], speed: `${speed}×` }}
      roles={showLabels ? LEGEND_ROLES : LEGEND_ROLES.slice(0, 6)}
    >
      <div className="relative flex h-full w-full flex-col px-3 py-2">
        {/* completion sweep */}
        <AnimatePresence>
          {swarm && !reduced ? (
            <motion.div
              key={`sweep-${index}`}
              initial={{ x: '-20%', opacity: 0.9 }}
              animate={{ x: '120%', opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-accent-lime/25 to-transparent"
            />
          ) : null}
        </AnimatePresence>

        {/* primary sequence */}
        <div className="relative min-h-0 flex-1">
          {values.length === 0 ? null : view === 'circular' ? (
            <div className="relative mx-auto aspect-square h-full max-h-[min(70vh,520px)] w-full max-w-[min(70vh,520px)]">
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line" />
              {values.map((value, i) => (
                <Bar
                  key={state.ids?.[i] ?? i}
                  id={state.ids?.[i] ?? String(i)}
                  value={value}
                  label={state.labels?.[i]}
                  role={roles[i] ?? 'idle'}
                  ratio={values.length > 1 ? (value - min) / (max - min) : 1}
                  index={i}
                  showLabel={false}
                  view="circular"
                  reduced={reduced}
                  widthPct={values.length}
                  playhead={false}
                />
              ))}
            </div>
          ) : (
            <div
              /*
                `items-stretch` (not `items-end`) is load-bearing: each column must
                be *stretched* to the row's definite height so the bar's percentage
                height has something to resolve against. With `items-end` the column
                collapses to its content height and every bar renders 2px tall.
                The bars still sit on the floor — the column is `justify-end`.
              */
              className="relative flex h-full w-full items-stretch gap-[2px]"
            >
              {values.map((value, i) => (
                <Bar
                  key={state.ids?.[i] ?? i}
                  id={state.ids?.[i] ?? String(i)}
                  value={value}
                  label={state.labels?.[i]}
                  role={roles[i] ?? 'idle'}
                  ratio={values.length > 1 ? (value - min) / (max - min) : 1}
                  index={i}
                  showLabel={showLabels}
                  view={view}
                  reduced={reduced}
                  widthPct={values.length}
                  playhead={playhead.has(i)}
                />
              ))}

              {/* window bracket (binary search, sliding window) */}
              {windowStart !== null && windowEnd !== null && values.length > 0 ? (
                <motion.div
                  layout
                  className="pointer-events-none absolute -bottom-1 top-0 rounded-lg border border-accent-cyan/50 bg-accent-cyan/5"
                  style={{
                    left: `${(windowStart / values.length) * 100}%`,
                    width: `${((windowEnd - windowStart + 1) / values.length) * 100}%`,
                  }}
                  transition={reduced ? REDUCED : SPRING}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-accent-cyan">
                    window [{windowStart}..{windowEnd}]
                  </span>
                </motion.div>
              ) : null}
            </div>
          )}
        </div>

        {/* cursors */}
        {state.pointers?.length ? (
          <div className="relative mt-6 h-5">
            {state.pointers.map((cursor) => (
              <motion.div
                key={cursor.name}
                layout
                transition={reduced ? REDUCED : SPRING}
                className="absolute -translate-x-1/2"
                style={{ left: `${((cursor.index + 0.5) / values.length) * 100}%` }}
              >
                <span
                  className="whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[10px]"
                  style={{
                    borderColor: `${ROLE_COLOR[cursor.role ?? 'active']}66`,
                    color: ROLE_COLOR[cursor.role ?? 'active'],
                    background: 'rgb(var(--c-bg) / 0.75)',
                  }}
                >
                  ▲ {cursor.name}
                </span>
              </motion.div>
            ))}
          </div>
        ) : null}

        {/* auxiliary rows: counts, buckets, prefix sums, an aux stack */}
        {state.aux?.length ? (
          <div className="mt-3 space-y-2">
            {state.aux.map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="w-20 shrink-0 truncate text-right font-mono text-[10px] text-ink-faint">
                  {row.label}
                </span>
                <div className={cn('flex min-w-0 flex-1 items-center gap-[3px]', row.style === 'chips' && 'flex-wrap')}>
                  {row.values.map((value, i) => {
                    const role = row.roles?.[i] ?? 'idle';
                    return (
                      <motion.span
                        key={`${row.label}-${i}`}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: value === null ? 0.3 : 1, scale: 1 }}
                        transition={reduced ? REDUCED : SPRING}
                        className={cn(
                          'flex items-center justify-center rounded-md border font-mono text-[10px]',
                          row.style === 'chips' ? 'h-6 px-2' : 'h-6 flex-1',
                        )}
                        style={{
                          borderColor: `${ROLE_COLOR[role]}55`,
                          color: role === 'idle' ? 'rgb(var(--c-ink-dim))' : ROLE_COLOR[role],
                          background: role === 'idle' ? 'rgb(var(--c-surface) / 0.6)' : `${ROLE_COLOR[role]}1f`,
                          marginLeft: row.offset ? `${row.offset * 2}px` : undefined,
                        }}
                      >
                        {value ?? '·'}
                      </motion.span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* algorithms that are pure narration (no array changes) */}
        {values.length === 0 ? (
          <p className="m-auto text-xs text-ink-faint">Nothing to draw for this step.</p>
        ) : null}
      </div>

      <span className="sr-only">
        {trace.name} step {index + 1}: {step.description}
      </span>
    </VisualizerShell>
  );
}

/** Convenience export used by the sorting/searching modules. */
export const ArrayVisualizer = BarVisualizer;
