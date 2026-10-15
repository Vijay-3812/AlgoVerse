import { AnimatePresence, motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import type { CallFrameSnapshot, CallSnapshot, VisualizerProps, VisualRole } from '@/types';
import { useAlgoSound } from '@/hooks/useAlgoSound';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { ROLE_COLOR } from '@/visual/roles';
import { VisualizerShell } from './shared';

/**
 * CALL STACK VISUALIZER — recursion you can watch.
 *
 * Two synced views: the stack (bottom-up, like a debugger's frames) and the
 * call tree that says *where* each frame came from. A frame entering slides in
 * from the left; a returning frame keeps its result visible for one beat
 * (`ret`) because that value is the whole reason the frame existed.
 *
 * The locals panel shows the active frame's bindings — the values a learner
 * needs to reproduce the step on paper.
 */

const SPRING = { type: 'spring', stiffness: 460, damping: 34, mass: 0.6 } as const;
const REDUCED = { duration: 0 } as const;

const LEGEND_ROLES: readonly VisualRole[] = ['active', 'visited', 'sorted', 'danger', 'ghost'];

interface FrameProps {
  readonly frame: CallFrameSnapshot;
  readonly depth: number;
  readonly active: boolean;
  readonly reduce: boolean;
}

const Frame = memo(function Frame({ frame, depth, active, reduce }: FrameProps) {
  const color = ROLE_COLOR[frame.role ?? 'idle'];
  return (
    <motion.li
      layout
      initial={reduce ? false : { opacity: 0, x: -20 }}
      animate={{ opacity: frame.role === 'ghost' ? 0.4 : 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -20 }}
      transition={reduce ? REDUCED : SPRING}
      style={{
        marginLeft: Math.min(28, depth * 10),
        borderColor: active ? color : 'rgb(var(--c-line) / 0.7)',
        boxShadow: active ? `0 0 26px -10px ${color}` : 'none',
      }}
      className="relative flex items-center gap-2 rounded-xl border bg-surface/40 px-2.5 py-1.5"
    >
      <span className="h-6 w-1 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-xs text-ink">{frame.label}</span>
        {frame.detail ? <span className="block truncate text-2xs text-ink-faint">{frame.detail}</span> : null}
      </span>
      {frame.ret !== undefined ? (
        <motion.span
          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-md border border-accent-lime/40 bg-accent-lime/10 px-1.5 py-0.5 font-mono text-2xs text-accent-lime"
        >
          ↳ {frame.ret}
        </motion.span>
      ) : null}
      <span className="font-mono text-[9px] text-ink-faint">#{depth}</span>
    </motion.li>
  );
});

export function CallVisualizer({ step, index, progress, speed }: VisualizerProps<CallSnapshot, unknown>) {
  const state = step.state;
  const reduce = usePrefersReducedMotion();
  useAlgoSound({ kind: step.kind, stepIndex: index, progress });

  const frames = state.frames;
  const depth = Math.max(0, frames.length - 1);

  /** Recursion tree layout: a simple layered tree, parent above children. */
  const tree = useMemo(() => {
    const nodes = state.tree ?? [];
    if (nodes.length === 0) return null;
    const byParent = new Map<string | null, string[]>();
    for (const node of nodes) {
      const siblings = byParent.get(node.parentId) ?? [];
      siblings.push(node.id);
      byParent.set(node.parentId, siblings);
    }
    const roots = byParent.get(null) ?? [];
    const placed = new Map<string, { x: number; y: number; node: (typeof nodes)[number] }>();
    let cursor = 0;
    let maxDepth = 0;

    const walk = (id: string, level: number): number => {
      const node = nodes.find((candidate) => candidate.id === id);
      maxDepth = Math.max(maxDepth, level);
      const children = byParent.get(id) ?? [];
      let x: number;
      if (children.length === 0) {
        x = cursor;
        cursor += 1;
      } else {
        const positions = children.map((child) => walk(child, level + 1));
        x = positions.reduce((sum, value) => sum + value, 0) / positions.length;
      }
      if (node) placed.set(id, { x, y: level, node });
      return x;
    };

    for (const root of roots) walk(root, 0);
    return { placed, width: Math.max(1, cursor - 1), depth: maxDepth };
  }, [state.tree]);

  return (
    <VisualizerShell
      caption={state.caption}
      badges={{ ...state.badges, depth, frames: frames.length, speed: `${speed}×` }}
      roles={LEGEND_ROLES}
    >
      <div className="flex h-full w-full min-h-0 gap-3 px-3 py-2">
        {/* stack */}
        <div className="flex min-h-0 min-w-0 flex-[1.1] flex-col">
          <p className="mb-1 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">call stack</p>
          <ul className="scroll-y flex min-h-0 flex-1 flex-col-reverse justify-end gap-1.5">
            <AnimatePresence initial={false}>
              {frames.map((frame, frameIndex) => (
                <Frame
                  key={frame.id}
                  frame={frame}
                  depth={frameIndex}
                  active={frameIndex === frames.length - 1}
                  reduce={reduce}
                />
              ))}
            </AnimatePresence>
          </ul>

          {state.locals && state.locals.length > 0 ? (
            <div className="mt-2 rounded-xl border border-line/60 bg-surface/30 p-2">
              <p className="mb-1 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">locals</p>
              <div className="flex flex-wrap gap-1.5">
                {state.locals.map((local) => (
                  <span
                    key={local.name}
                    className="rounded-md border border-line/70 px-1.5 py-0.5 font-mono text-2xs text-ink-dim"
                  >
                    {local.name} = <span className="text-ink">{local.value}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* recursion tree */}
        {tree ? (
          <div className="hidden min-h-0 flex-1 flex-col lg:flex">
            <p className="mb-1 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">recursion tree</p>
            <div className="scroll-both min-h-0 flex-1 rounded-xl border border-line/50 bg-surface/20 p-2">
              <svg
                role="img"
                aria-label={`recursion tree with ${tree.placed.size} calls`}
                viewBox={`0 0 ${Math.max(2, tree.width + 1) * 46} ${(tree.depth + 1) * 44 + 20}`}
                className="h-auto w-full"
                style={{ minWidth: Math.min(560, Math.max(2, tree.width + 1) * 46) }}
              >
                {[...tree.placed.values()].map(({ node, x, y }) => {
                  const parent = node.parentId ? tree.placed.get(node.parentId) : undefined;
                  return parent ? (
                    <line
                      key={`e-${node.id}`}
                      x1={parent.x * 46 + 44}
                      y1={parent.y * 44 + 30}
                      x2={x * 46 + 44}
                      y2={y * 44 + 8}
                      stroke="rgb(var(--c-line))"
                      strokeWidth={1.4}
                    />
                  ) : null;
                })}
                {[...tree.placed.values()].map(({ node, x, y }) => {
                  const color = ROLE_COLOR[node.role ?? 'idle'];
                  const label = node.label.length > 7 ? `${node.label.slice(0, 6)}…` : node.label;
                  return (
                    <g key={node.id}>
                      <motion.rect
                        initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={reduce ? REDUCED : SPRING}
                        x={x * 46}
                        y={y * 44}
                        width={78}
                        height={30}
                        rx={9}
                        fill="rgb(var(--c-panel) / 0.85)"
                        stroke={color}
                        strokeWidth={node.role && node.role !== 'idle' ? 2 : 1.2}
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                      />
                      <text
                        x={x * 46 + 39}
                        y={y * 44 + 20}
                        textAnchor="middle"
                        className="font-mono"
                        style={{ fontSize: 11, fill: 'rgb(var(--c-ink))' }}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        ) : null}
      </div>
    </VisualizerShell>
  );
}
