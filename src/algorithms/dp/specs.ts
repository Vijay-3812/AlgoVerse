import type { Complexity } from '@/types';

/**
 * Complexity cards and default inputs for the dynamic-programming family.
 *
 * Space is the interesting column here: every one of these algorithms can be
 * written with less memory than the table it is drawn on, and saying *how much*
 * less is part of what the page teaches.
 */
export const COMPLEXITY: Record<string, Complexity> = {
  'dp-fibonacci': {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(n) → O(1)',
    kind: 'tabulation',
    notes: [
      'One pass, one addition per cell — the recurrence is O(1) work each.',
      'Only the last two cells are ever read, so the table collapses to two variables.',
    ],
  },
  'coin-change': {
    time: { best: 'O(n)', average: 'O(n · amount)', worst: 'O(n · amount)' },
    space: 'O(amount)',
    kind: 'unbounded knapsack',
    notes: [
      'n coins × amount subproblems, each doing O(1) work per candidate coin.',
      'Coins may be reused, so a row can read from itself — that is what makes it unbounded.',
    ],
  },
  lis: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(n)',
    kind: 'longest increasing subsequence',
    notes: [
      'The quadratic table is the easy version; patience sorting with binary search gives O(n log n).',
      'The predecessor array is what turns a length into an actual subsequence.',
    ],
  },
  'knapsack-01': {
    time: { best: 'O(n · W)', average: 'O(n · W)', worst: 'O(n · W)' },
    space: 'O(W)',
    kind: '0/1 knapsack',
    notes: [
      'Pseudo-polynomial: the runtime depends on the capacity value, not just the item count.',
      'Each item is either taken or left — reading the previous row only is why O(W) space suffices.',
    ],
  },
  lcs: {
    time: { best: 'O(m + n)', average: 'O(m · n)', worst: 'O(m · n)' },
    space: 'O(m · n)',
    kind: 'sequence alignment',
    notes: [
      'The same table underlies diff, git blame and DNA alignment.',
      'Two rows are enough for the length; keeping the full grid is what makes backtracking possible.',
    ],
  },
  'edit-distance': {
    time: { best: 'O(m + n)', average: 'O(m · n)', worst: 'O(m · n)' },
    space: 'O(m · n)',
    kind: 'Levenshtein distance',
    notes: [
      'Three neighbours — insert, delete, substitute — and a diagonal discount on a match.',
      'With a cost matrix it becomes weighted alignment; with only diagonal moves it becomes LCS.',
    ],
  },
  'matrix-chain-multiplication': {
    time: { best: 'O(n³)', average: 'O(n³)', worst: 'O(n³)' },
    space: 'O(n²)',
    kind: 'interval DP',
    notes: [
      'Every chain length, every start, every split: n³ cells of work over an upper triangle.',
      'Only the split point is stored per cell — the parentheses are reconstructed by walking back.',
    ],
  },
};
