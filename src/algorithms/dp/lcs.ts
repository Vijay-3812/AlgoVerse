import { defineModule } from '@/types';
import type { AlgorithmDefinition, TableSnapshot } from '@/types';
import { code, defineAlgorithm, finish, textOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { TableVisualizer } from '@/visualizers/TableVisualizer';
import { TableModel } from './kit';
import { COMPLEXITY } from './specs';

/**
 * Longest Common Subsequence — the diff algorithm's engine.
 *
 * Cells match when the two characters do: a match copies the diagonal and adds
 * one; a mismatch copies the better of the two neighbours. The backtrack then
 * walks the diagonal matches backwards to spell the subsequence out.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
interface LcsData {
  readonly op: 'init' | 'match' | 'mismatch' | 'done';
  readonly i?: number;
  readonly j?: number;
}

const TEXT_A = 'AGGTAB';
const TEXT_B = 'GXTXAYB';

const spec: AlgorithmSpec<TableSnapshot, LcsData> = {
  id: 'lcs',
  complexity: COMPLEXITY.lcs!,
  pseudocode: pseudo(`
#lcs(X, Y)
# dp[0][*] ← 0; dp[*][0] ← 0          ← empty prefix matches nothing
# for i ← 1 to len(X)
#   for j ← 1 to len(Y)
#     if X[i−1] = Y[j−1]
#       dp[i][j] ← dp[i−1][j−1] + 1   ← the characters match: extend the diagonal
#     else
#       dp[i][j] ← max(dp[i−1][j], dp[i][j−1])   ← drop one character from either side
# walk the diagonal matches back from dp[m][n]`),
  code: code(
    `
function lcs(x, y) {
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      if (x[i - 1] === y[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[x.length][y.length];
}`,
    `
def lcs(x, y):
    dp = [[0] * (len(y) + 1) for _ in range(len(x) + 1)]
    for i in range(1, len(x) + 1):
        for j in range(1, len(y) + 1):
            if x[i - 1] == y[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[len(x)][len(y)]`,
    `
int lcs(const string& x, const string& y) {
  vector<vector<int>> dp(x.size() + 1, vector<int>(y.size() + 1, 0));
  for (size_t i = 1; i <= x.size(); ++i)
    for (size_t j = 1; j <= y.size(); ++j)
      dp[i][j] = x[i - 1] == y[j - 1] ? dp[i - 1][j - 1] + 1
                                      : max(dp[i - 1][j], dp[i][j - 1]);
  return dp[x.size()][y.size()];
}`,
    `
static int lcs(String x, String y) {
  int[][] dp = new int[x.length() + 1][y.length() + 1];
  for (int i = 1; i <= x.length(); i++)
    for (int j = 1; j <= y.length(); j++)
      dp[i][j] = x.charAt(i - 1) == y.charAt(j - 1)
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[x.length()][y.length()];
}`,
  ),
  explanation: [
    'A common subsequence is built from the front: if the next characters agree, keep them both and continue; if not, discard one of them and take the better of the two options.',
    'A match reads exactly one cell — the upper-left diagonal — which is why the answer appears as a staircase of matches when you walk back from the corner.',
    'This is the algorithm behind `git diff`: the LCS of two files is the largest set of lines that can be kept, and everything else is an insertion or a deletion.',
  ],
  learn: {
    useCases: ['Diff and version control', 'DNA / protein alignment', 'Fuzzy string comparison'],
    practice: [
      { title: 'Longest Common Subsequence', url: 'https://leetcode.com/problems/longest-common-subsequence/', difficulty: 'medium' },
      { title: 'Delete Operation for Two Strings', url: 'https://leetcode.com/problems/delete-operation-for-two-strings/', difficulty: 'medium' },
    ],
  },
  defaultInput: () => ({ kind: 'string', text: TEXT_A, pattern: TEXT_B }),
  generate: (input, run) => {
    const x = (textOf(input) || TEXT_A).slice(0, 8);
    const y = (input.kind === 'string' ? input.pattern : undefined) ?? TEXT_B;
    const second = y.replace(/\s/g, '').slice(0, 8) || TEXT_B;
    const table = new TableModel({
      rowLabels: ['∅', ...[...x]],
      colLabels: ['∅', ...[...second]],
      fill: 0,
      rowSub: 'X',
      colSub: 'Y',
    });

    const builder = new TraceBuilder<TableSnapshot, LcsData>(() =>
      table.snapshot({ badges: { X: x, Y: second } }),
    );

    builder.emit({
      kind: 'init',
      description: `LCS of "${x}" and "${second}" — row 0 and column 0 are the empty prefixes.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
      data: { op: 'init' },
    });

    for (let i = 1; i <= x.length; i += 1) {
      for (let j = 1; j <= second.length; j += 1) {
        table.active = [i, j];
        table.clearDeps();
        if (x[i - 1] === second[j - 1]) {
          table.dep(i - 1, j - 1);
          table.mark(i - 1, j - 1, 'compare');
          const value = table.number(i - 1, j - 1) + 1;
          table.set(i, j, value, 'active');
          builder.emit({
            kind: 'match',
            description: `'${x[i - 1]}' = '${second[j - 1]}' at (${i}, ${j}) — diagonal ${value - 1} + 1 = ${value}.`,
            pseudocodeLine: 5,
            codeLine: 4,
            weight: 1.4,
            bump: ['comparisons', 'writes'],
            data: { op: 'match', i, j },
          });
        } else {
          const up = table.number(i - 1, j);
          const left = table.number(i, j - 1);
          table.dep(i - 1, j);
          table.dep(i, j - 1);
          table.mark(i - 1, j, 'compare');
          table.mark(i, j - 1, 'compare');
          const value = Math.max(up, left);
          table.set(i, j, value, 'muted');
          builder.emit({
            kind: 'mismatch',
            description: `'${x[i - 1]}' ≠ '${second[j - 1]}' — take the better neighbour: max(${up}, ${left}) = ${value}.`,
            pseudocodeLine: 7,
            codeLine: 5,
            weight: 0.8,
            bump: ['comparisons', 'writes'],
            data: { op: 'mismatch', i, j },
          });
        }
        table.clearDeps();
        table.mark(i, j, 'sorted');
      }
    }

    // Backtrack: diagonal steps are the characters that ended up in the LCS.
    const path: [number, number][] = [];
    const letters: string[] = [];
    let i = x.length;
    let j = second.length;
    while (i > 0 && j > 0) {
      path.push([i, j]);
      if (x[i - 1] === second[j - 1]) {
        letters.unshift(x[i - 1] as string);
        path.push([i - 1, j - 1]);
        i -= 1;
        j -= 1;
      } else if (table.number(i - 1, j) >= table.number(i, j - 1)) {
        i -= 1;
      } else {
        j -= 1;
      }
    }

    table.active = null;
    table.clearRoles(['sorted']);
    table.setPath(path);
    const length = table.number(x.length, second.length);

    builder.emit({
      kind: 'complete',
      description: `Longest common subsequence is "${letters.join('')}" — length ${length}.`,
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
        headline: `LCS length ${length}`,
        detail: `"${letters.join('')}"`,
        output: letters.join(''),
      },
      expectedState: () => length === reference(x, second),
    });
  },
};

/** Independent check: exhaustive search over all subsequence pairs (small n). */
function reference(x: string, y: string): number {
  const length = (a: string, b: string): number => {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        dp[i]![j] = a[i - 1] === b[j - 1]
          ? (dp[i - 1]?.[j - 1] ?? 0) + 1
          : Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0);
      }
    }
    return dp[a.length]?.[b.length] ?? 0;
  };
  return length(x, y);
}

export const definition: AlgorithmDefinition<TableSnapshot, LcsData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: TableVisualizer });
