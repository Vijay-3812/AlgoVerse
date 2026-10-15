import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';
import type {
  SequenceCursorSnapshot,
  SequenceItemSnapshot,
  SequenceSnapshot,
  VisualizerProps,
  VisualRole,
} from '@/types';
import { ROLE_COLOR } from '@/visual/roles';
import { useAlgoSound } from '@/hooks/useAlgoSound';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/utils/cn';
import { VisualizerShell } from './shared';

/**
 * ---------------------------------------------------------------------------
 *  SEQUENCE VISUALIZER
 * ---------------------------------------------------------------------------
 *  Stack, queue, deque, (circular) linked list and heap-backed priority queue —
 *  one renderer, five layouts.
 *
 *  The layout *is* the algorithm: a stack grows upward and pops off the top, a
 *  queue advances left to right with the rear at the right, a linked list draws
 *  its `next` (and `prev`) arrows, a circular list wraps. Removals leave a ghost
 *  slot for one beat so the eye can follow what left the structure, and pointer
 *  tags ("top", "front", "head") ride on the item they reference.
 */

const SPRING = { type: 'spring', stiffness: 440, damping: 34, mass: 0.7 } as const;
const REDUCED = { duration: 0 } as const;

const LEGEND: readonly VisualRole[] = ['idle', 'active', 'compare', 'success', 'danger', 'ghost'];

interface ChipProps {
  readonly item: SequenceItemSnapshot;
  readonly cursors: readonly SequenceCursorSnapshot[];
  readonly index: number;
  readonly vertical: boolean;
  readonly reduced: boolean;
  readonly compact: boolean;
}

const Chip = memo(function Chip({ item, cursors, index, vertical, reduced, compact }: ChipProps) {
  const role: VisualRole = item.ghost ? 'ghost' : (item.role ?? 'idle');
  const color = ROLE_COLOR[role];
  const mine = cursors.filter((c) => c.itemId === item.id || c.index === index);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: item.ghost ? 0.35 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, y: vertical ? -14 : 0, x: vertical ? 0 : 14 }}
      transition={reduced ? REDUCED : SPRING}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-xl border text-center',
        compact ? 'h-9 min-w-[2.25rem] px-2' : 'h-12 min-w-[3rem] px-3',
      )}
      style={{
        borderColor: `${color}80`,
        background: item.ghost ? 'transparent' : `${color}1f`,
        color: role === 'idle' ? 'rgb(var(--c-ink))' : color,
        borderStyle: item.ghost ? 'dashed' : 'solid',
        boxShadow: role === 'idle' ? 'none' : `0 0 20px -8px ${color}`,
      }}
    >
      <span className="flex flex-col leading-tight">
        <span className={cn('font-mono', compact ? 'text-[11px]' : 'text-sm')}>{item.label}</span>
        {item.sub ? <span className="text-[9px] text-ink-faint">{item.sub}</span> : null}
      </span>

      {mine.length ? (
        <motion.span
          layout
          className={cn(
            'pointer-events-none absolute whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[9px]',
            vertical ? '-right-2 translate-x-full top-1/2 -translate-y-1/2' : '-bottom-6 left-1/2 -translate-x-1/2',
          )}
          style={{
            borderColor: `${ROLE_COLOR[mine[0]?.role ?? 'active']}66`,
            color: ROLE_COLOR[mine[0]?.role ?? 'active'],
            background: 'rgb(var(--c-bg) / 0.8)',
          }}
        >
          {mine.map((c) => c.name).join('/')} {vertical ? '▶' : '▲'}
        </motion.span>
      ) : null}
    </motion.div>
  );
});

/** Curved arrow between two list nodes (next above, prev below). */
function Link({ kind }: { kind: 'next' | 'prev' }) {
  const up = kind === 'next';
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 18"
      className={cn('h-4 w-9 shrink-0', up ? 'text-accent-cyan/70' : 'rotate-180 text-accent-violet/60')}
    >
      <path
        d="M2 15 C 10 2, 30 2, 37 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M37 12 l-4.5 -3 l0.6 5.4 z" fill="currentColor" />
    </svg>
  );
}

export function SequenceVisualizer({
  step,
  index,
  progress,
}: VisualizerProps<SequenceSnapshot, unknown>) {
  const state = step.state;
  const reduced = usePrefersReducedMotion();
  const { items, cursors = [], links = [], kind } = state;

  useAlgoSound({ kind: step.kind, stepIndex: index, progress });

  const vertical = kind === 'stack';
  const compact = items.length > 14;

  const nextPairs = new Set(
    links.filter((l) => l.kind === 'next').map((l) => `${l.from}->${l.to}`),
  );
  const prevPairs = new Set(
    links.filter((l) => l.kind === 'prev').map((l) => `${l.from}->${l.to}`),
  );
  const isCircular = links.some((l) => l.kind === 'next' && l.from === items[items.length - 1]?.id && l.to === items[0]?.id);

  const sequence = (
    <AnimatePresence initial={false} mode="popLayout">
      {items.map((item, i) => {
        const previous = items[i - 1];
        const showsNext = previous ? nextPairs.has(`${previous.id}->${item.id}`) : false;
        const showsPrev = previous ? prevPairs.has(`${previous.id}->${item.id}`) : false;
        return (
          <div key={item.id} className={cn('flex', vertical ? 'flex-col items-center gap-1' : 'items-center gap-0.5')}>
            {showsPrev && !vertical ? <Link kind="prev" /> : null}
            {showsNext && !vertical ? <Link kind="next" /> : null}
            <Chip item={item} cursors={cursors} index={i} vertical={vertical} reduced={reduced} compact={compact} />
          </div>
        );
      })}
    </AnimatePresence>
  );

  return (
    <VisualizerShell caption={state.caption} badges={state.badges} roles={LEGEND}>
      <div className="relative flex h-full w-full items-center justify-center px-4 py-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="rounded-xl border border-dashed border-line/70 px-4 py-3 font-mono text-2xs text-ink-faint">
              {kind} is empty
            </span>
            <span className="text-2xs text-ink-faint">{state.caption ?? 'Waiting for the first operation…'}</span>
          </div>
        ) : vertical ? (
          // Stack: last item on top, like a real stack of plates.
          <div className="flex flex-col-reverse items-center gap-1.5">
            <div className="mt-1 h-1 w-24 rounded-full bg-gradient-to-r from-transparent via-line to-transparent" />
            {sequence}
          </div>
        ) : (
          <div className="flex max-h-full w-full flex-wrap items-center justify-center gap-y-7">{sequence}</div>
        )}

        {/* queue/deque direction hints */}
        {!vertical && items.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-6 bottom-1 flex justify-between font-mono text-[10px] text-ink-faint">
            <span>front / head</span>
            <span>{isCircular ? '↺ wraps to front' : 'rear / tail'}</span>
          </div>
        ) : null}
      </div>

      <span className="sr-only">
        {step.description} — {items.length} items
      </span>
    </VisualizerShell>
  );
}

/** Convenience alias used by the linear-structure modules. */
export const LinearVisualizer = SequenceVisualizer;
