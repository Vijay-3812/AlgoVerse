import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import type { IntervalItemSnapshot, IntervalSnapshot, VisualizerProps, VisualRole } from '@/types';
import { useAlgoSound } from '@/hooks/useAlgoSound';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { ROLE_COLOR } from '@/visual/roles';
import { cn } from '@/utils/cn';
import { VisualizerShell } from './shared';

/**
 * INTERVAL / SCHEDULE VISUALIZER — activity selection, fractional knapsack,
 * Huffman-style weight races.
 *
 * Everything greedy is "sort, then sweep", so the renderer puts a shared time
 * axis along the bottom and draws each item as a bar on its own row. The
 * *overlap* that kills a candidate is then literally visible, and the running
 * "last end" cursor is drawn as a vertical line the next decision is measured
 * against — the invariant, made spatial.
 */

const SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.6 } as const;
const REDUCED = { duration: 0 } as const;

const LEGEND_ROLES: readonly VisualRole[] = ['active', 'compare', 'sorted', 'danger', 'muted', 'ghost'];

interface RowProps {
  readonly item: IntervalItemSnapshot;
  readonly span: readonly [number, number];
  readonly reduce: boolean;
  readonly showRatio: boolean;
}

const Row = memo(function Row({ item, span, reduce, showRatio }: RowProps) {
  const [from, to] = span;
  const width = Math.max(1e-6, to - from);
  const left = ((item.start - from) / width) * 100;
  const right = ((item.end - from) / width) * 100;
  const color = ROLE_COLOR[item.role ?? 'idle'];
  const active = item.role !== undefined && item.role !== 'idle' && item.role !== 'ghost';

  return (
    <div className="relative flex h-9 items-center">
      <span className="w-20 shrink-0 truncate font-mono text-2xs text-ink-faint" title={item.label}>
        {item.label}
      </span>
      <div className="relative h-full min-w-0 flex-1">
        <motion.div
          layout
          initial={reduce ? false : { opacity: 0, scaleX: 0.9 }}
          animate={{ opacity: item.role === 'muted' ? 0.4 : 1, scaleX: 1 }}
          transition={reduce ? REDUCED : SPRING}
          className={cn('absolute top-1.5 h-6 origin-left rounded-md border px-1.5', active && 'font-semibold')}
          style={{
            left: `${left}%`,
            width: `${Math.max(1.5, right - left)}%`,
            borderColor: color,
            background: `color-mix(in srgb, ${color} 20%, transparent)`,
            boxShadow: active ? `0 0 18px -8px ${color}` : 'none',
          }}
          title={`${item.label}: [${item.start}, ${item.end})`}
        >
          <span className="flex h-full items-center gap-1.5 overflow-hidden whitespace-nowrap font-mono text-[10px] text-ink">
            {item.start}–{item.end}
            {showRatio && item.ratio !== undefined ? (
              <span className="rounded bg-surface/70 px-1 text-[9px] text-accent-amber">{item.ratio.toFixed(2)}</span>
            ) : null}
            {item.weight !== undefined ? <span className="text-[9px] text-ink-faint">w{item.weight}</span> : null}
          </span>
        </motion.div>
      </div>
    </div>
  );
});

export function IntervalVisualizer({ step, index, progress, speed }: VisualizerProps<IntervalSnapshot, unknown>) {
  const state = step.state;
  const reduce = usePrefersReducedMotion();
  useAlgoSound({ kind: step.kind, stepIndex: index, progress });

  const [from, to] = state.span;
  const ticks = useMemo(() => {
    const count = 12;
    const stepSize = Math.max(1, Math.ceil((to - from) / count));
    const out: number[] = [];
    for (let value = Math.ceil(from / stepSize) * stepSize; value <= to; value += stepSize) out.push(value);
    return out;
  }, [from, to]);

  const showRatio = state.items.some((item) => item.ratio !== undefined);

  return (
    <VisualizerShell
      caption={state.caption}
      badges={{ ...state.badges, items: state.items.length, speed: `${speed}×` }}
      roles={LEGEND_ROLES}
    >
      <div className="flex h-full w-full flex-col justify-center gap-1 px-3 py-2">
        <div className="scroll-y min-h-0">
          {state.items.map((item) => (
            <Row key={item.id} item={item} span={state.span} reduce={reduce} showRatio={showRatio} />
          ))}
        </div>

        {/* time axis */}
        <div className="relative ml-20 mt-1 h-6 border-t border-line/60">
          <span className="absolute -top-4 left-0 font-mono text-[9px] text-ink-faint">time →</span>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute top-0 -translate-x-1/2 font-mono text-[9px] text-ink-faint"
              style={{ left: `${((tick - from) / Math.max(1e-6, to - from)) * 100}%` }}
            >
              <span className="mx-auto mb-0.5 block h-1.5 w-px bg-line" />
              {tick}
            </span>
          ))}
        </div>
      </div>
    </VisualizerShell>
  );
}
