import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, pseudo, targetOf, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SEARCH_DEFAULT_INPUT } from './specs';
import type { SearchData } from './linear';

/**
 * Exponential (galloping) Search.
 *
 * Doubles the bound until the target is bracketed, then hands off to binary
 * search inside `[bound/2, bound]`. Two phases, two colours: the gallop is
 * drawn as a growing window, the binary phase as the familiar halving bracket.
 * It is the algorithm behind `git bisect`-style searching in unbounded streams.
 */
const spec: AlgorithmSpec<ArraySnapshot, SearchData> = {
  id: 'exponential-search',
  complexity: COMPLEXITY.exponential!,
  pseudocode: pseudo(`
#exponentialSearch(A, target)     ▸ sorted
#   if A[0] = target: return 0
#   bound ← 1
#   while bound < n and A[bound] < target
#     bound ← bound · 2
#   return binarySearch(A, target, bound/2, min(bound, n − 1))
# # --- galloping finds the range, binary search finds the index ---`),
  code: code(
    `
function exponentialSearch(a, target) {
  if (a[0] === target) return 0;
  let bound = 1;
  while (bound < a.length && a[bound] < target) bound *= 2;
  return lowerBoundBinary(a, target, bound >> 1, Math.min(bound, a.length - 1));
}

function lowerBoundBinary(a, target, lo, hi) {
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    `
def exponential_search(a, target):
    if a[0] == target:
        return 0
    bound = 1
    while bound < len(a) and a[bound] < target:
        bound *= 2
    return _binary(a, target, bound // 2, min(bound, len(a) - 1))

def _binary(a, target, lo, hi):
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
int exponentialSearch(const vector<int>& a, int target) {
  if (a[0] == target) return 0;
  int bound = 1;
  while (bound < (int)a.size() && a[bound] < target) bound *= 2;
  return binaryInRange(a, target, bound / 2, min(bound, (int)a.size() - 1));
}

int binaryInRange(const vector<int>& a, int target, int lo, int hi) {
  while (lo <= hi) {
    int mid = (lo + hi) >> 1;
    if (a[mid] == target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    `
static int exponentialSearch(int[] a, int target) {
  if (a[0] == target) return 0;
  int bound = 1;
  while (bound < a.length && a[bound] < target) bound *= 2;
  return binaryInRange(a, target, bound >>> 1, Math.min(bound, a.length - 1));
}

static int binaryInRange(int[] a, int target, int lo, int hi) {
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
    'Exponential search first finds a range that must contain the target by doubling a bound — 1, 2, 4, 8 …',
    'Then it binary searches inside that range, which has at most half the size of the bound.',
    'Cost is O(log i) where i is the target’s index: search time scales with *where* the value is, not how long the array is.',
  ],
  learn: {
    useCases: [
      'Unbounded or streamed arrays where the length is unknown.',
      'When the target is expected near the start (frequently accessed keys).',
      'Interval lookup in log-structured merge trees.',
    ],
    practice: [{ title: 'Search in a Sorted Array of Unknown Size', url: 'https://leetcode.com/problems/search-in-a-sorted-array-of-unknown-size/', difficulty: 'medium' }],
  },
  defaultInput: SEARCH_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const target = targetOf(input) ?? model.at(0);
    const n = model.length;

    let bound = 1;
    let lo = 0;
    let hi = n - 1;
    let phase: 'gallop' | 'binary' = 'gallop';
    let mid: number | null = null;
    const eliminated: number[] = [];

    const builder = new TraceBuilder<ArraySnapshot, SearchData>(() =>
      model.snapshot({
        pointers: [
          { name: 'bound', index: Math.min(bound, n - 1), role: 'pivot' },
          ...(phase === 'binary'
            ? [
                { name: 'lo', index: lo, role: 'active' as const },
                { name: 'hi', index: hi, role: 'active' as const },
              ]
            : []),
          ...(mid !== null ? [{ name: 'mid', index: mid, role: 'compare' as const }] : []),
        ],
        window: phase === 'binary' ? [lo, Math.max(lo, hi)] : [0, Math.min(bound, n - 1)],
        caption: phase === 'gallop' ? 'phase 1 · gallop' : 'phase 2 · binary search inside the bracket',
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Exponential search for ${target}: gallop to bracket it, then bisect.`,
      badges: { target, phase: 'gallop' },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    if (model.at(0) === target) {
      builder.emit({
        kind: 'found',
        description: `A[0] = ${target} — one comparison.`,
        highlight: { success: [0], primary: [0] },
        badges: { target, index: 0 },
        pseudocodeLine: 1,
        codeLine: 1,
        data: { target, index: 0 },
        bump: ['comparisons'],
        weight: 2.8,
      });
      return finish({
        builder,
        spec,
        input,
        run,
        result: { headline: 'Found at index 0', detail: '1 comparison', output: 0 },
      });
    }

    while (bound < n && model.at(bound) < target) {
      builder.emit({
        kind: 'probe',
        description: `A[${bound}] = ${model.at(bound)} < ${target} — double the bound to ${bound * 2}.`,
        highlight: { primary: [bound], muted: [...eliminated] },
        badges: { target, bound },
        pseudocodeLine: 3,
        codeLine: 3,
        data: { target, index: bound },
        bump: ['comparisons', 'reads'],
        weight: 1.3,
      });
      for (let i = 0; i < bound; i += 1) if (!eliminated.includes(i)) eliminated.push(i);
      bound *= 2;
    }

    builder.emit({
      kind: 'info',
      description: `Bracketed: the target must lie in [${Math.floor(bound / 2)}..${Math.min(bound, n - 1)}].`,
      highlight: { muted: [...eliminated] },
      badges: { target, phase: 'binary' },
      pseudocodeLine: 4,
      codeLine: 4,
      weight: 1.4,
    });

    phase = 'binary';
    lo = Math.floor(bound / 2);
    hi = Math.min(bound, n - 1);

    while (lo <= hi) {
      mid = (lo + hi) >> 1;
      const value = model.at(mid);
      builder.emit({
        kind: 'compare',
        description: `Binary phase: probe A[${mid}] = ${value}.`,
        highlight: { primary: [mid], muted: [...eliminated] },
        badges: { target, mid },
        pseudocodeLine: 5,
        codeLine: 8,
        data: { target, index: mid },
        bump: ['comparisons'],
        weight: 1.1,
      });

      if (value === target) {
        builder.emit({
          kind: 'found',
          description: `Found ${target} at index ${mid} — ${builder.metrics.comparisons} comparisons, ${Math.log2(mid + 1) | 0} gallop hops.`,
          highlight: { success: [mid], primary: [mid] },
          badges: { target, index: mid },
          pseudocodeLine: 4,
          codeLine: 5,
          data: { target, index: mid },
          weight: 2.8,
        });
        return finish({
          builder,
          spec,
          input,
          run,
          result: { headline: `Found at index ${mid}`, detail: `${builder.metrics.comparisons} comparisons`, output: mid },
        });
      }

      if (value < target) {
        for (let i = lo; i <= mid; i += 1) if (!eliminated.includes(i)) eliminated.push(i);
        lo = mid + 1;
        builder.emit({
          kind: 'info',
          description: `${value} < ${target} — discard the left half of the bracket.`,
          highlight: { muted: [...eliminated] },
          badges: { target, range: `${lo}–${hi}` },
          pseudocodeLine: 5,
          codeLine: 9,
          weight: 0.8,
        });
      } else {
        for (let i = mid; i <= hi; i += 1) if (!eliminated.includes(i)) eliminated.push(i);
        hi = mid - 1;
        builder.emit({
          kind: 'info',
          description: `${value} > ${target} — discard the right half of the bracket.`,
          highlight: { muted: [...eliminated] },
          badges: { target, range: `${lo}–${hi}` },
          pseudocodeLine: 5,
          codeLine: 10,
          weight: 0.8,
        });
      }
      mid = null;
    }

    builder.emit({
      kind: 'not-found',
      description: `${target} is not in the bracketed range — not present.`,
      highlight: { danger: Array.from({ length: n }, (_, i) => i) },
      badges: { target, comparisons: builder.metrics.comparisons },
      pseudocodeLine: 6,
      codeLine: 12,
      weight: 2.4,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: 'Not found', detail: `${builder.metrics.comparisons} comparisons`, output: -1 },
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SearchData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: BarVisualizer });
