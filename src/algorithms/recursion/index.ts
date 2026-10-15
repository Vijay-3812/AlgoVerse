import type { ModuleLoader } from '@/engine/registry';

/**
 * Recursion & backtracking family loader table.
 *
 * Two renderers cover the whole family: the numeric/set recursions (factorial,
 * Fibonacci, Hanoi, subsets, permutations) share the call-stack panel, and the
 * three grid searches share the board panel. Hanoi composes the call panel with
 * its own rods, which is why it has no special-case renderer of its own.
 */
export const RECURSION_LOADERS: Readonly<Record<string, ModuleLoader>> = {
  factorial: () => import('./factorial').then((m) => m.module),
  'fibonacci-recursive': () => import('./fibonacciRecursive').then((m) => m.module),
  'tower-of-hanoi': () => import('./towerOfHanoi').then((m) => m.module),
  subsets: () => import('./subsets').then((m) => m.module),
  permutations: () => import('./permutations').then((m) => m.module),
  'n-queens': () => import('./nQueens').then((m) => m.module),
  'sudoku-solver': () => import('./sudoku').then((m) => m.module),
  'rat-in-a-maze': () => import('./ratInMaze').then((m) => m.module),
};
