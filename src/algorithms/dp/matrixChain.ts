import { defineModule } from '@/types';
import type { AlgorithmDefinition, TableSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { TableVisualizer } from '@/visualizers/TableVisualizer';
import { TableModel } from './kit';
import { COMPLEXITY } from './specs';

/**
 * Matrix Chain Multiplication — where to put the parentheses.
 *
 * `dp[i][j]` is the cheapest way to multiply matrices i…j, which makes the
 * table an upper triangle: shorter chains first, then every split point of
 * every longer chain. Only the *cost* is stored per cell; the split is
 * reconstructed by walking the path back, and that walk is the answer to the
 * question the page asks.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
interface McmData {
  readonly op: 'init' | 'try' | 'best' | 'done';
  readonly i?: number;
  readonly j?: number;
  readonly k?: number;
}

/** Matrix dimensions: matrix i is dims[i] × dims[i+1]. */
const DIMS: readonly number[] = [30, 35, 15, 5, 10, 20, 25];

const spec: AlgorithmSpec<TableSnapshot, McmData> = {
  id: 'matrix-chain-multiplication',
  complexity: COMPLEXITY['matrix-chain-multiplication']!,
  pseudocode: pseudo(`
#matrixChain(dims)
# dp[i][i] ← 0                      ← a single matrix costs nothing to “multiply”
# for len ← 2 to n
#   for i ← 1 to n − len + 1
#     j ← i + len − 1
#     dp[i][j] ← ∞
#     for k ← i to j − 1
#       cost ← dp[i][k] + dp[k+1][j] + dims[i−1] · dims[k] · dims[j]
#       if cost < dp[i][j]: dp[i][j] ← cost; split[i][j] ← k
# walk split[1][n] back to print the parenthesisation`),
  code: code(
    `
function matrixChain(dims) {
  const n = dims.length - 1;
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      dp[i][j] = Infinity;
      for (let k = i; k < j; k++) {
        const cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
        if (cost < dp[i][j]) dp[i][j] = cost;
      }
    }
  }
  return dp[0][n - 1];
}`,
    `
def matrix_chain(dims):
    n = len(dims) - 1
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float("inf")
            for k in range(i, j):
                cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
                dp[i][j] = min(dp[i][j], cost)
    return dp[0][n - 1]`,
    `
long long matrixChain(const vector<int>& dims) {
  int n = dims.size() - 1;
  vector<vector<long long>> dp(n, vector<long long>(n, 0));
  for (int len = 2; len <= n; ++len)
    for (int i = 0; i + len - 1 < n; ++i) {
      int j = i + len - 1;
      dp[i][j] = LLONG_MAX;
      for (int k = i; k < j; ++k) {
        long long cost = dp[i][k] + dp[k + 1][j] + (long long)dims[i] * dims[k + 1] * dims[j + 1];
        dp[i][j] = min(dp[i][j], cost);
      }
    }
  return dp[0][n - 1];
}`,
    `
static long matrixChain(int[] dims) {
  int n = dims.length - 1;
  long[][] dp = new long[n][n];
  for (int len = 2; len <= n; len++)
    for (int i = 0; i + len - 1 < n; i++) {
      int j = i + len - 1;
      dp[i][j] = Long.MAX_VALUE;
      for (int k = i; k < j; k++) {
        long cost = dp[i][k] + dp[k + 1][j] + (long) dims[i] * dims[k + 1] * dims[j + 1];
        dp[i][j] = Math.min(dp[i][j], cost);
      }
    }
  return dp[0][n - 1];
}`,
  ),
  explanation: [
    'Matrix multiplication is associative, so the cost depends only on where the parentheses go — and different choices differ by orders of magnitude. This DP finds the cheapest choice.',
    'Chains of length 2 are solved first, then length 3, and so on: a cell’s two ingredients are always shorter chains it has already seen. That ordering is why the loop is on *length*, not on i.',
    'Each cell stores the best cost, and a partner table stores the split k that produced it. Walking splits from (1, n) downwards reconstructs the optimal parenthesisation — shown as the highlighted path.',
  ],
  learn: {
    useCases: ['Query planners in databases', 'GPU / tensor contraction order', 'Any associative operator with a variable cost'],
    practice: [
      { title: 'Burst Balloons', url: 'https://leetcode.com/problems/burst-balloons/', difficulty: 'hard' },
      { title: 'Minimum Score Triangulation of Polygon', url: 'https://leetcode.com/problems/minimum-score-triangulation-of-polygon/', difficulty: 'medium' },
    ],
  },
  defaultInput: () => ({ kind: 'number', value: 6 }),
  generate: (input, run) => {
    const matrixCount = Math.max(2, Math.min(6, Math.round(Number(input.kind === 'number' ? input.value : 6))));
    const dims = DIMS.slice(0, matrixCount + 1);
    const n = dims.length - 1;

    const table = new TableModel({
      rowLabels: Array.from({ length: n }, (_, i) => `A${i + 1}`),
      colLabels: Array.from({ length: n }, (_, j) => `A${j + 1}`),
      fill: null,
      rowSub: 'i',
      colSub: 'j',
    });

    const split: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
    const builder = new TraceBuilder<TableSnapshot, McmData>(() =>
      table.snapshot({ badges: { dims: dims.join('×'), matrices: n } }),
    );

    builder.emit({
      kind: 'init',
      description: `Chain A1…A${n} with dimensions ${dims.join(' × ')} — find the cheapest parenthesisation.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
      data: { op: 'init' },
    });

    for (let i = 0; i < n; i += 1) {
      table.set(i, i, 0, 'sorted');
    }
    builder.emit({
      kind: 'fill',
      description: 'A single matrix needs no multiplication, so the diagonal is 0.',
      pseudocodeLine: 1,
      codeLine: 1,
      weight: 1.3,
      bump: 'writes',
      data: { op: 'init' },
    });

    for (let len = 2; len <= n; len += 1) {
      for (let i = 0; i + len - 1 < n; i += 1) {
        const j = i + len - 1;
        table.active = [i, j];
        table.clearDeps();
        let best = Number.POSITIVE_INFINITY;
        let bestK = i;

        for (let k = i; k < j; k += 1) {
          const left = table.number(i, k);
          const right = table.number(k + 1, j);
          const cost = left + right + (dims[i] as number) * (dims[k + 1] as number) * (dims[j + 1] as number);
          const improved = cost < best;
          if (improved) {
            best = cost;
            bestK = k;
          }

          table.clearDeps();
          table.dep(i, k);
          table.dep(k + 1, j);
          table.mark(i, k, 'compare');
          table.mark(k + 1, j, 'frontier');

          builder.emit({
            kind: 'compare',
            description: `Split after A${k + 1}: ${left} + ${right} + ${dims[i]}·${dims[k + 1]}·${dims[j + 1]} = ${cost}${improved ? ' — new best.' : `, worse than ${best}.`}`,
            pseudocodeLine: 6,
            codeLine: 5,
            weight: improved ? 1.2 : 0.65,
            bump: 'comparisons',
            data: { op: 'try', i, j, k },
          });
        }

        split[i]![j] = bestK;
        table.set(i, j, best, 'active');
        builder.emit({
          kind: 'fill',
          description: `dp[${i + 1}][${j + 1}] = ${best}, best split after A${bestK + 1}.`,
          pseudocodeLine: 7,
          codeLine: 6,
          weight: 1.3,
          bump: 'writes',
          data: { op: 'best', i, j, k: bestK },
        });

        table.clearDeps();
        table.mark(i, j, 'sorted');
      }
    }

    // Reconstruct the parenthesisation from the split table.
    const path: [number, number][] = [];
    const groups: string[] = [];
    const walk = (i: number, j: number): string => {
      path.push([i, j]);
      if (i === j) return `A${i + 1}`;
      const k = split[i]?.[j] ?? i;
      const left = walk(i, k);
      const right = walk(k + 1, j);
      return `(${left} × ${right})`;
    };
    groups.push(walk(0, n - 1));

    table.active = null;
    table.clearRoles(['sorted']);
    table.setPath(path);
    const cost = table.number(0, n - 1);

    builder.emit({
      kind: 'complete',
      description: `Cheapest order costs ${cost} scalar multiplications: ${groups.join('')}.`,
      pseudocodeLine: 8,
      codeLine: 6,
      weight: 3,
      data: { op: 'done' },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `${cost} multiplications`,
        detail: groups.join(''),
        output: cost,
      },
      expectedState: () => cost === reference(dims),
    });
  },
};

/** Independent check: the classic triply-nested formulation. */
function reference(dims: readonly number[]): number {
  const n = dims.length - 1;
  const dp: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let len = 2; len <= n; len += 1) {
    for (let i = 0; i + len - 1 < n; i += 1) {
      const j = i + len - 1;
      let best = Number.POSITIVE_INFINITY;
      for (let k = i; k < j; k += 1) {
        const cost =
          (dp[i]?.[k] as number) +
          (dp[k + 1]?.[j] as number) +
          (dims[i] as number) * (dims[k + 1] as number) * (dims[j + 1] as number);
        best = Math.min(best, cost);
      }
      (dp[i] as number[])[j] = best;
    }
  }
  return dp[0]?.[n - 1] as number;
}

export const definition: AlgorithmDefinition<TableSnapshot, McmData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: TableVisualizer });
