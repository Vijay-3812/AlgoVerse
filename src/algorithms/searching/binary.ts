import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, pseudo, targetOf, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SEARCH_DEFAULT_INPUT } from './specs';
import type { SearchData } from './linear';

/**
 * Binary Search (iterative, half-open bracket).
 *
 * The visual payoff is the window: every probe halves it, and the eliminated
 * space is dimmed. `lo` and `hi` pointers show the live bracket; `mid` marks the
 * probe. This is the trace that makes "log n" intuitive — 21 values, at most 5
 * probes.
 */
const spec: AlgorithmSpec<ArraySnapshot, SearchData> = {
  id: 'binary-search',
  complexity: COMPLEXITY.binary!,
  pseudocode: pseudo(`
#binarySearch(A, target)
#   lo ← 0, hi ← n − 1
#   while lo ≤ hi
#     mid ← ⌊(lo + hi) / 2⌋
#     if A[mid] = target: return mid
#     if A[mid] < target: lo ← mid + 1
#     else: hi ← mid − 1
#   return −1`),
  code: code(
    `
function binarySearch(a, target) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    `
def binary_search(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    `
int binarySearch(const vector<int>& a, int target) {
  int lo = 0, hi = (int)a.size() - 1;
  while (lo <= hi) {
    int mid = (lo + hi) >> 1;
    if (a[mid] == target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    `
static int binarySearch(int[] a, int target) {
  int lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    int mid = (lo + hi) >>> 1;
    if (a[mid] == target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
  ),
  explanation: [
    'Binary search looks at the middle element and throws away the half that cannot contain the target.',
    'Because the input is sorted, one comparison eliminates half the remaining candidates.',
    'The loop ends when the bracket closes (lo > hi), which is exactly the "not present" case.',
  ],
  learn: {
    useCases: [
      'Lookups in sorted arrays and indexes.',
      'Binary search on the answer: monotone predicates (koko eating bananas, ship packages).',
      'Powered by every database B-tree page split.',
    ],
    quiz: [
      {
        question: 'How many probes does binary search need for 1 000 sorted values?',
        options: ['10', '32', '500', '1000'],
        answer: 0,
        why: 'log₂1000 ≈ 10 — halving ten times covers the whole range.',
      },
      {
        question: 'What breaks if the array is not sorted?',
        options: ['Nothing', 'The halving assumption — the target may be in the discarded half', 'Speed only', 'Memory'],
        answer: 1,
        why: 'Discarding the wrong half makes the search unsound; the algorithm can then miss a present value.',
      },
    ],
    practice: [{ title: 'Binary Search', url: 'https://leetcode.com/problems/binary-search/', difficulty: 'easy' }],
  },
  defaultInput: SEARCH_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const target = targetOf(input) ?? model.at(0);
    const n = model.length;

    let lo = 0;
    let hi = n - 1;
    let mid: number | null = null;
    const eliminated: number[] = [];

    const builder = new TraceBuilder<ArraySnapshot, SearchData>(() =>
      model.snapshot({
        pointers: [
          { name: 'lo', index: lo, role: 'active' },
          { name: 'hi', index: hi, role: 'active' },
          ...(mid !== null ? [{ name: 'mid', index: mid, role: 'compare' as const }] : []),
        ],
        window: [lo, Math.max(lo, hi)],
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Binary search for ${target} in ${n} sorted values.`,
      badges: { target, range: `${lo}–${hi}` },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    while (lo <= hi) {
      builder.emit({
        kind: 'info',
        description: `Bracket [${lo}..${hi}] — ${hi - lo + 1} candidate${hi === lo ? '' : 's'} left.`,
        badges: { target, candidates: hi - lo + 1 },
        pseudocodeLine: 2,
        codeLine: 2,
        data: { target, index: lo },
        weight: 0.9,
      });

      mid = (lo + hi) >> 1;
      const value = model.at(mid);

      builder.emit({
        kind: 'compare',
        description: `Probe the middle: A[${mid}] = ${value}.`,
        highlight: { primary: [mid] },
        badges: { target, mid },
        pseudocodeLine: 3,
        codeLine: 3,
        data: { target, index: mid },
        bump: ['comparisons', 'reads'],
        weight: 1.2,
      });

      if (value === target) {
        builder.emit({
          kind: 'found',
          description: `A[${mid}] = ${target} — found in ${builder.metrics.comparisons} comparison${builder.metrics.comparisons === 1 ? '' : 's'}.`,
          highlight: { success: [mid], primary: [mid] },
          badges: { target, index: mid },
          pseudocodeLine: 4,
          codeLine: 4,
          data: { target, index: mid },
          weight: 2.8,
        });
        return finish({
          builder,
          spec,
          input,
          run,
          result: { headline: `Found at index ${mid}`, detail: `${builder.metrics.comparisons} probes`, output: mid },
        });
      }

      if (value < target) {
        for (let i = lo; i <= mid; i += 1) eliminated.push(i);
        lo = mid + 1;
        builder.emit({
          kind: 'info',
          description: `${value} < ${target} — discard the left half; search [${lo}..${hi}].`,
          highlight: { muted: [...eliminated], primary: [mid] },
          badges: { target, range: `${lo}–${hi}` },
          pseudocodeLine: 5,
          codeLine: 5,
          data: { target, index: mid },
          weight: 1.1,
        });
      } else {
        for (let i = mid; i <= hi; i += 1) eliminated.push(i);
        hi = mid - 1;
        builder.emit({
          kind: 'info',
          description: `${value} > ${target} — discard the right half; search [${lo}..${hi}].`,
          highlight: { muted: [...eliminated], primary: [mid] },
          badges: { target, range: `${lo}–${hi}` },
          pseudocodeLine: 6,
          codeLine: 6,
          data: { target, index: mid },
          weight: 1.1,
        });
      }
      mid = null;
    }

    builder.emit({
      kind: 'not-found',
      description: `Bracket closed (lo > hi) — ${target} is not present.`,
      highlight: { danger: Array.from({ length: n }, (_, i) => i) },
      badges: { target, probes: builder.metrics.comparisons },
      pseudocodeLine: 7,
      codeLine: 7,
      weight: 2.4,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: 'Not found', detail: `${builder.metrics.comparisons} probes`, output: -1 },
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SearchData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: BarVisualizer });
