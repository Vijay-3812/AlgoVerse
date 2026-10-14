import type { ModuleLoader } from '@/engine/registry';

/**
 * Trees family loader table: traversals, BST, AVL, Red-Black, heap, trie,
 * segment tree, Fenwick tree and the multi-way B-tree.
 */
export const TREE_LOADERS: Readonly<Record<string, ModuleLoader>> = {
  'bt-traversals': () => import('./btTraversals').then((m) => m.module),
  bst: () => import('./bst').then((m) => m.module),
  avl: () => import('./avl').then((m) => m.module),
  'red-black-tree': () => import('./redBlack').then((m) => m.module),
  heap: () => import('./heap').then((m) => m.module),
  trie: () => import('./trie').then((m) => m.module),
  'segment-tree': () => import('./segmentTree').then((m) => m.module),
  'fenwick-tree': () => import('./fenwick').then((m) => m.module),
  'b-tree': () => import('./bTree').then((m) => m.module),
};
