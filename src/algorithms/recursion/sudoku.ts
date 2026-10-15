import { defineModule } from '@/types';
import type { AlgorithmDefinition, BoardSnapshot, VisualRole } from '@/types';
import { code, defineAlgorithm, finish, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { BoardVisualizer } from '@/visualizers/BoardVisualizer';
import { COMPLEXITY } from './specs';

/**
 * Sudoku solver — backtracking with constraint checking and MRV selection.
 *
 * The solver picks the *most constrained* empty cell (the fewest legal digits
 * left) rather than the first one it finds. That single change is the difference
 * between a 46 000-step trace and a few hundred: a cell with one candidate
 * forces itself, and a cell with none proves the branch dead before it is
 * entered. The board is the whole state, so the trace shows the shape of the
 * search — long runs of confident placements, then red conflicts and an unwind.
 *
 * @pure — identical input + run ⇒ identical trace.
 */

interface SudokuData {
  readonly op: 'scan' | 'try' | 'conflict' | 'place' | 'backtrack' | 'solved';
  readonly row?: number;
  readonly col?: number;
  readonly digit?: number;
  /** Cells in the same row / column / box that block `digit`. */
  readonly blockers?: readonly number[];
}

/**
 * A puzzle with a unique solution.
 *
 * Deliberately not the easy one: this grid forces the MRV solver into genuine
 * dead ends (≈160 of them), so the page shows both halves of backtracking —
 * the confident run of forced cells *and* the unwind when a guess is wrong.
 */
const PUZZLE: readonly (readonly number[])[] = [
  [1, 0, 0, 0, 0, 7, 0, 9, 0],
  [0, 3, 0, 0, 2, 0, 0, 0, 8],
  [0, 0, 9, 6, 0, 0, 5, 0, 0],
  [0, 0, 5, 3, 0, 0, 9, 0, 0],
  [0, 1, 0, 0, 8, 0, 0, 0, 2],
  [6, 0, 0, 0, 0, 4, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 4, 0, 0, 0, 0, 0, 0, 7],
  [0, 0, 7, 0, 0, 0, 3, 0, 0],
];

/** Every filled cell that currently rules `digit` out of (row, col). */
function blockersFor(grid: readonly number[][], row: number, col: number, digit: number): number[] {
  const blockers = new Set<number>();
  for (let c = 0; c < 9; c += 1) if (grid[row]?.[c] === digit) blockers.add(row * 9 + c);
  for (let r = 0; r < 9; r += 1) if (grid[r]?.[col] === digit) blockers.add(r * 9 + col);
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if (grid[r]?.[c] === digit) blockers.add(r * 9 + c);
    }
  }
  return [...blockers];
}

const spec: AlgorithmSpec<BoardSnapshot, SudokuData> = {
  id: 'sudoku-solver',
  complexity: COMPLEXITY.sudoku!,
  pseudocode: pseudo(`
#solve(grid)
# pick the empty cell with fewest candidates (MRV)
# if no empty cell: return true     ← the grid is complete
# if the cell has no candidate: return false   ← dead branch
# for digit in candidates
#   place digit
#   if solve(grid): return true
#   clear the cell                ← backtrack
# return false                      ← nothing worked here`),
  code: code(
    `
function solve(grid) {
  const pick = mostConstrained(grid);   // { row, col, digits }
  if (!pick) return true;               // no empty cell left
  const { row, col, digits } = pick;
  for (const digit of digits) {
    grid[row][col] = digit;
    if (solve(grid)) return true;
    grid[row][col] = 0;
  }
  return false;
}`,
    `
def solve(grid):
    pick = most_constrained(grid)   # (row, col, digits)
    if pick is None:
        return True
    row, col, digits = pick
    for digit in digits:
        grid[row][col] = digit
        if solve(grid):
            return True
        grid[row][col] = 0
    return False`,
    `
bool solve(vector<vector<int>>& grid) {
  auto pick = mostConstrained(grid);   // { row, col, digits }
  if (!pick) return true;
  auto [row, col, digits] = *pick;
  for (int digit : digits) {
    grid[row][col] = digit;
    if (solve(grid)) return true;
    grid[row][col] = 0;
  }
  return false;
}`,
    `
static boolean solve(int[][] grid) {
  Choice pick = mostConstrained(grid);   // row, col, digits
  if (pick == null) return true;
  int row = pick.row, col = pick.col;
  for (int digit : pick.digits) {
    grid[row][col] = digit;
    if (solve(grid)) return true;
    grid[row][col] = 0;
  }
  return false;
}`,
  ),
  explanation: [
    'The solver is three ideas stacked: pick an empty cell, try each digit that survives the row/column/box checks, and recurse. If nothing works, clear the cell and return false so the caller tries its next digit.',
    'The cell is chosen by minimum remaining values — the empty cell with the fewest legal digits. A cell with one candidate is forced, and a cell with none proves the branch dead before it costs a single placement.',
    'Pruning and MRV together keep the search far away from 9^(empty cells). The narration badges count how much of that search actually happened.',
  ],
  defaultInput: () => ({ kind: 'matrix', grid: PUZZLE }),
  generate: (input, run) => {
    const given = (input.kind === 'matrix' ? input.grid : PUZZLE).map((row) => [...row]);
    const grid = given.map((row) => [...row]);
    const givenCells = new Set<number>();
    grid.forEach((row, r) => row.forEach((value, c) => { if (value !== 0) givenCells.add(r * 9 + c); }));

    let placements = 0;
    let backtracks = 0;
    let tested = 0;
    let solved = false;
    /** Blocking cells for the current beat — same one-beat trick as N-Queens. */
    const blocking = new Set<number>();
    const builder = new TraceBuilder<BoardSnapshot, SudokuData>(() => snapshot());

    function snapshot(): BoardSnapshot {
      return {
        rows: 9,
        cols: 9,
        cells: grid.map((row) => row.map((value) => (value === 0 ? '' : String(value)))),
        roles: grid.map((row, r) =>
          row.map((value, c) => {
            const index = r * 9 + c;
            if (blocking.has(index)) return 'danger' satisfies VisualRole;
            if (value === 0) return null;
            return givenCells.has(index) ? 'muted' : 'active';
          }),
        ),
        badges: { placements, backtracks, tested },
      };
    }

    const candidatesFor = (row: number, col: number): number[] => {
      const out: number[] = [];
      for (let digit = 1; digit <= 9; digit += 1) {
        if (blockersFor(grid, row, col, digit).length === 0) out.push(digit);
      }
      return out;
    };

    /**
     * Minimum-remaining-values pick: the empty cell with the fewest candidates.
     *
     * Ties go to the earliest cell, which keeps the trace deterministic.
     */
    const mostConstrained = (): { row: number; col: number; digits: number[] } | null => {
      let best: { row: number; col: number; digits: number[] } | null = null;
      for (let r = 0; r < 9; r += 1) {
        for (let c = 0; c < 9; c += 1) {
          if (grid[r]?.[c] !== 0) continue;
          const digits = candidatesFor(r, c);
          if (digits.length === 0) return { row: r, col: c, digits };
          if (!best || digits.length < best.digits.length) {
            best = { row: r, col: c, digits };
            if (digits.length === 1) return best;
          }
        }
      }
      return best;
    };

    builder.emit({
      kind: 'init',
      description: `${givenCells.size} of 81 cells are given — the rest must be deduced.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
      data: { op: 'scan' },
    });

    const solve = (): boolean => {
      const cell = mostConstrained();
      if (!cell) {
        solved = true;
        builder.emit({
          kind: 'complete',
          description: `Solved: ${placements} placements, ${backtracks} backtracks, ${tested} candidate digits explored.`,
          pseudocodeLine: 0,
          codeLine: 1,
          weight: 3,
          bump: 'writes',
          data: { op: 'solved' },
        });
        return true;
      }

      const { row, col, digits } = cell;
      tested += digits.length;
      builder.emit({
        kind: 'visit',
        description:
          digits.length === 0
            ? `(${row + 1}, ${col + 1}) has no legal digit left — this branch is dead.`
            : `Most constrained cell is (${row + 1}, ${col + 1}) with ${digits.length} candidate${digits.length === 1 ? '' : 's'}: ${digits.join(', ')}.`,
        pseudocodeLine: digits.length === 0 ? 2 : 1,
        codeLine: 2,
        weight: 1.1,
        bump: 'reads',
        data: { op: 'scan', row, col },
      });

      if (digits.length === 0) return false;

      for (const digit of digits) {
        grid[row]![col] = digit;
        placements += 1;
        builder.emit({
          kind: 'place',
          description: `Place ${digit} at (${row + 1}, ${col + 1}) and recurse.`,
          pseudocodeLine: 4,
          codeLine: 4,
          weight: 1.3,
          bump: 'writes',
          data: { op: 'place', row, col, digit },
        });

        if (solve()) return true;

        grid[row]![col] = 0;
        backtracks += 1;
        builder.emit({
          kind: 'backtrack',
          description: `${digit} at (${row + 1}, ${col + 1}) led to a dead end — clear it and try the next digit.`,
          pseudocodeLine: 6,
          codeLine: 5,
          weight: 1.2,
          bump: 'writes',
          data: { op: 'backtrack', row, col, digit },
        });
      }

      return false;
    };

    solve();

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: solved ? 'Grid solved' : 'No solution',
        detail: `${placements} placements · ${backtracks} backtracks`,
        output: grid.map((row) => [...row]),
      },
      expectedState: () =>
        solved &&
        grid.every((row) => row.every((value) => value >= 1 && value <= 9)) &&
        isConsistent(grid),
    });
  },
};

/** Independent check: every row, column and box holds 1–9 exactly once. */
function isConsistent(grid: readonly number[][]): boolean {
  const complete = (values: readonly number[]): boolean => {
    const set = new Set(values);
    return set.size === 9 && [...set].every((v) => v >= 1 && v <= 9);
  };
  for (let i = 0; i < 9; i += 1) {
    if (!complete(grid[i] ?? [])) return false;
    if (!complete(grid.map((row) => row[i] ?? 0))) return false;
  }
  for (let box = 0; box < 9; box += 1) {
    const br = Math.floor(box / 3) * 3;
    const bc = (box % 3) * 3;
    const values: number[] = [];
    for (let r = br; r < br + 3; r += 1) for (let c = bc; c < bc + 3; c += 1) values.push(grid[r]?.[c] ?? 0);
    if (!complete(values)) return false;
  }
  return true;
}

export const definition: AlgorithmDefinition<BoardSnapshot, SudokuData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BoardVisualizer });
