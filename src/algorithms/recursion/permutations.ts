import { defineModule } from '@/types';
import type { AlgorithmDefinition, CallSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { CallVisualizer } from '@/visualizers/CallVisualizer';
import { CallModel, callBuilder } from './kit';
import { COMPLEXITY } from './specs';

/**
 * Permutations by swap-and-recurse — factorial growth you can watch.
 *
 * Instead of a result array plus a used-flag, this version swaps in place: the
 * prefix `[0, i)` is already fixed, and the recursion only rearranges the
 * suffix. The backtrack *is* a second swap, which is the whole trick.
 *
 * @pure — identical input + run ⇒ identical trace.
 */

interface PermData {
  readonly call: string;
  readonly perm?: readonly number[];
  readonly emitted?: readonly (readonly number[])[];
  readonly swapped?: readonly [number, number];
}

const spec: AlgorithmSpec<CallSnapshot, PermData> = {
  id: 'permutations',
  complexity: COMPLEXITY.permutations!,
  pseudocode: pseudo(`
#permute(i)
# if i = n − 1
#   emit a[]              ← a full permutation
#   return
# for j from i to n − 1
#   swap(a[i], a[j])      ← fix a[j] at position i
#   permute(i + 1)
#   swap(a[i], a[j])      ← backtrack: restore the array`),
  code: code(
    `
function permute(i, a, out) {
  if (i === a.length - 1) {
    out.push([...a]);
    return;
  }
  for (let j = i; j < a.length; j++) {
    [a[i], a[j]] = [a[j], a[i]];
    permute(i + 1, a, out);
    [a[i], a[j]] = [a[j], a[i]];
  }
}`,
    `
def permute(i, a, out):
    if i == len(a) - 1:
        out.append(list(a))
        return
    for j in range(i, len(a)):
        a[i], a[j] = a[j], a[i]
        permute(i + 1, a, out)
        a[i], a[j] = a[j], a[i]`,
    `
void permute(size_t i, vector<int>& a, vector<vector<int>>& out) {
  if (i + 1 == a.size()) { out.push_back(a); return; }
  for (size_t j = i; j < a.size(); ++j) {
    std::swap(a[i], a[j]);
    permute(i + 1, a, out);
    std::swap(a[i], a[j]);
  }
}`,
    `
static void permute(int i, int[] a, List<int[]> out) {
  if (i == a.length - 1) { out.add(a.clone()); return; }
  for (int j = i; j < a.length; j++) {
    int t = a[i]; a[i] = a[j]; a[j] = t;
    permute(i + 1, a, out);
    t = a[i]; a[i] = a[j]; a[j] = t;
  }
}`,
  ),
  explanation: [
    'Position i gets every remaining element in turn. That is the loop; the recursion then fixes position i+1, and so on until the last position, which is forced.',
    'The array is rearranged in place, so the two swaps around the recursive call are the enter/exit of a branch. If the second swap is forgotten the algorithm is simply wrong.',
    'The number of leaves is n!, so even 8 elements is 40 320 outputs. Choosing the element to place *first* is a design decision — placing it last gives the same count but a different, sometimes clearer, order.',
  ],
  defaultInput: () => ({ kind: 'array', values: [1, 2, 3, 4] }),
  generate: (input, run) => {
    // Six elements already produce 720 leaves — the readable ceiling. A numeric
    // input means "permute the first n natural numbers".
    const source = input.kind === 'number' ? natural(input.value) : valuesOf(input);
    const values = (source.length > 0 ? source : [1, 2, 3, 4]).slice(0, 6);
    const a = [...values];
    const n = a.length;
    const emitted: number[][] = [];

    const model = new CallModel();
    const builder = callBuilder<PermData>(model);

    builder.emit({
      kind: 'init',
      description: `${n} elements ⇒ ${n}! = ${factorial(n)} permutations to emit.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    const walk = (i: number): void => {
      model.flushReturned();
      const id = model.enter(`permute(${i})`, `fixed prefix [${a.slice(0, i).join(', ')}]`);
      model.setLocals([
        { name: 'i', value: String(i) },
        { name: 'a', value: `[${a.join(', ')}]` },
      ]);

      builder.emit({
        kind: 'recurse',
        description:
          i === n - 1
            ? `Nothing left to permute — prefix + last element is a complete arrangement.`
            : `Position ${i} receives each of ${n - i} remaining elements in turn.`,
        pseudocodeLine: i === n - 1 ? 1 : 3,
        codeLine: i === n - 1 ? 1 : 5,
        bump: 'calls',
        weight: i === n - 1 ? 1.7 : 1.1,
        data: { call: `permute(${i})`, perm: [...a] },
      });

      if (i === n - 1) {
        emitted.push([...a]);
        builder.emit({
          kind: 'sorted',
          description: `Emit permutation #${emitted.length}: [${a.join(', ')}].`,
          pseudocodeLine: 2,
          codeLine: 2,
          weight: 1.7,
          bump: 'writes',
          data: { call: 'emit', perm: [...a], emitted: emitted.map((perm) => [...perm]) },
        });
        model.leave(id, `[${a.join(',')}]`);
        return;
      }

      for (let j = i; j < n; j += 1) {
        const left = a[i] as number;
        const right = a[j] as number;
        a[i] = right;
        a[j] = left;

        builder.emit({
          kind: 'swap',
          description: `Swap positions ${i} and ${j} — ${right} takes slot ${i}.`,
          pseudocodeLine: 4,
          codeLine: 4,
          weight: 1.25,
          bump: 'swaps',
          data: { call: `swap(${i}, ${j})`, perm: [...a], swapped: [i, j] },
        });

        walk(i + 1);

        a[i] = left;
        a[j] = right;
        builder.emit({
          kind: 'backtrack',
          description: `Swap back (${i} ↔ ${j}) so the next candidate starts from the same array.`,
          pseudocodeLine: 6,
          codeLine: 6,
          weight: 1.3,
          bump: 'swaps',
          data: { call: `unswap(${i}, ${j})`, perm: [...a], swapped: [i, j] },
        });
      }

      model.leave(id);
    };

    walk(0);

    model.reset();

    builder.emit({
      kind: 'complete',
      description: `Emitted all ${emitted.length} permutations of ${n} elements (${n}! = ${factorial(n)}).`,
      pseudocodeLine: 1,
      codeLine: 1,
      weight: 3,
      data: { call: 'done', emitted: emitted.map((perm) => [...perm]) },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `${emitted.length} permutations`,
        detail: `${n}! — factorial growth, not exponential`,
        output: emitted.map((perm) => [...perm]),
      },
      expectedState: () => emitted.length === factorial(n) && a.every((v, k) => v === values[k]),
    });
  },
};

/** `[1, 2, …, n]` — the labels a numeric input stands for. */
function natural(n: number): number[] {
  const count = Math.max(1, Math.min(6, Math.floor(n)));
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** Exact factorial — used for the expected leaf count, never for huge n. */
function factorial(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

export const definition: AlgorithmDefinition<CallSnapshot, PermData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: CallVisualizer });
