import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SORTING_DEFAULT_INPUT } from './specs';
import type { SortData } from './bubble';

/**
 * Insertion Sort.
 *
 * Maintains a sorted prefix; each new element is shifted left into place. The
 * `shift` steps are the point of the visualisation — they are why insertion
 * sort costs O(n + inversions) rather than O(n²) on nearly-sorted data, and why
 * Tim Sort uses it for short runs.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'insertion-sort',
  complexity: COMPLEXITY.insertion!,
  pseudocode: pseudo(`
#insertionSort(A)
# for i ← 1 to n − 1
#   key ← A[i]
#   j ← i − 1
#   while j ≥ 0 and A[j] > key
#     A[j+1] ← A[j]
#     j ← j − 1
#   A[j+1] ← key
# return A`),
  code: code(
    `
function insertionSort(a) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return a;
}`,
    `
def insertion_sort(a):
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a`,
    `
void insertionSort(vector<int>& a) {
  for (int i = 1; i < (int)a.size(); ++i) {
    int key = a[i], j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      --j;
    }
    a[j + 1] = key;
  }
}`,
    `
static void insertionSort(int[] a) {
  for (int i = 1; i < a.length; i++) {
    int key = a[i], j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
}`,
  ),
  explanation: [
    'Insertion sort grows a sorted prefix one element at a time, exactly like sorting a hand of playing cards.',
    'Each new key is compared against the sorted prefix from the right; larger values are shifted one slot right to make room.',
    'Because the shifts stop as soon as a smaller value is found, nearly-sorted data costs almost nothing.',
  ],
  learn: {
    useCases: [
      'The base case for Tim Sort and for quick sort’s small partitions.',
      'Streaming data: elements can be inserted as they arrive.',
      'Nearly-sorted or small inputs — it beats merge sort below ~16 items.',
    ],
    quiz: [
      {
        question: 'Insertion sort’s running time is proportional to…',
        options: ['n² always', 'n + number of inversions', 'n log n', 'the key range'],
        answer: 1,
        why: 'Each inversion causes exactly one shift, so cost = O(n + inversions).',
      },
    ],
    practice: [{ title: 'Insertion Sort List', url: 'https://leetcode.com/problems/insertion-sort-list/', difficulty: 'medium' }],
  },
  defaultInput: SORTING_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const n = model.length;
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot());

    builder.emit({ kind: 'init', description: `Insertion sort on ${n} values.`, pseudocodeLine: 0, codeLine: 0, weight: 1.5 });
    builder.emit({
      kind: 'sorted',
      description: 'A single element is trivially sorted — that is our starting prefix.',
      highlight: { success: [0] },
      pseudocodeLine: 1,
      codeLine: 1,
      data: { pass: 0 },
      weight: 1.4,
    });

    for (let i = 1; i < n; i += 1) {
      const key = model.at(i);

      builder.emit({
        kind: 'read',
        description: `Take ${key} as the key to insert.`,
        highlight: { primary: [i], success: range(0, i - 1) },
        pseudocodeLine: 2,
        codeLine: 3,
        data: { pass: i },
        bump: 'reads',
        weight: 1.1,
      });

      let j = i - 1;
      let shifted = 0;

      while (j >= 0 && model.at(j) > key) {
        const moved = model.at(j);
        model.set(j + 1, moved);
        shifted += 1;
        builder.emit({
          kind: 'shift',
          description: `${moved} > ${key} — shift ${moved} one slot right.`,
          highlight: { primary: [j + 1], secondary: [j], success: range(0, i - shifted) },
          pseudocodeLine: 5,
          codeLine: 6,
          data: { pass: i, j },
          bump: ['comparisons', 'writes', 'reads'],
          weight: 0.85,
        });
        j -= 1;
      }

      if (j >= 0) {
        builder.bump('comparisons');
      }

      model.set(j + 1, key);
      builder.emit({
        kind: 'insert',
        description: shifted
          ? `Drop ${key} into index ${j + 1} after ${shifted} shift${shifted === 1 ? '' : 's'}.`
          : `${key} already belongs at index ${i} — no shifts needed.`,
        highlight: { primary: [j + 1], success: range(0, i) },
        pseudocodeLine: 7,
        codeLine: 8,
        data: { pass: i, extra: `${shifted} shifts` },
        bump: 'writes',
        weight: 1.5,
      });
    }

    builder.emit({
      kind: 'complete',
      description: `Sorted with ${builder.metrics.comparisons} comparisons and ${builder.metrics.writes} writes.`,
      highlight: { success: range(0, n - 1) },
      pseudocodeLine: 8,
      codeLine: 9,
      weight: 3,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: 'Sorted', detail: `${n} values · ${builder.metrics.writes} writes`, output: model.values },
      expectedState: () => isAscending(model.values),
    });
  },
};

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) if (i >= 0) out.push(i);
  return out;
}

export const definition: AlgorithmDefinition<ArraySnapshot, SortData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BarVisualizer });
