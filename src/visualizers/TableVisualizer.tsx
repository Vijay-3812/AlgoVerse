import { motion } from 'framer-motion';
import { memo, useMemo, useRef } from 'react';
import type { TableSnapshot, VisualizerProps, VisualRole } from '@/types';
import { useAlgoSound } from '@/hooks/useAlgoSound';
import { useElementSize } from '@/hooks/useElementSize';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { ROLE_COLOR } from '@/visual/roles';
import { cn } from '@/utils/cn';
import { VisualizerShell } from './shared';

/**
 * TABLE VISUALIZER — DP tables, Floyd–Warshall matrices, interval DP.
 *
 * The whole point of a DP visualisation is the *dependency*: which cells fed the
 * one being filled. So the renderer draws arrow overlays from every `deps` entry
 * to the active cell, in SVG on top of the grid, and the final backtrack path
 * gets its own outline. Filled cells keep their value and a role colour; the
 * active cell gets a ring and a lift.
 *
 * Cells are memoised and animated with `scale`/`opacity` only, so a 30×30 table
 * (900 cells) stays smooth.
 */

const SPRING = { type: 'spring', stiffness: 420, damping: 30, mass: 0.5 } as const;
const REDUCED = { duration: 0 } as const;

const LEGEND_ROLES: readonly VisualRole[] = ['active', 'compare', 'sorted', 'pivot', 'visited', 'ghost'];

interface CellProps {
  readonly row: number;
  readonly col: number;
  readonly value: number | string | null;
  readonly role: VisualRole | null;
  readonly active: boolean;
  readonly onPath: boolean;
  readonly size: number;
  readonly reduce: boolean;
}

const Cell = memo(function Cell({ row, col, value, role, active, onPath, size, reduce }: CellProps) {
  const color = role && role !== 'idle' ? ROLE_COLOR[role] : null;
  const empty = value === null || value === '';

  return (
    <motion.div
      /* `data-cell` is the anchor the SVG dependency arrows measure against. */
      data-cell={`${row}:${col}`}
      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: empty ? 0.45 : 1, scale: active ? 1.04 : 1 }}
      transition={reduce ? REDUCED : SPRING}
      style={{
        width: size,
        height: size * 0.78,
        background: color ? `color-mix(in srgb, ${color} 16%, transparent)` : 'rgb(var(--c-panel) / 0.5)',
        borderColor: active ? 'rgb(var(--c-cyan))' : onPath ? 'rgb(var(--c-lime))' : color ?? 'rgb(var(--c-line))',
        boxShadow: active ? '0 0 22px -6px rgb(var(--c-cyan))' : 'none',
        zIndex: active ? 2 : 1,
      }}
      className={cn(
        'relative flex items-center justify-center rounded-md border font-mono text-ink transition-colors',
        active && 'font-semibold',
      )}
      title={`[${row}, ${col}] = ${value ?? '—'}`}
    >
      <span style={{ fontSize: Math.max(9, Math.min(13, size * 0.34)) }}>{value ?? ''}</span>
    </motion.div>
  );
});

export function TableVisualizer({ step, index, progress, speed }: VisualizerProps<TableSnapshot, unknown>) {
  const state = step.state;
  const reduce = usePrefersReducedMotion();
  const { ref, size } = useElementSize<HTMLDivElement>();
  const gridRef = useRef<HTMLDivElement>(null);
  useAlgoSound({ kind: step.kind, stepIndex: index, progress });

  const active = state.active ?? null;
  const path = useMemo(
    () => new Set((state.path ?? []).map(([row, col]) => `${row}:${col}`)),
    [state.path],
  );

  const rows = state.rows.length;
  const cols = state.cols.length;
  const axisWidth = 78;
  const cellSize = useMemo(() => {
    const available = Math.max(200, size.width - axisWidth - 24);
    const byWidth = available / Math.max(1, cols);
    const byHeight = 46;
    return Math.max(24, Math.min(62, byWidth, byHeight));
  }, [cols, size.width]);

  const arrowPath = useMemo(() => {
    if (!active || !state.deps || state.deps.length === 0) return '';
    const [ar, ac] = active;
    const step_ = cellSize + 4;
    const originX = axisWidth;
    const centre = (row: number, col: number): { x: number; y: number } => ({
      x: originX + col * step_ + cellSize / 2,
      y: 34 + row * (cellSize * 0.78 + 4) + (cellSize * 0.78) / 2,
    });
    const target = centre(ar, ac);
    return state.deps
      .map(([row, col]) => {
        const from = centre(row, col);
        return `M ${from.x} ${from.y} L ${target.x} ${target.y}`;
      })
      .join(' ');
  }, [active, cellSize, state.deps]);

  return (
    <VisualizerShell
      caption={state.caption}
      badges={{ ...state.badges, active: active ? `[${active[0]},${active[1]}]` : '—', speed: `${speed}×` }}
      roles={LEGEND_ROLES}
    >
      <div ref={ref} className="scroll-both h-full w-full px-3 py-2">
        <div ref={gridRef} className="relative inline-block">
          {/* column headers */}
          <div className="flex" style={{ marginLeft: axisWidth }}>
            {state.cols.map((col, colIndex) => (
              <div
                key={`c-${colIndex}`}
                className="flex flex-col items-center justify-end pb-1"
                style={{ width: cellSize + 4 }}
              >
                <span className="font-mono text-[10px] text-ink-dim">{col.label}</span>
                {col.sub ? <span className="font-mono text-[9px] text-ink-faint">{col.sub}</span> : null}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* row headers */}
            <div className="flex flex-col" style={{ width: axisWidth }}>
              {state.rows.map((row, rowIndex) => (
                <div
                  key={`r-${rowIndex}`}
                  className="flex flex-col items-end justify-center pr-2 text-right"
                  style={{ height: cellSize * 0.78 + 4 }}
                >
                  <span className="font-mono text-[10px] text-ink-dim">{row.label}</span>
                  {row.sub ? <span className="font-mono text-[9px] text-ink-faint">{row.sub}</span> : null}
                </div>
              ))}
            </div>

            {/* grid + dependency overlay */}
            <div className="relative">
              {arrowPath ? (
                <svg
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[3] h-full w-full overflow-visible"
                >
                  <defs>
                    <marker id="tv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--c-pink))" />
                    </marker>
                  </defs>
                  <motion.path
                    d={arrowPath}
                    fill="none"
                    stroke="rgb(var(--c-pink))"
                    strokeWidth={1.6}
                    strokeDasharray="4 4"
                    markerEnd="url(#tv-arrow)"
                    initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.95 }}
                    transition={reduce ? REDUCED : { duration: 0.35, ease: 'easeOut' }}
                  />
                </svg>
              ) : null}

              <div className="relative z-[1] flex flex-col" style={{ gap: 4 }}>
                {state.cells.map((row, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="flex" style={{ gap: 4 }}>
                    {row.map((value, colIndex) => (
                      <Cell
                        key={`${rowIndex}:${colIndex}`}
                        row={rowIndex}
                        col={colIndex}
                        value={value}
                        role={state.roles?.[rowIndex]?.[colIndex] ?? null}
                        active={active?.[0] === rowIndex && active?.[1] === colIndex}
                        onPath={path.has(`${rowIndex}:${colIndex}`)}
                        size={cellSize}
                        reduce={reduce}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {rows * cols > 400 ? (
            <p className="mt-2 font-mono text-2xs text-ink-faint">
              {rows}×{cols} table — scroll to explore; the active cell is highlighted.
            </p>
          ) : null}
        </div>
      </div>
    </VisualizerShell>
  );
}
