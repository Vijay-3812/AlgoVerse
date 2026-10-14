import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot, PointerSnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SORTING_DEFAULT_INPUT } from './specs';
import type { SortData } from './bubble';

/**
 * Quick Sort (Lomuto partition, median-of-three pivot).
 *
 * Median-of-three is used deliberately: the naive "last element" pivot degrades
 * to O(n²) on sorted input, and the default dataset presets include sorted and
 * reversed arrays — showing the good version is honest, showing the bad one
 * would be a lie about the algorithm as commonly implemented.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'quick-sort',
  complexity: COMPLEXITY.quick!,
  pseudocode: pseudo(`
#quickSort(A, lo, hi)
#   if lo ≥ hi: return
#   p ← partition(A, lo, hi)
#   quickSort(A, lo, p − 1)
#   quickSort(A, p + 1, hi)
#
#partition(A, lo, hi)          # Lomuto, median-of-three pivot
#   pivotIdx ← medianOf(lo, mid, hi)
#   swap A[pivotIdx], A[hi]
#   i ← lo − 1
#   for j ← lo to hi − 1
#     if A[j] < A[hi]
#       i ← i + 1
#       swap A[i], A[j]
#   swap A[i+1], A[hi]
#   return i + 1`),
  code: code(
    `
function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;
  const p = partition(a, lo, hi);
  quickSort(a, lo, p - 1);
  quickSort(a, p + 1, hi);
  return a;
}
function partition(a, lo, hi) {
  const mid = (lo + hi) >> 1;
  const pivotIdx = medianOf(a, lo, mid, hi);
  [a[pivotIdx], a[hi]] = [a[hi], a[pivotIdx]];
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    if (a[j] < a[hi]) swap(a, ++i, j);
  }
  swap(a, i + 1, hi);
  return i + 1;
}`,
    `
def quick_sort(a, lo=0, hi=None):
    if hi is None: hi = len(a) - 1
    if lo >= hi: return a
    p = partition(a, lo, hi)
    quick_sort(a, lo, p - 1)
    quick_sort(a, p + 1, hi)
    return a

def partition(a, lo, hi):
    mid = (lo + hi) // 2
    pivot = median_of(a, lo, mid, hi)
    a[pivot], a[hi] = a[hi], a[pivot]
    i = lo - 1
    for j in range(lo, hi):
        if a[j] < a[hi]:
            i += 1
            a[i], a[j] = a[j], a[i]
    a[i + 1], a[hi] = a[hi], a[i + 1]
    return i + 1`,
    `
static void quickSort(vector<int>& a, int lo, int hi) {
  if (lo >= hi) return;
  int p = partition(a, lo, hi);
  quickSort(a, lo, p - 1);
  quickSort(a, p + 1, hi);
}
static int partition(vector<int>& a, int lo, int hi) {
  int mid = (lo + hi) >> 1;
  int pivot = medianOf(a, lo, mid, hi);
  swap(a[pivot], a[hi]);
  int i = lo - 1;
  for (int j = lo; j < hi; ++j)
    if (a[j] < a[hi]) swap(a[++i], a[j]);
  swap(a[i + 1], a[hi]);
  return i + 1;
}`,
    `
static void quickSort(int[] a, int lo, int hi) {
  if (lo >= hi) return;
  int p = partition(a, lo, hi);
  quickSort(a, lo, p - 1);
  quickSort(a, p + 1, hi);
}
static int partition(int[] a, int lo, int hi) {
  int mid = (lo + hi) >>> 1;
  int pivot = medianOf(a, lo, mid, hi);
  int t = a[pivot]; a[pivot] = a[hi]; a[hi] = t;
  int i = lo - 1;
  for (int j = lo; j < hi; j++)
    if (a[j] < a[hi]) { int s = a[++i]; a[i] = a[j]; a[j] = s; }
  int u = a[i + 1]; a[i + 1] = a[hi]; a[hi] = u;
  return i + 1;
}`,
  ),
  explanation: [
    'Quick sort picks a pivot and rearranges the array so that everything smaller sits to its left and everything larger to its right.',
    'That single pass (the partition) puts the pivot in its final position, and the two sides are then sorted independently.',
    'Choosing the median of the first, middle and last elements keeps the split balanced on already-sorted input, which is where the naive pivot fails.',
  ],
  learn: {
    useCases: [
      'General-purpose in-memory sorting — the default in most standard libraries.',
      'Quickselect for the k-th smallest element in expected O(n).',
      'Cache-friendly: partitions scan memory linearly.',
    ],
    quiz: [
      {
        question: 'After one Lomuto partition, what is guaranteed?',
        options: [
          'The array is half sorted',
          'The pivot is in its final position',
          'All equal elements are adjacent',
          'Nothing',
        ],
        answer: 1,
        why: 'Everything left of the pivot is smaller and everything right is larger, so the pivot cannot move again.',
      },
      {
        question: 'Which input makes a first/last-element pivot degenerate to O(n²)?',
        options: ['Random', 'Already sorted', 'All distinct', 'Powers of two'],
        answer: 1,
        why: 'Sorted input gives a maximally unbalanced partition every time — hence median-of-three.',
      },
    ],
    practice: [
      { title: 'Kth Largest Element in an Array', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/', difficulty: 'medium' },
      { title: 'Sort an Array', url: 'https://leetcode.com/problems/sort-an-array/', difficulty: 'medium' },
    ],
  },
  defaultInput: SORTING_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const n = model.length;
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot());
    const placed = new Set<number>();

    builder.emit({ kind: 'init', description: `Quick sort on ${n} values.`, pseudocodeLine: 0, codeLine: 0, weight: 1.5 });

    const pointers = (lo: number, hi: number, i: number | null, j: number | null): PointerSnapshot[] => {
      const list: PointerSnapshot[] = [
        { name: 'lo', index: lo, role: 'pivot' },
        { name: 'hi', index: hi, role: 'pivot' },
      ];
      if (i !== null && i >= lo) list.push({ name: 'i', index: i, role: 'active' });
      if (j !== null) list.push({ name: 'j', index: j, role: 'compare' });
      return list;
    };

    const sort = (lo: number, hi: number, depth: number, label: string): void => {
      if (lo > hi) return;
      if (lo === hi) {
        placed.add(lo);
        builder.emit({
          kind: 'sorted',
          description: `Single element at ${lo} — nothing to partition.`,
          highlight: { success: [...placed] },
          pseudocodeLine: 1,
          codeLine: 1,
          data: { pass: depth, extra: label },
          weight: 0.8,
        });
        return;
      }

      builder.enter();

      // median-of-three
      const mid = (lo + hi) >> 1;
      const candidates: [number, number][] = [
        [model.at(lo), lo],
        [model.at(mid), mid],
        [model.at(hi), hi],
      ];
      candidates.sort((a, b) => a[0] - b[0]);
      const pivotIdx = (candidates[1] as [number, number])[1];
      const pivotValue = model.at(pivotIdx);

      builder.emit({
        kind: 'pivot',
        description: `Partition [${lo}..${hi}]: median of ${model.at(lo)}, ${model.at(mid)}, ${model.at(hi)} → pivot ${pivotValue}.`,
        highlight: { primary: [lo, mid, hi], tertiary: [pivotIdx], muted: [...placed] },
        data: { pass: depth, extra: label },
        pseudocodeLine: 7,
        codeLine: 8,
        weight: 1.8,
      });

      if (pivotIdx !== hi) {
        model.swap(pivotIdx, hi);
        builder.emit({
          kind: 'swap',
          description: `Move the pivot ${pivotValue} to the end of the range.`,
          highlight: { primary: [pivotIdx, hi], tertiary: [hi] },
          data: { pass: depth, extra: label },
          pseudocodeLine: 8,
          codeLine: 9,
          bump: ['swaps', 'writes'],
          weight: 1.2,
        });
      }

      let i = lo - 1;
      for (let j = lo; j < hi; j += 1) {
        const value = model.at(j);
        const smaller = value < pivotValue;
        builder.emit({
          kind: 'compare',
          description: `${value} < pivot ${pivotValue}?${smaller ? ' Yes — move it left.' : ' No — leave it right.'}`,
          highlight: { primary: [j], tertiary: [hi], muted: [...placed] },
          data: { pass: depth, j },
          pseudocodeLine: 12,
          codeLine: 13,
          bump: 'comparisons',
          weight: 0.6,
        });

        if (smaller) {
          i += 1;
          if (i !== j) {
            model.swap(i, j);
            builder.emit({
              kind: 'swap',
              description: `Swap ${value} into the “smaller” region at ${i}.`,
              highlight: { primary: [i, j], tertiary: [hi] },
              data: { pass: depth, j },
              pseudocodeLine: 14,
              codeLine: 15,
              bump: ['swaps', 'writes'],
              weight: 1,
            });
          }
        }

        builder.emit({
          kind: 'partition',
          description: `Smaller region: [${lo}..${i}], scanning at j=${j}.`,
          highlight: { primary: [j], secondary: [i], tertiary: [hi] },
          data: { pass: depth, j },
          pseudocodeLine: 15,
          codeLine: 16,
          weight: 0.4,
        });
      }

      model.swap(i + 1, hi);
      const pivotFinal = i + 1;
      placed.add(pivotFinal);
      builder.emit({
        kind: 'pivot',
        description: `Pivot ${pivotValue} lands at index ${pivotFinal} — it is final.`,
        highlight: { primary: [pivotFinal], success: [...placed] },
        data: { pass: depth, extra: label },
        pseudocodeLine: 14,
        codeLine: 15,
        bump: ['swaps', 'writes'],
        weight: 2.2,
      });

      sort(lo, pivotFinal - 1, depth + 1, `left of ${pivotFinal}`);
      sort(pivotFinal + 1, hi, depth + 1, `right of ${pivotFinal}`);

      builder.exit();
    };

    sort(0, n - 1, 0, 'root');

    for (let k = 0; k < n; k += 1) placed.add(k);

    builder.emit({
      kind: 'complete',
      description: `Sorted in ${builder.metrics.calls} recursive calls, max depth ${builder.metrics.depth}.`,
      highlight: { success: [...placed] },
      pseudocodeLine: 4,
      codeLine: 4,
      weight: 3,
    });

    // Pointers are part of the trace vocabulary even when the final step has none.
    void pointers;

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: 'Sorted', detail: `${n} values · ${builder.metrics.swaps} swaps`, output: model.values },
      expectedState: () => isAscending(model.values),
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SortData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BarVisualizer });
