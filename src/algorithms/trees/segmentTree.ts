import type { AlgorithmDefinition, TreeSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { TreeVisualizer } from '@/visualizers/TreeVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, TREE_DEFAULT_INPUT } from './specs';
import { TreeModel } from './kit';

export interface SegmentData {
  readonly operation: 'build' | 'query' | 'update';
  readonly range?: readonly [number, number];
  readonly covered?: readonly [number, number];
}

/**
 * Segment Tree — range sums with three outcomes per node.
 *
 * Every query step lands in one of three buckets, and the colours say which:
 * *full* overlap (the node's stored sum is used immediately), *partial* (recurse
 * into both halves) and *no* overlap (skip the whole subtree). Seeing a range
 * query touch only O(log n) nodes is the entire justification for the structure.
 */
const spec: AlgorithmSpec<TreeSnapshot, SegmentData> = {
  id: 'segment-tree',
  complexity: COMPLEXITY['segment-tree']!,
  pseudocode: pseudo(`
#build(node, lo, hi)                  ▸ O(n) total
#   if lo = hi: tree[node] ← A[lo]; return
#   mid ← ⌊(lo + hi)/2⌋
#   build(left, lo, mid); build(right, mid+1, hi)
#   tree[node] ← tree[left] + tree[right]
#
#query(node, lo, hi, ql, qr)          ▸ O(log n)
#   if qr < lo or hi < ql: return 0             ▸ no overlap → skip
#   if ql ≤ lo and hi ≤ qr: return tree[node]   ▸ full overlap → take it
#   mid ← ⌊(lo + hi)/2⌋                          ▸ partial → split
#   return query(left, …) + query(right, …)
#
#update(node, lo, hi, i, value)        ▸ O(log n)
#   leaf ← value; then re-sum every ancestor`),
  code: code(
    `
class SegTree {
  #tree; #n;
  constructor(a) {
    this.#n = a.length;
    this.#tree = new Array(4 * this.#n).fill(0);
    this.#build(1, 0, this.#n - 1, a);
  }
  #build(node, lo, hi, a) {
    if (lo === hi) { this.#tree[node] = a[lo]; return; }
    const mid = (lo + hi) >> 1;
    this.#build(2 * node, lo, mid, a);
    this.#build(2 * node + 1, mid + 1, hi, a);
    this.#tree[node] = this.#tree[2 * node] + this.#tree[2 * node + 1];
  }
  query(node, lo, hi, ql, qr) {
    if (qr < lo || hi < ql) return 0;
    if (ql <= lo && hi <= qr) return this.#tree[node];
    const mid = (lo + hi) >> 1;
    return this.query(2 * node, lo, mid, ql, qr) + this.query(2 * node + 1, mid + 1, hi, ql, qr);
  }
  range(ql, qr) { return this.query(1, 0, this.#n - 1, ql, qr); }
}`,
    `
class SegTree:
    def __init__(self, a):
        self.n = len(a)
        self.tree = [0] * (4 * self.n)
        self._build(1, 0, self.n - 1, a)

    def _build(self, node, lo, hi, a):
        if lo == hi:
            self.tree[node] = a[lo]
            return
        mid = (lo + hi) // 2
        self._build(2 * node, lo, mid, a)
        self._build(2 * node + 1, mid + 1, hi, a)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]

    def query(self, node, lo, hi, ql, qr):
        if qr < lo or hi < ql:
            return 0
        if ql <= lo and hi <= qr:
            return self.tree[node]
        mid = (lo + hi) // 2
        return self.query(2 * node, lo, mid, ql, qr) + self.query(2 * node + 1, mid + 1, hi, ql, qr)`,
    `
struct SegTree {
  vector<int> tree;
  int n;
  explicit SegTree(const vector<int>& a) : n(a.size()), tree(4 * a.size(), 0) {
    build(1, 0, n - 1, a);
  }
  void build(int node, int lo, int hi, const vector<int>& a) {
    if (lo == hi) { tree[node] = a[lo]; return; }
    int mid = (lo + hi) / 2;
    build(2 * node, lo, mid, a);
    build(2 * node + 1, mid + 1, hi, a);
    tree[node] = tree[2 * node] + tree[2 * node + 1];
  }
  int query(int node, int lo, int hi, int ql, int qr) const {
    if (qr < lo || hi < ql) return 0;
    if (ql <= lo && hi <= qr) return tree[node];
    int mid = (lo + hi) / 2;
    return query(2 * node, lo, mid, ql, qr) + query(2 * node + 1, mid + 1, hi, ql, qr);
  }
};`,
    `
static final class SegTree {
  private final int[] tree;
  private final int n;

  SegTree(int[] a) {
    n = a.length;
    tree = new int[4 * n];
    build(1, 0, n - 1, a);
  }

  private void build(int node, int lo, int hi, int[] a) {
    if (lo == hi) { tree[node] = a[lo]; return; }
    int mid = (lo + hi) >>> 1;
    build(2 * node, lo, mid, a);
    build(2 * node + 1, mid + 1, hi, a);
    tree[node] = tree[2 * node] + tree[2 * node + 1];
  }

  int query(int node, int lo, int hi, int ql, int qr) {
    if (qr < lo || hi < ql) return 0;
    if (ql <= lo && hi <= qr) return tree[node];
    int mid = (lo + hi) >>> 1;
    return query(2 * node, lo, mid, ql, qr) + query(2 * node + 1, mid + 1, hi, ql, qr);
  }
}`,
  ),
  explanation: [
    'Each node owns a fixed range and stores that range’s aggregate (here, its sum), so any query decomposes into O(log n) stored ranges.',
    'Three cases decide the recursion: no overlap (return the identity), full overlap (return the stored value), partial (split into the two children).',
    'Updates are O(log n) because only one root-to-leaf path changes; every ancestor is re-summed on the way back up.',
  ],
  learn: {
    useCases: ['Range sum/min/max with point or range updates', 'Counting inversions and frequencies', 'Interval problems where a prefix-sum array would be O(n) to update'],
    practice: [
      { title: 'Range Sum Query — Mutable', url: 'https://leetcode.com/problems/range-sum-query-mutable/', difficulty: 'medium' },
      { title: 'Count of Range Sum', url: 'https://leetcode.com/problems/count-of-range-sum/', difficulty: 'hard' },
    ],
  },
  defaultInput: TREE_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const n = values.length;
    const model = new TreeModel();
    let operation: SegmentData['operation'] = 'build';
    let caption = 'Building bottom-up: leaves are the array itself';

    const nodeIds = new Map<number, string>();
    const rangeOf = new Map<string, readonly [number, number]>();

    /** Builds the tree model (structure + stored sums) before narration starts. */
    const build = (index: number, lo: number, hi: number, parent: number | null): string => {
      const total = values.slice(lo, hi + 1).reduce((sum, v) => sum + v, 0);
      const id = model.create(total, { sub: `[${lo}..${hi}]`, keys: [String(total)], prefix: 'sg' });
      nodeIds.set(index, id);
      rangeOf.set(id, [lo, hi]);
      model.attach(id, parent === null ? null : (nodeIds.get(parent) as string));
      if (lo !== hi) {
        const mid = (lo + hi) >> 1;
        build(2 * index, lo, mid, index);
        build(2 * index + 1, mid + 1, hi, index);
      }
      return id;
    };

    const rootId = build(1, 0, n - 1, null);

    const builder = new TraceBuilder<TreeSnapshot, SegmentData>(() =>
      model.snapshot({
        kind: 'binary',
        caption,
        badges: { nodes: model.size, operation, ...(values.length ? { array: values.join(',') } : {}) },
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Segment tree over ${n} values, allocated as 4n slots but only 2n−1 nodes are used.`,
      highlight: { nodes: [rootId] },
      badges: { nodes: model.size, operation: 'build' },
      pseudocodeLine: 0,
      codeLine: 2,
      weight: 1.6,
    });

    /* ── show the O(n) build, level by level ──────────────────────────────── */
    const levels = model.levelOrder();
    levels.forEach((level, depth) => {
      const ids = level.filter((id) => rangeOf.has(id));
      const leaves = ids.filter((id) => (model.get(id)?.children ?? []).length === 0);
      const value = ids.reduce((acc, id) => {
        const [lo, hi] = rangeOf.get(id) ?? [0, 0];
        return acc + values.slice(lo, hi + 1).reduce((s, v) => s + v, 0);
      }, 0);
      model.clearRoles();
      model.setRole(leaves, 'success');
      model.setRole(ids.filter((id) => !leaves.includes(id)), 'active');
      caption = `level ${depth}: ${leaves.length} leaves, ${ids.length - leaves.length} internal nodes`;
      builder.emit({
        kind: depth === levels.length - 1 ? 'complete' : 'fill',
        description:
          depth === levels.length - 1
            ? `Leaves are the raw values; every parent above sums its two children — total work O(n).`
            : `Level ${depth} holds ranges of length ${(n / 2 ** depth).toFixed(0).replace('.0', '')}.`,
        highlight: { nodes: ids },
        badges: { nodes: model.size, level: depth, levelSum: value, operation: 'build' },
        pseudocodeLine: 4,
        codeLine: 12,
        data: { operation: 'build' },
        weight: depth === levels.length - 1 ? 1.8 : 0.9,
        bump: ['writes'],
      });
    });

    /* ── a range query, walked recursively ────────────────────────────────── */
    operation = 'query';
    const ql = 1;
    const qr = Math.max(2, n - 3);
    const collected: number[] = [];

    const walk = (index: number, lo: number, hi: number, depth: number): number => {
      const id = nodeIds.get(index) as string;
      const stored = values.slice(lo, hi + 1).reduce((s, v) => s + v, 0);

      if (qr < lo || hi < ql) {
        model.setRole([id], 'muted');
        builder.emit({
          kind: 'prune',
          description: `[${lo}..${hi}] does not intersect [${ql}..${qr}] — the whole subtree is skipped.`,
          highlight: { nodes: [id] },
          badges: { nodes: model.size, query: `[${ql}..${qr}]`, operation },
          pseudocodeLine: 7,
          codeLine: 15,
          data: { operation, range: [lo, hi], covered: [ql, qr] },
          weight: 0.8,
          bump: ['comparisons'],
        });
        return 0;
      }

      if (ql <= lo && hi <= qr) {
        collected.push(stored);
        model.setRole([id], 'success');
        builder.emit({
          kind: 'found',
          description: `[${lo}..${hi}] sits entirely inside the query — take its stored sum ${stored} in one step.`,
          highlight: { nodes: [id] },
          badges: { nodes: model.size, query: `[${ql}..${qr}]`, taken: collected.length, operation },
          pseudocodeLine: 8,
          codeLine: 16,
          data: { operation, range: [lo, hi], covered: [ql, qr] },
          weight: 1.3,
          bump: ['reads'],
        });
        return stored;
      }

      model.setRole([id], 'pivot');
      builder.emit({
        kind: 'split',
        description: `[${lo}..${hi}] overlaps the query only partially — split into both halves.`,
        highlight: { nodes: [id] },
        badges: { nodes: model.size, query: `[${ql}..${qr}]`, operation },
        pseudocodeLine: 10,
        codeLine: 17,
        data: { operation, range: [lo, hi], covered: [ql, qr] },
        weight: 0.9,
        bump: ['comparisons'],
      });

      const mid = (lo + hi) >> 1;
      return walk(2 * index, lo, mid, depth + 1) + walk(2 * index + 1, mid + 1, hi, depth + 1);
    };

    const answer = walk(1, 0, n - 1, 0);
    model.clearRoles();
    model.setRole([rootId], 'frontier');
    caption = `query(${ql}, ${qr}) = ${answer} assembled from ${collected.length} stored ranges`;
    builder.emit({
      kind: 'complete',
      description: `Answer ${answer} came from ${collected.length} nodes (${collected.join(' + ')}) — that is the O(log n) promise.`,
      highlight: { nodes: [rootId] },
      badges: { nodes: model.size, query: `[${ql}..${qr}]`, answer, nodesTouched: collected.length },
      pseudocodeLine: 10,
      codeLine: 18,
      weight: 2.4,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `Range sum [${ql}..${qr}] = ${answer}`,
        detail: `${collected.length} stored ranges → O(log n) instead of ${qr - ql + 1} additions`,
        output: { sum: answer, nodesUsed: collected.length },
      },
    });
  },
};

export const definition: AlgorithmDefinition<TreeSnapshot, SegmentData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: TreeVisualizer });
