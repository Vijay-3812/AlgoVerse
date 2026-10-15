import { defineModule } from '@/types';
import type { AlgorithmDefinition, TableSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { TableVisualizer } from '@/visualizers/TableVisualizer';
import { TableModel } from './kit';
import { COMPLEXITY } from './specs';

/**
 * Longest Increasing Subsequence — quadratic DP with a predecessor chain.
 *
 * Every element asks: "how long is the longest increasing run that ends here?"
 * The answer is one more than the best answer among smaller elements to the
 * left, which makes each cell read a set of earlier cells — a fan of arrows.
 * A parallel predecessors row is what turns those lengths back into an actual
 * subsequence.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
interface LisData {
  readonly op: 'init' | 'scan' | 'extend' | 'restart' | 'done';
  readonly i?: number;
  readonly j?: number;
}

const DEFAULT: readonly number[] = [10, 22, 9, 33, 21, 50, 41, 60, 80];

const spec: AlgorithmSpec<TableSnapshot, LisData> = {
  id: 'lis',
  complexity: COMPLEXITY.lis!,
  pseudocode: pseudo(`
#lis(A)
# for i ← 0 to n − 1
#   len[i] ← 1; prev[i] ← −1        ← every element is a run of length 1
#   for j ← 0 to i − 1
#     if A[j] < A[i] and len[j] + 1 > len[i]
#       len[i] ← len[j] + 1; prev[i] ← j    ← extend j's run
# best ← index of the largest len
# follow prev back from best        ← the subsequence itself`),
  code: code(
    `
function lis(a) {
  const len = new Array(a.length).fill(1);
  const prev = new Array(a.length).fill(-1);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < i; j++) {
      if (a[j] < a[i] && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
    }
  }
  return { length: Math.max(...len), prev };
}`,
    `
def lis(a):
    length = [1] * len(a)
    prev = [-1] * len(a)
    for i in range(len(a)):
        for j in range(i):
            if a[j] < a[i] and length[j] + 1 > length[i]:
                length[i] = length[j] + 1
                prev[i] = j
    return length, prev`,
    `
pair<int, vector<int>> lis(const vector<int>& a) {
  vector<int> len(a.size(), 1), prev(a.size(), -1);
  for (size_t i = 0; i < a.size(); ++i)
    for (size_t j = 0; j < i; ++j)
      if (a[j] < a[i] && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
  return { *max_element(len.begin(), len.end()), prev };
}`,
    `
static int lis(int[] a, int[] prev) {
  int[] len = new int[a.length];
  Arrays.fill(len, 1);
  Arrays.fill(prev, -1);
  for (int i = 0; i < a.length; i++)
    for (int j = 0; j < i; j++)
      if (a[j] < a[i] && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
  return Arrays.stream(len).max().getAsInt();
}`,
  ),
  explanation: [
    'The state is "the longest increasing run that ends exactly at index i". Small subproblems come first, so a single left-to-right pass is enough.',
    'A cell extends the best compatible run to its left: A[j] < A[i] and len[j] + 1 beating the current best. Those j cells are the dependency arrows.',
    'Ties matter for correctness of the *subsequence*: storing the predecessor index is what lets the trace walk back to real elements instead of just reporting a length.',
  ],
  learn: {
    useCases: ['Longest chain problems', 'Patience-sorting warm-up', 'Scheduling with ordering constraints'],
    practice: [
      { title: 'Longest Increasing Subsequence', url: 'https://leetcode.com/problems/longest-increasing-subsequence/', difficulty: 'medium' },
      { title: 'Russian Doll Envelopes', url: 'https://leetcode.com/problems/russian-doll-envelopes/', difficulty: 'hard' },
    ],
  },
  defaultInput: () => ({ kind: 'array', values: DEFAULT }),
  generate: (input, run) => {
    const values = (valuesOf(input).length > 0 ? valuesOf(input) : [...DEFAULT]).slice(0, 12);
    const n = values.length;
    const table = new TableModel({
      rowLabels: ['len', 'prev'],
      colLabels: Array.from({ length: n }, (_, i) => String(i)),
      fill: null,
      rowSub: 'index',
      colSub: 'value',
    });

    const len: number[] = [];
    const prev: number[] = [];
    const builder = new TraceBuilder<TableSnapshot, LisData>(() => table.snapshot({ badges: { n } }));

    builder.emit({
      kind: 'init',
      description: `A = [${values.join(', ')}] — find the longest strictly increasing subsequence.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
      data: { op: 'init' },
    });

    let bestIndex = 0;
    for (let i = 0; i < n; i += 1) {
      len[i] = 1;
      prev[i] = -1;
      table.active = [0, i];
      table.clearDeps();
      table.set(0, i, 1, 'active');
      table.set(1, i, -1, 'muted');
      builder.emit({
        kind: 'fill',
        description: `A[${i}] = ${values[i]} starts a new run of length 1.`,
        pseudocodeLine: 2,
        codeLine: 3,
        weight: 1,
        bump: 'writes',
        data: { op: 'restart', i },
      });

      for (let j = 0; j < i; j += 1) {
        const better = (values[j] as number) < (values[i] as number) && (len[j] as number) + 1 > (len[i] as number);
        builder.emit({
          kind: 'compare',
          description: better
            ? `A[${j}] = ${values[j]} < ${values[i]} and len[${j}] + 1 = ${(len[j] as number) + 1} beats ${len[i]} — extend.`
            : `A[${j}] = ${values[j]} cannot extend A[${i}] = ${values[i]}.`,
          pseudocodeLine: 4,
          codeLine: 5,
          weight: better ? 1.2 : 0.55,
          bump: 'comparisons',
          data: { op: 'scan', i, j },
        });

        if (better) {
          len[i] = (len[j] as number) + 1;
          prev[i] = j;
          table.clearDeps();
          table.dep(0, j);
          table.mark(0, j, 'compare');
          table.set(0, i, len[i] as number, 'active');
          table.set(1, i, j, 'active');
          builder.emit({
            kind: 'write',
            description: `len[${i}] becomes ${len[i]}, remembering predecessor ${j}.`,
            pseudocodeLine: 5,
            codeLine: 5,
            weight: 1.3,
            bump: 'writes',
            data: { op: 'extend', i, j },
          });
        } else {
          table.clearDeps();
          table.dep(0, j);
        }
      }

      if ((len[i] as number) > (len[bestIndex] as number)) bestIndex = i;
      table.mark(0, i, 'sorted');
    }

    // Reconstruct the subsequence by following the predecessors back.
    const chain: number[] = [];
    const path: [number, number][] = [];
    for (let cursor = bestIndex; cursor !== -1; cursor = prev[cursor] as number) {
      chain.unshift(cursor);
      path.unshift([0, cursor]);
      path.unshift([1, cursor]);
    }

    table.active = null;
    table.clearDeps();
    table.clearRoles(['muted']);
    table.setPath(path);
    table.caption = `LIS = [${chain.map((i) => values[i]).join(', ')}]`;

    builder.emit({
      kind: 'complete',
      description: `Longest increasing subsequence is [${chain.map((i) => values[i]).join(', ')}] — length ${len[bestIndex]}, found by following prev back from index ${bestIndex}.`,
      pseudocodeLine: 5,
      codeLine: 6,
      weight: 3,
      data: { op: 'done', i: bestIndex },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `LIS length ${len[bestIndex]}`,
        detail: `[${chain.map((i) => values[i]).join(', ')}]`,
        output: chain.map((i) => values[i] as number),
      },
      expectedState: () => (len[bestIndex] as number) === reference(values),
    });
  },
};

/** Independent O(n²) check written from the definition, not from the trace. */
function reference(values: readonly number[]): number {
  const best: number[] = values.map(() => 1);
  for (let i = 0; i < values.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if ((values[j] as number) < (values[i] as number)) {
        best[i] = Math.max(best[i] as number, (best[j] as number) + 1);
      }
    }
  }
  return Math.max(...best);
}

export const definition: AlgorithmDefinition<TableSnapshot, LisData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: TableVisualizer });
