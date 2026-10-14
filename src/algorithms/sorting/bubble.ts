import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SORTING_DEFAULT_INPUT } from './specs';

export interface SortData {
  readonly pass: number;
  readonly j?: number;
  readonly extra?: string;
}

/**
 * Bubble Sort.
 *
 * Two nested loops; the outer shrinks the unsorted tail after each pass. Every
 * pass guarantees one more value in its final position — which is exactly what
 * the growing lime tail shows, and why the completion wave is honest rather
 * than decorative.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'bubble-sort',
  complexity: COMPLEXITY.bubble!,
  pseudocode: pseudo(`
#bubbleSort(A)
# i ← n − 1
# while i > 0
#   swapped ← false
#   for j ← 0 to i − 1
#     if A[j] > A[j+1]
#       swap A[j], A[j+1]
#       swapped ← true
#   if not swapped: break
#   i ← i − 1
# return A`),
  code: code(
    `
function bubbleSort(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return a;
}`,
    `
def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:
            break
    return a`,
    `
void bubbleSort(vector<int>& a) {
  int n = (int)a.size();
  for (int i = 0; i < n - 1; ++i) {
    bool swapped = false;
    for (int j = 0; j < n - 1 - i; ++j) {
      if (a[j] > a[j + 1]) {
        swap(a[j], a[j + 1]);
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}`,
    `
static void bubbleSort(int[] a) {
  int n = a.length;
  for (int i = 0; i < n - 1; i++) {
    boolean swapped = false;
    for (int j = 0; j < n - 1 - i; j++) {
      if (a[j] > a[j + 1]) {
        int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}`,
  ),
  explanation: [
    'Bubble sort repeatedly walks the list, comparing neighbours and swapping them when they are out of order.',
    'After pass k the k largest values have bubbled to the end, so the unsorted region shrinks by one each pass — that is the growing lime tail.',
    'If a full pass performs no swaps the array must already be sorted, so the algorithm stops early.',
  ],
  learn: {
    useCases: [
      'Teaching: the clearest possible demonstration of compare-and-swap.',
      'Detecting whether data is already sorted in a single O(n) pass.',
      'Very small arrays (n < 10) where constant factors dominate.',
    ],
    quiz: [
      {
        question: 'How many comparisons does bubble sort make on an already-sorted array of n elements?',
        options: ['n²', 'n − 1', 'n log n', '1'],
        answer: 1,
        why: 'One clean pass is n−1 comparisons, then the early exit fires.',
      },
      {
        question: 'Why is bubble sort stable?',
        options: [
          'It uses extra memory',
          'It only swaps when a[j] > a[j+1], never on equality',
          'It is recursive',
          'It uses an auxiliary array',
        ],
        answer: 1,
        why: 'Equal neighbours are never swapped, so their relative order survives.',
      },
    ],
    practice: [
      { title: 'Sort Colors', url: 'https://leetcode.com/problems/sort-colors/', difficulty: 'medium' },
      { title: 'Sort an Array', url: 'https://leetcode.com/problems/sort-an-array/', difficulty: 'medium' },
    ],
  },
  defaultInput: SORTING_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const n = model.length;
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot());
    const sorted = new Set<number>();

    builder.emit({
      kind: 'init',
      description: `Bubble sort on ${n} values.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    for (let pass = 0; pass < n - 1; pass += 1) {
      const limit = n - 1 - pass;
      let swapped = false;

      builder.emit({
        kind: 'info',
        description: `Pass ${pass + 1}: scan 0…${limit}.`,
        ...(sorted.size ? { highlight: { muted: [...sorted] } } : {}),
        pseudocodeLine: 3,
        codeLine: 3,
        data: { pass },
        weight: 1.2,
      });

      for (let j = 0; j < limit; j += 1) {
        const a = model.at(j);
        const b = model.at(j + 1);
        builder.emit({
          kind: 'compare',
          description: `${a} > ${b}?`,
          highlight: { primary: [j], secondary: [j + 1] },
          data: { pass, j },
          pseudocodeLine: 5,
          codeLine: 5,
          bump: 'comparisons',
          weight: 0.55,
        });

        if (a > b) {
          model.swap(j, j + 1);
          swapped = true;
          builder.emit({
            kind: 'swap',
            description: `Yes — swap ${a} and ${b}.`,
            highlight: { primary: [j], secondary: [j + 1] },
            data: { pass, j },
            pseudocodeLine: 6,
            codeLine: 6,
            bump: ['swaps', 'writes'],
            weight: 1.05,
          });
        }
      }

      sorted.add(limit);
      builder.emit({
        kind: 'sorted',
        description: `Position ${limit} locked: ${model.at(limit)} is in its final place.`,
        highlight: { success: [limit] },
        pseudocodeLine: 10,
        codeLine: 10,
        data: { pass },
        weight: 2,
      });

      if (!swapped) {
        for (let k = 0; k <= limit; k += 1) sorted.add(k);
        builder.emit({
          kind: 'sorted',
          description: 'No swaps this pass — the array is sorted. Stopping early.',
          highlight: { success: [...sorted] },
          pseudocodeLine: 9,
          codeLine: 8,
          data: { pass, extra: 'early-exit' },
          weight: 2.6,
        });
        break;
      }
    }

    for (let k = 0; k < n; k += 1) sorted.add(k);

    builder.emit({
      kind: 'complete',
      description: `Sorted ${n} values.`,
      highlight: { success: [...sorted] },
      pseudocodeLine: 10,
      codeLine: 10,
      weight: 3,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Sorted',
        detail: `${n} values using ${builder.metrics.comparisons} comparisons`,
        output: model.values,
      },
      expectedState: () => isAscending(model.values),
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SortData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BarVisualizer });
