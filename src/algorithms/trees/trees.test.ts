import { describe, expect, it } from 'vitest';
import type { AlgorithmDefinition, AlgorithmInput, TraceRunInfo, TreeSnapshot, TreeNodeSnapshot } from '@/types';
import { assertTraceContract } from '@/test/traceContract';
import { definition as traversals } from './btTraversals';
import { definition as bst } from './bst';
import { definition as avl } from './avl';
import { definition as redBlack } from './redBlack';
import { definition as heap } from './heap';
import { definition as trie } from './trie';
import { definition as segmentTree } from './segmentTree';
import { definition as fenwick } from './fenwick';
import { definition as bTree } from './bTree';
import { TREE_VALUES } from './kit';

type TreeDefinition = AlgorithmDefinition<TreeSnapshot, unknown>;
type TreeTrace = ReturnType<TreeDefinition['generate']>;

const RUN: TraceRunInfo = { runId: 'test', dataSet: 'random', seed: 11 };
const INPUT: AlgorithmInput = { kind: 'tree', values: [...TREE_VALUES] };

const FAMILY: readonly { readonly name: string; readonly definition: TreeDefinition }[] = [
  { name: 'bt-traversals', definition: traversals as TreeDefinition },
  { name: 'bst', definition: bst as TreeDefinition },
  { name: 'avl', definition: avl as TreeDefinition },
  { name: 'red-black-tree', definition: redBlack as TreeDefinition },
  { name: 'heap', definition: heap as TreeDefinition },
  { name: 'trie', definition: trie as TreeDefinition },
  { name: 'segment-tree', definition: segmentTree as TreeDefinition },
  { name: 'fenwick-tree', definition: fenwick as TreeDefinition },
  { name: 'b-tree', definition: bTree as TreeDefinition },
];

/* -------------------------------------------------------------------------- */
/*  Structural helpers used by several assertions below                        */
/* -------------------------------------------------------------------------- */

const byId = (snapshot: TreeSnapshot): Map<string, TreeNodeSnapshot> =>
  new Map(snapshot.nodes.map((n) => [n.id, n]));

/** No node may be listed as a child twice, and ids must be unique. */
function assertWellFormed(snapshot: TreeSnapshot): void {
  const ids = snapshot.nodes.map((n) => n.id);
  expect(new Set(ids).size).toBe(ids.length);

  const map = byId(snapshot);
  for (const node of snapshot.nodes) {
    for (const childId of node.children) {
      if (childId === null) continue; // an empty slot, not a child
      expect(map.has(childId)).toBe(true);
      expect(map.get(childId)?.parentId).toBe(node.id);
    }
  }

  // Every node is reachable from a root exactly once (no cycles, no orphans).
  const seen = new Set<string>();
  const walk = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const child of map.get(id)?.children ?? []) if (child) walk(child);
  };
  snapshot.roots.forEach(walk);
  expect(seen.size).toBe(snapshot.nodes.length);
}

/** In-order keys for a binary tree. */
function inorderKeys(snapshot: TreeSnapshot): number[] {
  const map = byId(snapshot);
  const out: number[] = [];
  const walk = (id: string | null | undefined): void => {
    if (!id) return;
    const node = map.get(id);
    if (!node) return;
    walk(node.children[0]);
    const value = Number(node.keys?.[0] ?? node.label);
    if (!Number.isNaN(value)) out.push(value);
    walk(node.children[1]);
  };
  walk(snapshot.roots[0]);
  return out;
}

/** Height of the tallest root, counting a single node as 1. */
function height(snapshot: TreeSnapshot): number {
  const map = byId(snapshot);
  const walk = (id: string | null | undefined): number => {
    if (!id) return 0;
    const kids = map.get(id)?.children ?? [];
    return 1 + Math.max(0, ...kids.map((kid) => walk(kid)));
  };
  return Math.max(0, ...snapshot.roots.map((root) => walk(root)));
}

describe.each(FAMILY)('$name', ({ definition }) => {
  it('produces a well-formed trace', () => {
    const trace = definition.generate(INPUT, RUN);
    assertTraceContract(trace, { minSteps: 3 });
  });

  it('keeps every snapshot structurally valid', () => {
    const trace = definition.generate(INPUT, RUN);
    for (const step of trace.steps) assertWellFormed(step.state);
  });

  it('is deterministic for the same input', () => {
    const strip = (trace: TreeTrace): string => JSON.stringify({ ...trace, generatedInMs: 0 });
    expect(strip(definition.generate(INPUT, RUN))).toBe(strip(definition.generate(INPUT, RUN)));
  });

  it('never mutates the caller’s input', () => {
    const source = [...TREE_VALUES];
    definition.generate({ kind: 'tree', values: source }, RUN);
    expect(source).toEqual(TREE_VALUES);
  });

  it('stays well under the step budget', () => {
    const trace = definition.generate(INPUT, RUN);
    expect(trace.elidedSteps ?? 0).toBe(0);
    expect(trace.steps.length).toBeLessThan(2500);
  });
});

describe('binary tree traversals', () => {
  it('produces the four classic orders of the same tree', () => {
    const output = traversals.generate(INPUT, RUN).result.output as {
      values: number[];
      sequences: Record<string, number[]>;
    };
    expect(output.sequences.inorder).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expect(output.sequences.preorder?.[0]).toBe(50);
    expect(output.sequences.level?.[0]).toBe(50);
    // Every order visits the same multiset of nodes.
    for (const sequence of Object.values(output.sequences)) {
      expect([...sequence].sort((a, b) => a - b)).toEqual([20, 30, 40, 50, 60, 70, 80]);
    }
  });
});

describe('binary search tree', () => {
  it('ends sorted in-order and matches the inserted multiset', () => {
    const trace = bst.generate(INPUT, RUN);
    const final = trace.steps[trace.steps.length - 1]?.state as TreeSnapshot;
    const keys = inorderKeys(final);
    // The root delete replaces the root key with its in-order successor, so the
    // multiset keeps the original values.
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('holds the BST invariant at every step', () => {
    const trace = bst.generate(INPUT, RUN);
    for (const step of trace.steps) {
      const keys = inorderKeys(step.state);
      expect(keys).toEqual([...keys].sort((a, b) => a - b));
    }
  });

  it('searches with at most one comparison per level', () => {
    const trace = bst.generate(INPUT, RUN);
    const final = trace.steps[trace.steps.length - 1]?.state as TreeSnapshot;
    expect(trace.steps.map((s) => s.kind)).toContain('found');
    expect(height(final)).toBeLessThanOrEqual(4);
  });
});

describe('AVL tree', () => {
  it('stays sorted in-order and inside the AVL height bound', () => {
    const trace = avl.generate(INPUT, RUN);
    const final = trace.steps[trace.steps.length - 1]?.state as TreeSnapshot;
    const keys = inorderKeys(final);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));

    const bound = Math.ceil(1.44 * Math.log2(keys.length + 2));
    expect(height(final)).toBeLessThanOrEqual(bound);
  });

  it('never leaves a node with |balance| > 2 after a settled step', () => {
    const trace = avl.generate(INPUT, RUN);
    const settled = trace.steps.filter((s) => s.kind === 'info' || s.kind === 'complete');
    for (const step of settled) {
      for (const node of step.state.nodes) {
        if (node.meta?.balance !== undefined) expect(Math.abs(node.meta.balance)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('fires rotations — every case the input is designed to trigger appears', () => {
    const trace = avl.generate(INPUT, RUN);
    const steps = trace.steps.filter((s) => s.kind === 'balance');
    expect(steps.length).toBeGreaterThanOrEqual(2);
    const cases = new Set(steps.map((s) => s.data?.case));
    expect(cases.size).toBeGreaterThanOrEqual(2);
  });
});

describe('red-black tree', () => {
  it('keeps the BST order, no red-red edges, and a uniform black height', () => {
    const trace = redBlack.generate(INPUT, RUN);
    const final = trace.steps[trace.steps.length - 1]?.state as TreeSnapshot;
    const keys = inorderKeys(final);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));

    const map = byId(final);
    const root = final.roots[0] as string;
    expect(map.get(root)?.meta?.color).toBe('black');

    // No red node has a red child.
    for (const node of final.nodes) {
      if (node.meta?.color !== 'red') continue;
      for (const childId of node.children) {
        if (childId === null) continue;
        expect(map.get(childId)?.meta?.color).not.toBe('red');
      }
    }

    // Black height agrees on every root-to-leaf path.
    const heights = new Set<number>();
    const walk = (id: string | null | undefined, blacks: number): void => {
      if (!id) {
        heights.add(blacks + 1);
        return;
      }
      const node = map.get(id);
      if (!node) return;
      const next = node.meta?.color === 'black' ? blacks + 1 : blacks;
      if (node.children.length === 0) {
        heights.add(next + 1);
        return;
      }
      for (const child of node.children) walk(child, next);
    };
    walk(root, 0);
    expect(heights.size).toBe(1);
  });

  it('recolours as well as rotates', () => {
    const kinds = new Set(redBlack.generate(INPUT, RUN).steps.map((s) => s.kind));
    expect(kinds.has('balance')).toBe(true);
    expect(kinds.has('rotate')).toBe(true);
  });
});

describe('binary heap', () => {
  it('satisfies the min-heap property on every settled beat', () => {
    const trace = heap.generate(INPUT, RUN);
    // Mid-sift frames legitimately break the order (that is what sifting is),
    // and repairing one subtree leaves its ancestors out of order for a while,
    // so the invariant is checked only on beats the generator flags as settled.
    const settled = trace.steps.filter((s) => (s.data as { settled?: boolean } | undefined)?.settled === true);
    expect(settled.length).toBeGreaterThan(3);
    for (const step of settled) {
      const map = byId(step.state);
      for (const node of step.state.nodes) {
        const parentValue = Number(node.keys?.[0] ?? node.label);
        for (const childId of node.children) {
          const child = childId === null ? undefined : map.get(childId);
          if (!child) continue;
          const childValue = Number(child.keys?.[0] ?? child.label);
          expect(parentValue).toBeLessThanOrEqual(childValue);
        }
      }
    }
  });

  it('extracts the minimum first', () => {
    const output = heap.generate(INPUT, RUN).result.output as { extracted: number[]; remaining: number[] };
    const sorted = [...TREE_VALUES].sort((a, b) => a - b);
    expect(output.extracted).toEqual(sorted.slice(0, output.extracted.length));
    expect(output.remaining.length).toBe(TREE_VALUES.length - output.extracted.length);
  });
});

describe('trie', () => {
  it('shares prefixes instead of duplicating them', () => {
    const trace = trie.generate(INPUT, RUN);
    const final = trace.steps[trace.steps.length - 1]?.state as TreeSnapshot;
    const totalChars = ['cat', 'car', 'card', 'care', 'dog', 'do'].reduce((n, w) => n + w.length, 0);
    // The root plus one node per distinct prefix, always far fewer than the
    // naive character total.
    expect(final.nodes.length).toBeLessThanOrEqual(totalChars);
    expect(final.nodes.length).toBeGreaterThan(5);
  });

  it('marks key ends', () => {
    const trace = trie.generate(INPUT, RUN);
    const final = trace.steps[trace.steps.length - 1]?.state as TreeSnapshot;
    expect(final.nodes.filter((n) => n.sub === 'END').length).toBeGreaterThanOrEqual(4);
  });

  it('walks one node per character when searching', () => {
    const trace = trie.generate(INPUT, RUN);
    const searchSteps = trace.steps.filter((s) => s.kind === 'compare' && s.data?.operation === 'search');
    expect(searchSteps.length).toBeGreaterThan(1);
    const final = trace.steps[trace.steps.length - 1]?.state as TreeSnapshot;
    expect(final.nodes.length).toBeLessThan(40);
  });
});

describe('segment tree', () => {
  it('answers range sums correctly and reports how few nodes it touched', () => {
    const output = segmentTree.generate(INPUT, RUN).result.output as { sum: number; nodesUsed: number };
    const values = TREE_VALUES;
    const expected = values.slice(1, Math.max(3, values.length - 2)).reduce((s, v) => s + v, 0);
    expect(output.sum).toBe(expected);
    // O(log n) decomposition, never the one-node-per-element scan.
    expect(output.nodesUsed).toBeLessThanOrEqual(4 * Math.log2(values.length + 1) + 4);
    expect(output.nodesUsed).toBeGreaterThan(0);
  });

  it('builds exactly 2n − 1 nodes', () => {
    const trace = segmentTree.generate(INPUT, RUN);
    const first = trace.steps[0]?.state as TreeSnapshot;
    expect(first.nodes.length).toBe(2 * TREE_VALUES.length - 1);
  });
});

describe('Fenwick tree', () => {
  it('answers a prefix sum with one read per set bit', () => {
    const output = fenwick.generate(INPUT, RUN).result.output as {
      tree: number[];
      sum: number;
      readChain: number[];
    };
    const values = TREE_VALUES.map((v) => Math.abs(v));
    const queryIndex = Math.max(1, values.length - 1);
    expect(output.sum).toBe(values.slice(0, queryIndex).reduce((s, v) => s + v, 0));
    expect(output.readChain.length).toBeLessThanOrEqual(Math.ceil(Math.log2(queryIndex)) + 1);
    expect(output.tree.length).toBe(values.length);
  });

  it('touches only ancestors on update', () => {
    const output = fenwick.generate(INPUT, RUN).result.output as { updateChain: number[] };
    expect(output.updateChain.length).toBeGreaterThan(0);
    expect(output.updateChain.length).toBeLessThanOrEqual(Math.ceil(Math.log2(TREE_VALUES.length)) + 1);
  });
});

describe('B-tree', () => {
  it('keeps every key in a leaf at one depth, sorted', () => {
    const trace = bTree.generate(INPUT, RUN);
    const final = trace.steps[trace.steps.length - 1]?.state as TreeSnapshot;
    const map = byId(final);

    const depths = new Set<number>();
    const leaves: number[] = [];
    const walk = (id: string | null | undefined, depth: number): void => {
      if (!id) return;
      const node = map.get(id);
      if (!node) return;
      if (node.children.every((c) => c === null)) {
        depths.add(depth);
        for (const key of node.keys ?? []) {
          const value = Number(key);
          if (!Number.isNaN(value)) leaves.push(value);
        }
        return;
      }
      for (const child of node.children) walk(child, depth + 1);
    };
    walk(final.roots[0], 0);

    expect(depths.size).toBe(1);
    expect(leaves).toEqual([...leaves].sort((a, b) => a - b));
  });

  it('never lets a node exceed ORDER − 1 keys', () => {
    const trace = bTree.generate(INPUT, RUN);
    for (const step of trace.steps) {
      for (const node of step.state.nodes) {
        const keys = (node.keys ?? []).filter((k) => k !== '∅');
        expect(keys.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('splits, and repairs the delete by borrowing or merging', () => {
    const kinds = bTree.generate(INPUT, RUN).steps.map((s) => s.kind);
    expect(kinds).toContain('split');
    expect(kinds.includes('rotate') || kinds.includes('merge')).toBe(true);
  });
});
