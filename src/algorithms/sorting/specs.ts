import type { AlgorithmInput, Complexity } from '@/types';
import { defaultArrayInput } from '@/utils/dataset';

/**
 * Shared specs for the sorting family: complexity tables, the pseudocode
 * caption used by the panel header, and the default input.
 *
 * Keeping the complexity table here (rather than inline in eleven files) means
 * the Complexity tab reads identically everywhere and a correction lands once.
 */

export const SORTING_DEFAULT_INPUT = (): AlgorithmInput => defaultArrayInput(18, 20248);

export const COMPLEXITY: Record<string, Complexity> = {
  bubble: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: true,
    kind: 'in-place · comparison',
    notes: [
      'Early termination when a pass makes no swaps drops the best case to O(n).',
      'Adaptive: nearly sorted data costs roughly one pass plus the inversions.',
    ],
  },
  selection: {
    time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: false,
    kind: 'in-place · comparison',
    notes: [
      'Always Θ(n²) comparisons — the minimum of the unsorted tail is scanned every pass.',
      'Exactly n−1 swaps, which is why it wins when writes are expensive.',
    ],
  },
  insertion: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: true,
    kind: 'in-place · adaptive · online',
    notes: [
      'Cost is O(n + inversions) shifts, so nearly sorted input is nearly free.',
      'Used as the base case inside Tim Sort and quick sort’s small partitions.',
    ],
  },
  merge: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    stable: true,
    kind: 'out-of-place · divide & conquer',
    notes: [
      'Guaranteed n log n regardless of input order — the sorting algorithm of choice for linked lists.',
      'Merging is what makes it stable; the auxiliary buffer costs O(n).',
    ],
  },
  quick: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    space: 'O(log n)',
    stable: false,
    kind: 'in-place · divide & conquer',
    notes: [
      'Worst case is already-sorted input with a naive first/last pivot choice.',
      'Median-of-three pivots and tail-call optimisation keep the recursion shallow in practice.',
    ],
  },
  heap: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(1)',
    stable: false,
    kind: 'in-place · comparison',
    notes: [
      'Build-heap is O(n), then n extractions at O(log n) each.',
      'Poor cache locality: the sift path jumps around the array.',
    ],
  },
  counting: {
    time: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n + k)' },
    space: 'O(n + k)',
    stable: true,
    kind: 'non-comparison · integer keys',
    notes: [
      'k is the key range, not the input size — bad for sparse or huge ranges.',
      'The reversed prefix-sum pass is what preserves stability.',
    ],
  },
  radix: {
    time: { best: 'O(d·(n + b))', average: 'O(d·(n + b))', worst: 'O(d·(n + b))' },
    space: 'O(n + b)',
    stable: true,
    kind: 'non-comparison · LSD',
    notes: [
      'd = number of digits, b = base. No unstable inner sort allowed.',
      'Beats n log n when d is small, e.g. 32-bit integers (d ≈ 10 in base 10).',
    ],
  },
  shell: {
    time: { best: 'O(n log n)', average: 'O(n^1.3)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: false,
    kind: 'in-place · gapped · adaptive',
    notes: [
      'Complexity depends entirely on the gap sequence — Knuth’s 3h+1 is used here.',
      'Each gap pass moves elements a long way cheaply; the final pass is a plain insertion sort.',
    ],
  },
  bucket: {
    time: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n²)' },
    space: 'O(n + k)',
    stable: true,
    kind: 'distribution · comparison per bucket',
    notes: [
      'Uniformly distributed input is assumed; clustering degrades to the bucket sort used inside.',
      'Each bucket is sorted with insertion sort, which is fast on small runs.',
    ],
  },
  tim: {
    time: { best: 'O(n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    stable: true,
    kind: 'hybrid · adaptive (simplified)',
    notes: [
      'Real Tim Sort detects existing ascending/descending runs; this simplified version uses fixed minrun = 4.',
      'Merge order is chosen so runs stay balanced, which is what keeps the bound at n log n.',
    ],
  },
};
