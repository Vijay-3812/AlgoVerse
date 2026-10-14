import type { AlgorithmDefinition, TreeSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { TreeVisualizer } from '@/visualizers/TreeVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, TREE_DEFAULT_INPUT } from './specs';
import { TreeModel } from './kit';

export interface FenwickData {
  readonly operation: 'build' | 'prefix' | 'update';
  readonly index: number;
  readonly lowbit: number;
}

/**
 * Fenwick Tree (Binary Indexed Tree).
 *
 * Node `i` owns the range `(i − lowbit(i), i]`, so the *low bit* is the whole
 * story: `i -= i & -i` walks down to a prefix sum, `i += i & -i` walks up to
 * propagate an update. Nodes are laid out along one axis like an array, with
 * the next hop drawn as a link, so each jump is a visible stride rather than an
 * index arithmetic claim.
 */
const spec: AlgorithmSpec<TreeSnapshot, FenwickData> = {
  id: 'fenwick-tree',
  complexity: COMPLEXITY['fenwick-tree']!,
  pseudocode: pseudo(`
#lowbit(i) = i & (−i)                 ▸ the last set bit
#
#build(A)                             ▸ O(n)
#   for i ← 1 to n
#     tree[i] ← tree[i] + A[i]
#     j ← i + lowbit(i)
#     if j ≤ n: tree[j] ← tree[j] + tree[i]
#
#prefixSum(i)                         ▸ O(log n): walk down
#   sum ← 0
#   while i > 0
#     sum ← sum + tree[i]
#     i ← i − lowbit(i)
#   return sum
#
#update(i, delta)                     ▸ O(log n): walk up
#   while i ≤ n
#     tree[i] ← tree[i] + delta
#     i ← i + lowbit(i)`),
  code: code(
    `
function lowbit(i) { return i & -i; }

function build(a) {
  const n = a.length, tree = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    tree[i] += a[i - 1];
    const j = i + lowbit(i);
    if (j <= n) tree[j] += tree[i];
  }
  return tree;
}

function prefixSum(tree, i) {
  let sum = 0;
  while (i > 0) { sum += tree[i]; i -= lowbit(i); }
  return sum;
}

function update(tree, i, delta) {
  for (; i < tree.length; i += lowbit(i)) tree[i] += delta;
}`,
    `
def lowbit(i):
    return i & -i


def build(a):
    n = len(a)
    tree = [0] * (n + 1)
    for i in range(1, n + 1):
        tree[i] += a[i - 1]
        j = i + lowbit(i)
        if j <= n:
            tree[j] += tree[i]
    return tree


def prefix_sum(tree, i):
    total = 0
    while i > 0:
        total += tree[i]
        i -= lowbit(i)
    return total


def update(tree, i, delta):
    while i < len(tree):
        tree[i] += delta
        i += lowbit(i)`,
    `
int lowbit(int i) { return i & -i; }

vector<int> build(const vector<int>& a) {
  int n = a.size();
  vector<int> tree(n + 1, 0);
  for (int i = 1; i <= n; ++i) {
    tree[i] += a[i - 1];
    int j = i + lowbit(i);
    if (j <= n) tree[j] += tree[i];
  }
  return tree;
}

int prefixSum(const vector<int>& tree, int i) {
  int sum = 0;
  for (; i > 0; i -= lowbit(i)) sum += tree[i];
  return sum;
}

void update(vector<int>& tree, int i, int delta) {
  for (; i < (int)tree.size(); i += lowbit(i)) tree[i] += delta;
}`,
    `
static int lowbit(int i) { return i & -i; }

static int[] build(int[] a) {
  int n = a.length;
  int[] tree = new int[n + 1];
  for (int i = 1; i <= n; i++) {
    tree[i] += a[i - 1];
    int j = i + lowbit(i);
    if (j <= n) tree[j] += tree[i];
  }
  return tree;
}

static int prefixSum(int[] tree, int i) {
  int sum = 0;
  for (; i > 0; i -= lowbit(i)) sum += tree[i];
  return sum;
}

static void update(int[] tree, int i, int delta) {
  for (; i < tree.length; i += lowbit(i)) tree[i] += delta;
}`,
  ),
  explanation: [
    'A Fenwick tree stores prefix aggregates in n slots instead of a segment tree’s 2n — the low bit of each index encodes the range it owns.',
    'A prefix query keeps clearing the lowest set bit (`i -= i & -i`), so it reads exactly one node per set bit in the index.',
    'An update keeps adding the lowest set bit (`i += i & -i`), touching the same chain of ancestors in reverse.',
  ],
  learn: {
    useCases: ['Dynamic prefix sums (updates + queries interleaved)', 'Counting inversions online', 'Competitive-programming workhorse for 2D prefix counts with coordinate compression'],
    quiz: [
      {
        question: 'How many nodes does prefixSum(12) read?',
        options: ['12', '2', '3', '6'],
        answer: 2,
        why: '12 → 8 → 0: 12 − lowbit(12)=4 gives 8, 8 − 8 gives 0, so tree[12] and tree[8] are read — one per set bit in 12 (1100₂).',
      },
    ],
    practice: [{ title: 'Range Sum Query — Mutable', url: 'https://leetcode.com/problems/range-sum-query-mutable/', difficulty: 'medium' }],
  },
  defaultInput: TREE_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input).map((v) => Math.abs(v));
    const n = values.length;
    const model = new TreeModel();
    const tree = new Array<number>(n + 1).fill(0);
    const ids: string[] = [];

    /** Node i covers values (i − lowbit(i), i]; store the range as the subtitle. */
    const rangeOf = (i: number): [number, number] => [i - (i & -i) + 1, i];

    for (let i = 1; i <= n; i += 1) {
      const [lo, hi] = rangeOf(i);
      const id = model.create(0, { sub: `[${lo}..${hi}]`, prefix: 'f' });
      ids[i] = id;
      model.attach(id, null);
    }

    // Layout: a single row along the index axis, so `i -= lowbit(i)` reads as a
    // leftward stride across the same line rather than a tree descent.
    const positions: Record<string, number> = {};
    for (let i = 1; i <= n; i += 1) positions[ids[i] as string] = (i - 0.5) / n;

    let operation: FenwickData['operation'] = 'build';
    let caption = `Fenwick array of ${n} slots — slot i owns its lowbit-range`;
    let cursor = 1;
    let lowbit = 1;

    const sync = (): void => {
      for (let i = 1; i <= n; i += 1) model.setKeys(ids[i], [String(tree[i])]);
    };

    const builder = new TraceBuilder<TreeSnapshot, FenwickData>(() => {
      sync();
      const highlights: Record<string, 'active' | 'compare' | 'pivot'> = {};
      if (ids[cursor]) highlights[ids[cursor] as string] = 'active';
      void highlights;
      return model.snapshot({
        kind: 'forest',
        positions,
        caption,
        badges: {
          nodes: model.size,
          operation,
          i: cursor,
          lowbit: `i & −i = ${lowbit}`,
        },
      });
    });

    builder.emit({
      kind: 'init',
      description: `Building a Fenwick tree over ${n} values: slot i will own the range ending at i.`,
      highlight: { nodes: ids.slice(1) },
      badges: { nodes: model.size, operation: 'build', i: 0 },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
    });

    /* ── O(n) build: each slot pushes its own value to its next parent ────── */
    operation = 'build';
    for (let i = 1; i <= n; i += 1) {
      cursor = i;
      lowbit = i & -i;
      model.clearRoles();
      model.setRole([ids[i] as string], 'active');
      tree[i] += values[i - 1] as number;
      const [lo, hi] = rangeOf(i);
      builder.emit({
        kind: 'fill',
        description: `Slot ${i} absorbs its own value; it owns the range [${lo}..${hi}] (lowbit ${lowbit}).`,
        highlight: { nodes: [ids[i] as string] },
        badges: { nodes: model.size, i, lowbit, operation, value: tree[i] },
        pseudocodeLine: 2,
        codeLine: 4,
        data: { operation, index: i, lowbit },
        weight: 1,
        bump: ['writes'],
      });

      const parent = i + lowbit;
      if (parent <= n) {
        tree[parent] += tree[i];
        model.setRole([ids[parent] as string], 'pivot');
        cursor = parent;
        builder.emit({
          kind: 'update',
          description: `Propagate slot ${i}'s running total to its parent ${parent} (i + lowbit).`,
          highlight: { nodes: [ids[parent] as string] },
          badges: { nodes: model.size, i: parent, lowbit: parent & -parent, operation },
          pseudocodeLine: 4,
          codeLine: 6,
          data: { operation, index: parent, lowbit: parent & -parent },
          weight: 1.1,
          bump: ['writes'],
        });
      }
    }

    sync();
    model.clearRoles();
    model.setRole(ids.slice(1), 'success');
    const built = tree.slice();
    builder.emit({
      kind: 'complete',
      description: `Built in O(n): every slot now holds the sum of its lowbit range, ${built.slice(1).join(', ')}.`,
      highlight: { nodes: ids.slice(1) },
      badges: { nodes: model.size, operation: 'build' },
      pseudocodeLine: 5,
      codeLine: 7,
      weight: 2,
    });

    /* ── prefix query: walk down by lowbit ────────────────────────────────── */
    operation = 'prefix';
    const queryIndex = Math.max(1, n - 1);
    let i = queryIndex;
    let sum = 0;
    const readChain: number[] = [];
    while (i > 0) {
      cursor = i;
      lowbit = i & -i;
      readChain.push(i);
      model.clearRoles();
      model.setRole(readChain.map((k) => ids[k] as string), 'success');
      model.setRole([ids[i] as string], 'active');
      sum += tree[i] as number;
      builder.emit({
        kind: 'read',
        description: `Read slot ${i} (sum += ${tree[i]}); jump down to ${i - lowbit} — that is i − lowbit(i).`,
        highlight: { nodes: [ids[i] as string] },
        badges: { nodes: model.size, i, lowbit, running: sum, operation },
        pseudocodeLine: 7,
        codeLine: 10,
        data: { operation, index: i, lowbit },
        weight: 1.15,
        bump: ['reads'],
      });
      i -= lowbit;
    }

    model.clearRoles();
    model.setRole(readChain.map((k) => ids[k] as string), 'success');
    builder.emit({
      kind: 'complete',
      description: `prefixSum(${queryIndex}) = ${sum} in ${readChain.length} reads — ${queryIndex} would have been ${readChain.length === 1 ? 'the same' : 'more'} with a plain scan.`,
      highlight: { nodes: readChain.map((k) => ids[k] as string) },
      badges: { nodes: model.size, i: queryIndex, running: sum, reads: readChain.length, operation },
      pseudocodeLine: 9,
      codeLine: 12,
      weight: 2.3,
    });

    /* ── point update: walk up by lowbit ─────────────────────────────────── */
    operation = 'update';
    const delta = 5;
    let updateIndex = Math.max(1, Math.min(n, 3));
    const updateChain: number[] = [];
    while (updateIndex <= n) {
      cursor = updateIndex;
      lowbit = updateIndex & -updateIndex;
      updateChain.push(updateIndex);
      tree[updateIndex] += delta;
      sync();
      model.clearRoles();
      model.setRole(updateChain.map((k) => ids[k] as string), 'swap');
      model.setRole([ids[updateIndex] as string], 'active');
      builder.emit({
        kind: 'update',
        description: `Add ${delta} to slot ${updateIndex} — every ancestor’s range contains index ${3}.`,
        highlight: { nodes: [ids[updateIndex] as string] },
        badges: { nodes: model.size, i: updateIndex, lowbit, added: delta, operation },
        pseudocodeLine: 12,
        codeLine: 16,
        data: { operation, index: updateIndex, lowbit },
        weight: 1.15,
        bump: ['writes'],
      });
      updateIndex += lowbit;
    }

    model.clearRoles();
    model.setRole(updateChain.map((k) => ids[k] as string), 'frontier');
    builder.emit({
      kind: 'complete',
      description: `Update touched ${updateChain.length} slots instead of all ${n} — the low-bit chain is the whole trick.`,
      highlight: { nodes: updateChain.map((k) => ids[k] as string) },
      badges: { nodes: model.size, writes: updateChain.length, operation, added: delta },
      pseudocodeLine: 13,
      codeLine: 17,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `prefixSum(${queryIndex}) = ${sum}`,
        detail: `${readChain.length} reads, ${updateChain.length} writes per update`,
        output: { tree: tree.slice(1), sum, readChain, updateChain },
      },
    });
  },
};

export const definition: AlgorithmDefinition<TreeSnapshot, FenwickData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: TreeVisualizer });
