import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, pseudo, targetOf, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SEARCH_DEFAULT_INPUT } from './specs';
import type { SearchData } from './linear';

/**
 * Interpolation Search.
 *
 * Instead of always probing the middle, it *guesses* where the target should be
 * by assuming the values are uniformly spread:
 *
 *     pos = lo + ⌊(target − A[lo]) · (hi − lo) / (A[hi] − A[lo])⌋
 *
 * The guess pointer visibly lands right next to the target on uniform data
 * (hence O(log log n)) — and the explanation tab warns that skewed data turns
 * this same logic into a linear scan, which is the honest O(n) worst case.
 */
const spec: AlgorithmSpec<ArraySnapshot, SearchData> = {
  id: 'interpolation-search',
  complexity: COMPLEXITY.interpolation!,
  pseudocode: pseudo(`
#interpolationSearch(A, target)   ▸ sorted
#   lo ← 0, hi ← n − 1
#   while lo ≤ hi and A[lo] ≤ target ≤ A[hi]
#     pos ← lo + (target − A[lo]) · (hi − lo) / (A[hi] − A[lo])
#     if A[pos] = target: return pos
#     if A[pos] < target: lo ← pos + 1
#     else: hi ← pos − 1
#   return −1`),
  code: code(
    `
function interpolationSearch(a, target) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi && target >= a[lo] && target <= a[hi]) {
    const pos = lo + Math.floor(((target - a[lo]) * (hi - lo)) / (a[hi] - a[lo] || 1));
    if (a[pos] === target) return pos;
    if (a[pos] < target) lo = pos + 1;
    else hi = pos - 1;
  }
  return -1;
}`,
    `
def interpolation_search(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi and a[lo] <= target <= a[hi]:
        span = a[hi] - a[lo] or 1
        pos = lo + ((target - a[lo]) * (hi - lo)) // span
        if a[pos] == target:
            return pos
        if a[pos] < target:
            lo = pos + 1
        else:
            hi = pos - 1
    return -1`,
    `
int interpolationSearch(const vector<int>& a, int target) {
  int lo = 0, hi = (int)a.size() - 1;
  while (lo <= hi && target >= a[lo] && target <= a[hi]) {
    int span = (a[hi] - a[lo]) ? a[hi] - a[lo] : 1;
    int pos = lo + (int)(((long long)(target - a[lo]) * (hi - lo)) / span);
    if (a[pos] == target) return pos;
    if (a[pos] < target) lo = pos + 1;
    else hi = pos - 1;
  }
  return -1;
}`,
    `
static int interpolationSearch(int[] a, int target) {
  int lo = 0, hi = a.length - 1;
  while (lo <= hi && target >= a[lo] && target <= a[hi]) {
    int span = (a[hi] - a[lo]) != 0 ? a[hi] - a[lo] : 1;
    int pos = lo + (int) (((long) (target - a[lo]) * (hi - lo)) / span);
    if (a[pos] == target) return pos;
    if (a[pos] < target) lo = pos + 1;
    else hi = pos - 1;
  }
  return -1;
}`,
  ),
  explanation: [
    'Interpolation search treats the sorted array as a straight line and solves for the target’s position algebraically.',
    'On uniformly distributed keys it converges in O(log log n) — about 3–4 probes where binary search needs 20.',
    'The catch: the linear assumption. On skewed or clustered data the probe can creep one index at a time, giving O(n).',
  ],
  learn: {
    useCases: [
      'Uniform keys: phone directories, sequential ids, timestamps.',
      'Read-once numeric indexes where probes are expensive.',
    ],
    quiz: [
      {
        question: 'Why is the worst case O(n) rather than O(log n)?',
        options: [
          'Because the array is unsorted',
          'Because a bad guess can shrink the bracket by only one element per step',
          'Because of integer overflow',
          'It is O(log n) in all cases',
        ],
        answer: 1,
        why: 'Exponentially growing values make the formula land near `lo`, advancing the bracket by one index at a time.',
      },
    ],
  },
  defaultInput: SEARCH_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const target = targetOf(input) ?? model.at(0);
    const n = model.length;

    let lo = 0;
    let hi = n - 1;
    let pos: number | null = null;
    const eliminated: number[] = [];

    const builder = new TraceBuilder<ArraySnapshot, SearchData>(() =>
      model.snapshot({
        pointers: [
          { name: 'lo', index: lo, role: 'active' },
          { name: 'hi', index: hi, role: 'active' },
          ...(pos !== null ? [{ name: 'pos', index: pos, role: 'compare' as const }] : []),
        ],
        window: [lo, Math.max(lo, hi)],
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Interpolation search for ${target} — guess the position from the value range.`,
      badges: { target, range: `${model.at(0)}–${model.at(n - 1)}` },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    while (lo <= hi && target >= model.at(lo) && target <= model.at(hi)) {
      const loValue = model.at(lo);
      const hiValue = model.at(hi);
      const span = hiValue - loValue === 0 ? 1 : hiValue - loValue;
      pos = Math.min(hi, Math.max(lo, lo + Math.floor(((target - loValue) * (hi - lo)) / span)));

      builder.emit({
        kind: 'probe',
        description: `${target} sits ${Math.round(((target - loValue) / span) * 100)}% along [${lo}..${hi}] → guess index ${pos}.`,
        highlight: { tertiary: [pos], primary: [lo, hi], muted: [...eliminated] },
        badges: { target, pos },
        pseudocodeLine: 3,
        codeLine: 3,
        data: { target, index: pos },
        bump: ['reads'],
        weight: 1.3,
      });

      const value = model.at(pos);
      builder.emit({
        kind: 'compare',
        description: `A[${pos}] = ${value} — compare with ${target}.`,
        highlight: { primary: [pos], muted: [...eliminated] },
        badges: { target, pos },
        pseudocodeLine: 4,
        codeLine: 4,
        data: { target, index: pos },
        bump: ['comparisons'],
        weight: 1.1,
      });

      if (value === target) {
        builder.emit({
          kind: 'found',
          description: `Found ${target} at index ${pos} in ${builder.metrics.comparisons} comparisons.`,
          highlight: { success: [pos], primary: [pos] },
          badges: { target, index: pos },
          pseudocodeLine: 5,
          codeLine: 5,
          data: { target, index: pos },
          weight: 2.8,
        });
        return finish({
          builder,
          spec,
          input,
          run,
          result: { headline: `Found at index ${pos}`, detail: `${builder.metrics.comparisons} comparisons`, output: pos },
        });
      }

      if (value < target) {
        for (let i = lo; i <= pos; i += 1) if (!eliminated.includes(i)) eliminated.push(i);
        lo = pos + 1;
        builder.emit({
          kind: 'info',
          description: `Guess was too low — search [${lo}..${hi}].`,
          highlight: { muted: [...eliminated] },
          badges: { target, range: `${lo}–${hi}` },
          pseudocodeLine: 6,
          codeLine: 6,
          weight: 0.9,
        });
      } else {
        for (let i = pos; i <= hi; i += 1) if (!eliminated.includes(i)) eliminated.push(i);
        hi = pos - 1;
        builder.emit({
          kind: 'info',
          description: `Guess was too high — search [${lo}..${hi}].`,
          highlight: { muted: [...eliminated] },
          badges: { target, range: `${lo}–${hi}` },
          pseudocodeLine: 7,
          codeLine: 7,
          weight: 0.9,
        });
      }
      pos = null;
    }

    builder.emit({
      kind: 'not-found',
      description: `${target} is outside the remaining range [${lo}..${hi}] — not present.`,
      highlight: { danger: Array.from({ length: n }, (_, i) => i) },
      badges: { target, probes: builder.metrics.comparisons },
      pseudocodeLine: 7,
      codeLine: 8,
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
