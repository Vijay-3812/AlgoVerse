import type { AlgorithmInput, Complexity } from '@/types';

/**
 * Shared specs for the recursion & backtracking family.
 *
 * The default inputs are deliberately *small*: a recursion trace is only
 * legible while the tree fits on screen, and 8! subsets would be a 40 000-step
 * trace nobody can read. Each generator enlarges its own input if the user
 * asks for more, but the first frame is always something a human can follow.
 */

export const COMPLEXITY: Record<string, Complexity> = {
  factorial: {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(n)',
    kind: 'linear recursion',
    notes: [
      'One call per level: n+1 frames exist at the deepest point.',
      'Tail recursion would let a compiler reuse the frame, but the return value is multiplied on the way back up.',
    ],
  },
  fibonacci: {
    time: { best: 'O(2ⁿ)', average: 'O(2ⁿ)', worst: 'O(2ⁿ)' },
    space: 'O(n)',
    kind: 'branching recursion',
    notes: [
      'The count of leaves is fib(n+1) — the tree *is* the exponential.',
      'The same subproblem is solved many times over, which is exactly what memoisation removes.',
    ],
  },
  hanoi: {
    time: { best: 'O(2ⁿ)', average: 'O(2ⁿ)', worst: 'O(2ⁿ)' },
    space: 'O(n)',
    kind: 'divide & conquer',
    notes: [
      'Exactly 2ⁿ − 1 moves, and the recursion tree has that many leaves.',
      'The move count doubles with every extra disk — 64 disks would outlast the universe.',
    ],
  },
  subsets: {
    time: { best: 'O(2ⁿ)', average: 'O(2ⁿ)', worst: 'O(2ⁿ)' },
    space: 'O(n)',
    kind: 'include / exclude',
    notes: [
      'Two branches per element: take it or skip it. The leaves are the answer.',
      'Output size is inherently 2ⁿ — no algorithm can print the power set faster.',
    ],
  },
  permutations: {
    time: { best: 'O(n!)', average: 'O(n!)', worst: 'O(n!)' },
    space: 'O(n)',
    kind: 'swap & recurse',
    notes: [
      'n! leaves, n! × n work: factorial growth is visible within seconds at n = 8.',
      'Swapping in place avoids the O(n) copy per branch that an immutable version pays.',
    ],
  },
  queens: {
    time: { best: 'O(n!)', average: 'O(n!)', worst: 'O(n!)' },
    space: 'O(n)',
    kind: 'backtracking · pruning',
    notes: [
      'The bound is the same as permutations, but complete pruning of attacked columns and diagonals makes 8-queens finish instantly.',
      'Counting solutions rather than printing them is the classic 92-for-8 result.',
    ],
  },
  sudoku: {
    time: { best: 'O(1) with a solved grid', average: 'O(9^e) for e empty cells', worst: 'O(9^e)' },
    space: 'O(e)',
    kind: 'backtracking · constraint propagation',
    notes: [
      'Worst case is 9 choices per empty cell; the row/column/box checks prune almost all of it.',
      'Choosing the most-constrained cell first (MRV) shrinks the search tree dramatically.',
    ],
  },
  maze: {
    time: { best: 'O(rows × cols)', average: 'O(rows × cols)', worst: 'O(rows × cols)' },
    space: 'O(rows × cols)',
    kind: 'backtracking on a grid',
    notes: [
      'Each cell is visited at most a constant number of times before the recursion unwinds.',
      'The recursion depth equals the length of the path being explored.',
    ],
  },
};

/** A small integer for the numeric-recursion algorithms. */
export function numberInput(value: number): () => AlgorithmInput {
  return () => ({ kind: 'number', value });
}
