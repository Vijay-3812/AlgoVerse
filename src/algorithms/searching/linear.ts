import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, pseudo, targetOf, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SEARCH_DEFAULT_INPUT } from './specs';

export interface SearchData {
  readonly target: number;
  readonly index?: number;
}

/**
 * Linear (sequential) search — the control case.
 *
 * It assumes nothing about the data, which is why it is the only search here
 * that would still work on the shuffled array. The trace keeps a live cursor and
 * a growing set of eliminated indices, so the "scanned prefix" is visible.
 */
const spec: AlgorithmSpec<ArraySnapshot, SearchData> = {
  id: 'linear-search',
  complexity: COMPLEXITY.linear!,
  pseudocode: pseudo(`
#linearSearch(A, target)
#   for i ← 0 to n − 1
#     if A[i] = target
#       return i
#   return −1`),
  code: code(
    `
function linearSearch(a, target) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === target) return i;
  }
  return -1;
}`,
    `
def linear_search(a, target):
    for i, value in enumerate(a):
        if value == target:
            return i
    return -1`,
    `
int linearSearch(const vector<int>& a, int target) {
  for (int i = 0; i < (int)a.size(); ++i) {
    if (a[i] == target) return i;
  }
  return -1;
}`,
    `
static int linearSearch(int[] a, int target) {
  for (int i = 0; i < a.length; i++) {
    if (a[i] == target) return i;
  }
  return -1;
}`,
  ),
  explanation: [
    'Linear search inspects every element in turn until it finds the target — no ordering assumption at all.',
    'Its best case is one comparison (target first), its worst case n (target last or absent).',
    'It is the only search here that works on unsorted data, on linked lists and on streams.',
  ],
  learn: {
    useCases: ['Unsorted data', 'Linked lists (no random access)', 'Tiny n where setup costs dominate'],
    practice: [{ title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/', difficulty: 'easy' }],
  },
  defaultInput: SEARCH_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const target = targetOf(input) ?? model.at(0);
    const n = model.length;

    // Live decoration: the builder re-reads this on every emit.
    let cursor = 0;
    const eliminated: number[] = [];
    const builder = new TraceBuilder<ArraySnapshot, SearchData>(() =>
      model.snapshot({ pointers: [{ name: 'i', index: cursor, role: 'active' }] }),
    );

    builder.emit({
      kind: 'init',
      description: `Linear search for ${target} across ${n} values.`,
      badges: { target },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    for (let i = 0; i < n; i += 1) {
      cursor = i;
      const value = model.at(i);

      builder.emit({
        kind: 'compare',
        description: `Is ${value} equal to ${target}?`,
        highlight: { primary: [i], muted: [...eliminated] },
        badges: { target, probe: i },
        pseudocodeLine: 2,
        codeLine: 2,
        data: { target, index: i },
        bump: ['comparisons', 'reads'],
        weight: 0.7,
      });

      if (value === target) {
        builder.emit({
          kind: 'found',
          description: `Found ${target} at index ${i} after ${i + 1} comparison${i === 0 ? '' : 's'}.`,
          highlight: { success: [i], primary: [i] },
          badges: { target, index: i },
          pseudocodeLine: 3,
          codeLine: 3,
          data: { target, index: i },
          weight: 2.6,
        });
        return finish({
          builder,
          spec,
          input,
          run,
          result: { headline: `Found at index ${i}`, detail: `${i + 1} comparisons`, output: i },
        });
      }

      eliminated.push(i);
      builder.emit({
        kind: 'info',
        description: `No — index ${i} is ruled out.`,
        highlight: { muted: [...eliminated], primary: [i] },
        badges: { target },
        pseudocodeLine: 1,
        codeLine: 1,
        data: { target, index: i },
        weight: 0.35,
      });
    }

    builder.emit({
      kind: 'not-found',
      description: `${target} is not in the array — all ${n} positions checked.`,
      highlight: { danger: Array.from({ length: n }, (_, i) => i) },
      badges: { target, comparisons: builder.metrics.comparisons },
      pseudocodeLine: 4,
      codeLine: 4,
      weight: 2.4,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: 'Not found', detail: `${n} comparisons`, output: -1 },
    });
  },
};

export const definition: AlgorithmDefinition<ArraySnapshot, SearchData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: BarVisualizer });
