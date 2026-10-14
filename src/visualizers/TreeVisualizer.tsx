import { AnimatePresence, motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import type { TreeNodeSnapshot, TreeSnapshot, VisualizerProps, VisualRole } from '@/types';
import { ROLE_COLOR } from '@/visual/roles';
import { useAlgoSound } from '@/hooks/useAlgoSound';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/utils/cn';
import { VisualizerShell } from './shared';

/**
 * ---------------------------------------------------------------------------
 *  TREE VISUALIZER
 * ---------------------------------------------------------------------------
 *  One SVG renderer for binary trees, AVL/Red-Black trees, heaps, tries,
 *  segment trees, Fenwick trees and B-trees.
 *
 *  Layout: `y` comes from the node's depth, `x` from either the algorithm's own
 *  `positions` (Fenwick, B-tree rows) or an in-order sweep (everything else),
 *  which is the classic way to draw a BST without edge crossings.
 *
 *  Nodes are SVG groups animated with `transform` only, so a rotation is a pair
 *  of arcs the eye can follow rather than a redraw. Entries and exits use
 *  `AnimatePresence` with scale-from-parent, deletions fade through a `ghost`
 *  role, and multi-key nodes (tries, B-trees) render their keys as a row of
 *  cells inside one wide node.
 */

const VIEW_W = 1000;
const VIEW_H = 620;
const NODE_W = 68;
const NODE_H = 44;
const SPRING = { type: 'spring', stiffness: 260, damping: 30, mass: 0.8 } as const;
const REDUCED = { duration: 0 } as const;

const LEGEND: readonly VisualRole[] = ['idle', 'active', 'compare', 'pivot', 'success', 'danger', 'visited', 'ghost'];

interface Placed extends TreeNodeSnapshot {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

/** Depth-first layout: assign each node a column in visit order. */
function layout(snapshot: TreeSnapshot): { placed: Placed[]; byId: Map<string, Placed>; maxDepth: number } {
  const byId = new Map(snapshot.nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, string[]>();
  for (const node of snapshot.nodes) {
    childrenOf.set(node.id, node.children.filter((c): c is string => c !== null));
  }

  const order: string[] = [];
  const depthOf = new Map<string, number>();
  const visit = (id: string, depth: number): void => {
    const node = byId.get(id);
    if (!node || depthOf.has(id)) return;
    depthOf.set(id, depth);
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      order.push(id);
      return;
    }
    kids.forEach((kid, i) => {
      visit(kid, depth + 1);
      if (i === Math.floor((kids.length - 1) / 2)) order.push(id);
    });
    // Wide nodes (B-trees) with a single child must still be placed.
    if (!order.includes(id)) order.push(id);
  };
  snapshot.roots.forEach((root) => visit(root, 0));

  // Any node unreachable from a root (orphaned mid-operation) still gets a slot.
  for (const node of snapshot.nodes) if (!depthOf.has(node.id)) depthOf.set(node.id, 0);

  const columns = new Map<string, number>();
  if (snapshot.positions) {
    for (const [id, x] of Object.entries(snapshot.positions)) columns.set(id, x * (VIEW_W - NODE_W) + NODE_W / 2);
  } else {
    order.forEach((id, i) => columns.set(id, ((i + 1) / (order.length + 1)) * VIEW_W));
  }

  const maxDepth = Math.max(0, ...[...depthOf.values()]);
  const rowH = maxDepth === 0 ? 0 : Math.min(120, (VIEW_H - 120) / maxDepth);
  const placed: Placed[] = snapshot.nodes.map((node) => {
    const depth = depthOf.get(node.id) ?? 0;
    return {
      ...node,
      depth,
      x: columns.get(node.id) ?? VIEW_W / 2,
      y: 60 + depth * rowH,
    };
  });

  return { placed, byId: new Map(placed.map((p) => [p.id, p])), maxDepth };
}

const TreeEdge = memo(function TreeEdge({ from, to }: { from: Placed; to: Placed }) {
  const midY = (from.y + to.y) / 2;
  const d = `M ${from.x} ${from.y + NODE_H / 2} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y - NODE_H / 2}`;
  return (
    <motion.path
      initial={{ opacity: 0, pathLength: 0 }}
      animate={{ opacity: 0.75, pathLength: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      d={d}
      fill="none"
      stroke="rgb(var(--c-line))"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  );
});

const TreeNode = memo(function TreeNode({ node, reduced }: { node: Placed; reduced: boolean }) {
  const role: VisualRole = node.role ?? 'idle';
  const color = ROLE_COLOR[role];
  const keys = node.keys ?? [node.label];
  const width = keys.length > 1 ? NODE_W + (keys.length - 1) * 34 : NODE_W;
  const meta = node.meta;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: node.role === 'ghost' ? 0.4 : 1, scale: 1, x: node.x - width / 2, y: node.y - NODE_H / 2 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={reduced ? REDUCED : SPRING}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      <rect
        width={width}
        height={NODE_H}
        rx={12}
        fill={node.role === 'ghost' ? 'transparent' : `${color}1f`}
        stroke={color}
        strokeWidth={role === 'idle' ? 1.2 : 1.8}
        strokeDasharray={node.role === 'ghost' ? '4 3' : undefined}
        style={role === 'idle' ? undefined : { filter: `drop-shadow(0 0 10px ${color}55)` }}
      />
      {keys.map((key, i) => (
        <text
          key={`${node.id}-${key}-${i}`}
          x={width / 2 + (i - (keys.length - 1) / 2) * 34}
          y={NODE_H / 2 + 5}
          textAnchor="middle"
          className="font-mono"
          fontSize={keys.length > 1 ? 13 : 15}
          fill={role === 'idle' ? 'rgb(var(--c-ink))' : color}
        >
          {key}
        </text>
      ))}
      {meta?.balance !== undefined ? (
        <text x={width - 8} y={12} textAnchor="middle" fontSize={9} fill="rgb(var(--c-ink-faint))">
          {meta.balance > 0 ? `+${meta.balance}` : meta.balance}
        </text>
      ) : null}
      {meta?.height !== undefined && meta.balance === undefined ? (
        <text x={width - 8} y={12} textAnchor="middle" fontSize={9} fill="rgb(var(--c-ink-faint))">
          h{meta.height}
        </text>
      ) : null}
      {meta?.color ? (
        <circle cx={9} cy={9} r={4} fill={meta.color === 'red' ? ROLE_COLOR.danger : 'rgb(var(--c-line))'} />
      ) : null}
      {node.sub ? (
        <text x={width / 2} y={NODE_H + 13} textAnchor="middle" fontSize={9} fill="rgb(var(--c-ink-faint))">
          {node.sub}
        </text>
      ) : null}
    </motion.g>
  );
});

export function TreeVisualizer({ step, index, progress }: VisualizerProps<TreeSnapshot, unknown>) {
  const state = step.state;
  const reduced = usePrefersReducedMotion();
  const { placed, byId } = useMemo(() => layout(state), [state]);

  useAlgoSound({ kind: step.kind, stepIndex: index, progress });

  const edges = useMemo(
    () =>
      placed.flatMap((node) =>
        node.children
          .filter((childId): childId is string => childId !== null)
          .map((childId) => {
            const child = byId.get(childId);
            return child ? { from: node, to: child, key: `${node.id}->${childId}` } : null;
          })
          .filter((e): e is { from: Placed; to: Placed; key: string } => e !== null),
      ),
    [placed, byId],
  );

  return (
    <VisualizerShell caption={state.caption} badges={state.badges} roles={LEGEND}>
      <div className="relative h-full w-full">
        {state.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="rounded-xl border border-dashed border-line/70 px-4 py-3 font-mono text-2xs text-ink-faint">
              empty tree
            </span>
          </div>
        ) : (
          <svg
            role="img"
            aria-label={`${state.kind} tree with ${state.nodes.length} nodes`}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
          >
            <AnimatePresence initial={false}>
              {edges.map((edge) => (
                <TreeEdge key={edge.key} from={edge.from} to={edge.to} />
              ))}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {placed.map((node) => (
                <TreeNode key={node.id} node={node} reduced={reduced} />
              ))}
            </AnimatePresence>
          </svg>
        )}

        <span className="sr-only">{step.description}</span>
        <span
          className={cn(
            'pointer-events-none absolute bottom-1 left-2 font-mono text-[10px] text-ink-faint',
            state.nodes.length > 24 && 'text-transparent',
          )}
        >
          {state.nodes.length} nodes
        </span>
      </div>
    </VisualizerShell>
  );
}
