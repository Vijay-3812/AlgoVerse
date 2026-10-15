import type { AlgorithmDefinition, TreeSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { TreeVisualizer } from '@/visualizers/TreeVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, TREE_DEFAULT_INPUT } from './specs';
import { TreeModel } from './kit';

export interface BstData {
  readonly operation: 'insert' | 'search' | 'delete';
  readonly value: number;
  readonly compares: number;
}

/**
 * Binary Search Tree — insert, search and delete.
 *
 * Nodes are *created detached and then linked*, never re-parented, so the
 * visualiser shows a real attachment: a new node flies to its parent's left or
 * right slot. Delete covers the three cases students mix up — leaf, single
 * child, two children (replaced by the in-order successor).
 */
const spec: AlgorithmSpec<TreeSnapshot, BstData> = {
  id: 'bst',
  complexity: COMPLEXITY.bst!,
  pseudocode: pseudo(`
#insert(root, x)                    ▸ O(h)
#   if root = null: return new Node(x)
#   if x < root.key: root.left ← insert(root.left, x)
#   else: root.right ← insert(root.right, x)
#   return root
#
#search(root, x)                     ▸ O(h)
#   while root ≠ null and root.key ≠ x
#     root ← x < root.key ? root.left : root.right
#   return root
#
#delete(root, x)                     ▸ O(h)
#   if x < root.key: root.left ← delete(root.left, x)
#   elif x > root.key: root.right ← delete(root.right, x)
#   else:
#     if root has one child: return that child
#     successor ← min(root.right)      ▸ two children
#     root.key ← successor.key
#     root.right ← delete(root.right, successor.key)`),
  code: code(
    `
class Node {
  constructor(key) { this.key = key; this.left = null; this.right = null; }
}

function insert(root, x) {
  if (!root) return new Node(x);
  if (x < root.key) root.left = insert(root.left, x);
  else root.right = insert(root.right, x);
  return root;
}

function search(root, x) {
  while (root && root.key !== x) root = x < root.key ? root.left : root.right;
  return root;
}

function remove(root, x) {
  if (!root) return null;
  if (x < root.key) root.left = remove(root.left, x);
  else if (x > root.key) root.right = remove(root.right, x);
  else {
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    let successor = root.right;
    while (successor.left) successor = successor.left;
    root.key = successor.key;
    root.right = remove(root.right, successor.key);
  }
  return root;
}`,
    `
class Node:
    __slots__ = ("key", "left", "right")

    def __init__(self, key):
        self.key, self.left, self.right = key, None, None


def insert(root, x):
    if root is None:
        return Node(x)
    if x < root.key:
        root.left = insert(root.left, x)
    else:
        root.right = insert(root.right, x)
    return root


def search(root, x):
    while root and root.key != x:
        root = root.left if x < root.key else root.right
    return root


def remove(root, x):
    if root is None:
        return None
    if x < root.key:
        root.left = remove(root.left, x)
    elif x > root.key:
        root.right = remove(root.right, x)
    else:
        if root.left is None:
            return root.right
        if root.right is None:
            return root.left
        successor = root.right
        while successor.left:
            successor = successor.left
        root.key = successor.key
        root.right = remove(root.right, successor.key)
    return root`,
    `
struct Node {
  int key;
  Node *left = nullptr, *right = nullptr;
  explicit Node(int k) : key(k) {}
};

Node* insert(Node* root, int x) {
  if (!root) return new Node(x);
  if (x < root->key) root->left = insert(root->left, x);
  else root->right = insert(root->right, x);
  return root;
}

Node* search(Node* root, int x) {
  while (root && root->key != x) root = x < root->key ? root->left : root->right;
  return root;
}

Node* remove(Node* root, int x) {
  if (!root) return nullptr;
  if (x < root->key) { root->left = remove(root->left, x); return root; }
  if (x > root->key) { root->right = remove(root->right, x); return root; }
  if (!root->left) { Node* r = root->right; delete root; return r; }
  if (!root->right) { Node* l = root->left; delete root; return l; }
  Node* successor = root->right;
  while (successor->left) successor = successor->left;
  root->key = successor->key;
  root->right = remove(root->right, successor->key);
  return root;
}`,
    `
static final class Node {
  int key;
  Node left, right;
  Node(int key) { this.key = key; }
}

static Node insert(Node root, int x) {
  if (root == null) return new Node(x);
  if (x < root.key) root.left = insert(root.left, x);
  else root.right = insert(root.right, x);
  return root;
}

static Node search(Node root, int x) {
  while (root != null && root.key != x) root = x < root.key ? root.left : root.right;
  return root;
}

static Node remove(Node root, int x) {
  if (root == null) return null;
  if (x < root.key) root.left = remove(root.left, x);
  else if (x > root.key) root.right = remove(root.right, x);
  else {
    if (root.left == null) return root.right;
    if (root.right == null) return root.left;
    Node successor = root.right;
    while (successor.left != null) successor = successor.left;
    root.key = successor.key;
    root.right = remove(root.right, successor.key);
  }
  return root;
}`,
  ),
  explanation: [
    'A BST keeps the invariant left < node < right, so a search discards half of the remaining tree at every comparison.',
    'Insert walks down to the first empty slot; delete has three cases, and only the two-child case needs the in-order successor.',
    'Everything costs O(height): O(log n) when balanced, O(n) when the inserts arrive sorted — which is exactly why AVL and Red-Black trees exist.',
  ],
  learn: {
    useCases: ['Ordered maps and sets', 'Range queries with ordered iteration', 'Basis for AVL/Red-Black/treaps'],
    quiz: [
      {
        question: 'Deleting a node with two children replaces its key with…',
        options: ['its parent', 'the in-order successor (smallest key in the right subtree)', 'the largest key in the left subtree only', 'nothing, the node is dropped'],
        answer: 1,
        why: 'The successor is the next key in sorted order, so overwriting the key preserves the BST invariant on both sides.',
      },
      {
        question: 'What is the worst-case height of an unbalanced BST with n keys?',
        options: ['log₂n', '√n', 'n − 1', 'n/2'],
        answer: 2,
        why: 'Inserting sorted keys builds a path: every node has only a right child, so the tree is a linked list.',
      },
    ],
    practice: [
      { title: 'Validate Binary Search Tree', url: 'https://leetcode.com/problems/validate-binary-search-tree/', difficulty: 'medium' },
      { title: 'Delete Node in a BST', url: 'https://leetcode.com/problems/delete-node-in-a-bst/', difficulty: 'medium' },
    ],
  },
  defaultInput: TREE_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new TreeModel();
    let operation: BstData['operation'] = 'insert';
    let caption = 'Empty BST';
    let compares = 0;

    const builder = new TraceBuilder<TreeSnapshot, BstData>(() =>
      model.snapshot({
        kind: 'binary',
        caption,
        badges: { nodes: model.size, height: heightOf(model), operation },
      }),
    );

    builder.emit({
      kind: 'init',
      description: 'Empty BST: keeping left < node < right is the only rule.',
      badges: { nodes: 0, operation },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    /* ── insert every value ───────────────────────────────────────────────── */
    operation = 'insert';
    for (const value of values) {
      compares = 0;
      if (model.size === 0) {
        const rootId = model.create(value);
        model.attach(rootId, null);
        model.setRole([rootId], 'success');
        caption = `${value} becomes the root`;
        builder.emit({
          kind: 'insert',
          description: `${value} is the first key, so it becomes the root.`,
          highlight: { nodes: [rootId] },
          badges: { nodes: model.size, height: 1, operation },
          pseudocodeLine: 1,
          codeLine: 5,
          data: { operation, value, compares },
          weight: 2,
          bump: ['writes'],
        });
        continue;
      }

      let current = model.roots[0];
      const path: string[] = [];
      let parentId: string | null = null;
      let side: 'left' | 'right' = 'right';

      model.clearRoles();
      builder.emit({
        kind: 'info',
        description: `Insert ${value}: walk down from the root, comparing as we go.`,
        highlight: { nodes: current ? [current] : [] },
        badges: { nodes: model.size, operation, inserting: value },
        pseudocodeLine: 2,
        codeLine: 6,
        data: { operation, value, compares },
        weight: 1,
      });

      while (current) {
        const key = model.valueOf(current);
        path.push(current);
        compares += 1;
        const goLeft = value < key;
        model.setRole([...path], 'visited');
        model.setRole([current], 'compare');

        builder.emit({
          kind: 'compare',
          description: `${value} ${goLeft ? '<' : '>'} ${key} — descend to the ${goLeft ? 'left' : 'right'}.`,
          highlight: { nodes: [current] },
          badges: { nodes: model.size, operation, compares },
          pseudocodeLine: 2,
          codeLine: 7,
          data: { operation, value, compares },
          weight: 0.85,
          bump: ['comparisons', 'reads'],
        });

        parentId = current;
        side = goLeft ? 'left' : 'right';
        current = model.get(current)?.children[goLeft ? 0 : 1] ?? '';
      }

      const newId = model.create(value);
      model.attach(newId, parentId, side);
      model.setRole([...path], 'visited');
      model.setRole([newId], 'success');
      caption = `${value} hangs off ${parentId ? model.labelOf(parentId) : '—'} on the ${side}`;
      builder.emit({
        kind: 'insert',
        description: `Empty slot found after ${compares} comparison${compares === 1 ? '' : 's'} — ${value} becomes the ${side} child.`,
        highlight: { nodes: [newId, ...(parentId ? [parentId] : [])] },
        badges: { nodes: model.size, height: heightOf(model), operation, compares },
        pseudocodeLine: 1,
        codeLine: 5,
        data: { operation, value, compares },
        weight: 1.8,
        bump: ['writes'],
      });
    }

    /* ── search for a value that exists ───────────────────────────────────── */
    operation = 'search';
    const needle = values[Math.min(values.length - 1, 2)] ?? 0;
    compares = 0;
    let current = model.roots[0];
    const path: string[] = [];

    while (current && model.valueOf(current) !== needle) {
      const key = model.valueOf(current);
      compares += 1;
      path.push(current);
      model.setRole([...path], 'visited');
      model.setRole([current], 'compare');
      builder.emit({
        kind: 'compare',
        description: `Search: ${needle} ≠ ${key} — go ${needle < key ? 'left' : 'right'}.`,
        highlight: { nodes: [current] },
        badges: { nodes: model.size, operation, compares },
        pseudocodeLine: 7,
        codeLine: 12,
        data: { operation, value: needle, compares },
        weight: 0.85,
        bump: ['comparisons', 'reads'],
      });
      current = model.get(current)?.children[needle < key ? 0 : 1] ?? '';
    }

    if (current) {
      model.setRole([...path], 'visited');
      model.setRole([current], 'success');
      builder.emit({
        kind: 'found',
        description: `Found ${needle} on the ${needle < model.valueOf(model.roots[0] ?? '') ? 'left' : 'right'} side after ${compares} comparisons.`,
        highlight: { nodes: [current] },
        badges: { nodes: model.size, operation, compares },
        pseudocodeLine: 8,
        codeLine: 13,
        data: { operation, value: needle, compares },
        weight: 2.2,
      });
    }

    /* ── delete: the two-children case, found by walking down ─────────────── */
    operation = 'delete';
    const victim = model.roots[0] ? model.valueOf(model.roots[0]) : 0;
    const rootId = model.roots[0];
    const kids = model.get(rootId)?.children ?? [];
    if (kids.length === 2) {
      model.setRole([rootId], 'danger');
      caption = `Delete the root (${victim}) — two children, so find the in-order successor`;
      builder.emit({
        kind: 'mark',
        description: `Deleting ${victim} with two children: overwrite its key with the in-order successor and delete that instead.`,
        highlight: { nodes: [rootId] },
        badges: { nodes: model.size, operation, target: victim },
        pseudocodeLine: 16,
        codeLine: 23,
        data: { operation, value: victim, compares },
        weight: 1.5,
        bump: ['reads'],
      });

      let successor = kids[1] as string;
      const successorPath: string[] = [];
      while (model.get(successor)?.children[0]) {
        successorPath.push(successor);
        model.setRole([...successorPath], 'visited');
        model.setRole([successor], 'pivot');
        builder.emit({
          kind: 'visit',
          description: `Successor hunt: ${model.labelOf(successor)} has a left child, keep going left.`,
          highlight: { nodes: [successor] },
          badges: { nodes: model.size, operation },
          pseudocodeLine: 16,
          codeLine: 24,
          data: { operation, value: victim, compares },
          weight: 0.9,
        });
        successor = model.get(successor)?.children[0] as string;
      }

      model.setRole([successor], 'pivot');
      builder.emit({
        kind: 'found',
        description: `Smallest key in the right subtree is ${model.labelOf(successor)} — it replaces ${victim}.`,
        highlight: { nodes: [successor] },
        badges: { nodes: model.size, operation, successor: model.labelOf(successor) },
        pseudocodeLine: 16,
        codeLine: 24,
        data: { operation, value: victim, compares },
        weight: 1.6,
      });

      const successorId = successor;
      const successorValue = model.valueOf(successorId);
      model.remove(successorId);
      model.nodes.set(rootId as string, {
        ...(model.get(rootId) as NonNullable<ReturnType<TreeModel['get']>>),
        label: String(successorValue),
      });
      model.setRole([rootId], 'success');
      caption = `Root key is now ${successorValue}`;
      builder.emit({
        kind: 'write',
        description: `Root now holds ${successorValue}; the duplicate node in the right subtree is spliced out.`,
        highlight: { nodes: [rootId] },
        badges: { nodes: model.size, height: heightOf(model), operation },
        pseudocodeLine: 17,
        codeLine: 25,
        data: { operation, value: successorValue, compares },
        weight: 2,
        bump: ['writes'],
      });
    }

    const output = model.inorderBinary();
    model.setRole(output, 'success');
    caption = `In-order: ${output.map((id) => model.labelOf(id)).join(' → ')}`;
    builder.emit({
      kind: 'complete',
      description: `In-order traversal is sorted: ${model.inorderBinary().map((id) => model.labelOf(id)).join(', ')}.`,
      highlight: { nodes: output },
      badges: { nodes: model.size, height: heightOf(model), operation },
      pseudocodeLine: 18,
      codeLine: 28,
      weight: 2.4,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'BST operations complete',
        detail: `${model.size} nodes, height ${heightOf(model)}`,
        output: model.inorderBinary().map((id) => model.valueOf(id)),
      },
    });
  },
};

/** Height of the tallest root, counting a single node as 1. */
function heightOf(model: TreeModel): number {
  const walk = (id: string | null | undefined): number => {
    if (!id) return 0;
    const kids = model.get(id)?.children ?? [];
    return 1 + Math.max(0, ...kids.map((kid) => walk(kid)));
  };
  return Math.max(0, ...model.roots.map((root) => walk(root)));
}

export const definition: AlgorithmDefinition<TreeSnapshot, BstData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: TreeVisualizer });
