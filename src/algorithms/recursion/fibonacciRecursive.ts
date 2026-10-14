import { defineModule } from '@/types';
import type { AlgorithmDefinition, CallSnapshot } from '@/types';
import { code, defineAlgorithm, finish, numberOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { CallVisualizer } from '@/visualizers/CallVisualizer';
import { CallModel, callBuilder } from './kit';
import { COMPLEXITY, numberInput } from './specs';

/**
 * Naive recursive Fibonacci — the recursion *tree*, not the answer.
 *
 * The point of this visualiser is the shape: fib(5) calls fib(3) twice, fib(2)
 * three times, and the tree doubles roughly every two levels. Watching the same
 * node reappear is the motivation for memoisation, which the DP category then
 * delivers with the same problem.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
const spec: AlgorithmSpec<CallSnapshot, { call: string }> = {
  id: 'fibonacci-recursive',
  complexity: COMPLEXITY.fibonacci!,
  pseudocode: pseudo(`
#fib(n)
# if n ≤ 1
#   return n            ← base cases fib(0)=0, fib(1)=1
# left  ← fib(n − 1)
# right ← fib(n − 2)
# return left + right   ← note the repeated subtrees`),
  code: code(
    `
function fib(n) {
  if (n <= 1) return n;
  const left = fib(n - 1);
  const right = fib(n - 2);
  return left + right;
}`,
    `
def fib(n):
    if n <= 1:
        return n
    left = fib(n - 1)
    right = fib(n - 2)
    return left + right`,
    `
long long fib(int n) {
  if (n <= 1) return n;
  long long left = fib(n - 1);
  long long right = fib(n - 2);
  return left + right;
}`,
    `
static long fib(int n) {
  if (n <= 1) return n;
  long left = fib(n - 1);
  long right = fib(n - 2);
  return left + right;
}`,
  ),
  explanation: [
    'Each call branches into fib(n−1) and fib(n−2), so the recursion tree grows exponentially: the number of calls is about 1.6ⁿ.',
    'The waste is visible in the tree panel — fib(n−2) is recomputed by every node on the left branch. The same subproblem, solved again and again.',
    'Memoising it collapses the tree into n distinct subproblems, which is exactly what the Dynamic Programming → Fibonacci (Tabulation) page does with the same recurrence.',
  ],
  defaultInput: numberInput(5),
  generate: (input, run) => {
    const n = Math.max(1, Math.min(9, Math.floor(numberOf(input, 5))));
    const model = new CallModel();
    const builder = callBuilder(model);
    let calls = 0;
    let recomputed = 0;
    const memoSeen = new Set<number>();

    builder.emit({
      kind: 'init',
      description: `fib(${n}) — watch how often the same n comes back.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    const walk = (value: number): number => {
      calls += 1;
      model.flushReturned();
      const id = model.enter(`fib(${value})`, value <= 1 ? 'base case' : `n = ${value}`);
      model.setLocals([
        { name: 'n', value: String(value) },
        { name: 'calls', value: String(calls) },
      ]);

      const repeated = memoSeen.has(value);
      if (repeated) recomputed += 1;
      memoSeen.add(value);

      builder.emit({
        kind: 'recurse',
        description:
          value <= 1
            ? `fib(${value}) is a base case — return ${value}.`
            : repeated
              ? `fib(${value}) again — this subtree has already been computed once.`
              : `Expand fib(${value}) into fib(${value - 1}) + fib(${value - 2}).`,
        pseudocodeLine: value <= 1 ? 1 : 3,
        codeLine: value <= 1 ? 1 : 2,
        bump: 'calls',
        weight: value <= 1 ? 1.5 : repeated ? 1.4 : 1.2,
        data: { call: `fib(${value})` },
      });

      if (value <= 1) {
        model.leave(id, String(value));
        builder.emit({
          kind: 'return',
          description: `fib(${value}) = ${value}.`,
          pseudocodeLine: 2,
          codeLine: 1,
          weight: 1.2,
          data: { call: `fib(${value})` },
        });
        return value;
      }

      const left = walk(value - 1);
      const right = walk(value - 2);
      const sum = left + right;
      model.setLocals([
        { name: 'n', value: String(value) },
        { name: 'left', value: String(left) },
        { name: 'right', value: String(right) },
      ]);
      model.leave(id, String(sum));
      builder.emit({
        kind: 'return',
        description: `fib(${value}) = ${left} + ${right} = ${sum}.`,
        pseudocodeLine: 5,
        codeLine: 4,
        weight: 1.6,
        bump: 'reads',
        data: { call: `fib(${value})` },
      });
      return sum;
    };

    const result = walk(n);
    model.setLocals([{ name: `fib(${n})`, value: String(result) }]);

    model.reset();

    builder.emit({
      kind: 'complete',
      description: `fib(${n}) = ${result} using ${calls} calls — ${recomputed} of them recomputed a subproblem.`,
      pseudocodeLine: 5,
      codeLine: 4,
      weight: 3,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `fib(${n}) = ${result}`,
        detail: `${calls} calls, ${recomputed} redundant`,
        output: result,
      },
      expectedState: () => result === fibTable(n),
    });
  },
};

/** Iterative reference — the value the recursion must agree with. */
function fibTable(n: number): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return a;
}

export const definition: AlgorithmDefinition<CallSnapshot, { call: string }> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: CallVisualizer });
