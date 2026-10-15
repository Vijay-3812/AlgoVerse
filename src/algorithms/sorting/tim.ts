import { defineModule } from '@/types';
import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, isAscending, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY } from './specs';
import type { SortData } from './bubble';

const MINRUN = 4;

/**
 * Tim Sort (simplified).
 *
 * The real algorithm detects natural ascending/descending runs and sets minrun
 * from n; this version fixes minrun = 4 so the structure is legible in a
 * visualiser. The two ideas that matter are both present and visible:
 *
 *   1. sort short runs with insertion sort, then
 *   2. merge runs in a balanced, stack-like order so the merge tree stays
 *      shallow — instead of folding everything into one ever-growing run.
 */
const spec: AlgorithmSpec<ArraySnapshot, SortData> = {
  id: 'tim-sort',
  complexity: COMPLEXITY.tim!,
  pseudocode: pseudo(`
#timSort(A, minrun = 4)
# for each block of minrun consecutive elements
#   insertionSort(block)
#   push block onto run stack
#   while top two runs are unbalanced: merge them
# while run stack has more than one run
#   merge the top two runs
# return A`),
  code: code(
    `
function timSort(a, minrun = 4) {
  const n = a.length;
  const stack = [];
  for (let lo = 0; lo < n; lo += minrun) {
    const hi = Math.min(lo + minrun, n);
    insertionSortRange(a, lo, hi);
    stack.push([lo, hi]);
    while (stack.length >= 2) {
      const [x0, x1] = stack[stack.length - 2];
      const [y0, y1] = stack[stack.length - 1];
      if (x1 - x0 <= 2 * (y1 - y0)) {
        merge(a, x0, x1, y1);
        stack.splice(stack.length - 2, 2, [x0, y1]);
      } else break;
    }
  }
  while (stack.length > 1) {
    const [x0, x1] = stack[stack.length - 2];
    const [, y1] = stack.pop();
    merge(a, x0, x1, y1);
    stack[stack.length - 1] = [x0, y1];
  }
  return a;
}`,
    `
def tim_sort(a, minrun=4):
    n = len(a)
    stack = []
    for lo in range(0, n, minrun):
        hi = min(lo + minrun, n)
        insertion_sort_range(a, lo, hi)
        stack.append([lo, hi])
        while len(stack) >= 2:
            x0, x1 = stack[-2]
            y0, y1 = stack[-1]
            if x1 - x0 <= 2 * (y1 - y0):
                merge(a, x0, x1, y1)
                stack[-2:] = [[x0, y1]]
            else:
                break
    while len(stack) > 1:
        x0, x1 = stack[-2]
        _, y1 = stack.pop()
        merge(a, x0, x1, y1)
        stack[-1] = [x0, y1]
    return a`,
    `
static void timSort(vector<int>& a, int minrun = 4) {
  int n = (int)a.size();
  vector<pair<int,int>> stack;
  for (int lo = 0; lo < n; lo += minrun) {
    int hi = min(lo + minrun, n);
    insertionSortRange(a, lo, hi);
    stack.push_back({lo, hi});
    while (stack.size() >= 2) {
      auto [x0, x1] = stack[stack.size() - 2];
      auto [y0, y1] = stack[stack.size() - 1];
      if (x1 - x0 <= 2 * (y1 - y0)) {
        merge(a, x0, x1, y1);
        stack.resize(stack.size() - 2);
        stack.push_back({x0, y1});
      } else break;
    }
  }
  while (stack.size() > 1) {
    auto [x0, x1] = stack[stack.size() - 2];
    int y1 = stack.back().second;
    stack.pop_back();
    merge(a, x0, x1, y1);
    stack.back() = {x0, y1};
  }
}`,
    `
static void timSort(int[] a, int minrun) {
  int n = a.length;
  Deque<int[]> stack = new ArrayDeque<>();
  for (int lo = 0; lo < n; lo += minrun) {
    int hi = Math.min(lo + minrun, n);
    insertionSortRange(a, lo, hi);
    stack.push(new int[]{lo, hi});
    while (stack.size() >= 2) {
      int[] y = stack.pop(), x = stack.pop();
      if (x[1] - x[0] <= 2 * (y[1] - y[0])) {
        merge(a, x[0], x[1], y[1]);
        stack.push(new int[]{x[0], y[1]});
      } else {
        stack.push(x); stack.push(y); break;
      }
    }
  }
  while (stack.size() > 1) {
    int[] y = stack.pop(), x = stack.pop();
    merge(a, x[0], x[1], y[1]);
    stack.push(new int[]{x[0], y[1]});
  }
}`,
  ),
  explanation: [
    'Tim Sort exploits order that already exists: real data is rarely random, so it starts by finding or building short sorted runs.',
    'Each run is sorted with insertion sort (fast on short inputs), then runs are merged pairwise.',
    'Java, Python and V8 all ship Tim Sort variants — this simplified version keeps the two structural ideas and drops the run-detection heuristics.',
  ],
  learn: {
    useCases: [
      'Default sorting in Python (list.sort), Java (Arrays.sort for objects) and V8.',
      'Any dataset with long existing runs: logs by timestamp, append-only tables.',
      'Guaranteeing both stability and O(n log n) worst case.',
    ],
    practice: [{ title: 'Sort an Array', url: 'https://leetcode.com/problems/sort-an-array/', difficulty: 'medium' }],
  },
  defaultInput: () => ({ kind: 'array', values: [5, 21, 7, 34, 9, 2, 44, 18, 26, 11, 30, 3, 15, 27, 40, 6] }),
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const n = model.length;
    let caption: string | undefined;
    let auxRows: ArraySnapshot['aux'];
    const decor = (): Omit<ArraySnapshot, 'values'> => ({
      ...(auxRows ? { aux: auxRows } : {}),
      ...(caption ? { caption } : {}),
    });
    const builder = new TraceBuilder<ArraySnapshot, SortData>(() => model.snapshot(decor()));

    interface Run {
      lo: number;
      hi: number;
    }
    const stack: Run[] = [];

    const runRow = (active: number[] = []): ArraySnapshot['aux'] => [
      {
        label: 'run stack',
        values: stack.map((r) => `[${r.lo}..${r.hi - 1}]`),
        roles: stack.map((_, i) => (active.includes(i) ? 'active' : null)),
        style: 'chips',
      },
    ];

    const merge = (lo: number, mid: number, hi: number, depth: number): void => {
      const left: number[] = [];
      const right: number[] = [];
      for (let k = lo; k < mid; k += 1) left.push(model.at(k));
      for (let k = mid; k < hi; k += 1) right.push(model.at(k));

      let i = 0;
      let j = 0;
      const out: number[] = [];
      while (i < left.length && j < right.length) {
        const a = left[i] as number;
        const b = right[j] as number;
        builder.emit({
          kind: 'compare',
          description: `Merge [${lo}..${mid - 1}] with [${mid}..${hi - 1}]: ${a} vs ${b}.`,
          highlight: { primary: [lo + i], secondary: [mid + j] },
          data: { pass: depth, extra: `merge ${lo}-${hi}` },
          pseudocodeLine: 6,
          codeLine: 8,
          bump: 'comparisons',
          weight: 0.5,
        });
        if (a <= b) {
          out.push(a);
          i += 1;
        } else {
          out.push(b);
          j += 1;
        }
      }
      while (i < left.length) out.push(left[i++] as number);
      while (j < right.length) out.push(right[j++] as number);

      for (let k = 0; k < out.length; k += 1) model.set(lo + k, out[k] as number);
    };

    builder.emit({
      kind: 'init',
      description: `Tim Sort (simplified): minrun = ${MINRUN}, ${Math.ceil(n / MINRUN)} runs.`,
      badges: { minrun: MINRUN, runs: Math.ceil(n / MINRUN) },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
    });

    for (let lo = 0; lo < n; lo += MINRUN) {
      const hi = Math.min(lo + MINRUN, n);

      builder.emit({
        kind: 'info',
        description: `Insertion-sort the run [${lo}..${hi - 1}].`,
        highlight: { tertiary: rangeOf(lo, hi), muted: [] },
        data: { pass: 0, extra: `run ${lo}-${hi}` },
        pseudocodeLine: 1,
        codeLine: 3,
        weight: 1.2,
      });

      for (let i = lo + 1; i < hi; i += 1) {
        const key = model.at(i);
        let j = i - 1;
        while (j >= lo && model.at(j) > key) {
          model.set(j + 1, model.at(j));
          builder.emit({
            kind: 'shift',
            description: `Shift ${model.at(j)} right inside the run for ${key}.`,
            highlight: { primary: [j], secondary: [j + 1] },
            data: { pass: 0, j: i },
            pseudocodeLine: 1,
            codeLine: 3,
            bump: ['comparisons', 'writes'],
            weight: 0.35,
          });
          j -= 1;
        }
        model.set(j + 1, key);
        builder.emit({
          kind: 'insert',
          description: `Run [${lo}..${hi - 1}] receives ${key} at index ${j + 1}.`,
          highlight: { primary: [j + 1], tertiary: rangeOf(lo, hi) },
          data: { pass: 0, j: i },
          pseudocodeLine: 1,
          codeLine: 3,
          bump: 'writes',
          weight: 0.5,
        });
      }

      stack.push({ lo, hi });
      caption = `run [${lo}..${hi - 1}] sorted`;
      auxRows = runRow([stack.length - 1]);
      builder.emit({
        kind: 'sorted',
        description: `Run [${lo}..${hi - 1}] is sorted: [${rangeOf(lo, hi).map((k) => model.at(k)).join(', ')}].`,
        highlight: { success: rangeOf(lo, hi) },
        data: { pass: 0, extra: `run done` },
        pseudocodeLine: 2,
        codeLine: 4,
        weight: 1.3,
      });

      // Balance the run stack (simplified Tim Sort invariant).
      while (stack.length >= 2) {
        const x = stack[stack.length - 2] as Run;
        const y = stack[stack.length - 1] as Run;
        const xLen = x.hi - x.lo;
        const yLen = y.hi - y.lo;
        if (xLen <= 2 * yLen) {
          merge(x.lo, x.hi, y.hi, stack.length);
          stack.splice(stack.length - 2, 2, { lo: x.lo, hi: y.hi });
          caption = `merged into [${x.lo}..${y.hi - 1}]`;
          auxRows = runRow([stack.length - 1]);
          builder.emit({
            kind: 'merge',
            description: `Runs unbalanced (${xLen} ≤ 2×${yLen}) — merge into [${x.lo}..${y.hi - 1}].`,
            highlight: { success: rangeOf(x.lo, y.hi) },
            data: { pass: 1, extra: `merge ${x.lo}-${y.hi}` },
            pseudocodeLine: 4,
            codeLine: 5,
            bump: ['writes', 'writes'],
            weight: 1.6,
          });
        } else {
          break;
        }
      }
    }

    while (stack.length > 1) {
      const x = stack[stack.length - 2] as Run;
      const y = stack.pop() as Run;
      merge(x.lo, x.hi, y.hi, stack.length);
      stack[stack.length - 1] = { lo: x.lo, hi: y.hi };
      caption = `final merge [${x.lo}..${y.hi - 1}]`;
      auxRows = runRow([stack.length - 1]);
      builder.emit({
        kind: 'merge',
        description: `Final merges: [${x.lo}..${x.hi - 1}] + [${y.lo}..${y.hi - 1}] → [${x.lo}..${y.hi - 1}].`,
        highlight: { success: rangeOf(x.lo, y.hi) },
        data: { pass: 2, extra: 'final merge' },
        pseudocodeLine: 7,
        codeLine: 11,
        bump: ['writes', 'writes'],
        weight: 1.8,
      });
    }

    builder.emit({
      kind: 'complete',
      description: `Sorted ${n} values with ${builder.metrics.comparisons} comparisons across ${builder.metrics.calls} merges.`,
      highlight: { success: rangeOf(0, n) },
      pseudocodeLine: 7,
      codeLine: 12,
      weight: 3,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: 'Sorted', detail: `${n} values · minrun ${MINRUN}`, output: model.values },
      expectedState: () => isAscending(model.values),
    });
  },
};

function rangeOf(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = lo; i < hi; i += 1) out.push(i);
  return out;
}

export const definition: AlgorithmDefinition<ArraySnapshot, SortData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: BarVisualizer });
