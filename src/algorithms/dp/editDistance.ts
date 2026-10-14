import { defineModule } from '@/types';
import type { AlgorithmDefinition, TableSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, textOf, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { TableVisualizer } from '@/visualizers/TableVisualizer';
import { TableModel } from './kit';
import { COMPLEXITY } from './specs';

/**
 * Edit Distance (Levenshtein) — insert, delete, substitute.
 *
 * The table is a cost surface: row i is a prefix of the first word, column j a
 * prefix of the second, and each cell costs one more than the cheapest way to
 * get to it. Matches come free along the diagonal, which is why the answer is
 * always ≤ max(length) and the backtrack spells out the edit script.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
interface EditData {
  readonly op: 'init' | 'match' | 'insert' | 'delete' | 'substitute' | 'done';
  readonly i?: number;
  readonly j?: number;
}

const WORD_A = 'kitten';
const WORD_B = 'sitting';

const spec: AlgorithmSpec<TableSnapshot, EditData> = {
  id: 'edit-distance',
  complexity: COMPLEXITY['edit-distance']!,
  pseudocode: pseudo(`
#editDistance(a, b)
# dp[i][0] ← i; dp[0][j] ← j        ← i deletions, j insertions
# for i ← 1 to len(a)
#   for j ← 1 to len(b)
#     if a[i−1] = b[j−1]
#       dp[i][j] ← dp[i−1][j−1]       ← free: the characters agree
#     else
#       dp[i][j] ← 1 + min(dp[i−1][j], dp[i][j−1], dp[i−1][j−1])
# return dp[len(a)][len(b)]`),
  code: code(
    `
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}`,
    `
def edit_distance(a, b):
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        for j in range(len(b) + 1):
            if i == 0: dp[i][j] = j
            elif j == 0: dp[i][j] = i
            elif a[i - 1] == b[j - 1]: dp[i][j] = dp[i - 1][j - 1]
            else: dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[len(a)][len(b)]`,
    `
int editDistance(const string& a, const string& b) {
  vector<vector<int>> dp(a.size() + 1, vector<int>(b.size() + 1, 0));
  for (size_t i = 0; i <= a.size(); ++i) dp[i][0] = i;
  for (size_t j = 0; j <= b.size(); ++j) dp[0][j] = j;
  for (size_t i = 1; i <= a.size(); ++i)
    for (size_t j = 1; j <= b.size(); ++j)
      dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1]
        : 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
  return dp[a.size()][b.size()];
}`,
    `
static int editDistance(String a, String b) {
  int[][] dp = new int[a.length() + 1][b.length() + 1];
  for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
  for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
  for (int i = 1; i <= a.length(); i++)
    for (int j = 1; j <= b.length(); j++)
      dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], Math.min(dp[i][j - 1], dp[i - 1][j - 1]));
  return dp[a.length()][b.length()];
}`,
  ),
  explanation: [
    'Every cell is a subproblem: how much does it cost to turn the first i characters of one word into the first j of the other? The first row and column are pure insertions and deletions.',
    'Three neighbours feed each cell — from above (delete), from the left (insert), from the diagonal (substitute) — and an equal pair of characters makes the diagonal free.',
    'The trace is the answer to "why is this distance 3?": walking the path back from the corner shows exactly which edits achieve it, which is the same walk a spell checker uses to suggest corrections.',
  ],
  learn: {
    useCases: ['Spelling correction and fuzzy search', 'DNA alignment with custom costs', 'OCR and clean-up of scanned text'],
    practice: [
      { title: 'Edit Distance', url: 'https://leetcode.com/problems/edit-distance/', difficulty: 'hard' },
      { title: 'One Edit Distance', url: 'https://leetcode.com/problems/one-edit-distance/', difficulty: 'medium' },
    ],
  },
  defaultInput: () => ({ kind: 'string', text: WORD_A, pattern: WORD_B }),
  generate: (input, run) => {
    const a = (textOf(input) || WORD_A).slice(0, 7);
    const b = ((input.kind === 'string' ? input.pattern : undefined) ?? WORD_B).slice(0, 7);
    const table = new TableModel({
      rowLabels: ['∅', ...[...a]],
      colLabels: ['∅', ...[...b]],
      fill: 0,
      rowSub: 'a',
      colSub: 'b',
    });

    const builder = new TraceBuilder<TableSnapshot, EditData>(() =>
      table.snapshot({ badges: { from: a, to: b } }),
    );

    builder.emit({
      kind: 'init',
      description: `Turning "${a}" into "${b}" — insertions cost the top row, deletions the left column.`,
      pseudocodeLine: 0,
      codeLine: 1,
      weight: 1.6,
      data: { op: 'init' },
    });

    for (let i = 1; i <= a.length; i += 1) {
      table.set(i, 0, i, 'muted');
    }
    builder.emit({
      kind: 'fill',
      description: `${a.length} deletions bring the first word down to nothing.`,
      pseudocodeLine: 1,
      codeLine: 1,
      weight: 1.2,
      bump: 'writes',
      data: { op: 'delete' },
    });
    for (let j = 1; j <= b.length; j += 1) {
      table.set(0, j, j, 'muted');
    }
    builder.emit({
      kind: 'fill',
      description: `${b.length} insertions build the second word up from nothing.`,
      pseudocodeLine: 1,
      codeLine: 1,
      weight: 1.2,
      bump: 'writes',
      data: { op: 'insert' },
    });

    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        table.active = [i, j];
        table.clearDeps();

        if (a[i - 1] === b[j - 1]) {
          table.dep(i - 1, j - 1);
          table.mark(i - 1, j - 1, 'compare');
          const value = table.number(i - 1, j - 1);
          table.set(i, j, value, 'active');
          builder.emit({
            kind: 'match',
            description: `'${a[i - 1]}' = '${b[j - 1]}' — the diagonal is free, cost stays ${value}.`,
            pseudocodeLine: 5,
            codeLine: 4,
            weight: 1.1,
            bump: ['comparisons', 'writes'],
            data: { op: 'match', i, j },
          });
        } else {
          const del = table.number(i - 1, j);
          const ins = table.number(i, j - 1);
          const sub = table.number(i - 1, j - 1);
          table.dep(i - 1, j);
          table.dep(i, j - 1);
          table.dep(i - 1, j - 1);
          table.mark(i - 1, j, 'compare');
          table.mark(i, j - 1, 'compare');
          table.mark(i - 1, j - 1, 'compare');
          const value = 1 + Math.min(del, ins, sub);
          table.set(i, j, value, 'muted');
          const kind: EditData['op'] = del <= ins && del <= sub ? 'delete' : ins <= sub ? 'insert' : 'substitute';
          builder.emit({
            kind: 'write',
            description: `'${a[i - 1]}' ≠ '${b[j - 1]}' — 1 + min(delete ${del}, insert ${ins}, substitute ${sub}) = ${value} (${kind}).`,
            pseudocodeLine: 7,
            codeLine: 5,
            weight: 0.9,
            bump: ['comparisons', 'writes'],
            data: { op: kind, i, j },
          });
        }

        table.clearDeps();
        table.mark(i, j, 'sorted');
      }
    }

    // Backtrack to produce the edit script itself.
    const path: [number, number][] = [];
    const script: string[] = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 || j > 0) {
      path.push([i, j]);
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && table.number(i, j) === table.number(i - 1, j - 1)) {
        i -= 1;
        j -= 1;
      } else if (i > 0 && j > 0 && table.number(i, j) === table.number(i - 1, j - 1) + 1) {
        script.unshift(`substitute ${a[i - 1]} → ${b[j - 1]}`);
        i -= 1;
        j -= 1;
      } else if (j > 0 && table.number(i, j) === table.number(i, j - 1) + 1) {
        script.unshift(`insert ${b[j - 1]}`);
        j -= 1;
      } else {
        script.unshift(`delete ${a[i - 1]}`);
        i -= 1;
      }
    }

    table.active = null;
    table.clearRoles(['sorted']);
    table.setPath(path);
    const distance = table.number(a.length, b.length);
    table.caption = script.join(' · ');

    builder.emit({
      kind: 'complete',
      description: `Distance ${distance}: ${script.join('; ')}.`,
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
        headline: `Distance ${distance}`,
        detail: `${script.length} edit${script.length === 1 ? '' : 's'}`,
        output: distance,
      },
      expectedState: () => distance === reference(a, b),
    });
  },
};

/** Independent reference implementation. */
function reference(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) (dp[i] as number[])[0] = i;
  for (let j = 0; j <= b.length; j += 1) (dp[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      (dp[i] as number[])[j] = a[i - 1] === b[j - 1]
        ? (dp[i - 1]?.[j - 1] as number)
        : 1 + Math.min(dp[i - 1]?.[j] as number, dp[i]?.[j - 1] as number, dp[i - 1]?.[j - 1] as number);
    }
  }
  return dp[a.length]?.[b.length] as number;
}

export const definition: AlgorithmDefinition<TableSnapshot, EditData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: TableVisualizer });
