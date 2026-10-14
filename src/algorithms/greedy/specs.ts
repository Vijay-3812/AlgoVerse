import type { Complexity } from '@/types';

/**
 * Complexity cards for the greedy family.
 *
 * Greedy algorithms are cheap — the interesting column is the *proof*, which is
 * what the notes record: why the locally best choice is also globally safe.
 */
export const COMPLEXITY: Record<string, Complexity> = {
  'activity-selection': {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(1)',
    kind: 'interval scheduling',
    notes: [
      'Sorting by finish time dominates; the sweep itself is linear.',
      'Picking the activity that ends earliest leaves the most room for everything after it — that exchange argument is the whole proof.',
    ],
  },
  'huffman-coding': {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    kind: 'optimal prefix codes',
    notes: [
      'Two heap extractions and one insertion per merge; n − 1 merges in total.',
      'With a sorted input the heap can be replaced by two queues, giving O(n).',
    ],
  },
  'fractional-knapsack': {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(1)',
    kind: 'density greedy',
    notes: [
      'Sort by value per unit of weight, then take greedily — no table needed.',
      'Unlike the 0/1 version, greedy is provably optimal here because the last item can be split.',
    ],
  },
};
