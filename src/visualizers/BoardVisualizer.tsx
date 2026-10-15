import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import type { BoardSnapshot, VisualizerProps, VisualRole } from '@/types';
import { useAlgoSound } from '@/hooks/useAlgoSound';
import { useElementSize } from '@/hooks/useElementSize';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { ROLE_COLOR } from '@/visual/roles';
import { cn } from '@/utils/cn';
import { VisualizerShell } from './shared';

/**
 * BOARD VISUALIZER — N-Queens, Sudoku, Rat in a Maze, any row × col grid.
 *
 * The interesting information on a board is never the value, it is the
 * *constraint*: which cells a queen attacks, which candidate a solver just
 * rejected, which cell is trying to be filled. So cells carry a role, overlays
 * carry text above them, and the diagonal sweep of an N-Queens conflict is
 * visible as a role before any of the narration is read.
 *
 * Cell size is derived from the measured box, so a 4×4 maze and a 9×9 Sudoku
 * both fill the stage without a hard-coded scale.
 */

const SPRING = { type: 'spring', stiffness: 400, damping: 30, mass: 0.5 } as const;
const REDUCED = { duration: 0 } as const;

const LEGEND_ROLES: readonly VisualRole[] = ['active', 'compare', 'success', 'danger', 'ghost', 'muted'];

interface BoardCellProps {
  readonly row: number;
  readonly col: number;
  readonly value: string | number | null;
  readonly role: VisualRole | null;
  readonly size: number;
  readonly reduce: boolean;
  readonly blockSize: number;
}

const BoardCell = memo(function BoardCell({ row, col, value, role, size, reduce, blockSize }: BoardCellProps) {
  const color = role && role !== 'idle' ? ROLE_COLOR[role] : null;
  const fixed = typeof value === 'number';
  // Sudoku-style block shading: alternate 3×3 blocks so the structure is visible.
  const shaded = Math.floor(row / blockSize) % 2 !== Math.floor(col / blockSize) % 2;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: role === 'muted' ? 0.45 : 1, scale: 1 }}
      transition={reduce ? REDUCED : SPRING}
      style={{
        width: size,
        height: size,
        background: color
          ? `color-mix(in srgb, ${color} 22%, transparent)`
          : shaded
            ? 'rgb(var(--c-surface) / 0.5)'
            : 'rgb(var(--c-panel) / 0.4)',
        borderColor: color ?? 'rgb(var(--c-line) / 0.7)',
        boxShadow: role === 'active' ? '0 0 20px -6px rgb(var(--c-cyan))' : 'none',
        fontSize: Math.max(10, size * 0.42),
      }}
      className={cn(
        'flex items-center justify-center rounded-md border font-mono',
        fixed ? 'text-ink' : 'text-ink-dim',
        role === 'active' && 'font-semibold',
      )}
      title={`[${row}, ${col}]${value === null ? '' : ` = ${value}`}`}
    >
      {value ?? ''}
    </motion.div>
  );
});

export function BoardVisualizer({ step, index, progress, speed }: VisualizerProps<BoardSnapshot, unknown>) {
  const state = step.state;
  const reduce = usePrefersReducedMotion();
  const { ref, size: box } = useElementSize<HTMLDivElement>();
  useAlgoSound({ kind: step.kind, stepIndex: index, progress });

  const overlays = useMemo(() => {
    const map = new Map<string, { text: string; role: VisualRole }>();
    for (const overlay of state.overlays ?? []) map.set(`${overlay.row}:${overlay.col}`, overlay);
    return map;
  }, [state.overlays]);

  const size = useMemo(() => {
    const available = Math.max(180, Math.min(box.width - 160, (box.height || 420) - 40));
    const raw = available / Math.max(state.rows, state.cols);
    return Math.max(20, Math.min(86, raw));
  }, [box.height, box.width, state.cols, state.rows]);

  // Sudoku is 9×9 with 3×3 blocks; everything else is one block.
  const blockSize = state.rows === 9 ? 3 : state.rows === 4 ? 2 : state.rows;

  return (
    <VisualizerShell
      caption={state.caption}
      badges={{ ...state.badges, size: `${state.rows}×${state.cols}`, speed: `${speed}×` }}
      roles={LEGEND_ROLES}
    >
      <div ref={ref} className="scroll-both flex h-full w-full items-start justify-center px-3 py-2">
        <div className="flex gap-2">
          {state.rowLabels ? (
            <div className="flex flex-col pt-[18px]">
              {state.rowLabels.map((label) => (
                <div key={label} className="flex items-center justify-end pr-1 font-mono text-[10px] text-ink-faint" style={{ height: size + 2 }}>
                  {label}
                </div>
              ))}
            </div>
          ) : null}

          <div>
            {state.colLabels ? (
              <div className="mb-1 flex">
                {state.colLabels.map((label) => (
                  <div key={label} className="text-center font-mono text-[10px] text-ink-faint" style={{ width: size + 2 }}>
                    {label}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid" style={{ gridTemplateColumns: `repeat(${state.cols}, ${size + 2}px)`, gap: 2 }}>
              {state.cells.map((row, rowIndex) =>
                row.map((value, colIndex) => {
                  const overlay = overlays.get(`${rowIndex}:${colIndex}`);
                  return (
                    <div key={`${rowIndex}:${colIndex}`} className="relative">
                      <BoardCell
                        row={rowIndex}
                        col={colIndex}
                        value={value}
                        role={state.roles?.[rowIndex]?.[colIndex] ?? null}
                        size={size}
                        reduce={reduce}
                        blockSize={blockSize}
                      />
                      {overlay ? (
                        <motion.span
                          initial={reduce ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-bg/90 px-1 font-mono text-[9px]"
                          style={{ color: ROLE_COLOR[overlay.role] }}
                        >
                          {overlay.text}
                        </motion.span>
                      ) : null}
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>
    </VisualizerShell>
  );
}
