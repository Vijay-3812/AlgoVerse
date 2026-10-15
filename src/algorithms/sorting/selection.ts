import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SORTING_DEFAULT_INPUT } from './specs';
import type { SortData } from './bubble';

/**
 * Selection Sort.
 *
 * Scan the unsorted tail for its minimum, then put it where it belongs. Exactly
 * n−1 swaps — the algorithm of choice when writes cost more than comparisons.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'selection-sort',
  complexity: COMPLEXITY.selection!,
  pseudocode: pseudo(`
#selectionSort(A)
# for i ← 0 to n − 2
#   minIdx ← i
#   for j ← i + 1 to n − 1
#     if A[j] < A[minIdx]
#       minIdx ← j
#   if minIdx ≠ i
#     swap A[i], A[minIdx]
# return A`),
  code: code(
    `
function selectionSort(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) [a[i], a[min]] = [a[min], a[i]];
  }
  return a;
}`,
    `
def selection_sort(a):
    n = len(a)
    for i in range(n - 1):
        m = i
        for j in range(i + 1, n):
            if a[j] < a[m]:
                m = j
        if m != i:
            a[i], a[m] = a[m], a[i]
    return a`,
    `
void selectionSort(vector<int>& a) {
  int n = (int)a.size();
  for (int i = 0; i < n - 1; ++i) {
    int m = i;
    for (int j = i + 1; j < n; ++j) {
      if (a[j] < a[m]) m = j;
    }
    if (m != i) swap(a[i], a[m]);
  }
}`,
    `
static void selectionSort(int[] a) {
  int n = a.length;
  for (int i = 0; i < n - 1; i++) {
    int m = i;
    for (int j = i + 1; j < n; j++) {
      if (a[j] < a[m]) m = j;
    }
    if (m != i) { int t = a[i]; a[i] = a[m]; a[m] = t; }
  }
}`,
  ),
  explanation: [
    'Selection sort splits the array into a sorted prefix and an unsorted suffix.',
    'Each pass scans the suffix for its minimum and swaps it into the first unsorted slot — so the sorted prefix grows left-to-right.',
    'The scan always costs n−i−1 comparisons even if the suffix is already sorted; the payoff is that only one write happens per pass.',
  ],
  learn: {
    useCases: [
      'Flash memory or EEPROM, where each write shortens the device’s life.',
      'Small arrays where simplicity beats an O(n log n) constant factor.',
      'Cases needing the k smallest elements (run k passes, then stop).',
    ],
    practice: [{ title: 'Kth Largest Element in an Array', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/', difficulty: 'medium' }],
  },
  defaultInput: SORTING_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const n = model.length;
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot());
    const sorted = new Set<number>();

    builder.emit({ kind: 'init', description: `Selection sort on ${n} values.`, pseudocodeLine: 0, codeLine: 0, weight: 1.5 });

    for (let i = 0; i < n - 1; i += 1) {
      let minIdx = i;

      builder.emit({
        kind: 'info',
        description: `Pass ${i + 1}: find the smallest value in ${i}…${n - 1}.`,
        ...(sorted.size ? { highlight: { muted: [...sorted] } } : {}),
        pseudocodeLine: 3,
        codeLine: 3,
        data: { pass: i },
        weight: 1.1,
      });

      for (let j = i + 1; j < n; j += 1) {
        const isSmaller = model.at(j) < model.at(minIdx);
        builder.emit({
          kind: 'compare',
          description: `${model.at(j)} < ${model.at(minIdx)}?${isSmaller ? ' Yes — new minimum.' : ''}`,
          highlight: { primary: [j], tertiary: [minIdx], muted: [...sorted] },
          data: { pass: i, j },
          pseudocodeLine: 5,
          codeLine: 5,
          bump: 'comparisons',
          weight: 0.6,
        });
        if (isSmaller) minIdx = j;
      }

      if (minIdx !== i) {
        const a = model.at(i);
        const b = model.at(minIdx);
        model.swap(i, minIdx);
        builder.emit({
          kind: 'swap',
          description: `Swap minimum ${b} into position ${i} (was ${a}).`,
          highlight: { primary: [i], secondary: [minIdx] },
          data: { pass: i, j: minIdx },
          pseudocodeLine: 7,
          codeLine: 7,
          bump: ['swaps', 'writes', 'writes'],
          weight: 1.5,
        });
      } else {
        builder.emit({
          kind: 'info',
          description: `${model.at(i)} was already the minimum.`,
          highlight: { primary: [i], tertiary: [minIdx] },
          pseudocodeLine: 7,
          codeLine: 7,
          data: { pass: i },
          weight: 0.9,
        });
      }

      sorted.add(i);
      builder.emit({
        kind: 'sorted',
        description: `Prefix sorted through index ${i}.`,
        highlight: { success: [...sorted] },
        pseudocodeLine: 8,
        codeLine: 8,
        data: { pass: i },
        weight: 1.7,
      });
    }

    sorted.add(n - 1);
    builder.emit({
      kind: 'complete',
      description: `Sorted with ${builder.metrics.comparisons} comparisons and only ${builder.metrics.swaps} swaps.`,
      highlight: { success: [...sorted] },
      pseudocodeLine: 8,
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
