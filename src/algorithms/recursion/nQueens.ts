import { defineModule } from '@/types';
import type { AlgorithmDefinition, BoardSnapshot } from '@/types';
import { code, defineAlgorithm, finish, numberOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { BoardVisualizer } from '@/visualizers/BoardVisualizer';
import { COMPLEXITY, numberInput } from './specs';

/**
 * N-Queens — backtracking with real pruning.
 *
 * A queen is placed row by row, and each row tests the three constraints
 * (column, ↘ diagonal, ↙ diagonal) in O(1) using boolean arrays. When no
 * column survives in a row, the recursion unwinds: that unwind *is* the
 * algorithm, and painting it on a chessboard makes it legible.
 *
 * @pure — identical input + run ⇒ identical trace.
 */

interface QueenData {
  readonly op: 'try' | 'conflict' | 'place' | 'backtrack' | 'solution' | 'done';
  readonly row?: number;
  readonly col?: number;
  readonly conflicts?: readonly number[];
}

/**
 * Conflict cells for the step currently being emitted.
 *
 * A board state is a thunk, read at the moment `emit()` runs, so the generator
 * can hand the renderer "these squares are under attack" for exactly one beat
 * by filling this set just before the emit and clearing it just after.
 */
const attackingSet = new Set<number>();

const spec: AlgorithmSpec<BoardSnapshot, QueenData> = {
  id: 'n-queens',
  complexity: COMPLEXITY.queens!,
  pseudocode: pseudo(`
#solve(row)
# if row = n
#   record a solution     ← all n rows have a queen
#   return
# for col from 0 to n − 1
#   if col used or ↘ diag used or ↙ diag used
#     skip                ← pruned, no recursion at all
#   place queen(row, col); mark col and both diagonals
#   solve(row + 1)
#   remove queen; unmark  ← backtrack`),
  code: code(
    `
function solve(row, n, cols, d1, d2, board, out) {
  if (row === n) { out.push(board.map((r) => [...r])); return; }
  for (let col = 0; col < n; col++) {
    if (cols[col] || d1[row + col] || d2[row - col + n - 1]) continue;
    cols[col] = d1[row + col] = d2[row - col + n - 1] = true;
    board[row][col] = 'Q';
    solve(row + 1, n, cols, d1, d2, board, out);
    board[row][col] = null;
    cols[col] = d1[row + col] = d2[row - col + n - 1] = false;
  }
}`,
    `
def solve(row, n, cols, d1, d2, board, out):
    if row == n:
        out.append([r[:] for r in board])
        return
    for col in range(n):
        if cols[col] or d1[row + col] or d2[row - col + n - 1]:
            continue
        cols[col] = d1[row + col] = d2[row - col + n - 1] = True
        board[row][col] = 'Q'
        solve(row + 1, n, cols, d1, d2, board, out)
        board[row][col] = None
        cols[col] = d1[row + col] = d2[row - col + n - 1] = False`,
    `
void solve(int row, int n, vector<bool>& cols, vector<bool>& d1, vector<bool>& d2,
           vector<vector<char>>& board, vector<vector<vector<char>>>& out) {
  if (row == n) { out.push_back(board); return; }
  for (int col = 0; col < n; ++col) {
    if (cols[col] || d1[row + col] || d2[row - col + n - 1]) continue;
    cols[col] = d1[row + col] = d2[row - col + n - 1] = true;
    board[row][col] = 'Q';
    solve(row + 1, n, cols, d1, d2, board, out);
    board[row][col] = '.';
    cols[col] = d1[row + col] = d2[row - col + n - 1] = false;
  }
}`,
    `
static void solve(int row, int n, boolean[] cols, boolean[] d1, boolean[] d2,
                  char[][] board, List<char[][]> out) {
  if (row == n) { out.add(clone(board)); return; }
  for (int col = 0; col < n; col++) {
    if (cols[col] || d1[row + col] || d2[row - col + n - 1]) continue;
    cols[col] = d1[row + col] = d2[row - col + n - 1] = true;
    board[row][col] = 'Q';
    solve(row + 1, n, cols, d1, d2, board, out);
    board[row][col] = '.';
    cols[col] = d1[row + col] = d2[row - col + n - 1] = false;
  }
}`,
  ),
  explanation: [
    'Rows are filled top to bottom. Because each row gets exactly one queen, the only thing to decide per row is which column — that alone removes nⁿ candidate boards.',
    'A placement is legal if its column is free (columns array) and neither diagonal is taken. Both diagonals have a constant index: row+col for ↘ and row−col+n−1 for ↙.',
    'The pruning is what makes this fast: 8 queens has 16.7 million full boards but only a few thousand surviving nodes. The board shows rejected squares the moment they are tested, so the shrink is visible.',
  ],
  defaultInput: numberInput(6),
  generate: (input, run) => {
    const n = Math.max(4, Math.min(8, Math.floor(numberOf(input, 6))));
    const board: (string | null)[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => null));
    const cols = Array.from({ length: n }, () => false);
    const d1 = Array.from({ length: 2 * n - 1 }, () => false);
    const d2 = Array.from({ length: 2 * n - 1 }, () => false);
    const solutions: number[][] = [];
    let placements = 0;
    let pruned = 0;

    const builder = new TraceBuilder<BoardSnapshot, QueenData>(() => snapshot());
    const lastSolution = (): number[] | undefined => solutions[solutions.length - 1];

    /**
     * The board as the renderer sees it.
     *
     * Two states are worth drawing: the queens currently placed, and — once the
     * search finds one — the shape of the most recent solution, ghosted in so
     * the final frame is not an empty board.
     */
    function snapshot(): BoardSnapshot {
      const solved = solutions.length > 0 ? lastSolution() : undefined;
      const placed = board.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
      return {
        rows: n,
        cols: n,
        cells: board.map((row, r) =>
          row.map((cell, c) => {
            if (cell) return cell;
            if (solved?.[c] === r) return 'Q';
            return '';
          }),
        ),
        roles: board.map((row, r) =>
          row.map((cell, c) => {
            const index = r * n + c;
            if (attackingSet.has(index)) return 'danger';
            if (cell) return 'active';
            if (solved?.[c] === r && placed === 0) return 'success';
            return null;
          }),
        ),
        colLabels: Array.from({ length: n }, (_, c) => String.fromCharCode(97 + c)),
        badges: { queens: placed, solutions: solutions.length, pruned },
      };
    }

    builder.emit({
      kind: 'init',
      description: `${n}-queens: place one queen per row so no two share a column or diagonal.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
      data: { op: 'try' },
    });

    const solve = (row: number): void => {
      if (row === n) {
        const seen = board.map((r) => r.indexOf('Q'));
        solutions.push(seen);
        builder.emit({
          kind: 'sorted',
          description: `Solution #${solutions.length}: columns ${seen.map((c) => String.fromCharCode(97 + c)).join(', ')}.`,
          pseudocodeLine: 2,
          codeLine: 1,
          weight: 2.2,
          bump: 'writes',
          data: { op: 'solution', row: n - 1 },
        });
        return;
      }

      for (let col = 0; col < n; col += 1) {
        const blocked = cols[col] || d1[row + col] || d2[row - col + n - 1];
        if (blocked) {
          pruned += 1;
          const conflicts = [
            ...(cols[col] ? Array.from({ length: row }, (_, r) => r * n + col) : []),
            ...(d1[row + col] ? diagonalCells(row, col, n, 'down') : []),
            ...(d2[row - col + n - 1] ? diagonalCells(row, col, n, 'up') : []),
          ];
          attackingSet.clear();
          for (const cell of conflicts) attackingSet.add(cell);
          builder.emit({
            kind: 'conflict',
            description: `(${String.fromCharCode(97 + col)}${row + 1}) is attacked — prune, no recursion.`,
            pseudocodeLine: 4,
            codeLine: 3,
            weight: 1,
            bump: 'comparisons',
            data: { op: 'conflict', row, col, conflicts },
          });
          attackingSet.clear();
          continue;
        }

        cols[col] = true;
        d1[row + col] = true;
        d2[row - col + n - 1] = true;
        board[row]![col] = 'Q';
        placements += 1;

        builder.emit({
          kind: 'place',
          description: `Place queen at ${String.fromCharCode(97 + col)}${row + 1}; now solve row ${row + 2}.`,
          pseudocodeLine: 6,
          codeLine: 5,
          weight: 1.4,
          bump: 'writes',
          data: { op: 'place', row, col },
        });

        solve(row + 1);

        cols[col] = false;
        d1[row + col] = false;
        d2[row - col + n - 1] = false;
        board[row]![col] = null;

        builder.emit({
          kind: 'backtrack',
          description: `Remove the queen from ${String.fromCharCode(97 + col)}${row + 1} and try the next column.`,
          pseudocodeLine: 8,
          codeLine: 7,
          weight: 1.25,
          bump: 'writes',
          data: { op: 'backtrack', row, col },
        });
      }
    };

    solve(0);

    builder.emit({
      kind: 'complete',
      description: `${n}-queens has ${solutions.length} solution${solutions.length === 1 ? '' : 's'} — ${placements} placements, ${pruned} squares pruned without recursing.`,
      pseudocodeLine: 1,
      codeLine: 0,
      weight: 3,
      data: { op: 'done' },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `${solutions.length} solutions`,
        detail: `${pruned} prunes vs ${placements} placements`,
        output: solutions.length,
      },
      expectedState: () => solutions.length === REFERENCE[n]?.[0],
    });
  },
};

/** Cells on the two diagonals through (row, col) — drawn as conflict highlights. */
function diagonalCells(row: number, col: number, n: number, direction: 'up' | 'down'): number[] {
  const cells: number[] = [];
  const step = direction === 'down' ? 1 : -1;
  for (let d = -n; d <= n; d += 1) {
    const r = row + d;
    const c = col + step * d;
    if (r >= 0 && r < n && c >= 0 && c < n) cells.push(r * n + c);
  }
  return cells;
}

/** Solution counts n = 4…8, from the standard N-Queens sequence. */
const REFERENCE: Record<number, readonly [number, number]> = {
  4: [2, 2],
  5: [10, 10],
  6: [4, 4],
  7: [40, 40],
  8: [92, 92],
};

export const definition: AlgorithmDefinition<BoardSnapshot, QueenData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BoardVisualizer });
