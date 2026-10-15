import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SORTING_DEFAULT_INPUT } from './specs';
import type { SortData } from './bubble';

/**
 * Merge Sort.
 *
 * The recursion is recorded as real `enter()`/`exit()` pairs, so the metrics
 * panel can show the call depth climbing to log n, and Phase 9's big-input
 * warning fires on the auxiliary buffer size rather than elapsed time.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'merge-sort',
  complexity: COMPLEXITY.merge!,
  pseudocode: pseudo(`
#mergeSort(A, lo, hi)
#   if lo ≥ hi: return
#   mid ← ⌊(lo + hi) / 2⌋
#   mergeSort(A, lo, mid)
#   mergeSort(A, mid+1, hi)
#   merge(A, lo, mid, hi)
#
#merge(A, lo, mid, hi)
#   i ← lo, j ← mid + 1, tmp ← []
#   while i ≤ mid and j ≤ hi
#     take the smaller of A[i], A[j]
#   append whatever remains
#   write tmp back into A[lo..hi]`),
  code: code(
    `
function mergeSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;
  const mid = (lo + hi) >> 1;
  mergeSort(a, lo, mid);
  mergeSort(a, mid + 1, hi);
  merge(a, lo, mid, hi);
  return a;
}
function merge(a, lo, mid, hi) {
  const tmp = [];
  let i = lo, j = mid + 1;
  while (i <= mid && j <= hi) tmp.push(a[i] <= a[j] ? a[i++] : a[j++]);
  while (i <= mid) tmp.push(a[i++]);
  while (j <= hi) tmp.push(a[j++]);
  for (let k = 0; k < tmp.length; k++) a[lo + k] = tmp[k];
}`,
    `
def merge_sort(a, lo=0, hi=None):
    if hi is None: hi = len(a) - 1
    if lo >= hi: return a
    mid = (lo + hi) // 2
    merge_sort(a, lo, mid)
    merge_sort(a, mid + 1, hi)
    merge(a, lo, mid, hi)
    return a

def merge(a, lo, mid, hi):
    tmp, i, j = [], lo, mid + 1
    while i <= mid and j <= hi:
        tmp.append(a[i] if a[i] <= a[j] else a[j])
        if a[i] <= a[j]: i += 1
        else: j += 1
    tmp += a[i:mid + 1] + a[j:hi + 1]
    a[lo:hi + 1] = tmp`,
    `
static void mergeSort(vector<int>& a, int lo, int hi) {
  if (lo >= hi) return;
  int mid = (lo + hi) >> 1;
  mergeSort(a, lo, mid);
  mergeSort(a, mid + 1, hi);
  merge(a, lo, mid, hi);
}
static void merge(vector<int>& a, int lo, int mid, int hi) {
  vector<int> tmp;
  int i = lo, j = mid + 1;
  while (i <= mid && j <= hi) tmp.push_back(a[i] <= a[j] ? a[i++] : a[j++]);
  while (i <= mid) tmp.push_back(a[i++]);
  while (j <= hi) tmp.push_back(a[j++]);
  for (size_t k = 0; k < tmp.size(); ++k) a[lo + k] = tmp[k];
}`,
    `
static void mergeSort(int[] a, int lo, int hi) {
  if (lo >= hi) return;
  int mid = (lo + hi) >>> 1;
  mergeSort(a, lo, mid);
  mergeSort(a, mid + 1, hi);
  merge(a, lo, mid, hi);
}
static void merge(int[] a, int lo, int mid, int hi) {
  int[] tmp = new int[hi - lo + 1];
  int i = lo, j = mid + 1, k = 0;
  while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
  while (i <= mid) tmp[k++] = a[i++];
  while (j <= hi) tmp[k++] = a[j++];
  System.arraycopy(tmp, 0, a, lo, k);
}`,
  ),
  explanation: [
    'Merge sort divides the array in half, sorts each half recursively, then merges the two sorted halves.',
    'The merge is the interesting part: two cursors walk the halves and always take the smaller front element, so the output is sorted by construction.',
    'Depth is log₂n and every level touches all n elements, which is where the guaranteed n log n comes from.',
  ],
  learn: {
    useCases: [
      'Sorting linked lists (no random access needed, no auxiliary array).',
      'External sorting: merging runs that do not fit in memory.',
      'Stable, predictable performance — used by Java’s Arrays.sort for objects and Python’s Timsort.',
    ],
    quiz: [
      {
        question: 'Why is merge sort’s worst case still n log n while quick sort’s is n²?',
        options: [
          'It uses more memory',
          'The split is always exactly in half',
          'It never compares equal elements',
          'It is iterative',
        ],
        answer: 1,
        why: 'A fixed midpoint keeps the recursion tree balanced at every level.',
      },
    ],
    practice: [{ title: 'Merge k Sorted Lists', url: 'https://leetcode.com/problems/merge-k-sorted-lists/', difficulty: 'hard' }],
  },
  defaultInput: SORTING_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const n = model.length;
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot());
    const done = new Set<number>();

    builder.emit({ kind: 'init', description: `Merge sort on ${n} values.`, pseudocodeLine: 0, codeLine: 0, weight: 1.5 });

    const sort = (lo: number, hi: number, depth: number): void => {
      if (lo >= hi) {
        builder.emit({
          kind: 'info',
          description: `Sub-array [${lo}..${hi}] has one element — already sorted.`,
          highlight: { primary: [lo], tertiary: [lo] },
          pseudocodeLine: 1,
          codeLine: 1,
          data: { pass: depth },
          weight: 0.7,
        });
        return;
      }

      const mid = (lo + hi) >> 1;
      builder.enter();
      builder.emit({
        kind: 'split',
        description: `Split [${lo}..${hi}] into [${lo}..${mid}] and [${mid + 1}..${hi}].`,
        highlight: { primary: [lo, hi], tertiary: [mid] },
        pseudocodeLine: 3,
        codeLine: 3,
        data: { pass: depth, extra: `[${lo}..${hi}]` },
        weight: 1.6,
      });

      sort(lo, mid, depth + 1);
      sort(mid + 1, hi, depth + 1);

      const left: number[] = [];
      const right: number[] = [];
      for (let k = lo; k <= mid; k += 1) left.push(model.at(k));
      for (let k = mid + 1; k <= hi; k += 1) right.push(model.at(k));

      let i = 0;
      let j = 0;
      const merged: number[] = [];

      while (i < left.length && j < right.length) {
        const a = left[i] as number;
        const b = right[j] as number;
        builder.emit({
          kind: 'compare',
          description: `Merge: ${a} vs ${b} — take ${a <= b ? a : b}.`,
          highlight: { primary: [lo + i], secondary: [mid + 1 + j] },
          pseudocodeLine: 9,
          codeLine: 10,
          data: { pass: depth, extra: `[${lo}..${hi}]` },
          bump: 'comparisons',
          weight: 0.75,
        });
        if (a <= b) {
          merged.push(a);
          i += 1;
        } else {
          merged.push(b);
          j += 1;
        }
      }
      while (i < left.length) merged.push(left[i++] as number);
      while (j < right.length) merged.push(right[j++] as number);

      for (let k = 0; k < merged.length; k += 1) {
        model.set(lo + k, merged[k] as number);
      }
      for (let k = lo; k <= hi; k += 1) done.add(k);

      builder.emit({
        kind: 'merge',
        description: `Merged [${lo}..${hi}] → [${merged.join(', ')}].`,
        highlight: { success: [...done], primary: [lo, hi] },
        pseudocodeLine: 5,
        codeLine: 5,
        data: { pass: depth, extra: `[${lo}..${hi}]` },
        bump: ['writes', 'writes'],
        weight: 2.2,
      });

      builder.exit();
    };

    sort(0, n - 1, 0);

    builder.emit({
      kind: 'complete',
      description: `Sorted ${n} values in ${builder.metrics.calls} recursive calls.`,
      highlight: { success: Array.from({ length: n }, (_, i) => i) },
      pseudocodeLine: 5,
      codeLine: 5,
      weight: 3,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: 'Sorted', detail: `${n} values · depth ${builder.metrics.depth}`, output: model.values },
      expectedState: () => isAscending(model.values),
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SortData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BarVisualizer });
