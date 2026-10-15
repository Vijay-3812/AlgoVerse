import { defineModule } from '@/types';
import type { AlgorithmDefinition, TableSnapshot } from '@/types';
import { code, defineAlgorithm, finish, numberOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { TableVisualizer } from '@/visualizers/TableVisualizer';
import { TableModel } from './kit';
import { COMPLEXITY } from './specs';

/**
 * Fibonacci by tabulation — the smallest DP table worth drawing.
 *
 * Every cell reads the two before it, so the dependency arrows form a chain and
 * the whole point of memoisation becomes visible: each subproblem is solved
 * exactly once, in order, with no recursion and no repeated work.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
interface FibData {
  readonly op: 'init' | 'read' | 'write' | 'done';
}

const spec: AlgorithmSpec<TableSnapshot, FibData> = {
  id: 'dp-fibonacci',
  complexity: COMPLEXITY['dp-fibonacci']!,
  pseudocode: pseudo(`
#fib(n)
# dp[0] ← 0; dp[1] ← 1        ← the two base cases
# for i ← 2 to n
#   dp[i] ← dp[i − 1] + dp[i − 2]
# return dp[n]`),
  code: code(
    `
function fib(n) {
  const dp = [0, 1];
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}`,
    `
def fib(n):
    dp = [0, 1]
    for i in range(2, n + 1):
        dp.append(dp[i - 1] + dp[i - 2])
    return dp[n]`,
    `
long long fib(int n) {
  vector<long long> dp(n + 1, 0);
  dp[1] = 1;
  for (int i = 2; i <= n; ++i)
    dp[i] = dp[i - 1] + dp[i - 2];
  return dp[n];
}`,
    `
static long fib(int n) {
  long[] dp = new long[n + 1];
  dp[1] = 1;
  for (int i = 2; i <= n; i++)
    dp[i] = dp[i - 1] + dp[i - 2];
  return dp[n];
}`,
  ),
  explanation: [
    'The recursion tree solved fib(5) several times over. Tabulation flips the direction: solve the smallest subproblems first and never repeat one.',
    'The loop body reads two already-finished neighbours. Those reads are the arrows in the trace — the entire dependency structure of the recurrence, drawn.',
    'Because only dp[i−1] and dp[i−2] are ever touched, the array can be replaced by two variables. The table is there to make the recurrence legible, not because the memory is needed.',
  ],
  learn: {
    useCases: ['Counting paths in a grid', 'Any recurrence whose state is a suffix or prefix index', 'Warm-up for the 2-D tables'],
    practice: [
      { title: 'Climbing Stairs', url: 'https://leetcode.com/problems/climbing-stairs/', difficulty: 'easy' },
      { title: 'Fibonacci Number', url: 'https://leetcode.com/problems/fibonacci-number/', difficulty: 'easy' },
    ],
  },
  defaultInput: () => ({ kind: 'number', value: 10 }),
  generate: (input, run) => {
    const n = Math.max(4, Math.min(18, Math.floor(numberOf(input, 10))));
    const table = new TableModel({
      rowLabels: ['fib'],
      colLabels: Array.from({ length: n + 1 }, (_, i) => String(i)),
      fill: null,
      rowSub: 'i',
      colSub: 'n',
    });

    let written = 0;
    const builder = new TraceBuilder<TableSnapshot, FibData>(() =>
      table.snapshot({ badges: { n, filled: written } }),
    );

    builder.emit({
      kind: 'init',
      description: `Build fib(0…${n}) left to right — ${n + 1} cells, one addition each.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
      data: { op: 'init' },
    });

    table.set(0, 0, 0, 'sorted');
    table.set(0, 1, 1, 'sorted');
    written += 2;
    builder.emit({
      kind: 'fill',
      description: 'Base cases: fib(0) = 0 and fib(1) = 1.',
      pseudocodeLine: 1,
      codeLine: 1,
      weight: 1.6,
      bump: ['writes', 'writes'],
      data: { op: 'write' },
    });

    for (let i = 2; i <= n; i += 1) {
      table.active = [0, i];
      table.clearDeps();
      table.dep(0, i - 1);
      table.dep(0, i - 2);
      table.mark(0, i - 1, 'compare');
      table.mark(0, i - 2, 'compare');

      const value = table.number(0, i - 1) + table.number(0, i - 2);
      builder.emit({
        kind: 'read',
        description: `fib(${i}) reads fib(${i - 1}) = ${table.number(0, i - 1)} and fib(${i - 2}) = ${table.number(0, i - 2)}.`,
        pseudocodeLine: 3,
        codeLine: 3,
        weight: 1,
        bump: 'reads',
        data: { op: 'read' },
      });

      table.set(0, i, value, 'active');
      written += 1;
      builder.emit({
        kind: 'fill',
        description: `dp[${i}] = ${table.number(0, i - 1)} + ${table.number(0, i - 2)} = ${value}.`,
        pseudocodeLine: 3,
        codeLine: 3,
        weight: 1.3,
        bump: ['writes', 'comparisons'],
        data: { op: 'write' },
      });

      table.clearDeps();
      table.mark(0, i - 1, 'sorted');
      table.mark(0, i - 2, 'sorted');
    }

    table.active = [0, n];
    table.clearRoles(['sorted', 'path']);
    table.setPath(
      Array.from({ length: n + 1 }, (_, i) => [0, i] as [number, number]),
    );

    builder.emit({
      kind: 'complete',
      description: `fib(${n}) = ${table.number(0, n)} — ${n - 1} additions instead of ${2 ** n} recursion-tree calls.`,
      pseudocodeLine: 4,
      codeLine: 5,
      weight: 3,
      data: { op: 'done' },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `fib(${n}) = ${table.number(0, n)}`,
        detail: `${n - 1} additions`,
        output: table.number(0, n),
      },
      expectedState: () => table.number(0, n) === reference(n),
    });
  },
};

/** Independent iterative check. */
function reference(n: number): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return a;
}

export const definition: AlgorithmDefinition<TableSnapshot, FibData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: TableVisualizer });
