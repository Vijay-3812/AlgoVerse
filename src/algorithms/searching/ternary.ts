import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, pseudo, targetOf, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SEARCH_DEFAULT_INPUT } from './specs';
import type { SearchData } from './linear';

/**
 * Ternary Search.
 *
 * Two probes per level split the range into thirds. It needs *more* comparisons
 * than binary search (2·log₃n vs log₂n) — it is included precisely so the
 * comparison counter can show that, and because on strictly unimodal functions
 * it is the right tool rather than the wrong one.
 */
const spec: AlgorithmSpec<ArraySnapshot, SearchData> = {
  id: 'ternary-search',
  complexity: COMPLEXITY.ternary!,
  pseudocode: pseudo(`
#ternarySearch(A, target)         ▸ sorted
#   lo ← 0, hi ← n − 1
#   while lo ≤ hi
#     m1 ← lo + ⌊(hi − lo)/3⌋
#     m2 ← hi − ⌊(hi − lo)/3⌋
#     if A[m1] = target: return m1
#     if A[m2] = target: return m2
#     if target < A[m1]: hi ← m1 − 1
#     elif target > A[m2]: lo ← m2 + 1
#     else: lo ← m1 + 1, hi ← m2 − 1
#   return −1`),
  code: code(
    `
function ternarySearch(a, target) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const third = Math.floor((hi - lo) / 3);
    const m1 = lo + third, m2 = hi - third;
    if (a[m1] === target) return m1;
    if (a[m2] === target) return m2;
    if (target < a[m1]) hi = m1 - 1;
    else if (target > a[m2]) lo = m2 + 1;
    else { lo = m1 + 1; hi = m2 - 1; }
  }
  return -1;
}`,
    `
def ternary_search(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        third = (hi - lo) // 3
        m1, m2 = lo + third, hi - third
        if a[m1] == target:
            return m1
        if a[m2] == target:
            return m2
        if target < a[m1]:
            hi = m1 - 1
        elif target > a[m2]:
            lo = m2 + 1
        else:
            lo, hi = m1 + 1, m2 - 1
    return -1`,
    `
int ternarySearch(const vector<int>& a, int target) {
  int lo = 0, hi = (int)a.size() - 1;
  while (lo <= hi) {
    int third = (hi - lo) / 3;
    int m1 = lo + third, m2 = hi - third;
    if (a[m1] == target) return m1;
    if (a[m2] == target) return m2;
    if (target < a[m1]) hi = m1 - 1;
    else if (target > a[m2]) lo = m2 + 1;
    else { lo = m1 + 1; hi = m2 - 1; }
  }
  return -1;
}`,
    `
static int ternarySearch(int[] a, int target) {
  int lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    int third = (hi - lo) / 3;
    int m1 = lo + third, m2 = hi - third;
    if (a[m1] == target) return m1;
    if (a[m2] == target) return m2;
    if (target < a[m1]) hi = m1 - 1;
    else if (target > a[m2]) lo = m2 + 1;
    else { lo = m1 + 1; hi = m2 - 1; }
  }
  return -1;
}`,
  ),
  explanation: [
    'Ternary search probes two points that cut the range into thirds and keeps only the third that can hold the target.',
    'Each level removes 2/3 of the range, but costs two comparisons — so on plain lookups it loses to binary search.',
    'Its real home is optimising strictly unimodal (single-peak) functions, where the same two probes reveal which side the optimum is on.',
  ],
  learn: {
    useCases: ['Unimodal function optimisation', 'Peak-finding on a bitonic array', 'Teaching the comparisons-per-level trade-off'],
    practice: [{ title: 'Find Peak Element', url: 'https://leetcode.com/problems/find-peak-element/', difficulty: 'medium' }],
  },
  defaultInput: SEARCH_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const target = targetOf(input) ?? model.at(0);
    const n = model.length;

    let lo = 0;
    let hi = n - 1;
    let m1 = 0;
    let m2 = 0;
    const eliminated: number[] = [];

    const builder = new TraceBuilder<ArraySnapshot, SearchData>(() =>
      model.snapshot({
        pointers: [
          { name: 'lo', index: lo, role: 'active' },
          { name: 'm1', index: m1, role: 'compare' },
          { name: 'm2', index: m2, role: 'compare' },
          { name: 'hi', index: hi, role: 'active' },
        ],
        window: [lo, Math.max(lo, hi)],
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Ternary search for ${target}: two probes split the range into thirds.`,
      badges: { target },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    while (lo <= hi) {
      const third = Math.floor((hi - lo) / 3);
      m1 = lo + third;
      m2 = hi - third;

      builder.emit({
        kind: 'info',
        description: `Range [${lo}..${hi}] — probe A[${m1}] and A[${m2}].`,
        highlight: { muted: [...eliminated] },
        badges: { target, range: `${lo}–${hi}` },
        pseudocodeLine: 2,
        codeLine: 2,
        weight: 0.8,
      });

      const v1 = model.at(m1);
      builder.emit({
        kind: 'compare',
        description: `First probe: A[${m1}] = ${v1}.`,
        highlight: { primary: [m1], tertiary: [m2], muted: [...eliminated] },
        badges: { target, m1 },
        pseudocodeLine: 3,
        codeLine: 4,
        data: { target, index: m1 },
        bump: ['comparisons', 'reads'],
        weight: 1,
      });

      if (v1 === target) {
        m2 = m1;
        builder.emit({
          kind: 'found',
          description: `A[${m1}] = ${target} — found with ${builder.metrics.comparisons} comparisons.`,
          highlight: { success: [m1], primary: [m1] },
          badges: { target, index: m1 },
          pseudocodeLine: 4,
          codeLine: 5,
          data: { target, index: m1 },
          weight: 2.8,
        });
        return finish({
          builder,
          spec,
          input,
          run,
          result: { headline: `Found at index ${m1}`, detail: `${builder.metrics.comparisons} comparisons`, output: m1 },
        });
      }

      const v2 = model.at(m2);
      builder.emit({
        kind: 'compare',
        description: `Second probe: A[${m2}] = ${v2}.`,
        highlight: { primary: [m2], tertiary: [m1], muted: [...eliminated] },
        badges: { target, m2 },
        pseudocodeLine: 5,
        codeLine: 6,
        data: { target, index: m2 },
        bump: ['comparisons', 'reads'],
        weight: 1,
      });

      if (v2 === target) {
        builder.emit({
          kind: 'found',
          description: `A[${m2}] = ${target} — found with ${builder.metrics.comparisons} comparisons.`,
          highlight: { success: [m2], primary: [m2] },
          badges: { target, index: m2 },
          pseudocodeLine: 6,
          codeLine: 7,
          data: { target, index: m2 },
          weight: 2.8,
        });
        return finish({
          builder,
          spec,
          input,
          run,
          result: { headline: `Found at index ${m2}`, detail: `${builder.metrics.comparisons} comparisons`, output: m2 },
        });
      }

      if (target < v1) {
        for (let i = m1; i <= hi; i += 1) if (!eliminated.includes(i)) eliminated.push(i);
        hi = m1 - 1;
        builder.emit({
          kind: 'info',
          description: `${target} < ${v1} — keep the first third [${lo}..${hi}].`,
          highlight: { muted: [...eliminated] },
          badges: { target, range: `${lo}–${hi}` },
          pseudocodeLine: 7,
          codeLine: 8,
          weight: 0.9,
        });
      } else if (target > v2) {
        for (let i = lo; i <= m2; i += 1) if (!eliminated.includes(i)) eliminated.push(i);
        lo = m2 + 1;
        builder.emit({
          kind: 'info',
          description: `${target} > ${v2} — keep the last third [${lo}..${hi}].`,
          highlight: { muted: [...eliminated] },
          badges: { target, range: `${lo}–${hi}` },
          pseudocodeLine: 8,
          codeLine: 9,
          weight: 0.9,
        });
      } else {
        for (let i = lo; i <= m1; i += 1) if (!eliminated.includes(i)) eliminated.push(i);
        for (let i = m2; i <= hi; i += 1) if (!eliminated.includes(i)) eliminated.push(i);
        lo = m1 + 1;
        hi = m2 - 1;
        builder.emit({
          kind: 'info',
          description: `${v1} < ${target} < ${v2} — keep only the middle third [${lo}..${hi}].`,
          highlight: { muted: [...eliminated] },
          badges: { target, range: `${lo}–${hi}` },
          pseudocodeLine: 9,
          codeLine: 10,
          weight: 1,
        });
      }
    }

    builder.emit({
      kind: 'not-found',
      description: `All thirds eliminated — ${target} is not present.`,
      highlight: { danger: Array.from({ length: n }, (_, i) => i) },
      badges: { target, comparisons: builder.metrics.comparisons },
      pseudocodeLine: 10,
      codeLine: 11,
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
