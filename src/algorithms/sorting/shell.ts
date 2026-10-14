import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SORTING_DEFAULT_INPUT } from './specs';
import type { SortData } from './bubble';

/**
 * Shell Sort (Knuth gap sequence: 1, 4, 13, 40, …).
 *
 * Insertion sort, but on elements `gap` apart, with the gap shrinking to 1.
 * Large early gaps move far-out-of-place values across the array in one
 * operation; the final gap-1 pass is a plain insertion sort over an array that
 * is already *nearly* sorted — which is exactly the input it is fast on.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'shell-sort',
  complexity: COMPLEXITY.shell!,
  pseudocode: pseudo(`
#shellSort(A)
# gap ← 1
# while gap < n / 3: gap ← 3·gap + 1      # Knuth sequence
# while gap ≥ 1
#   for i ← gap to n − 1
#     key ← A[i], j ← i
#     while j ≥ gap and A[j−gap] > key
#       A[j] ← A[j−gap]
#       j ← j − gap
#     A[j] ← key
#   gap ← ⌊gap / 3⌋
# return A`),
  code: code(
    `
function shellSort(a) {
  const n = a.length;
  let gap = 1;
  while (gap < n / 3) gap = 3 * gap + 1;
  for (; gap >= 1; gap = Math.floor(gap / 3)) {
    for (let i = gap; i < n; i++) {
      const key = a[i];
      let j = i;
      while (j >= gap && a[j - gap] > key) {
        a[j] = a[j - gap];
        j -= gap;
      }
      a[j] = key;
    }
  }
  return a;
}`,
    `
def shell_sort(a):
    n = len(a)
    gap = 1
    while gap < n / 3:
        gap = 3 * gap + 1
    while gap >= 1:
        for i in range(gap, n):
            key, j = a[i], i
            while j >= gap and a[j - gap] > key:
                a[j] = a[j - gap]
                j -= gap
            a[j] = key
        gap //= 3
    return a`,
    `
void shellSort(vector<int>& a) {
  int n = (int)a.size(), gap = 1;
  while (gap < n / 3) gap = 3 * gap + 1;
  for (; gap >= 1; gap /= 3) {
    for (int i = gap; i < n; ++i) {
      int key = a[i], j = i;
      while (j >= gap && a[j - gap] > key) {
        a[j] = a[j - gap];
        j -= gap;
      }
      a[j] = key;
    }
  }
}`,
    `
static void shellSort(int[] a) {
  int n = a.length, gap = 1;
  while (gap < n / 3) gap = 3 * gap + 1;
  for (; gap >= 1; gap /= 3) {
    for (int i = gap; i < n; i++) {
      int key = a[i], j = i;
      while (j >= gap && a[j - gap] > key) {
        a[j] = a[j - gap];
        j -= gap;
      }
      a[j] = key;
    }
  }
}`,
  ),
  explanation: [
    'Shell sort is insertion sort that first compares elements far apart instead of adjacent.',
    'Each gap pass partially sorts the array, removing long-range disorder cheaply.',
    'By the time the gap reaches 1 the array is nearly sorted, so the final insertion pass does very little work.',
  ],
  learn: {
    useCases: [
      'Small embedded systems: no extra memory, no recursion, easy to implement in C.',
      'Cases where a decent O(n^1.3) average beats merge sort’s allocation cost.',
      'Pre-sorting before a final cheap pass in hybrid pipelines.',
    ],
    practice: [{ title: 'Sort an Array', url: 'https://leetcode.com/problems/sort-an-array/', difficulty: 'medium' }],
  },
  defaultInput: SORTING_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const n = model.length;
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot());

    // Build the gap sequence (Knuth 3h+1), then walk it downwards.
    const gaps: number[] = [];
    let g = 1;
    while (g < n / 3) {
      gaps.push(g);
      g = 3 * g + 1;
    }
    gaps.push(g);
    gaps.reverse();

    builder.emit({
      kind: 'init',
      description: `Shell sort on ${n} values. Gap sequence: ${gaps.join(' → ')}.`,
      badges: { gaps: gaps.join(',') },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
    });

    gaps.forEach((gap, passIndex) => {
      builder.emit({
        kind: 'info',
        description: `Pass ${passIndex + 1} with gap ${gap}: compare elements ${gap} apart.`,
        highlight: { muted: [] },
        badges: { gap, pass: passIndex + 1 },
        data: { pass: passIndex, extra: `gap ${gap}` },
        pseudocodeLine: 6,
        codeLine: 4,
        weight: 1.5,
      });

      for (let i = gap; i < n; i += 1) {
        const key = model.at(i);
        let j = i;

        while (j >= gap && model.at(j - gap) > key) {
          const moved = model.at(j - gap);
          model.set(j, moved);
          builder.emit({
            kind: 'shift',
            description: `Gap ${gap}: ${moved} > ${key} — shift right by ${gap}.`,
            highlight: { primary: [j - gap], secondary: [j] },
            data: { pass: passIndex, j: i },
            pseudocodeLine: 9,
            codeLine: 8,
            bump: ['comparisons', 'writes'],
            weight: 0.5,
          });
          j -= gap;
        }

        if (j >= gap) builder.bump('comparisons');
        model.set(j, key);

        builder.emit({
          kind: 'insert',
          description: `Place ${key} at index ${j} (gap ${gap}).`,
          highlight: { primary: [j], tertiary: [i] },
          data: { pass: passIndex, j: i },
          pseudocodeLine: 11,
          codeLine: 10,
          bump: 'writes',
          weight: 0.8,
        });
      }

      const partiallySorted =
        gap === 1 ? Array.from({ length: n }, (_, i) => i) : [];
      builder.emit({
        kind: gap === 1 ? 'complete' : 'sorted',
        description:
          gap === 1
            ? `Final gap-1 pass complete — fully sorted.`
            : `Gap ${gap} pass done: the array is ${gap}-ordered.`,
        ...(partiallySorted.length ? { highlight: { success: partiallySorted } } : {}),
        data: { pass: passIndex, extra: `gap ${gap} done` },
        pseudocodeLine: 11,
        codeLine: 11,
        weight: gap === 1 ? 3 : 2,
      });
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Sorted',
        detail: `${n} values · ${gaps.length} gap passes · ${builder.metrics.writes} writes`,
        output: model.values,
      },
      expectedState: () => isAscending(model.values),
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SortData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BarVisualizer });
