import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY } from './specs';
import type { SortData } from './bubble';

/**
 * Counting Sort.
 *
 * No comparisons at all: count how many of each key exist, turn the counts into
 * end positions with a prefix sum, then place each element from right to left.
 * Placing right-to-left is what makes it stable, and it is visible in the trace
 * (the write cursor walks backwards through equal keys).
 *
 * The count array is shown as an auxiliary row under the bars, so the two
 * phases — tally and placement — are legible without narration.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'counting-sort',
  complexity: COMPLEXITY.counting!,
  pseudocode: pseudo(`
#countingSort(A)
# k ← max(A)
# count ← array of k+1 zeros
# for each value v in A
#   count[v] ← count[v] + 1
# for i ← 1 to k
#   count[i] ← count[i] + count[i−1]
# out ← array of n zeros
# for i ← n − 1 down to 0
#   v ← A[i]
#   count[v] ← count[v] − 1
#   out[count[v]] ← v
# return out`),
  code: code(
    `
function countingSort(a) {
  const k = Math.max(...a);
  const count = new Array(k + 1).fill(0);
  for (const v of a) count[v]++;
  for (let i = 1; i <= k; i++) count[i] += count[i - 1];
  const out = new Array(a.length);
  for (let i = a.length - 1; i >= 0; i--) {
    const v = a[i];
    out[--count[v]] = v;
  }
  return out;
}`,
    `
def counting_sort(a):
    k = max(a)
    count = [0] * (k + 1)
    for v in a:
        count[v] += 1
    for i in range(1, k + 1):
        count[i] += count[i - 1]
    out = [0] * len(a)
    for i in range(len(a) - 1, -1, -1):
        v = a[i]
        count[v] -= 1
        out[count[v]] = v
    return out`,
    `
vector<int> countingSort(const vector<int>& a) {
  int k = *max_element(a.begin(), a.end());
  vector<int> count(k + 1, 0);
  for (int v : a) ++count[v];
  for (int i = 1; i <= k; ++i) count[i] += count[i - 1];
  vector<int> out(a.size());
  for (int i = (int)a.size() - 1; i >= 0; --i) {
    int v = a[i];
    out[--count[v]] = v;
  }
  return out;
}`,
    `
static int[] countingSort(int[] a) {
  int k = 0;
  for (int v : a) k = Math.max(k, v);
  int[] count = new int[k + 1];
  for (int v : a) count[v]++;
  for (int i = 1; i <= k; i++) count[i] += count[i - 1];
  int[] out = new int[a.length];
  for (int i = a.length - 1; i >= 0; i--) {
    int v = a[i];
    out[--count[v]] = v;
  }
  return out;
}`,
  ),
  explanation: [
    'Counting sort ignores comparisons entirely: it assumes small integer keys and counts occurrences instead.',
    'A prefix sum converts counts into “where does this key end”, so each element knows its exact destination slot.',
    'Placing elements from right to left preserves the original order of equal keys — that is what makes it stable.',
  ],
  learn: {
    useCases: [
      'Histograms, vote tallies and any small, dense integer key range.',
      'The inner routine of radix sort (one digit per pass).',
      'Bucketing ages, scores or grades where k ≪ n log n.',
    ],
    quiz: [
      {
        question: 'Counting sort’s complexity O(n + k) becomes bad when…',
        options: ['n is large', 'k is much larger than n', 'values repeat', 'values are negative'],
        answer: 1,
        why: 'A huge key range forces a huge count array even if the input is tiny.',
      },
      {
        question: 'Which loop direction preserves stability?',
        options: ['Forward', 'Backward', 'Either', 'Stability is impossible here'],
        answer: 1,
        why: 'Walking the input backwards and decrementing the end position keeps equal keys in original order.',
      },
    ],
    practice: [{ title: 'Sort Colors', url: 'https://leetcode.com/problems/sort-colors/', difficulty: 'medium' }],
  },
  defaultInput: () => ({ kind: 'array', values: [4, 2, 2, 8, 3, 3, 1, 7, 5, 2, 6, 4] }),
  generate: (input, run) => {
    const source = valuesOf(input);
    const n = source.length;
    const values = source.map((v) => Math.max(0, Math.trunc(v)));
    const max = Math.max(1, ...values);

    const model = new BarModel(values);
    // `decor()` is the live decoration: the builder calls it on every emit, so
    // these variables *are* the visual state between steps.
    let caption: string | undefined;
    let auxRows: ArraySnapshot['aux'];
    let active = model;
    const decor = (): Omit<ArraySnapshot, 'values'> => ({
      ...(auxRows ? { aux: auxRows } : {}),
      ...(caption ? { caption } : {}),
    });
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => active.snapshot(decor()));
    const count = new Array<number>(max + 1).fill(0);
    const countRow = (active: number[], label = 'count'): ArraySnapshot['aux'] => [
      {
        label,
        values: count.map((c) => c),
        roles: count.map((_, i) => (active.includes(i) ? 'active' : null)),
        style: 'cells',
      },
    ];

    builder.emit({
      kind: 'init',
      description: `Counting sort on ${n} values (keys 0…${max}). No comparisons at all.`,
      highlight: { },
      badges: { keys: max + 1 },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
    });

    // Phase 1: tally
    for (let i = 0; i < n; i += 1) {
      const v = values[i] as number;
      count[v] = (count[v] as number) + 1;
      auxRows = countRow([v], 'count');
      caption = `tally: ${v} seen ${count[v]}×`;
      builder.emit({
        kind: 'read',
        description: `Count ${v}: it has now appeared ${count[v]} time${count[v] === 1 ? '' : 's'}.`,
        highlight: { primary: [i] },
        data: { pass: 0, extra: 'tally' },
        pseudocodeLine: 4,
        codeLine: 4,
        bump: ['reads', 'writes'],
        weight: 0.7,
      });
    }

    // Phase 2: prefix sums
    for (let i = 1; i <= max; i += 1) {
      count[i] = (count[i] as number) + (count[i - 1] as number);
      auxRows = countRow([i - 1, i], 'end pos');
      caption = `prefix: count[${i}] = ${count[i]}`;
      builder.emit({
        kind: 'write',
        description: `Prefix sum: key ${i} ends at position ${count[i]}.`,
        highlight: { tertiary: [i] },
        data: { pass: 1, extra: 'prefix' },
        pseudocodeLine: 6,
        codeLine: 6,
        bump: ['reads', 'writes'],
        weight: 0.6,
      });
    }

    // Phase 3: placement (right to left → stable)
    const out: (number | null)[] = new Array<number | null>(n).fill(null);
    const outModel = new BarModel(new Array<number>(n).fill(0));
    for (let i = n - 1; i >= 0; i -= 1) {
      const v = values[i] as number;
      count[v] = (count[v] as number) - 1;
      const dest = count[v] as number;
      out[dest] = v;
      outModel.set(dest, v);

      active = outModel;
      auxRows = [
        { label: 'count', values: count.map((c) => c), roles: count.map((_, k) => (k === v ? 'active' : null)), style: 'cells' },
        { label: 'output', values: out.map((o) => o), style: 'cells' },
      ];
      caption = `place ${v} at index ${dest}`;
      builder.emit({
        kind: 'write',
        description: `Take ${v} from index ${i} and place it at index ${dest}.`,
        highlight: { primary: [dest], secondary: [i] },
        data: { pass: 2, extra: `dest ${dest}` },
        pseudocodeLine: 11,
        codeLine: 11,
        bump: ['writes', 'reads'],
        weight: 0.95,
      });
    }

    const sortedValues = out.map((v) => v ?? 0);
    caption = 'output complete';
    builder.emit({
      kind: 'complete',
      description: `Sorted without a single comparison — ${n} reads, ${n} writes.`,
      highlight: { success: sortedValues.map((_, i) => i) },
      pseudocodeLine: 11,
      codeLine: 11,
      weight: 3,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Sorted',
        detail: `${n} values · 0 comparisons`,
        output: sortedValues,
      },
      expectedState: () => isAscending(sortedValues),
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SortData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BarVisualizer });
