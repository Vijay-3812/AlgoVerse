import { defineModule } from '@/types';
import type { AlgorithmDefinition, CallSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { CallVisualizer } from '@/visualizers/CallVisualizer';
import { CallModel, callBuilder } from './kit';
import { COMPLEXITY } from './specs';

/**
 * Subsets (the power set) — include or exclude, one element at a time.
 *
 * The recursion tree *is* the answer: every leaf is one subset, and the depth
 * of the tree is the number of elements. Watching a leaf get printed makes the
 * 2ⁿ count concrete rather than abstract.
 *
 * @pure — identical input + run ⇒ identical trace.
 */

interface SubsetData {
  readonly call: string;
  readonly chosen?: readonly number[];
  readonly output?: readonly (readonly number[])[];
}

const spec: AlgorithmSpec<CallSnapshot, SubsetData> = {
  id: 'subsets',
  complexity: COMPLEXITY.subsets!,
  pseudocode: pseudo(`
#subsets(i, chosen)
# if i = n
#   emit chosen        ← a complete subset
#   return
# chosen.push(a[i])
# subsets(i + 1, chosen)   ← branch: take a[i]
# chosen.pop()
# subsets(i + 1, chosen)   ← branch: skip a[i]`),
  code: code(
    `
function subsets(i, chosen, a, out) {
  if (i === a.length) {
    out.push([...chosen]);
    return;
  }
  chosen.push(a[i]);
  subsets(i + 1, chosen, a, out);
  chosen.pop();
  subsets(i + 1, chosen, a, out);
}`,
    `
def subsets(i, chosen, a, out):
    if i == len(a):
        out.append(list(chosen))
        return
    chosen.append(a[i])
    subsets(i + 1, chosen, a, out)
    chosen.pop()
    subsets(i + 1, chosen, a, out)`,
    `
void subsets(size_t i, vector<int>& chosen, const vector<int>& a, vector<vector<int>>& out) {
  if (i == a.size()) { out.push_back(chosen); return; }
  chosen.push_back(a[i]);
  subsets(i + 1, chosen, a, out);
  chosen.pop_back();
  subsets(i + 1, chosen, a, out);
}`,
    `
static void subsets(int i, List<Integer> chosen, int[] a, List<List<Integer>> out) {
  if (i == a.length) { out.add(new ArrayList<>(chosen)); return; }
  chosen.add(a[i]);
  subsets(i + 1, chosen, a, out);
  chosen.remove(chosen.size() - 1);
  subsets(i + 1, chosen, a, out);
}`,
  ),
  explanation: [
    'For each element there are exactly two futures: it is in the subset, or it is not. The recursion explores both, which is why the tree has 2ⁿ leaves.',
    'The stack panel shows the "chosen" set evolving. When a path reaches index n, the current set is a complete subset and gets emitted before the recursion unwinds.',
    'Pruning is not possible here — the output itself has 2ⁿ items, so any correct algorithm must spend at least that long. The value of the trace is seeing *why* that is inherent.',
  ],
  defaultInput: () => ({ kind: 'array', values: [1, 2, 3, 4] }),
  generate: (input, run) => {
    // Five elements is already 32 leaves — the ceiling on what stays readable.
    // A numeric input means "use the first n natural numbers".
    const source = input.kind === 'number' ? natural(input.value) : valuesOf(input);
    const values = (source.length > 0 ? source : [1, 2, 3, 4]).slice(0, 5);

    const model = new CallModel();
    const builder = callBuilder<SubsetData>(model);
    const chosen: number[] = [];
    const output: number[][] = [];

    builder.emit({
      kind: 'init',
      description: `${values.length} elements ⇒ 2^${values.length} = ${2 ** values.length} subsets to emit.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    const walk = (index: number): void => {
      model.flushReturned();
      const id = model.enter(`subsets(${index})`, `chosen = [${chosen.join(', ')}]`);
      model.setLocals([
        { name: 'i', value: String(index) },
        { name: 'chosen', value: `[${chosen.join(', ')}]` },
      ]);

      builder.emit({
        kind: 'recurse',
        description:
          index === values.length
            ? 'Every element has been decided — this is a complete subset.'
            : `Decide element ${values[index]}: take it, or skip it.`,
        pseudocodeLine: index === values.length ? 1 : 2,
        codeLine: index === values.length ? 1 : 2,
        bump: 'calls',
        weight: index === values.length ? 1.8 : 1.1,
        data: { call: `subsets(${index})`, chosen: [...chosen], output: output.map((set) => [...set]) },
      });

      if (index === values.length) {
        output.push([...chosen]);
        model.setLocals([{ name: 'emit', value: `[${chosen.join(', ')}]` }]);
        builder.emit({
          kind: 'sorted',
          description: `Emit subset #${output.length}: [${chosen.join(', ')}].`,
          pseudocodeLine: 2,
          codeLine: 2,
          weight: 1.7,
          bump: 'writes',
          data: { call: 'emit', chosen: [...chosen], output: output.map((set) => [...set]) },
        });
        model.leave(id, `[${chosen.join(',')}]`);
        return;
      }

      chosen.push(values[index] as number);
      builder.emit({
        kind: 'place',
        description: `Take ${values[index]} — chosen becomes [${chosen.join(', ')}].`,
        pseudocodeLine: 3,
        codeLine: 4,
        weight: 1.2,
        data: { call: `take(${values[index]})`, chosen: [...chosen] },
      });
      walk(index + 1);

      chosen.pop();
      builder.emit({
        kind: 'backtrack',
        description: `Undo: put ${values[index]} back and try the other branch.`,
        pseudocodeLine: 5,
        codeLine: 6,
        weight: 1.3,
        data: { call: `skip(${values[index]})`, chosen: [...chosen] },
      });
      walk(index + 1);

      model.leave(id);
    };

    walk(0);

    model.reset();

    builder.emit({
      kind: 'complete',
      description: `Emitted all ${output.length} subsets of ${values.length} elements.`,
      pseudocodeLine: 1,
      codeLine: 1,
      weight: 3,
      data: { call: 'done', output: output.map((set) => [...set]) },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `${output.length} subsets`,
        detail: `2^${values.length} — the output size is the lower bound`,
        output: output.map((set) => [...set]),
      },
      expectedState: () => output.length === 2 ** values.length,
    });
  },
};

/** `[1, 2, …, n]` — the labels a numeric input stands for. */
function natural(n: number): number[] {
  const count = Math.max(1, Math.min(5, Math.floor(n)));
  return Array.from({ length: count }, (_, i) => i + 1);
}

export const definition: AlgorithmDefinition<CallSnapshot, SubsetData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: CallVisualizer });
