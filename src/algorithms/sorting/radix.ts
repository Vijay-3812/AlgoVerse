import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY } from './specs';
import type { SortData } from './bubble';

/**
 * Radix Sort (LSD, base 10).
 *
 * Sort by the least-significant digit, then the next, and so on. Each pass is a
 * stable counting sort restricted to one digit, which is why the array is
 * *more* sorted after every pass rather than sorted once at the end. Each pass
 * renders its ten buckets in the auxiliary row, so the scatter/gather is
 * visible rather than implied.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'radix-sort',
  complexity: COMPLEXITY.radix!,
  pseudocode: pseudo(`
#radixSort(A)                  # base 10
# d ← number of digits of max(A)
# for exp ← 1, 10, …, 10^(d−1)
#   buckets ← 10 empty lists
#   for each v in A            # stable pass
#     buckets[digit(v, exp)].append(v)
#   A ← concatenate(buckets)
# return A`),
  code: code(
    `
function radixSort(a) {
  const max = Math.max(...a);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const buckets = Array.from({ length: 10 }, () => []);
    for (const v of a) buckets[Math.floor(v / exp) % 10].push(v);
    a = buckets.flat();
  }
  return a;
}`,
    `
def radix_sort(a):
    exp, top = 1, max(a)
    while top // exp > 0:
        buckets = [[] for _ in range(10)]
        for v in a:
            buckets[(v // exp) % 10].append(v)
        a = [v for b in buckets for v in b]
        exp *= 10
    return a`,
    `
void radixSort(vector<int>& a) {
  int top = *max_element(a.begin(), a.end());
  for (int exp = 1; top / exp > 0; exp *= 10) {
    vector<vector<int>> b(10);
    for (int v : a) b[(v / exp) % 10].push_back(v);
    a.clear();
    for (auto& bucket : b)
      a.insert(a.end(), bucket.begin(), bucket.end());
  }
}`,
    `
static void radixSort(int[] a) {
  int top = 0;
  for (int v : a) top = Math.max(top, v);
  for (int exp = 1; top / exp > 0; exp *= 10) {
    List<List<Integer>> b = new ArrayList<>();
    for (int i = 0; i < 10; i++) b.add(new ArrayList<>());
    for (int v : a) b.get((v / exp) % 10).add(v);
    int k = 0;
    for (List<Integer> bucket : b)
      for (int v : bucket) a[k++] = v;
  }
}`,
  ),
  explanation: [
    'Radix sort processes one decimal digit at a time, starting with the least significant.',
    'Because every pass is a stable bucket distribution, digits already sorted are never disturbed — after d passes the array is sorted.',
    'It never compares two elements directly, so it escapes the n log n lower bound for comparison sorts.',
  ],
  learn: {
    useCases: [
      'Sorting large sets of fixed-width integers, IDs, phone numbers or IP addresses.',
      'Suffix-array construction and other string-processing pipelines.',
      'GPU and SIMD sorting, where bucket passes vectorise well.',
    ],
    quiz: [
      {
        question: 'Why must each radix pass be stable?',
        options: [
          'For speed',
          'Otherwise earlier digit ordering is destroyed',
          'To save memory',
          'Stability is optional',
        ],
        answer: 1,
        why: 'A later, more significant digit must not reorder elements that were already correctly ordered by lower digits.',
      },
    ],
    practice: [{ title: 'Maximum Gap', url: 'https://leetcode.com/problems/maximum-gap/', difficulty: 'hard' }],
  },
  defaultInput: () => ({ kind: 'array', values: [170, 45, 75, 90, 802, 24, 2, 66, 315, 120] }),
  generate: (input, run) => {
    const values = valuesOf(input).map((v) => Math.max(0, Math.trunc(v)));
    const model = new BarModel(values);
    let caption: string | undefined;
    let auxRows: ArraySnapshot['aux'];
    const decor = (): Omit<ArraySnapshot, 'values'> => ({
      ...(auxRows ? { aux: auxRows } : {}),
      ...(caption ? { caption } : {}),
    });
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot(decor()));
    const max = Math.max(...values);
    const digits = String(max).length;

    builder.emit({
      kind: 'init',
      description: `Radix sort (LSD, base 10) on ${values.length} values · ${digits} digit passes.`,
      badges: { digits, base: 10 },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
    });

    for (let exp = 1, pass = 1; Math.floor(max / exp) > 0; exp *= 10, pass += 1) {
      const buckets: number[][] = Array.from({ length: 10 }, () => []);

      auxRows = [{ label: `digit ${pass}`, values: buckets.map((b) => b.length), style: 'cells' }];
      caption = `pass ${pass}: sort by the ${exp === 1 ? 'ones' : exp === 10 ? 'tens' : `10^${pass - 1}`} digit`;
      builder.emit({
        kind: 'info',
        description: `Pass ${pass}: distribute by digit ${pass} (place value ${exp}).`,
        pseudocodeLine: 2,
        codeLine: 2,
        data: { pass, extra: `exp=${exp}` },
        weight: 1.4,
      });

      for (let i = 0; i < model.length; i += 1) {
        const v = model.at(i);
        const digit = Math.floor(v / exp) % 10;
        buckets[digit]?.push(v);

        auxRows = [
          {
            label: `digit ${pass}`,
            values: buckets.map((b) => (b.length ? b.join(',') : null)),
            roles: buckets.map((_, k) => (k === digit ? 'active' : null)),
            style: 'chips',
          },
        ];
        caption = `${v} → bucket ${digit}`;
        builder.emit({
          kind: 'read',
          description: `Digit of ${v} at place ${exp} is ${digit} → bucket ${digit}.`,
          highlight: { primary: [i] },
          data: { pass, j: digit },
          pseudocodeLine: 5,
          codeLine: 5,
          bump: ['reads', 'writes'],
          weight: 0.55,
        });
      }

      // gather: stable concatenation
      let write = 0;
      for (let digit = 0; digit < 10; digit += 1) {
        for (const v of buckets[digit] as number[]) {
          model.set(write, v);
          write += 1;
        }
        caption = `gather: pulled all values from bucket ${digit}`;
        builder.emit({
          kind: 'write',
          description: `Gather bucket ${digit} back into the array.`,
          highlight: { muted: Array.from({ length: Math.max(0, model.length - write) }, (_, k) => write + k) },
          data: { pass, j: digit },
          pseudocodeLine: 6,
          codeLine: 6,
          bump: 'writes',
          weight: 0.5,
        });
      }

      builder.emit({
        kind: 'sorted',
        description: `Pass ${pass} complete — the last ${pass} digit${pass === 1 ? '' : 's'} are now ordered.`,
        highlight: { success: Array.from({ length: model.length }, (_, k) => k) },
        data: { pass, extra: `pass ${pass} done` },
        pseudocodeLine: 6,
        codeLine: 6,
        weight: 2,
      });
    }

    builder.emit({
      kind: 'complete',
      description: `Sorted ${model.length} values in ${digits} passes with zero comparisons.`,
      highlight: { success: Array.from({ length: model.length }, (_, k) => k) },
      pseudocodeLine: 7,
      codeLine: 7,
      weight: 3,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: 'Sorted', detail: `${digits} digit passes · ${builder.metrics.comparisons} comparisons`, output: model.values },
      expectedState: () => isAscending(model.values),
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SortData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BarVisualizer });
