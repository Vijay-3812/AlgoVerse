import type { AlgorithmInput, Complexity } from '@/types';
import { buildSearchInput } from '@/utils/dataset';

/**
 * Searching family specs.
 *
 * Inputs are always *sorted* arrays with a target — the presets guarantee it,
 * and the target is chosen from the data so the trace almost always ends in a
 * found (or a deliberate miss), which is far more informative to watch than a
 * miss every time.
 */
export const SEARCH_DEFAULT_INPUT = (): AlgorithmInput =>
  buildSearchInput({ kind: 'sorted', size: 21, seed: 4242 });

export const COMPLEXITY: Record<string, Complexity> = {
  linear: {
    time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(1)',
    kind: 'sequential scan',
    notes: ['Works on unsorted data — its one advantage over binary search.', 'Cost is the index of the target, plus one.'],
  },
  binary: {
    time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(1)',
    kind: 'requires sorted input',
    notes: [
      'Halves the search space every probe: 1 000 000 elements needs at most 20 comparisons.',
      'Needs random access — the reason it cannot be used on linked lists.',
    ],
  },
  jump: {
    time: { best: 'O(1)', average: 'O(√n)', worst: 'O(√n)' },
    space: 'O(1)',
    kind: 'requires sorted input',
    notes: ['Block size √n balances the skip phase against the scan phase.', 'Useful where jumping backwards is cheaper than probing.'],
  },
  interpolation: {
    time: { best: 'O(1)', average: 'O(log log n)', worst: 'O(n)' },
    space: 'O(1)',
    kind: 'requires sorted, uniform input',
    notes: [
      'Guesses the position: it assumes values are roughly linearly distributed.',
      'Degrades to O(n) on skewed data (e.g. exponential keys).',
    ],
  },
  exponential: {
    time: { best: 'O(1)', average: 'O(log i)', worst: 'O(log n)' },
    space: 'O(1)',
    kind: 'galloping, unbounded-friendly',
    notes: ['Doubles the range until it brackets the target, then binary searches inside.', 'Ideal for unbounded or streamed arrays.'],
  },
  ternary: {
    time: { best: 'O(1)', average: 'O(log₃ n)', worst: 'O(log n)' },
    space: 'O(1)',
    kind: 'three-way probe',
    notes: [
      'Two probes per level instead of one — fewer levels, more comparisons.',
      'Classically used for unimodal functions, not plain lookups.',
    ],
  },
};
