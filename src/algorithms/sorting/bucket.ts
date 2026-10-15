import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SORTING_DEFAULT_INPUT } from './specs';
import type { SortData } from './bubble';

/**
 * Bucket Sort.
 *
 * Distribute values into √n equal-width buckets, insertion-sort each bucket,
 * then concatenate. Unlike counting/radix sort the buckets are *ranges*, so the
 * buckets themselves are the visual story: some fill up, some stay empty, and
 * clustering in the input shows up as a lopsided row.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'bucket-sort',
  complexity: COMPLEXITY.bucket!,
  pseudocode: pseudo(`
#bucketSort(A)
# k ← ⌈√n⌉ buckets
# lo ← min(A), hi ← max(A)
# for each v in A
#   b ← ⌊(v − lo) / (hi − lo) · k⌋
#   bucket[b].append(v)
# for each bucket
#   insertionSort(bucket)
# A ← concatenate(buckets)   # in bucket order
# return A`),
  code: code(
    `
function bucketSort(a) {
  const n = a.length;
  const k = Math.ceil(Math.sqrt(n));
  const lo = Math.min(...a), hi = Math.max(...a);
  const buckets = Array.from({ length: k }, () => []);
  for (const v of a) {
    const b = hi === lo ? 0 : Math.floor(((v - lo) / (hi - lo)) * (k - 1));
    buckets[b].push(v);
  }
  const out = [];
  for (const bucket of buckets) {
    bucket.sort((x, y) => x - y);
    out.push(...bucket);
  }
  return out;
}`,
    `
def bucket_sort(a):
    n = len(a)
    k = math.ceil(math.sqrt(n))
    lo, hi = min(a), max(a)
    buckets = [[] for _ in range(k)]
    for v in a:
        b = 0 if hi == lo else int((v - lo) / (hi - lo) * (k - 1))
        buckets[b].append(v)
    out = []
    for bucket in buckets:
        out.extend(sorted(bucket))
    return out`,
    `
void bucketSort(vector<int>& a) {
  int n = (int)a.size();
  int k = (int)ceil(sqrt(n));
  int lo = *min_element(a.begin(), a.end());
  int hi = *max_element(a.begin(), a.end());
  vector<vector<int>> b(k);
  for (int v : a) {
    int idx = hi == lo ? 0 : (int)((double)(v - lo) / (hi - lo) * (k - 1));
    b[idx].push_back(v);
  }
  a.clear();
  for (auto& bucket : b) {
    sort(bucket.begin(), bucket.end());
    a.insert(a.end(), bucket.begin(), bucket.end());
  }
}`,
    `
static void bucketSort(int[] a) {
  int n = a.length;
  int k = (int)Math.ceil(Math.sqrt(n));
  int lo = a[0], hi = a[0];
  for (int v : a) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  List<List<Integer>> b = new ArrayList<>();
  for (int i = 0; i < k; i++) b.add(new ArrayList<>());
  for (int v : a) {
    int idx = hi == lo ? 0 : (int)((double)(v - lo) / (hi - lo) * (k - 1));
    b.get(idx).add(v);
  }
  int w = 0;
  for (List<Integer> bucket : b) {
    Collections.sort(bucket);
    for (int v : bucket) a[w++] = v;
  }
}`,
  ),
  explanation: [
    'Bucket sort assumes the values are roughly uniformly distributed over a known range.',
    'That range is split into √n equal-width buckets; each value falls into exactly one.',
    'Sorting many tiny buckets is cheaper than sorting one big array, and the buckets are then concatenated in order.',
  ],
  learn: {
    useCases: [
      'Uniformly distributed floats in [0, 1) — the classic case.',
      'Parallel sorting: buckets can be processed independently.',
      'Histogram-adjacent workloads where the distribution is already known.',
    ],
    practice: [{ title: 'Maximum Gap', url: 'https://leetcode.com/problems/maximum-gap/', difficulty: 'hard' }],
  },
  defaultInput: SORTING_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const n = values.length;
    const model = new BarModel(values);
    let caption: string | undefined;
    let auxRows: ArraySnapshot['aux'];
    const decor = (): Omit<ArraySnapshot, 'values'> => ({
      ...(auxRows ? { aux: auxRows } : {}),
      ...(caption ? { caption } : {}),
    });
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot(decor()));

    const k = Math.max(2, Math.ceil(Math.sqrt(n)));
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const buckets: number[][] = Array.from({ length: k }, () => []);
    const range = hi - lo || 1;

    const bucketRow = (active: number[] = []): ArraySnapshot['aux'] => [
      {
        label: `buckets (${k})`,
        values: buckets.map((b) => (b.length ? b.join(',') : null)),
        roles: buckets.map((_, i) => (active.includes(i) ? 'active' : null)),
        style: 'chips',
      },
    ];

    builder.emit({
      kind: 'init',
      description: `Bucket sort: ${n} values, range ${lo}…${hi}, split into ${k} buckets of width ${(range / k).toFixed(1)}.`,
      badges: { buckets: k, range: `${lo}–${hi}` },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
    });

    for (let i = 0; i < n; i += 1) {
      const v = values[i] as number;
      const b = Math.min(k - 1, Math.floor(((v - lo) / range) * k));
      (buckets[b] as number[]).push(v);

      auxRows = bucketRow([b]);
      caption = `${v} → bucket ${b}`;
      builder.emit({
        kind: 'write',
        description: `Scatter ${v} into bucket ${b} (range ${(lo + (b * range) / k).toFixed(0)}–${(lo + ((b + 1) * range) / k).toFixed(0)}).`,
        highlight: { primary: [i] },
        data: { pass: 0, j: b },
        pseudocodeLine: 5,
        codeLine: 5,
        bump: ['reads', 'writes'],
        weight: 0.6,
      });
    }

    auxRows = bucketRow();
    caption = 'all values scattered';
    builder.emit({
      kind: 'info',
      description: `Scatter complete. Bucket sizes: ${buckets.map((b) => b.length).join(', ')}.`,
      pseudocodeLine: 5,
      codeLine: 5,
      data: { pass: 0, extra: 'scatter done' },
      weight: 1.4,
    });

    // Sort each bucket with insertion sort (visible, per bucket).
    buckets.forEach((bucket, b) => {
      for (let i = 1; i < bucket.length; i += 1) {
        const key = bucket[i] as number;
        let j = i - 1;
        while (j >= 0 && (bucket[j] as number) > key) {
          bucket[j + 1] = bucket[j] as number;
          j -= 1;
          auxRows = bucketRow([b]);
          caption = `sorting bucket ${b}`;
          builder.emit({
            kind: 'shift',
            description: `Sort bucket ${b}: shift ${bucket[j + 1]} right for ${key}.`,
            data: { pass: 1, j: b },
            pseudocodeLine: 8,
            codeLine: 9,
            bump: ['comparisons', 'writes'],
            weight: 0.35,
          });
        }
        bucket[j + 1] = key;
        auxRows = bucketRow([b]);
        caption = `bucket ${b}: ${bucket.join(', ')}`;
        builder.emit({
          kind: 'insert',
          description: `Bucket ${b} now reads [${bucket.join(', ')}].`,
          data: { pass: 1, j: b },
          pseudocodeLine: 8,
          codeLine: 9,
          bump: 'writes',
          weight: 0.5,
        });
      }
    });

    // Concatenate
    let write = 0;
    buckets.forEach((bucket, b) => {
      for (const v of bucket) {
        model.set(write, v);
        write += 1;
      }
      auxRows = bucketRow([b]);
      caption = `gathered buckets 0…${b}`;
      builder.emit({
        kind: 'merge',
        description: `Concatenate bucket ${b}: [${bucket.join(', ') || 'empty'}].`,
        highlight: { success: Array.from({ length: write }, (_, i) => i) },
        data: { pass: 2, j: b },
        pseudocodeLine: 9,
        codeLine: 10,
        weight: 0.7,
      });
    });

    builder.emit({
      kind: 'complete',
      description: `Sorted ${n} values using ${k} buckets.`,
      highlight: { success: Array.from({ length: n }, (_, i) => i) },
      pseudocodeLine: 9,
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
        detail: `${n} values · ${k} buckets · ${builder.metrics.comparisons} comparisons`,
        output: model.values,
      },
      expectedState: () => isAscending(model.values),
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SortData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BarVisualizer });
