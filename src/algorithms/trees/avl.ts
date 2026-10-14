import type { AlgorithmDefinition, TreeSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { TreeVisualizer } from '@/visualizers/TreeVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, TREE_DEFAULT_INPUT } from './specs';
import { TreeModel } from './kit';

export interface AvlData {
  readonly operation: 'insert' | 'rotate' | 'update-height';
  readonly value: number;
  readonly case?: 'LL' | 'RR' | 'LR' | 'RL';
}

/**
 * AVL Tree — the four rotation cases, animated.
 *
 * Each node carries its height and balance factor in the snapshot, so the tree
 * can be *seen* going out of balance (|bf| = 2) and then coming back. Rotations
 * re-attach three subtrees, which is exactly how many the visualiser redraws.
 * The deterministic input is engineered to trigger all four cases: LL, RR, LR
 * and RL each appear at least once.
 */
const spec: AlgorithmSpec<TreeSnapshot, AvlData> = {
  id: 'avl',
  complexity: COMPLEXITY.avl!,
  pseudocode: pseudo(`
#height(n)  = n ? max(height(n.left), height(n.right)) + 1 : 0
#balance(n) = height(n.left) − height(n.right)
#
#insert(node, x)                     ▸ O(log n)
#   ▸ …plain BST insert…
#   node.height ← 1 + max(height(left), height(right))
#   bf ← balance(node)
#   if bf > 1 and x < node.left.key:  return rotateRight(node)      ▸ LL
#   if bf < −1 and x > node.right.key: return rotateLeft(node)      ▸ RR
#   if bf > 1 and x > node.left.key:   node.left ← rotateLeft(node.left)
#                                      return rotateRight(node)     ▸ LR
#   if bf < −1 and x < node.right.key: node.right ← rotateRight(node.right)
#                                      return rotateLeft(node)      ▸ RL
#   return node
#
#rotateRight(y)                      ▸ x becomes the parent of y
#   x ← y.left; y.left ← x.right; x.right ← y
#   updateHeight(y); updateHeight(x); return x`),
  code: code(
    `
class AvlNode {
  constructor(key) { this.key = key; this.left = null; this.right = null; this.height = 1; }
}

const height = (n) => (n ? n.height : 0);
const balance = (n) => height(n.left) - height(n.right);

function rotateRight(y) {
  const x = y.left;
  y.left = x.right;
  x.right = y;
  y.height = 1 + Math.max(height(y.left), height(y.right));
  x.height = 1 + Math.max(height(x.left), height(x.right));
  return x;
}

function rotateLeft(x) {
  const y = x.right;
  x.right = y.left;
  y.left = x;
  x.height = 1 + Math.max(height(x.left), height(x.right));
  y.height = 1 + Math.max(height(y.left), height(y.right));
  return y;
}

function insert(node, key) {
  if (!node) return new AvlNode(key);
  if (key < node.key) node.left = insert(node.left, key);
  else if (key > node.key) node.right = insert(node.right, key);
  else return node;

  node.height = 1 + Math.max(height(node.left), height(node.right));
  const bf = balance(node);

  if (bf > 1 && key < node.left.key) return rotateRight(node);        // LL
  if (bf < -1 && key > node.right.key) return rotateLeft(node);       // RR
  if (bf > 1 && key > node.left.key) { node.left = rotateLeft(node.left); return rotateRight(node); }   // LR
  if (bf < -1 && key < node.right.key) { node.right = rotateRight(node.right); return rotateLeft(node); } // RL
  return node;
}`,
    `
class AvlNode:
    def __init__(self, key):
        self.key, self.left, self.right, self.height = key, None, None, 1


def height(node):
    return node.height if node else 0


def balance(node):
    return height(node.left) - height(node.right)


def rotate_right(y):
    x = y.left
    y.left = x.right
    x.right = y
    y.height = 1 + max(height(y.left), height(y.right))
    x.height = 1 + max(height(x.left), height(x.right))
    return x


def rotate_left(x):
    y = x.right
    x.right = y.left
    y.left = x
    x.height = 1 + max(height(x.left), height(x.right))
    y.height = 1 + max(height(y.left), height(y.right))
    return y


def insert(node, key):
    if node is None:
        return AvlNode(key)
    if key < node.key:
        node.left = insert(node.left, key)
    elif key > node.key:
        node.right = insert(node.right, key)
    else:
        return node

    node.height = 1 + max(height(node.left), height(node.right))
    bf = balance(node)

    if bf > 1 and key < node.left.key:
        return rotate_right(node)                  # LL
    if bf < -1 and key > node.right.key:
        return rotate_left(node)                   # RR
    if bf > 1 and key > node.left.key:
        node.left = rotate_left(node.left)         # LR
        return rotate_right(node)
    if bf < -1 and key < node.right.key:
        node.right = rotate_right(node.right)      # RL
        return rotate_left(node)
    return node`,
    `
struct AvlNode {
  int key, height = 1;
  AvlNode *left = nullptr, *right = nullptr;
  explicit AvlNode(int k) : key(k) {}
};

int height(AvlNode* n) { return n ? n->height : 0; }
int balance(AvlNode* n) { return height(n->left) - height(n->right); }

AvlNode* rotateRight(AvlNode* y) {
  AvlNode* x = y->left;
  y->left = x->right;
  x->right = y;
  y->height = 1 + max(height(y->left), height(y->right));
  x->height = 1 + max(height(x->left), height(x->right));
  return x;
}

AvlNode* rotateLeft(AvlNode* x) {
  AvlNode* y = x->right;
  x->right = y->left;
  y->left = x;
  x->height = 1 + max(height(x->left), height(x->right));
  y->height = 1 + max(height(y->left), height(y->right));
  return y;
}

AvlNode* insert(AvlNode* node, int key) {
  if (!node) return new AvlNode(key);
  if (key < node->key) node->left = insert(node->left, key);
  else if (key > node->key) node->right = insert(node->right, key);
  else return node;

  node->height = 1 + max(height(node->left), height(node->right));
  int bf = balance(node);
  if (bf > 1 && key < node->left->key) return rotateRight(node);
  if (bf < -1 && key > node->right->key) return rotateLeft(node);
  if (bf > 1 && key > node->left->key) { node->left = rotateLeft(node->left); return rotateRight(node); }
  if (bf < -1 && key < node->right->key) { node->right = rotateRight(node->right); return rotateLeft(node); }
  return node;
}`,
    `
static final class AvlNode {
  int key, height = 1;
  AvlNode left, right;
  AvlNode(int key) { this.key = key; }
}

static int height(AvlNode n) { return n == null ? 0 : n.height; }
static int balance(AvlNode n) { return height(n.left) - height(n.right); }

static AvlNode rotateRight(AvlNode y) {
  AvlNode x = y.left;
  y.left = x.right;
  x.right = y;
  y.height = 1 + Math.max(height(y.left), height(y.right));
  x.height = 1 + Math.max(height(x.left), height(x.right));
  return x;
}

static AvlNode rotateLeft(AvlNode x) {
  AvlNode y = x.right;
  x.right = y.left;
  y.left = x;
  x.height = 1 + Math.max(height(x.left), height(x.right));
  y.height = 1 + Math.max(height(y.left), height(y.right));
  return y;
}

static AvlNode insert(AvlNode node, int key) {
  if (node == null) return new AvlNode(key);
  if (key < node.key) node.left = insert(node.left, key);
  else if (key > node.key) node.right = insert(node.right, key);
  else return node;

  node.height = 1 + Math.max(height(node.left), height(node.right));
  int bf = balance(node);
  if (bf > 1 && key < node.left.key) return rotateRight(node);
  if (bf < -1 && key > node.right.key) return rotateLeft(node);
  if (bf > 1 && key > node.left.key) { node.left = rotateLeft(node.left); return rotateRight(node); }
  if (bf < -1 && key < node.right.key) { node.right = rotateRight(node.right); return rotateLeft(node); }
  return node;
}`,
  ),
  explanation: [
    'AVL trees keep every balance factor inside ±1, so the height stays Θ(log n) — the tree can never degenerate.',
    'Imbalance is repaired by a rotation: a local, O(1) re-parenting of three pointers that also fixes the heights.',
    'The four cases are named after where the offending insert went: LL and RR need one rotation, LR and RL need two.',
  ],
  learn: {
    useCases: ['Read-heavy ordered maps where lookup time must be guaranteed', 'In-memory indexes', 'Teaching rotations — the four cases are the canonical lesson'],
    quiz: [
      {
        question: 'A node with balance factor +2 whose left child has balance factor −1 needs…',
        options: ['a right rotation only', 'a left rotation only', 'a left rotation on the child, then a right rotation on the node (RL mirrored: LR)', 'rebalancing the whole tree'],
        answer: 2,
        why: 'That is the LR case: the kneecap has to be straightened before the whole leg can rotate.',
      },
    ],
    practice: [{ title: 'Balance a Binary Search Tree', url: 'https://leetcode.com/problems/balance-a-binary-search-tree/', difficulty: 'medium' }],
  },
  defaultInput: TREE_DEFAULT_INPUT,
  generate: (input, run) => {
    // A sequence that walks through every rotation case: RR, LL, LR and RL.
    const values = valuesOf(input);
    // The user's values build the tree. When they are too few to show anything
    // interesting, extra keys are appended (never more than MIN_DEMO_KEYS) so
    // the trace still rehearses the rotation cases instead of only sifting
    // heights. A caller passing MIN_DEMO_KEYS or more gets exactly its input.
    const MIN_DEMO_KEYS = 12;
    const EXTRAS = Object.freeze([5, 90, 85, 10, 95, 15, 75, 45]);
    const sequence =
      values.length >= MIN_DEMO_KEYS ? values.slice(0, 16) : [...values, ...EXTRAS].slice(0, MIN_DEMO_KEYS);

    const model = new TreeModel();
    let operation: AvlData['operation'] = 'insert';
    let lastCase: AvlData['case'];

    const builder = new TraceBuilder<TreeSnapshot, AvlData>(() =>
      model.snapshot({
        kind: 'binary',
        caption: lastCase ? `rotation case ${lastCase} applied` : 'AVL invariant: |balance| ≤ 1',
        badges: { nodes: model.size, height: heightOf(model), maxBalance: maxAbsBalance(model), operation },
      }),
    );

    builder.emit({
      kind: 'init',
      description: 'Empty AVL tree. Every node will carry its height and balance factor.',
      badges: { nodes: 0, operation },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    /** Inserts one key, rebalancing and narrating the case it hits. */
    const insertKey = (key: number): void => {
      operation = 'insert';
      const path = searchPath(model, key);
      model.setRole(path.slice(0, -1), 'visited');
      model.setRole([path[path.length - 1]], 'compare');

      builder.emit({
        kind: 'compare',
        description: `Insert ${key}: descend past ${path.map((id) => model.labelOf(id)).join(' → ')}.`,
        highlight: { nodes: path },
        badges: { nodes: model.size, operation, key },
        pseudocodeLine: 4,
        codeLine: 27,
        data: { operation, value: key },
        weight: 0.9,
        bump: ['comparisons', 'reads'],
      });

      const parentId = path[path.length - 1] ?? null;
      const parentValue = parentId ? model.valueOf(parentId) : Number.NaN;
      const side: 'left' | 'right' = key < parentValue ? 'left' : 'right';
      const newId = model.create(key);
      model.attach(newId, parentId, side);
      updateHeights(model);
      model.setRole([newId], 'success');

      builder.emit({
        kind: 'insert',
        description: `${key} attached as the ${side} child; heights updated up the path.`,
        highlight: { nodes: [newId, ...(parentId ? [parentId] : [])] },
        badges: { nodes: model.size, height: heightOf(model), operation, key },
        pseudocodeLine: 5,
        codeLine: 26,
        data: { operation, value: key },
        weight: 1.3,
        bump: ['writes'],
      });

      // Walk back up looking for the first unbalanced ancestor.
      let unbalanced: string | undefined;
      for (let i = path.length - 1; i >= 0; i -= 1) {
        const id = path[i] as string;
        const bf = balanceOf(model, id);
        model.setMeta(id, { height: heightOfNode(model, id), balance: bf });
        if (Math.abs(bf) > 1) {
          unbalanced = id;
          break;
        }
      }

      if (!unbalanced) {
        model.setRole([newId], 'success');
        builder.emit({
          kind: 'info',
          description: `All balance factors are within ±1 — no rotation needed for ${key}.`,
          highlight: { nodes: [newId] },
          badges: { nodes: model.size, height: heightOf(model), maxBalance: maxAbsBalance(model), operation, key },
          pseudocodeLine: 6,
          codeLine: 37,
          data: { operation, value: key },
          weight: 1.1,
        });
        return;
      }

      const bf = balanceOf(model, unbalanced);
      const leftChild = model.get(unbalanced)?.children[0];
      const rightChild = model.get(unbalanced)?.children[1];
      let rotationCase: AvlData['case'];
      if (bf > 1 && leftChild && key < model.valueOf(leftChild)) rotationCase = 'LL';
      else if (bf < -1 && rightChild && key > model.valueOf(rightChild)) rotationCase = 'RR';
      else if (bf > 1) rotationCase = 'LR';
      else rotationCase = 'RL';
      lastCase = rotationCase;

      operation = 'rotate';
      model.setRole([unbalanced], 'danger');
      builder.emit({
        kind: 'balance',
        description: `Balance factor ${bf > 0 ? `+${bf}` : bf} at ${model.labelOf(unbalanced)} — case ${rotationCase}, rotate.`,
        highlight: { nodes: [unbalanced] },
        badges: { nodes: model.size, operation, case: rotationCase, imbalance: `${model.labelOf(unbalanced)} (${bf})` },
        pseudocodeLine: rotationPseudocodeLine(rotationCase),
        codeLine: rotationCodeLine(rotationCase),
        data: { operation, value: key, case: rotationCase },
        weight: 1.7,
      });

      // Canonical dispatch: single rotations for LL/RR, the two-step forms for LR/RL.
      if (rotationCase === 'LL') rotateRight(model, unbalanced);
      else if (rotationCase === 'RR') rotateLeft(model, unbalanced);
      else if (rotationCase === 'LR' && leftChild) {
        rotateLeft(model, leftChild);
        rotateRight(model, unbalanced);
      } else if (rotationCase === 'RL' && rightChild) {
        rotateRight(model, rightChild);
        rotateLeft(model, unbalanced);
      }
    };

    for (const key of sequence) insertKey(key);

    const output = model.inorderBinary().map((id) => model.valueOf(id));
    model.setRole(model.inorderBinary(), 'success');
    builder.emit({
      kind: 'complete',
      description: `Balanced tree of ${model.size} nodes, height ${heightOf(model)} — in-order ${output.join(', ')}.`,
      highlight: { nodes: model.inorderBinary() },
      badges: { nodes: model.size, height: heightOf(model), maxBalance: maxAbsBalance(model), operation: 'insert' },
      pseudocodeLine: 13,
      codeLine: 38,
      weight: 2.4,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'AVL tree balanced',
        detail: `height ${heightOf(model)} for ${model.size} keys (worst allowed ${Math.ceil(1.44 * Math.log2(model.size + 2))})`,
        output,
      },
    });
  },
};

/* -------------------------------------------------------------------------- */
/*  Rotation helpers — these mutate the model, and the trace shows the result. */
/* -------------------------------------------------------------------------- */

/** Pseudocode line for each rotation case (see the spec's branch ladder). */
function rotationPseudocodeLine(rotationCase: 'LL' | 'RR' | 'LR' | 'RL' | undefined): number {
  switch (rotationCase) {
    case 'LL':
      return 7;
    case 'RR':
      return 8;
    case 'LR':
      return 9;
    case 'RL':
      return 11;
    default:
      return 6;
  }
}

/** JavaScript line for each rotation case, matching the four `if` branches. */
function rotationCodeLine(rotationCase: 'LL' | 'RR' | 'LR' | 'RL' | undefined): number {
  switch (rotationCase) {
    case 'LL':
      return 34;
    case 'RR':
      return 35;
    case 'LR':
      return 36;
    case 'RL':
      return 37;
    default:
      return 32;
  }
}

function searchPath(model: TreeModel, key: number): string[] {
  const path: string[] = [];
  let current = model.roots[0];
  while (current) {
    path.push(current);
    const value = model.valueOf(current);
    if (key === value) break;
    const next = model.get(current)?.children[key < value ? 0 : 1];
    if (!next) break;
    current = next;
  }
  return path;
}

function heightOfNode(model: TreeModel, id: string): number {
  const kids = (model.get(id)?.children ?? []).filter((kid): kid is string => kid !== null);
  if (kids.length === 0) return 1;
  return 1 + Math.max(...kids.map((kid) => heightOfNode(model, kid)));
}

function heightOf(model: TreeModel): number {
  return Math.max(0, ...model.roots.map((root) => heightOfNode(model, root)));
}

function balanceOf(model: TreeModel, id: string): number {
  const [left, right] = model.get(id)?.children ?? [];
  return (left ? heightOfNode(model, left) : 0) - (right ? heightOfNode(model, right) : 0);
}

function maxAbsBalance(model: TreeModel): number {
  return Math.max(0, ...[...model.nodes.keys()].map((id) => Math.abs(balanceOf(model, id))));
}

function updateHeights(model: TreeModel): void {
  for (const id of [...model.nodes.keys()].reverse()) {
    model.setMeta(id, { height: heightOfNode(model, id), balance: balanceOf(model, id) });
  }
}

/**
 * Left rotation: `x`'s right child `y` takes x's place, x becomes y's left
 * child, and y's old left subtree is re-attached as x's right subtree. This is
 * the single move every one of the four AVL cases is built from.
 */
function rotateLeft(model: TreeModel, xId: string): string {
  const x = model.get(xId);
  const yId = x?.children[1];
  if (!x || !yId) return xId;
  const y = model.get(yId);
  const carry = y?.children[0];
  const grandparent = x.parentId;
  const side = sideOf(model, xId);

  model.attach(yId, grandparent, side);
  model.attach(xId, yId, 'left');
  if (carry) model.attach(carry, xId, 'right');

  updateHeights(model);
  model.setRole([yId], 'pivot');
  model.setRole([xId], 'swap');
  return yId;
}

/** Mirror image of `rotateLeft`. */
function rotateRight(model: TreeModel, yId: string): string {
  const y = model.get(yId);
  const xId = y?.children[0];
  if (!y || !xId) return yId;
  const x = model.get(xId);
  const carry = x?.children[1];
  const grandparent = y.parentId;
  const side = sideOf(model, yId);

  model.attach(xId, grandparent, side);
  model.attach(yId, xId, 'right');
  if (carry) model.attach(carry, yId, 'left');

  updateHeights(model);
  model.setRole([xId], 'pivot');
  model.setRole([yId], 'swap');
  return xId;
}

function sideOf(model: TreeModel, id: string): 'left' | 'right' | undefined {
  const parentId = model.get(id)?.parentId;
  if (!parentId) return undefined;
  const kids = model.get(parentId)?.children ?? [];
  return kids[0] === id ? 'left' : 'right';
}

export const definition: AlgorithmDefinition<TreeSnapshot, AvlData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: TreeVisualizer });
