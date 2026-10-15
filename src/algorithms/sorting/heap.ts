import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SORTING_DEFAULT_INPUT } from './specs';
import type { SortData } from './bubble';

/**
 * Heap Sort.
 *
 * The array doubles as a complete binary tree: children of `i` live at `2i+1`
 * and `2i+2`. Two phases — build a max-heap in O(n), then repeatedly swap the
 * root to the tail and sift down. The `sorted` tail is exactly the growing
 * sorted region, so the visualisation reads as the heap shrinking into the
 * answer.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'heap-sort',
  complexity: COMPLEXITY.heap!,
  pseudocode: pseudo(`
#heapSort(A)
# buildMaxHeap(A)
# for end ← n − 1 down to 1
#   swap A[0], A[end]
#   siftDown(A, 0, end)
# return A
#
#siftDown(A, i, size)
#   while 2i+1 < size
#     child ← larger of A[2i+1], A[2i+2]
#     if A[i] ≥ A[child]: return
#     swap A[i], A[child]
#     i ← child`),
  code: code(
    `
function heapSort(a) {
  const n = a.length;
  for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(a, i, n);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    siftDown(a, 0, end);
  }
  return a;
}
function siftDown(a, i, size) {
  while (2 * i + 1 < size) {
    let child = 2 * i + 1;
    if (child + 1 < size && a[child + 1] > a[child]) child++;
    if (a[i] >= a[child]) return;
    [a[i], a[child]] = [a[child], a[i]];
    i = child;
  }
}`,
    `
def heap_sort(a):
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):
        sift_down(a, i, n)
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0]
        sift_down(a, 0, end)
    return a

def sift_down(a, i, size):
    while 2 * i + 1 < size:
        child = 2 * i + 1
        if child + 1 < size and a[child + 1] > a[child]:
            child += 1
        if a[i] >= a[child]:
            return
        a[i], a[child] = a[child], a[i]
        i = child`,
    `
static void heapSort(vector<int>& a) {
  int n = (int)a.size();
  for (int i = n / 2 - 1; i >= 0; --i) siftDown(a, i, n);
  for (int end = n - 1; end > 0; --end) {
    swap(a[0], a[end]);
    siftDown(a, 0, end);
  }
}
static void siftDown(vector<int>& a, int i, int size) {
  while (2 * i + 1 < size) {
    int child = 2 * i + 1;
    if (child + 1 < size && a[child + 1] > a[child]) ++child;
    if (a[i] >= a[child]) return;
    swap(a[i], a[child]);
    i = child;
  }
}`,
    `
static void heapSort(int[] a) {
  int n = a.length;
  for (int i = n / 2 - 1; i >= 0; i--) siftDown(a, i, n);
  for (int end = n - 1; end > 0; end--) {
    int t = a[0]; a[0] = a[end]; a[end] = t;
    siftDown(a, 0, end);
  }
}
static void siftDown(int[] a, int i, int size) {
  while (2 * i + 1 < size) {
    int child = 2 * i + 1;
    if (child + 1 < size && a[child + 1] > a[child]) child++;
    if (a[i] >= a[child]) return;
    int s = a[i]; a[i] = a[child]; a[child] = s;
    i = child;
  }
}`,
  ),
  explanation: [
    'A heap is a complete binary tree stored flat in an array: index i has children 2i+1 and 2i+2.',
    'Building the max-heap only needs to sift down the first half of the array, because the leaves are already valid heaps.',
    'Then the root (always the maximum) is swapped to the end and the heap shrinks by one — so the sorted tail grows from the right.',
  ],
  learn: {
    useCases: [
      'In-place n log n sorting with O(1) extra memory — unlike merge sort.',
      'Priority queues and schedulers (heap.ts in the Linear Structures category).',
      'Streaming top-k: keep a heap of size k over an unbounded stream.',
    ],
    practice: [{ title: 'Sort an Array', url: 'https://leetcode.com/problems/sort-an-array/', difficulty: 'medium' }],
  },
  defaultInput: SORTING_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const n = model.length;
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot());
    const sorted = new Set<number>();

    const heapBadge = (size: number) => ({ heap: `0…${size - 1}` });

    builder.emit({
      kind: 'init',
      description: `Heap sort on ${n} values. Phase 1: build a max-heap.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    const siftDown = (start: number, size: number, pass: number): void => {
      let i = start;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        if (left >= size) return;

        let child = left;
        if (right < size) {
          builder.emit({
            kind: 'compare',
            description: `Children of ${model.at(i)}: ${model.at(left)} and ${model.at(right)}.`,
            highlight: { primary: [left], secondary: [right], tertiary: [i] },
            data: { pass },
            pseudocodeLine: 9,
            codeLine: 11,
            bump: 'comparisons',
            weight: 0.55,
          });
          if (model.at(right) > model.at(left)) child = right;
        }

        const heapOk = model.at(i) >= model.at(child);
        builder.emit({
          kind: 'heapify',
          description: heapOk
            ? `Heap property holds: ${model.at(i)} ≥ ${model.at(child)}.`
            : `Heap violated: ${model.at(child)} > ${model.at(i)} — sift down.`,
          highlight: { primary: [i], secondary: [child] },
          data: { pass },
          pseudocodeLine: 10,
          codeLine: 12,
          bump: 'comparisons',
          weight: 0.75,
        });
        if (heapOk) return;

        const a = model.at(i);
        const b = model.at(child);
        model.swap(i, child);
        builder.emit({
          kind: 'sift-down',
          description: `Swap ${a} and ${b}; continue sifting from index ${child}.`,
          highlight: { primary: [i], secondary: [child] },
          data: { pass },
          pseudocodeLine: 11,
          codeLine: 13,
          bump: ['swaps', 'writes'],
          weight: 1.05,
        });
        i = child;
      }
    };

    for (let i = (n >> 1) - 1; i >= 0; i -= 1) {
      builder.emit({
        kind: 'info',
        description: `Sift down from internal node ${i}.`,
        highlight: { primary: [i], muted: [...sorted] },
        data: { pass: 0, extra: 'build-heap' },
        pseudocodeLine: 2,
        codeLine: 4,
        weight: 0.8,
      });
      siftDown(i, n, 0);
    }

    builder.emit({
      kind: 'complete',
      description: `Max-heap built: the largest value ${model.at(0)} is at the root.`,
      highlight: { primary: [0] },
      badges: heapBadge(n),
      data: { pass: 0, extra: 'build-heap done' },
      pseudocodeLine: 2,
      codeLine: 5,
      weight: 2,
    });

    for (let end = n - 1; end > 0; end -= 1) {
      const top = model.at(0);
      const last = model.at(end);
      model.swap(0, end);
      sorted.add(end);

      builder.emit({
        kind: 'swap',
        description: `Move the maximum ${top} to index ${end} (was ${last} there).`,
        highlight: { primary: [0, end], success: [...sorted] },
        data: { pass: n - end },
        pseudocodeLine: 4,
        codeLine: 6,
        bump: ['swaps', 'writes'],
        weight: 1.8,
      });

      siftDown(0, end, n - end);
    }

    sorted.add(0);
    builder.emit({
      kind: 'complete',
      description: `Sorted ${n} values with ${builder.metrics.comparisons} comparisons.`,
      highlight: { success: [...sorted] },
      pseudocodeLine: 6,
      codeLine: 8,
      weight: 3,
    });

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
