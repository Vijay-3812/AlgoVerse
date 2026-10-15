import { defineModule } from '@/types';
import type { AlgorithmDefinition, TableSnapshot } from '@/types';
import { code, defineAlgorithm, finish, numberOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { TableVisualizer } from '@/visualizers/TableVisualizer';
import { TableModel } from './kit';
import { COMPLEXITY } from './specs';

/**
 * Coin Change — fewest coins for an amount, with unlimited supply.
 *
 * The table is `coins × amount`: row i answers "what is the best I can do using
 * coins 0…i". Because a coin may be reused, the interesting read is the one from
 * the *same* row (amount − coin), which is exactly what makes it unbounded.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
interface CoinData {
  readonly op: 'init' | 'read' | 'write' | 'take' | 'skip' | 'done';
  readonly coin?: number;
  readonly amount?: number;
}

const COINS: readonly number[] = [1, 3, 5, 7];
const TARGET = 13;
const INF = 999;

const spec: AlgorithmSpec<TableSnapshot, CoinData> = {
  id: 'coin-change',
  complexity: COMPLEXITY['coin-change']!,
  pseudocode: pseudo(`
#coinChange(coins, amount)
# dp[0…amount] ← ∞; dp[0] ← 0      ← 0 coins make 0 currency
# for amount a ← 1 to T
#   for each coin c ≤ a
#     dp[a] ← min(dp[a], dp[a − c] + 1)   ← take c, then solve a − c
# if dp[T] = ∞: return “impossible”
# return dp[T]`),
  code: code(
    `
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    `
def coin_change(coins, amount):
    dp = [0] + [float("inf")] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return -1 if dp[amount] == float("inf") else dp[amount]`,
    `
int coinChange(const vector<int>& coins, int amount) {
  vector<int> dp(amount + 1, INT_MAX);
  dp[0] = 0;
  for (int a = 1; a <= amount; ++a)
    for (int c : coins)
      if (c <= a && dp[a - c] != INT_MAX) dp[a] = min(dp[a], dp[a - c] + 1);
  return dp[amount] == INT_MAX ? -1 : dp[amount];
}`,
    `
static int coinChange(int[] coins, int amount) {
  int[] dp = new int[amount + 1];
  Arrays.fill(dp, Integer.MAX_VALUE);
  dp[0] = 0;
  for (int a = 1; a <= amount; a++)
    for (int c : coins)
      if (c <= a && dp[a - c] != Integer.MAX_VALUE) dp[a] = Math.min(dp[a], dp[a - c] + 1);
  return dp[amount] == Integer.MAX_VALUE ? -1 : dp[amount];
}`,
  ),
  explanation: [
    'Each amount is answered by trying every coin as the *last* one used: the answer for a is one more than the answer for a − c, if that amount is reachable.',
    'Reusing a coin is what makes this unbounded — and it shows up as a read from the same row of the table, to the left.',
    'A greedy "take the biggest coin" rule fails on coins {1, 3, 4} with amount 6 (greedy gives 4+1+1 = 3 coins, the optimum is 3+3 = 2). The table has no such blind spot.',
  ],
  learn: {
    useCases: ['Currency with arbitrary denominations', 'Minimum moves problems', 'Unbounded knapsack in disguise'],
    practice: [
      { title: 'Coin Change', url: 'https://leetcode.com/problems/coin-change/', difficulty: 'medium' },
      { title: 'Coin Change II', url: 'https://leetcode.com/problems/coin-change-ii/', difficulty: 'medium' },
    ],
  },
  defaultInput: () => ({ kind: 'number', value: TARGET }),
  generate: (input, run) => {
    const target = Math.max(5, Math.min(20, Math.floor(numberOf(input, TARGET))));
    const coins = COINS.filter((coin) => coin <= target);
    const table = new TableModel({
      rowLabels: coins.map((coin) => String(coin)),
      colLabels: Array.from({ length: target + 1 }, (_, i) => String(i)),
      fill: null,
      rowSub: 'coin',
      colSub: 'amount',
    });

    const builder = new TraceBuilder<TableSnapshot, CoinData>(() => table.snapshot({ badges: { target } }));

    builder.emit({
      kind: 'init',
      description: `${coins.length} denominations, target ${target} — build the answer amount by amount.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
      data: { op: 'init' },
    });

    // Row 0 is only meaningful for amount 0: one coin of value c can make exactly c.
    for (let r = 0; r < coins.length; r += 1) {
      const coin = coins[r] as number;
      table.set(r, 0, 0, 'sorted');
      table.active = [r, 0];
      builder.emit({
        kind: 'fill',
        description: `With coin ${coin}: amount 0 needs 0 coins.`,
        pseudocodeLine: 1,
        codeLine: 1,
        weight: 1.1,
        bump: 'writes',
        data: { op: 'write', coin },
      });
    }

    for (let amount = 1; amount <= target; amount += 1) {
      for (let r = 0; r < coins.length; r += 1) {
        const coin = coins[r] as number;
        table.active = [r, amount];
        table.clearDeps();

        if (coin > amount) {
          // The coin cannot be used at this amount, so the cell inherits the
          // best answer that did not use it — copying INF here would poison
          // every later row.
          const inherited = r > 0 ? table.number(r - 1, amount) : INF;
          if (r > 0) table.dep(r - 1, amount);
          table.set(r, amount, inherited, inherited >= INF ? 'danger' : 'muted');
          builder.emit({
            kind: 'compare',
            description:
              inherited >= INF
                ? `A ${coin}-coin is too big for ${amount} and nothing smaller has been offered — still unreachable.`
                : `A ${coin}-coin is too big for ${amount} — carry the previous best of ${inherited}.`,
            pseudocodeLine: 3,
            codeLine: 4,
            weight: 0.45,
            bump: 'comparisons',
            data: { op: 'skip', coin, amount },
          });
          table.clearDeps();
          continue;
        }

        const rest = table.number(r, amount - coin);
        table.dep(r, amount - coin);
        const candidate = rest === INF ? INF : rest + 1;
        const previous = r > 0 ? table.number(r - 1, amount) : INF;
        if (r > 0) table.dep(r - 1, amount);

        builder.emit({
          kind: 'read',
          description:
            rest === INF
              ? `${amount} − ${coin} = ${amount - coin} is unreachable, so taking this coin leads nowhere.`
              : `Taking a ${coin}-coin leaves ${amount - coin}, which needs ${rest} more.`,
          pseudocodeLine: 3,
          codeLine: 4,
          weight: 0.9,
          bump: 'reads',
          data: { op: 'read', coin, amount },
        });

        const best = Math.min(candidate, previous);
        table.set(r, amount, best, best === candidate && candidate < previous ? 'active' : 'compare');
        builder.emit({
          kind: 'fill',
          description:
            candidate <= previous
              ? `Take the coin: ${rest} + 1 = ${best} coin${best === 1 ? '' : 's'} is the best so far for ${amount}.`
              : `Skipping the coin keeps ${previous} coins for ${amount} — better than ${candidate}.`,
          pseudocodeLine: 3,
          codeLine: 4,
          weight: 1.2,
          bump: ['writes', 'comparisons'],
          data: { op: candidate <= previous ? 'take' : 'skip', coin, amount },
        });

        table.clearDeps();
      }
    }

    // Backtrack: at the bottom-right cell, walk left by the coin that was used.
    const path: [number, number][] = [];
    let row = coins.length - 1;
    let amount = target;
    while (amount > 0 && row >= 0) {
      path.push([row, amount]);
      const coin = coins[row] as number;
      const taken = table.number(row, amount);
      const skipped = row > 0 ? table.number(row - 1, amount) : INF;
      if (coin <= amount && table.number(row, amount - coin) + 1 === taken && taken <= skipped) {
        amount -= coin;
      } else {
        row -= 1;
      }
    }
    path.push([Math.max(0, row), 0]);

    table.active = [coins.length - 1, target];
    table.clearRoles(['sorted']);
    table.setPath(path);

    const answer = table.number(coins.length - 1, target);
    builder.emit({
      kind: 'complete',
      description:
        answer >= INF
          ? `${target} cannot be made with ${coins.join(', ')}.`
          : `${target} needs ${answer} coins — the highlighted backtrack is one optimal way.`,
      pseudocodeLine: 5,
      codeLine: 7,
      weight: 3,
      data: { op: 'done', amount: target },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: answer >= INF ? 'Unreachable' : `${answer} coins`,
        detail: `target ${target} from {${coins.join(', ')}}`,
        output: answer,
      },
      expectedState: () => answer === reference(coins, target),
    });
  },
};

/** Independent check: the same recurrence, written without a table. */
function reference(coins: readonly number[], target: number): number {
  const dp = new Array<number>(target + 1).fill(INF);
  dp[0] = 0;
  for (let a = 1; a <= target; a += 1) {
    for (const coin of coins) {
      if (coin <= a && (dp[a - coin] as number) + 1 < (dp[a] as number)) {
        dp[a] = (dp[a - coin] as number) + 1;
      }
    }
  }
  return dp[target] as number;
}

export const definition: AlgorithmDefinition<TableSnapshot, CoinData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: TableVisualizer });
