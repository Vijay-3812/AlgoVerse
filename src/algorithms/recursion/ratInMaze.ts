import { defineModule } from '@/types';
import type { AlgorithmDefinition, BoardSnapshot, VisualRole } from '@/types';
import { code, defineAlgorithm, finish, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { BoardVisualizer } from '@/visualizers/BoardVisualizer';
import { COMPLEXITY } from './specs';

/**
 * Rat in a Maze — backtracking on a grid.
 *
 * From (0,0) the rat tries down, right, then up and left, refusing to step on a
 * wall, off the board, or onto a cell it has already visited *on this path*.
 * Dead ends are the interesting frames: the recursion walks in, paints itself
 * into a corner, and then unwinds one cell at a time.
 *
 * @pure — identical input + run ⇒ identical trace.
 */

interface MazeData {
  readonly op: 'explore' | 'blocked' | 'enter' | 'dead-end' | 'solution';
  readonly row?: number;
  readonly col?: number;
  readonly blockedBy?: string;
}

/**
 * 1 = open, 0 = wall.
 *
 * Chosen so the *first* strategy fails loudly: trying "down" first walks into a
 * long pocket in the bottom-left corner, and the unwind that follows — seven
 * dead ends in a row — is the whole reason this page exists. The top row then
 * reaches the exit.
 */
const MAZE: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 0],
  [0, 1, 0, 1, 1, 1],
  [0, 1, 1, 1, 0, 1],
  [1, 1, 0, 1, 1, 1],
  [1, 1, 0, 0, 0, 1],
];

/** Clockwise from down: the order in which moves are attempted. */
const MOVES: readonly { readonly dr: number; readonly dc: number; readonly name: string }[] = [
  { dr: 1, dc: 0, name: 'down' },
  { dr: 0, dc: 1, name: 'right' },
  { dr: -1, dc: 0, name: 'up' },
  { dr: 0, dc: -1, name: 'left' },
];

const spec: AlgorithmSpec<BoardSnapshot, MazeData> = {
  id: 'rat-in-a-maze',
  complexity: COMPLEXITY.maze!,
  pseudocode: pseudo(`
#walk(row, col)
# if off the board, a wall, or already on this path
#   return false              ← dead end, unwind
# mark (row, col) as on-path
# if (row, col) is the exit
#   return true
# for each move: down, right, up, left
#   if walk(row + dr, col + dc): return true
# unmark (row, col)         ← backtrack: this cell is not on the solution`),
  code: code(
    `
function walk(row, col, grid, path) {
  if (!open(grid, row, col) || path[row][col]) return false;
  path[row][col] = true;
  if (row === grid.length - 1 && col === grid[0].length - 1) return true;
  for (const [dr, dc] of MOVES) {
    if (walk(row + dr, col + dc, grid, path)) return true;
  }
  path[row][col] = false;
  return false;
}`,
    `
def walk(row, col, grid, path):
    if not open(grid, row, col) or path[row][col]:
        return False
    path[row][col] = True
    if row == len(grid) - 1 and col == len(grid[0]) - 1:
        return True
    for dr, dc in MOVES:
        if walk(row + dr, col + dc, grid, path):
            return True
    path[row][col] = False
    return False`,
    `
bool walk(int row, int col, const vector<vector<int>>& grid, vector<vector<bool>>& path) {
  if (!open(grid, row, col) || path[row][col]) return false;
  path[row][col] = true;
  if (row + 1 == (int)grid.size() && col + 1 == (int)grid[0].size()) return true;
  for (auto [dr, dc] : MOVES)
    if (walk(row + dr, col + dc, grid, path)) return true;
  path[row][col] = false;
  return false;
}`,
    `
static boolean walk(int row, int col, int[][] grid, boolean[][] path) {
  if (!open(grid, row, col) || path[row][col]) return false;
  path[row][col] = true;
  if (row == grid.length - 1 && col == grid[0].length - 1) return true;
  for (int[] move : MOVES)
    if (walk(row + move[0], col + move[1], grid, path)) return true;
  path[row][col] = false;
  return false;
}`,
  ),
  explanation: [
    'The rat moves one cell at a time, always trying the same four directions in the same order. Deterministic ordering is what makes the search reproducible — and what makes the trace readable.',
    'Only cells on the current path count as visited. If a path fails, its cells are unmarked, so the rat may legitimately return to them from a different branch. Marking them permanently would lose solutions.',
    'The recursion depth is the length of the path being explored, not the size of the maze. A long winding corridor consumes stack, which is exactly the worst-case space bound.',
  ],
  defaultInput: () => ({ kind: 'matrix', grid: MAZE }),
  generate: (input, run) => {
    const grid = (input.kind === 'matrix' ? input.grid : MAZE).map((row) => [...row]);
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const onPath = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
    const deadEnds = new Set<number>();
    const solution: number[] = [];
    let visitedCells = 0;
    let backtracks = 0;

    /** Blocked cell for the current beat, highlighted in red. */
    let blockedCell: number | null = null;
    let exitReached = false;
    const builder = new TraceBuilder<BoardSnapshot, MazeData>(() => snapshot());

    function snapshot(): BoardSnapshot {
      const solved = exitReached && solution.length > 0;
      const solutionSet = new Set(solution);
      return {
        rows,
        cols,
        cells: grid.map((row, r) =>
          row.map((value, c) => {
            if (value === 0) return '▓';
            const index = r * cols + c;
            if (solved && solutionSet.has(index)) return '•';
            if (r === rows - 1 && c === cols - 1) return '⇥';
            if (r === 0 && c === 0) return 'R';
            return '';
          }),
        ),
        roles: grid.map((row, r) =>
          row.map((_, c) => {
            const index = r * cols + c;
            if (grid[r]?.[c] === 0) return 'ghost' satisfies VisualRole;
            if (blockedCell === index) return 'danger' satisfies VisualRole;
            if (solved && solutionSet.has(index)) return 'path' satisfies VisualRole;
            if (r === rows - 1 && c === cols - 1) return 'success' satisfies VisualRole;
            if (r === 0 && c === 0) return 'active' satisfies VisualRole;
            if (onPath[r]?.[c]) return 'visited' satisfies VisualRole;
            if (deadEnds.has(index)) return 'muted' satisfies VisualRole;
            return null;
          }),
        ),
        badges: { pathLength: solution.length, backtracks, visited: visitedCells },
      };
    }

    const open = (row: number, col: number): boolean =>
      row >= 0 && row < rows && col >= 0 && col < cols && grid[row]?.[col] === 1;

    builder.emit({
      kind: 'init',
      description: `Enter at R (top-left), leave at ⇥ (bottom-right) — ${rows}×${cols} maze.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
      data: { op: 'explore', row: 0, col: 0 },
    });

    const walk = (row: number, col: number): boolean => {
      // `deadEnds` is an optimisation the classic version leaves out: a cell
      // already proven to lead nowhere is never worth re-entering.
      if (!open(row, col) || onPath[row]?.[col] || deadEnds.has(row * cols + col)) {
        builder.emit({
          kind: 'conflict',
          description: !open(row, col)
            ? `(${row + 1}, ${col + 1}) is a wall or off the board — go back.`
            : deadEnds.has(row * cols + col)
              ? `(${row + 1}, ${col + 1}) is a known dead end — skip it.`
              : `(${row + 1}, ${col + 1}) is already on this path — go back.`,
          pseudocodeLine: 1,
          codeLine: 1,
          weight: 0.4,
          bump: 'comparisons',
          data: {
            op: 'blocked',
            row,
            col,
            blockedBy: !open(row, col) ? 'wall' : deadEnds.has(row * cols + col) ? 'dead end' : 'path',
          },
        });
        return false;
      }

      onPath[row]![col] = true;
      visitedCells += 1;
      builder.emit({
        kind: 'visit',
        description: `Step onto (${row + 1}, ${col + 1}) — depth ${solution.length + 1}.`,
        pseudocodeLine: 2,
        codeLine: 2,
        weight: 1,
        bump: 'reads',
        data: { op: 'enter', row, col },
      });

      if (row === rows - 1 && col === cols - 1) {
        exitReached = true;
        // Reconstruct the successful path from the marks the rat itself left.
        solution.length = 0;
        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) if (onPath[r]?.[c]) solution.push(r * cols + c);
        }
        builder.emit({
          kind: 'found',
          description: 'Exit reached — the marked cells are the path.',
          pseudocodeLine: 3,
          codeLine: 3,
          weight: 2.4,
          bump: 'writes',
          data: { op: 'solution', row, col },
        });
        return true;
      }

      for (const move of MOVES) {
        const nr = row + move.dr;
        const nc = col + move.dc;
        const allowed = open(nr, nc) && !onPath[nr]?.[nc];
        if (!allowed) {
          blockedCell = open(nr, nc) ? null : nr * cols + nc;
          builder.emit({
            kind: 'compare',
            description: `${move.name} is unavailable — try the next direction.`,
            pseudocodeLine: 5,
            codeLine: 4,
            weight: 0.3,
            bump: 'comparisons',
            data: { op: 'blocked', row: nr, col: nc, blockedBy: open(nr, nc) ? 'path' : 'wall' },
          });
          blockedCell = null;
          continue;
        }

        if (walk(nr, nc)) return true;
      }

      onPath[row]![col] = false;
      deadEnds.add(row * cols + col);
      backtracks += 1;
      builder.emit({
        kind: 'backtrack',
        description: `(${row + 1}, ${col + 1}) is a dead end — unmark it and unwind.`,
        pseudocodeLine: 6,
        codeLine: 5,
        weight: 1.2,
        bump: 'writes',
        data: { op: 'dead-end', row, col },
      });
      return false;
    };

    const found = walk(0, 0);

    builder.emit({
      kind: found ? 'complete' : 'not-found',
      description: found
        ? `Path found with ${solution.length} cells after ${backtracks} dead ends.`
        : `No path exists — every branch failed after ${backtracks} dead ends.`,
      pseudocodeLine: 4,
      codeLine: 3,
      weight: 3,
      data: { op: found ? 'solution' : 'dead-end' },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: found ? `${solution.length}-cell path` : 'No path',
        detail: `${backtracks} dead ends`,
        output: solution.slice(),
      },
      expectedState: () => found === referenceHasPath(grid),
    });
  },
};

/** Independent BFS — the ground truth the recursive search must agree with. */
function referenceHasPath(grid: readonly (readonly number[])[]): boolean {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const seen = new Set<number>([0]);
  const queue: Array<[number, number]> = [[0, 0]];
  while (queue.length > 0) {
    const [r, c] = queue.shift() as [number, number];
    if (r === rows - 1 && c === cols - 1) return true;
    for (const move of MOVES) {
      const nr = r + move.dr;
      const nc = c + move.dc;
      const index = nr * cols + nc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr]?.[nc] !== 1 || seen.has(index)) continue;
      seen.add(index);
      queue.push([nr, nc]);
    }
  }
  return false;
}

export const definition: AlgorithmDefinition<BoardSnapshot, MazeData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BoardVisualizer });
