import { defineModule } from '@/types';
import type { AlgorithmDefinition, CallSnapshot } from '@/types';
import { code, defineAlgorithm, finish, numberOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { CallVisualizer } from '@/visualizers/CallVisualizer';
import { CallModel, callBuilder } from './kit';
import { COMPLEXITY, numberInput } from './specs';

/**
 * Factorial — the smallest useful recursion.
 *
 * One call per level, and the multiplication happens on the way *back up*: the
 * first frame to return is the deepest one. That ordering is the whole lesson,
 * and the call-stack panel shows it directly.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
const spec: AlgorithmSpec<CallSnapshot, { call: string }> = {
  id: 'factorial',
  complexity: COMPLEXITY.factorial!,
  pseudocode: pseudo(`
#factorial(n)
# if n ≤ 1
#   return 1             ← base case
# sub ← factorial(n − 1)  ← recurse deeper
# return n × sub         ← unwind, multiplying`),
  code: code(
    `
function factorial(n) {
  if (n <= 1) return 1;
  const sub = factorial(n - 1);
  return n * sub;
}`,
    `
def factorial(n):
    if n <= 1:
        return 1
    sub = factorial(n - 1)
    return n * sub`,
    `
long long factorial(int n) {
  if (n <= 1) return 1;
  long long sub = factorial(n - 1);
  return n * sub;
}`,
    `
static long factorial(int n) {
  if (n <= 1) return 1;
  long sub = factorial(n - 1);
  return n * sub;
}`,
  ),
  explanation: [
    'Factorial is recursion reduced to its bones: n! needs (n−1)!, so the function calls itself with a smaller argument until it reaches the base case.',
    'Nothing is multiplied until the calls start returning. The deepest frame (n = 1) returns first, and each waiting frame multiplies its own n by the value that came back.',
    'The stack depth equals n, and every frame stays alive because each still has a multiplication to perform — which is why this costs O(n) space, not O(1).',
  ],
  defaultInput: numberInput(6),
  generate: (input, run) => {
    const n = Math.max(1, Math.min(12, Math.floor(numberOf(input, 6))));
    const model = new CallModel();
    const builder = callBuilder(model);
    let calls = 0;

    builder.emit({
      kind: 'init',
      description: `factorial(${n}) — ${n - 1} multiplications, performed on the way back up.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    const walk = (value: number): number => {
      calls += 1;
      model.flushReturned();
      const id = model.enter(`factorial(${value})`, value <= 1 ? 'base case' : `n = ${value}`);
      model.setLocals([{ name: 'n', value: String(value) }]);

      builder.emit({
        kind: 'recurse',
        description:
          value <= 1
            ? `factorial(${value}) hits the base case — the chain stops here.`
            : `Push factorial(${value}); it cannot finish until factorial(${value - 1}) does.`,
        pseudocodeLine: value <= 1 ? 1 : 3,
        codeLine: value <= 1 ? 1 : 2,
        bump: 'calls',
        weight: value <= 1 ? 1.8 : 1.2,
        data: { call: `factorial(${value})` },
      });

      if (value <= 1) {
        model.leave(id, '1');
        builder.emit({
          kind: 'return',
          description: 'Return 1 — the first frame to unwind.',
          pseudocodeLine: 2,
          codeLine: 1,
          weight: 1.6,
          data: { call: `factorial(${value})` },
        });
        return 1;
      }

      const sub = walk(value - 1);
      const product = value * sub;
      model.setLocals([
        { name: 'n', value: String(value) },
        { name: 'sub', value: String(sub) },
      ]);
      model.leave(id, String(sub));
      builder.emit({
        kind: 'return',
        description: `factorial(${value - 1}) returned ${sub}; ${value} × ${sub} = ${product}.`,
        pseudocodeLine: 4,
        codeLine: 3,
        weight: 1.7,
        bump: 'reads',
        data: { call: `factorial(${value})` },
      });
      return product;
    };

    const result = walk(n);
    model.setLocals([{ name: `factorial(${n})`, value: String(result) }]);

    model.reset();

    builder.emit({
      kind: 'complete',
      description: `${n}! = ${result} — ${calls} calls, maximum depth ${n}.`,
      pseudocodeLine: 4,
      codeLine: 3,
      weight: 3,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: `${n}! = ${result}`, detail: `${calls} calls deep`, output: result },
      expectedState: () => result === iterativeFactorial(n),
    });
  },
};

/** Independent implementation used only to verify the recursive answer. */
function iterativeFactorial(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

export const definition: AlgorithmDefinition<CallSnapshot, { call: string }> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: CallVisualizer });
