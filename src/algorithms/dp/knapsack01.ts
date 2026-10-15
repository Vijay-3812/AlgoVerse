import { defineModule } from '@/types';
import type { AlgorithmDefinition, TableSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { TableVisualizer } from '@/visualizers/TableVisualizer';
import { TableModel } from './kit';
import { COMPLEXITY } from './specs';

/**
 * 0/1 Knapsack — take an item or leave it, one row per item.
 *
 * Row i answers "best value from the first i+1 items at each capacity", which
 * means every cell consults the row above twice: without the item (same column)
 * and with it (column minus weight). Those two arrows are the entire recurrence.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
interface KnapsackData {
  readonly op: 'init' | 'compare' | 'take' | 'skip' | 'done';
  readonly item?: number;
  readonly capacity?: number;
}

interface Item {
  readonly name: string;
  readonly weight: number;
  readonly value: number;
}

const ITEMS: readonly Item[] = [
  { name: 'map', weight: 2, value: 3 },
  { name: 'rope', weight: 3, value: 4 },
  { name: 'lantern', weight: 4, value: 5 },
  { name: 'tent', weight: 5, value: 8 },
  { name: 'stove', weight: 6, value: 9 },
];
const CAPACITY = 10;

const spec: AlgorithmSpec<TableSnapshot, KnapsackData> = {
  id: 'knapsack-01',
  complexity: COMPLEXITY['knapsack-01']!,
  pseudocode: pseudo(`
#knapsack(items, W)
# dp[i][w] ← best value using the first i items at capacity w
# for i ← 1 to n
#   for w ← 0 to W
#     dp[i][w] ← dp[i − 1][w]             ← leave item i behind
#     if weight[i] ≤ w
#       dp[i][w] ← max(dp[i][w], dp[i − 1][w − weight[i]] + value[i])   ← take it
# answer ← dp[n][W]; walk back to list the items`),
  code: code(
    `
function knapsack(items, W) {
  const n = items.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];
      if (items[i - 1].weight <= w)
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - items[i - 1].weight] + items[i - 1].value);
    }
  }
  return dp[n][W];
}`,
    `
def knapsack(items, W):
    n = len(items)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i - 1][w]
            if items[i - 1][0] <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - items[i - 1][0]] + items[i - 1][1])
    return dp[n][W]`,
    `
int knapsack(const vector<pair<int,int>>& items, int W) {
  int n = items.size();
  vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
  for (int i = 1; i <= n; ++i)
    for (int w = 0; w <= W; ++w) {
      dp[i][w] = dp[i - 1][w];
      if (items[i - 1].first <= w)
        dp[i][w] = max(dp[i][w], dp[i - 1][w - items[i - 1].first] + items[i - 1].second);
    }
  return dp[n][W];
}`,
    `
static int knapsack(int[][] items, int W) {
  int n = items.length;
  int[][] dp = new int[n + 1][W + 1];
  for (int i = 1; i <= n; i++)
    for (int w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];
      if (items[i - 1][0] <= w)
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - items[i - 1][0]] + items[i - 1][1]);
    }
  return dp[n][W];
}`,
  ),
  explanation: [
    'Each item gets a row. Filling left to right means every cell already knows the best answer for smaller items and smaller capacities.',
    'Two reads decide the cell: the row above at the same capacity (give the item up) and the row above at capacity − weight, plus the item value (take it).',
    'Because only the previous row is read, the table can be collapsed into one array — but the array has to be traversed right-to-left, so that an item cannot be taken twice.',
  ],
  learn: {
    useCases: ['Budgeted selection', 'Subset-sum variants', 'Resource allocation with indivisible goods'],
    practice: [
      { title: 'Partition Equal Subset Sum', url: 'https://leetcode.com/problems/partition-equal-subset-sum/', difficulty: 'medium' },
      { title: 'Target Sum', url: 'https://leetcode.com/problems/target-sum/', difficulty: 'medium' },
    ],
  },
  defaultInput: () => ({ kind: 'number', value: CAPACITY }),
  generate: (input, run) => {
    const capacity = Math.max(6, Math.min(14, Math.floor(Number(input.kind === 'number' ? input.value : CAPACITY))));
    const items = ITEMS.filter((item) => item.weight <= capacity).slice(0, 5);
    const table = new TableModel({
      rowLabels: ['∅', ...items.map((item) => item.name)],
      colLabels: Array.from({ length: capacity + 1 }, (_, w) => String(w)),
      fill: 0,
      rowSub: 'item',
      colSub: 'capacity',
    });

    const builder = new TraceBuilder<TableSnapshot, KnapsackData>(() =>
      table.snapshot({ badges: { capacity, items: items.length } }),
    );

    builder.emit({
      kind: 'init',
      description: `${items.length} items, capacity ${capacity} — no item may be taken twice.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
      data: { op: 'init' },
    });

    builder.emit({
      kind: 'fill',
      description: 'With no items available every capacity is worth 0 — row 0 is the base case.',
      pseudocodeLine: 1,
      codeLine: 1,
      weight: 1.4,
      bump: 'writes',
      data: { op: 'init' },
    });

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i] as Item;
      const row = i + 1;
      for (let w = 0; w <= capacity; w += 1) {
        table.active = [row, w];
        table.clearDeps();
        const skipped = table.number(i, w);
        table.dep(i, w);
        table.mark(i, w, 'compare');

        if (item.weight > w) {
          table.set(row, w, skipped, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${item.name} weighs ${item.weight} — it does not fit in ${w}, so the cell copies the row above.`,
            pseudocodeLine: 3,
            codeLine: 4,
            weight: 0.5,
            bump: 'comparisons',
            data: { op: 'skip', item: row, capacity: w },
          });
          continue;
        }

        const taken = table.number(i, w - item.weight) + item.value;
        table.dep(i, w - item.weight);
        table.mark(i, w - item.weight, 'frontier');
        const best = Math.max(skipped, taken);

        builder.emit({
          kind: 'read',
          description: `At capacity ${w}: leave ${item.name} → ${skipped}; take it → ${taken} (${w - item.weight} left + value ${item.value}).`,
          pseudocodeLine: 5,
          codeLine: 6,
          weight: 0.9,
          bump: 'reads',
          data: { op: 'compare', item: row, capacity: w },
        });

        table.set(row, w, best, taken > skipped ? 'active' : 'compare');
        builder.emit({
          kind: 'fill',
          description: taken > skipped
            ? `Take ${item.name}: ${best} beats ${skipped}.`
            : `Leave ${item.name}: ${skipped} is already at least ${taken}.`,
          pseudocodeLine: 5,
          codeLine: 6,
          weight: 1.15,
          bump: ['writes', 'comparisons'],
          data: { op: taken > skipped ? 'take' : 'skip', item: row, capacity: w },
        });
        table.clearDeps();
      }
      table.clearRoles(['muted']);
      for (let w = 0; w <= capacity; w += 1) table.mark(row, w, 'sorted');
    }

    // Walk the winning row backwards to recover the chosen items.
    const chosen: Item[] = [];
    const path: [number, number][] = [];
    let w = capacity;
    for (let i = items.length; i > 0 && w >= 0; i -= 1) {
      path.push([i, w]);
      const item = items[i - 1] as Item;
      if (table.number(i, w) !== table.number(i - 1, w)) {
        chosen.push(item);
        w -= item.weight;
        path.push([i - 1, w]);
      }
    }

    table.active = null;
    table.clearRoles(['sorted']);
    table.setPath(path);
    const total = table.number(items.length, capacity);

    builder.emit({
      kind: 'complete',
      description: `Maximum value ${total} with ${chosen.map((item) => item.name).join(' + ') || 'nothing'}.`,
      pseudocodeLine: 7,
      codeLine: 6,
      weight: 3,
      data: { op: 'done', capacity },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `Best value ${total}`,
        detail: chosen.map((item) => item.name).join(' + ') || 'nothing fits',
        output: total,
      },
      expectedState: () => total === reference(items, capacity),
    });
  },
};

/** Independent check: brute force over every subset. */
function reference(items: readonly Item[], capacity: number): number {
  let best = 0;
  const subsets = 1 << items.length;
  for (let mask = 0; mask < subsets; mask += 1) {
    let weight = 0;
    let value = 0;
    for (let i = 0; i < items.length; i += 1) {
      if (mask & (1 << i)) {
        weight += (items[i] as Item).weight;
        value += (items[i] as Item).value;
      }
    }
    if (weight <= capacity) best = Math.max(best, value);
  }
  return best;
}

export const definition: AlgorithmDefinition<TableSnapshot, KnapsackData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: TableVisualizer });
