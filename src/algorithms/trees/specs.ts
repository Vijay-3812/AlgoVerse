import type { AlgorithmInput, Complexity } from '@/types';
import { TREE_VALUES } from './kit';

/** Default tree input: seven values inserted in median order, so it stays bushy. */
export const TREE_DEFAULT_INPUT = (): AlgorithmInput => ({ kind: 'tree', values: [...TREE_VALUES] });

export const COMPLEXITY: Record<string, Complexity> = {
  'bt-traversals': {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(h) recursion · O(w) queue for level order',
    kind: 'depth-first & breadth-first',
    notes: [
      'In-order on a BST yields sorted order; pre-order copies the tree; post-order deletes it.',
      'Level order is the only one that needs a queue instead of a stack.',
    ],
  },
  bst: {
    time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' },
    space: 'O(h)',
    kind: 'ordered binary tree',
    notes: ['All three operations are O(height); sorted inserts turn the height into n.', 'The invariant is left < node < right — not just "children are smaller".'],
  },
  avl: {
    time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(h) ≈ O(log n)',
    kind: 'height-balanced',
    notes: [
      'Every node keeps |balance| ≤ 1, so the height never exceeds 1.44 log₂n.',
      'Four rotation cases (LL, RR, LR, RL) repair every imbalance.',
    ],
  },
  'red-black-tree': {
    time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(n)',
    kind: 'colour-balanced',
    notes: [
      'Red nodes cannot have red children, and every root-to-leaf path counts the same number of black nodes.',
      'Looser than AVL (height ≤ 2 log₂n) but cheaper to update — which is why std::map is red-black.',
    ],
  },
  heap: {
    time: { best: 'O(1) peek', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(n)',
    kind: 'complete binary tree',
    notes: ['A heap is complete by construction, so it never needs rebalancing.', 'Heapify is O(n), not O(n log n) — the bottom levels dominate and are cheap.'],
  },
  trie: {
    time: { best: 'O(1)', average: 'O(m)', worst: 'O(m)' },
    space: 'O(total chars · alphabet)',
    kind: 'prefix tree',
    notes: [
      'Lookup cost depends on the key length m, not the number of stored keys — this is why autocomplete uses tries.',
      'The memory bill is the alphabet size per node, which is what compressed variants (radix, DAWG) attack.',
    ],
  },
  'segment-tree': {
    time: { best: 'O(1) full range', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(2n) arrays, O(4n) with padding',
    kind: 'range queries',
    notes: ['Each node stores one range’s aggregate; a query touches O(log n) nodes.', 'Build is O(n) because there are 2n−1 nodes and each does O(1) work.'],
  },
  'fenwick-tree': {
    time: { best: 'O(1) prefix', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(n)',
    kind: 'binary indexed tree',
    notes: [
      '`i += i & -i` walks up, `i -= i & -i` walks down — the low bit encodes each node’s range.',
      'Half the memory and a smaller constant than a segment tree, but only for invertible operations.',
    ],
  },
  'b-tree': {
    time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(n)',
    kind: 'multi-way, disk-friendly',
    notes: [
      'Order-m nodes hold up to m−1 keys and m children, so the height is tiny: 3 levels index millions of rows.',
      'A node splits when it overflows and merges when it underflows twice — that keeps every leaf at the same depth.',
    ],
  },
};
