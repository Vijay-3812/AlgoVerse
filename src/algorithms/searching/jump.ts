import type { AlgorithmDefinition, ArraySnapshot } from '@/types';
import { BarModel, code, defineAlgorithm, finish, pseudo, targetOf, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { BarVisualizer } from '@/visualizers/BarVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SEARCH_DEFAULT_INPUT } from './specs';
import type { SearchData } from './linear';

/**
 * Jump Search — √n blocks then a linear scan inside one block.
 *
 * The visual is a two-phase motion: big square-root hops to find the block that
 * could contain the target, then a short walk through that block. It is the
 * cheapest way to show *why* √n blocks is optimal: skipping fewer blocks costs
 * more per-block scanning; skipping more costs more hops.
 */
const spec: AlgorithmSpec<ArraySnapshot, SearchData> = {
  id: 'jump-search',
  complexity: COMPLEXITY.jump!,
  pseudocode: pseudo(`
#jumpSearch(A, target)          ▸ sorted
#   step ← ⌊√n⌋
#   prev ← 0
#   while A[min(step, n) − 1] < target
#     prev ← step, step ← step + ⌊√n⌋
#     if prev ≥ n: return −1
#   while A[prev] < target
#     prev ← prev + 1
#     if prev = min(step, n): return −1
#   if A[prev] = target: return prev
#   return −1`),
  code: code(
    `
function jumpSearch(a, target) {
  const n = a.length, block = Math.floor(Math.sqrt(n));
  let prev = 0, step = block;
  while (a[Math.min(step, n) - 1] < target) {
    prev = step;
    step += block;
    if (prev >= n) return -1;
  }
  while (a[prev] < target) {
    prev++;
    if (prev === Math.min(step, n)) return -1;
  }
  return a[prev] === target ? prev : -1;
}`,
    `
def jump_search(a, target):
    n = len(a)
    block = int(math.sqrt(n))
    prev, step = 0, block
    while a[min(step, n) - 1] < target:
        prev, step = step, step + block
        if prev >= n:
            return -1
    while a[prev] < target:
        prev += 1
        if prev == min(step, n):
            return -1
    return prev if a[prev] == target else -1`,
    `
int jumpSearch(const vector<int>& a, int target) {
  int n = (int)a.size(), block = (int)sqrt(n);
  int prev = 0, step = block;
  while (a[min(step, n) - 1] < target) {
    prev = step;
    step += block;
    if (prev >= n) return -1;
  }
  while (a[prev] < target) {
    prev++;
    if (prev == min(step, n)) return -1;
  }
  return a[prev] == target ? prev : -1;
}`,
    `
static int jumpSearch(int[] a, int target) {
  int n = a.length, block = (int) Math.sqrt(n);
  int prev = 0, step = block;
  while (a[Math.min(step, n) - 1] < target) {
    prev = step;
    step += block;
    if (prev >= n) return -1;
  }
  while (a[prev] < target) {
    prev++;
    if (prev == Math.min(step, n)) return -1;
  }
  return a[prev] == target ? prev : -1;
}`,
  ),
  explanation: [
    'Jump search hops in fixed √n blocks until the block that must contain the target is found, then scans that block linearly.',
    'Total work is ≈ √n hops + √n comparisons inside the last block — still O(√n), but with tiny constants.',
    'It beats linear search on huge arrays and avoids binary search’s random-access pattern (useful for slow seeks).',
  ],
  learn: {
    useCases: ['Sorted data on seek-heavy storage (tapes, big files)', 'Teaching the block/√n trade-off', 'Fixed-block pagination lookups'],
  },
  defaultInput: SEARCH_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new BarModel(valuesOf(input));
    const target = targetOf(input) ?? model.at(0);
    const n = model.length;
    const block = Math.max(1, Math.floor(Math.sqrt(n)));

    let prev = 0;
    let step = block;
    let scanning = false;
    const eliminated: number[] = [];

    const builder = new TraceBuilder<ArraySnapshot, SearchData>(() =>
      model.snapshot({
        pointers: [
          { name: 'block', index: Math.min(step, n) - 1, role: 'pivot' },
          { name: 'prev', index: prev, role: 'active' },
        ],
        window: scanning ? [prev, Math.min(step, n) - 1] : [prev, Math.min(step, n) - 1],
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Jump search for ${target}: block size ⌊√${n}⌋ = ${block}.`,
      badges: { target, block },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    while (Math.min(step, n) - 1 < n && model.at(Math.min(step, n) - 1) < target) {
      builder.emit({
        kind: 'probe',
        description: `Block end A[${Math.min(step, n) - 1}] = ${model.at(Math.min(step, n) - 1)} < ${target} — hop forward.`,
        highlight: { primary: [Math.min(step, n) - 1], tertiary: [prev] },
        badges: { target, block, hop: step / block },
        pseudocodeLine: 3,
        codeLine: 3,
        data: { target, index: Math.min(step, n) - 1 },
        bump: ['comparisons', 'reads'],
        weight: 1.2,
      });

      for (let i = prev; i < Math.min(step, n); i += 1) eliminated.push(i);
      prev = step;
      step += block;

      if (prev >= n) {
        builder.emit({
          kind: 'not-found',
          description: `${target} lies beyond the last block — not present.`,
          highlight: { danger: Array.from({ length: n }, (_, i) => i) },
          badges: { target },
          pseudocodeLine: 5,
          codeLine: 5,
          weight: 2.4,
        });
        return finish({
          builder,
          spec,
          input,
          run,
          result: { headline: 'Not found', detail: `${builder.metrics.comparisons} comparisons`, output: -1 },
        });
      }
    }

    scanning = true;
    builder.emit({
      kind: 'info',
      description: `Target must be inside block [${prev}..${Math.min(step, n) - 1}] — scan it linearly.`,
      highlight: { muted: [...eliminated], tertiary: [prev] },
      badges: { target, block: `[${prev}..${Math.min(step, n) - 1}]` },
      pseudocodeLine: 6,
      codeLine: 7,
      weight: 1.4,
    });

    while (prev < n && model.at(prev) < target) {
      builder.emit({
        kind: 'compare',
        description: `A[${prev}] = ${model.at(prev)} < ${target} — keep scanning.`,
        highlight: { primary: [prev], muted: [...eliminated] },
        badges: { target, i: prev },
        pseudocodeLine: 7,
        codeLine: 9,
        data: { target, index: prev },
        bump: ['comparisons', 'reads'],
        weight: 0.7,
      });
      prev += 1;
      if (prev === Math.min(step, n) && prev < n) {
        builder.emit({
          kind: 'not-found',
          description: `Scan left the block without finding ${target}.`,
          highlight: { danger: Array.from({ length: n }, (_, i) => i) },
          badges: { target },
          pseudocodeLine: 9,
          codeLine: 11,
          weight: 2.2,
        });
        return finish({
          builder,
          spec,
          input,
          run,
          result: { headline: 'Not found', detail: `${builder.metrics.comparisons} comparisons`, output: -1 },
        });
      }
    }

    const found = prev < n && model.at(prev) === target;
    if (found) {
      builder.emit({
        kind: 'found',
        description: `A[${prev}] = ${target} — found after ${builder.metrics.comparisons} comparisons.`,
        highlight: { success: [prev], primary: [prev] },
        badges: { target, index: prev },
        pseudocodeLine: 10,
        codeLine: 12,
        data: { target, index: prev },
        weight: 2.8,
      });
      return finish({
        builder,
        spec,
        input,
        run,
        result: { headline: `Found at index ${prev}`, detail: `${builder.metrics.comparisons} comparisons`, output: prev },
      });
    }

    builder.emit({
      kind: 'not-found',
      description: `Block ended without a match — ${target} is not present.`,
      highlight: { danger: prev < n ? [prev] : Array.from({ length: n }, (_, i) => i) },
      badges: { target },
      pseudocodeLine: 10,
      codeLine: 13,
      weight: 2.2,
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
