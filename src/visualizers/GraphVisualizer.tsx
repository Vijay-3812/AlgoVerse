import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import type { GraphEdgeSnapshot, GraphNodeSnapshot, GraphSnapshot, VisualRole, VisualizerProps } from '@/types';
import { useAlgoSound } from '@/hooks/useAlgoSound';
import { useElementSize } from '@/hooks/useElementSize';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { EmptyStage, VisualizerShell } from './shared';
import { cn } from '@/utils/cn';

/**
 * ---------------------------------------------------------------------------
 *  GRAPH STAGE — SVG structure + Canvas energy
 * ---------------------------------------------------------------------------
 *  Two layers, each doing what it is good at:
 *
 *   • **SVG** draws the graph itself — rounds nodes, curved directed edges,
 *     weight chips, distance badges. Everything animates through
 *     `transform`/`opacity` only, so a 60-node graph still moves on the
 *     compositor and every node keeps a real hit target and accessible name.
 *
 *   • **Canvas** draws the *energy*: particles streaming along the edges a step
 *     is actively using (relaxations, the frontier, the final path). Particles
 *     are hundreds of tiny primitives repainted at 60 fps — the one job SVG is
 *     bad at — and they are purely decorative, so the canvas can be skipped
 *     wholesale under `prefers-reduced-motion`.
 */

const NODE_R = 19;
const PAD = 44;

/** Which CSS token paints each role. Kept in sync with `shared.tsx`. */
const ROLE_TOKEN: Record<VisualRole, string> = {
  idle: '--c-ink-faint',
  active: '--c-cyan',
  compare: '--c-amber',
  swap: '--c-pink',
  pivot: '--c-violet',
  sorted: '--c-lime',
  visited: '--c-violet',
  frontier: '--c-amber',
  path: '--c-lime',
  success: '--c-lime',
  danger: '--c-red',
  ghost: '--c-ink-faint',
  muted: '--c-line',
};

const roleColor = (role: VisualRole | undefined): string => `rgb(var(${ROLE_TOKEN[role ?? 'idle']}))`;

/** Reads the live CSS token values — the theme switch re-paints the canvas. */
function readTokens(tokens: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === 'undefined') return out;
  const styles = window.getComputedStyle(document.documentElement);
  for (const token of tokens) out[token] = styles.getPropertyValue(token).trim() || '148 163 184';
  return out;
}

/** Edges whose particles should be flowing right now. */
const ENERGY_ROLES: ReadonlySet<VisualRole> = new Set<VisualRole>(['active', 'compare', 'frontier', 'path', 'success']);

interface Placed {
  readonly node: GraphNodeSnapshot;
  readonly cx: number;
  readonly cy: number;
}

/**
 * The energy layer. It owns its own animation frame and only reads from a ref,
 * so stepping through the trace never re-renders it — the canvas simply picks
 * up the new edge set on the next frame.
 */
function EnergyLayer({
  edges,
  placed,
  size,
  active,
}: {
  readonly edges: readonly GraphEdgeSnapshot[];
  readonly placed: readonly Placed[];
  readonly size: { readonly width: number; readonly height: number };
  readonly active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Latest edge set, read by the animation frame without re-rendering React. */
  const edgesRef = useRef<readonly GraphEdgeSnapshot[]>(edges);
  edgesRef.current = edges;
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced || !active) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(size.width * dpr));
    canvas.height = Math.max(1, Math.floor(size.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const tokens = readTokens(['--c-cyan', '--c-lime', '--c-amber', '--c-violet', '--c-ink-faint']);
    const byId = new Map(placed.map((p) => [p.node.id, p]));
    let frame = 0;
    const started = performance.now();

    const draw = (now: number): void => {
      ctx.clearRect(0, 0, size.width, size.height);
      const elapsed = (now - started) / 1000;

      for (const edge of edgesRef.current) {
        if (!edge.role || !ENERGY_ROLES.has(edge.role)) continue;
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) continue;
        const token = ROLE_TOKEN[edge.role ?? 'active'];
        const rgb = tokens[token] ?? tokens['--c-cyan'] ?? '0 245 255';

        const dx = to.cx - from.cx;
        const dy = to.cy - from.cy;
        const length = Math.hypot(dx, dy);
        if (length < 1) continue;
        const ux = dx / length;
        const uy = dy / length;
        const startGap = NODE_R + 4;
        const endGap = NODE_R + 4;

        // Two particles per edge, offset so the flow reads as a stream.
        for (let i = 0; i < 2; i += 1) {
          const t = ((elapsed * 0.35 + i * 0.5) % 1 + 1) % 1;
          const x = from.cx + ux * (startGap + (length - startGap - endGap) * t);
          const y = from.cy + uy * (startGap + (length - startGap - endGap) * t);
          const fade = Math.sin(t * Math.PI);

          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${rgb} / ${0.16 * fade})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, 2.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${rgb} / ${0.9 * fade})`;
          ctx.fill();
        }
      }
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [placed, reduced, size.width, size.height, active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

function EdgeShape({
  edge,
  from,
  to,
  directed,
  weighted,
}: {
  readonly edge: GraphEdgeSnapshot;
  readonly from: Placed;
  readonly to: Placed;
  readonly directed: boolean;
  readonly weighted: boolean;
}) {
  const hasRole = Boolean(edge.role) && edge.role !== 'idle';
  const color = roleColor(edge.role);

  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const x1 = from.cx + ux * NODE_R;
  const y1 = from.cy + uy * NODE_R;
  const x2 = to.cx - ux * (directed ? NODE_R + 8 : NODE_R);
  const y2 = to.cy - uy * (directed ? NODE_R + 8 : NODE_R);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const weight = edge.weight;

  return (
    <g>
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={hasRole ? 3 : 1.6}
        strokeLinecap="round"
        strokeDasharray={edge.flow !== undefined ? '6 5' : undefined}
        initial={false}
        animate={{ opacity: edge.role === 'muted' ? 0.25 : 1 }}
        transition={{ duration: 0.25 }}
        style={hasRole ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
      />
      {directed && weight === undefined && hasRole ? (
        <motion.path
          d={`M ${x2 - ux * 9 - uy * 4} ${y2 - uy * 9 + ux * 4} L ${x2} ${y2} L ${x2 - ux * 9 + uy * 4} ${y2 - uy * 9 - ux * 4}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          initial={false}
          animate={{ opacity: 1 }}
        />
      ) : null}
      {directed && weight !== undefined ? (
        <motion.polygon
          points={`${x2 - ux * 9 - uy * 4.5},${y2 - uy * 9 + ux * 4.5} ${x2},${y2} ${x2 - ux * 9 + uy * 4.5},${y2 - uy * 9 - ux * 4.5}`}
          fill={color}
          initial={false}
          animate={{ opacity: 1 }}
        />
      ) : null}
      {weighted && weight !== undefined ? (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x={-11}
            y={-9}
            width={22}
            height={17}
            rx={6}
            fill="rgb(var(--c-surface) / 0.92)"
            stroke={color}
            strokeWidth={hasRole ? 1.2 : 0.8}
          />
          <text
            textAnchor="middle"
            y={4}
            className="font-mono"
            fontSize={11}
            fill={hasRole ? color : 'rgb(var(--c-ink-dim))'}
          >
            {weight}
          </text>
        </g>
      ) : null}
    </g>
  );
}

const ROLE_TEXT_ON: ReadonlySet<VisualRole> = new Set<VisualRole>(['active', 'compare', 'swap', 'pivot', 'sorted', 'visited', 'path', 'frontier', 'success', 'danger']);

function NodeShape({ placed, reduced }: { readonly placed: Placed; readonly reduced: boolean }) {
  const { node, cx, cy } = placed;
  // Generators tag the terminals through `sub`, so the rings need no extra field.
  const isStart = node.sub === 'start';
  const isEnd = node.sub === 'end';
  const color = roleColor(node.role);
  const emphasized = node.role !== undefined && ROLE_TEXT_ON.has(node.role);

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: node.role === 'ghost' ? 0.4 : 1, scale: 1, x: cx, y: cy }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {isStart || isEnd ? (
        <circle r={NODE_R + 7} fill="none" stroke={isStart ? 'rgb(var(--c-cyan))' : 'rgb(var(--c-pink))'} strokeWidth={1.2} strokeDasharray="3 4" opacity={0.8} />
      ) : null}
      <circle
        r={NODE_R}
        fill={emphasized ? `color-mix(in srgb, ${color} 22%, rgb(var(--c-surface)))` : 'rgb(var(--c-surface) / 0.92)'}
        stroke={color}
        strokeWidth={emphasized ? 2.2 : 1.3}
        style={emphasized ? { filter: `drop-shadow(0 0 10px ${color})` } : undefined}
      />
      <text
        textAnchor="middle"
        y={5}
        className="font-mono"
        fontSize={13}
        fontWeight={600}
        fill={emphasized ? color : 'rgb(var(--c-ink))'}
      >
        {node.label}
      </text>
      {node.badge !== undefined ? (
        <g transform={`translate(${NODE_R - 4}, ${-NODE_R + 2})`}>
          <circle r={9.5} fill="rgb(var(--c-bg) / 0.95)" stroke={color} strokeWidth={1} />
          <text textAnchor="middle" y={3.5} className="font-mono" fontSize={9} fill={color}>
            {node.badge}
          </text>
        </g>
      ) : null}
      {node.sub !== undefined ? (
        <text textAnchor="middle" y={NODE_R + 15} fontSize={9} fill="rgb(var(--c-ink-faint))" className="font-mono">
          {node.sub}
        </text>
      ) : null}
    </motion.g>
  );
}

function DistanceTable({ table }: { readonly table: NonNullable<GraphSnapshot['table']> }) {
  return (
    <div className="pointer-events-auto max-h-[42%] overflow-auto rounded-xl border border-line/70 bg-surface/80 p-2 backdrop-blur-md">
      <table className="border-separate border-spacing-0 font-mono text-[10px]">
        <thead>
          <tr>
            {table.headers.map((header, c) => (
              <th
                key={header}
                scope="col"
                className={cn(
                  'px-2 py-1 text-left font-normal text-ink-faint',
                  c === table.highlightCol && 'text-accent-cyan',
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr
              key={`row-${r}`}
              className={cn(
                r === table.highlightRow && 'bg-accent-cyan/10',
                table.highlightRow !== undefined && r < table.highlightRow && 'opacity-70',
              )}
            >
              {row.map((cell, c) => (
                <td
                  key={`cell-${r}-${c}`}
                  className={cn(
                    'border-t border-line/50 px-2 py-1 text-ink-dim',
                    c === 0 && 'text-ink-faint',
                    c === table.highlightCol && r === table.highlightRow && 'text-accent-cyan',
                    c > 0 && r > 0 && typeof cell === 'number' && 'text-ink',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GraphVisualizer({ step, index, progress }: VisualizerProps<GraphSnapshot, unknown>) {
  const state = step.state;
  const reduced = usePrefersReducedMotion();
  const { ref, size } = useElementSize<HTMLDivElement>();
  const sound = { kind: step.kind, stepIndex: index, progress } as const;
  useAlgoSound(sound);

  const placed: Placed[] = useMemo(
    () =>
      state.nodes.map((node) => ({
        node,
        cx: PAD + node.x * Math.max(1, size.width - PAD * 2),
        cy: PAD + node.y * Math.max(1, size.height - PAD * 2),
      })),
    [state.nodes, size.width, size.height],
  );

  const byId = useMemo(() => new Map(placed.map((p) => [p.node.id, p])), [placed]);

  const energyActive = placed.length > 0;

  if (state.nodes.length === 0) {
    return (
      <VisualizerShell caption={state.caption} badges={state.badges}>
        <EmptyStage message="This graph has no nodes. Add some edges and vertices to explore." />
      </VisualizerShell>
    );
  }

  return (
    <VisualizerShell
      caption={state.caption}
      badges={state.badges}
      roles={['active', 'compare', 'frontier', 'visited', 'path', 'danger']}
    >
      <div ref={ref} className="relative h-full w-full overflow-hidden rounded-xl">
        <EnergyLayer edges={state.edges} placed={placed} size={size} active={energyActive} />

        <svg role="img" aria-label={`graph with ${state.nodes.length} nodes and ${state.edges.length} edges`} className="relative h-full w-full">
          <AnimatePresence initial={false}>
            {state.edges.map((edge) => {
              const from = byId.get(edge.from);
              const to = byId.get(edge.to);
              if (!from || !to) return null;
              return (
                <EdgeShape
                  key={`${edge.from}->${edge.to}`}
                  edge={edge}
                  from={from}
                  to={to}
                  directed={Boolean(edge.directed)}
                  weighted={Boolean(state.weighted)}
                />
              );
            })}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {placed.map((p) => (
              <NodeShape key={p.node.id} placed={p} reduced={reduced} />
            ))}
          </AnimatePresence>
        </svg>

        {state.table ? (
          <div className="pointer-events-none absolute bottom-2 left-2">
            <DistanceTable table={state.table} />
          </div>
        ) : null}

        <span className="sr-only">{step.description}</span>
      </div>
    </VisualizerShell>
  );
}
