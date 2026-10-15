import type { AlgorithmDefinition, TreeSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { TreeVisualizer } from '@/visualizers/TreeVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, TREE_DEFAULT_INPUT } from './specs';
import { TreeModel } from './kit';

export interface RbData {
  readonly operation: 'insert' | 'recolor' | 'rotate';
  readonly value: number;
  readonly rule?: 'uncle-red' | 'uncle-black';
}

type Color = 'red' | 'black';

/**
 * Red-Black Tree — four invariants, two repair moves.
 *
 * Every node carries its colour as a filled dot in the snapshot, so the two
 * things that keep the tree balanced are both visible: a red node may not have
 * a red child, and every root-to-leaf path counts the same number of black
 * nodes. Repair is recolouring when the uncle is red, and a rotation when it is
 * black — the same two moves, all the way up.
 */
const spec: AlgorithmSpec<TreeSnapshot, RbData> = {
  id: 'red-black-tree',
  complexity: COMPLEXITY['red-black-tree']!,
  pseudocode: pseudo(`
#insert(key)                          ▸ O(log n)
#   node ← BST insert, colour node RED
#   fixup(node)
#
#fixup(node)
#   while parent(node) is RED
#     if uncle(node) is RED:               ▸ recolour case
#       parent ← BLACK, uncle ← BLACK, grandparent ← RED
#       node ← grandparent                   ▸ violation may have moved up
#     else:                                ▸ rotate case
#       if node is "inner" grandchild: rotate parent to straighten
#       rotate grandparent; recolour the new subtree root BLACK
#   root ← BLACK`),
  code: code(
    `
const RED = true, BLACK = false;

class RbNode {
  constructor(key) { this.key = key; this.red = RED; this.left = null; this.right = null; this.parent = null; }
}

function insert(root, key) {
  let node = new RbNode(key), parent = null, cur = root;
  while (cur) { parent = cur; cur = key < cur.key ? cur.left : cur.right; }
  node.parent = parent;
  if (!parent) root = node;
  else if (key < parent.key) parent.left = node;
  else parent.right = node;
  return fixup(root, node);
}

function fixup(root, node) {
  while (node.parent && node.parent.red) {
    const parent = node.parent, grand = parent.parent;
    const uncle = grand.left === parent ? grand.right : grand.left;
    if (uncle && uncle.red) {
      parent.red = uncle.red = BLACK;
      grand.red = RED;
      node = grand;
    } else {
      if (node === parent.right && parent === grand.left) { root = rotateLeft(root, parent); node = parent; }
      else if (node === parent.left && parent === grand.right) { root = rotateRight(root, parent); node = parent; }
      parent.red = BLACK;
      grand.red = RED;
      root = (parent === grand.left) ? rotateRight(root, grand) : rotateLeft(root, grand);
    }
  }
  root.red = BLACK;
  return root;
}`,
    `
RED, BLACK = True, False


class RbNode:
    def __init__(self, key):
        self.key = key
        self.red = RED
        self.left = self.right = self.parent = None


def insert(root, key):
    node, parent, cur = RbNode(key), None, root
    while cur:
        parent, cur = cur, (cur.left if key < cur.key else cur.right)
    node.parent = parent
    if parent is None:
        root = node
    elif key < parent.key:
        parent.left = node
    else:
        parent.right = node
    return fixup(root, node)


def fixup(root, node):
    while node.parent and node.parent.red:
        parent, grand = node.parent, node.parent.parent
        uncle = grand.left if grand.left is not parent else grand.right
        if uncle and uncle.red:
            parent.red = uncle.red = BLACK
            grand.red = RED
            node = grand
        else:
            if node is parent.right and parent is grand.left:
                root = rotate_left(root, parent)
                node = parent
            elif node is parent.left and parent is grand.right:
                root = rotate_right(root, parent)
                node = parent
            parent.red = BLACK
            grand.red = RED
            root = rotate_right(root, grand) if parent is grand.left else rotate_left(root, grand)
    root.red = BLACK
    return root`,
    `
static constexpr bool RED = true, BLACK = false;

struct RbNode {
  int key;
  bool red = RED;
  RbNode *left = nullptr, *right = nullptr, *parent = nullptr;
  explicit RbNode(int k) : key(k) {}
};

RbNode* insert(RbNode* root, int key) {
  RbNode* node = new RbNode(key);
  RbNode* parent = nullptr;
  RbNode* cur = root;
  while (cur) { parent = cur; cur = key < cur->key ? cur->left : cur->right; }
  node->parent = parent;
  if (!parent) root = node;
  else if (key < parent->key) parent->left = node;
  else parent->right = node;
  return fixup(root, node);
}

RbNode* fixup(RbNode* root, RbNode* node) {
  while (node->parent && node->parent->red) {
    RbNode* parent = node->parent;
    RbNode* grand = parent->parent;
    RbNode* uncle = grand->left == parent ? grand->right : grand->left;
    if (uncle && uncle->red) {
      parent->red = uncle->red = BLACK;
      grand->red = RED;
      node = grand;
    } else {
      if (node == parent->right && parent == grand->left) { root = rotateLeft(root, parent); node = parent; }
      else if (node == parent->left && parent == grand->right) { root = rotateRight(root, parent); node = parent; }
      parent->red = BLACK;
      grand->red = RED;
      root = (parent == grand->left) ? rotateRight(root, grand) : rotateLeft(root, grand);
    }
  }
  root->red = BLACK;
  return root;
}`,
    `
private static final boolean RED = true, BLACK = false;

static final class RbNode {
  int key;
  boolean red = RED;
  RbNode left, right, parent;
  RbNode(int key) { this.key = key; }
}

static RbNode insert(RbNode root, int key) {
  RbNode node = new RbNode(key), parent = null, cur = root;
  while (cur != null) { parent = cur; cur = key < cur.key ? cur.left : cur.right; }
  node.parent = parent;
  if (parent == null) root = node;
  else if (key < parent.key) parent.left = node;
  else parent.right = node;
  return fixup(root, node);
}

static RbNode fixup(RbNode root, RbNode node) {
  while (node.parent != null && node.parent.red) {
    RbNode parent = node.parent, grand = parent.parent;
    RbNode uncle = grand.left == parent ? grand.right : grand.left;
    if (uncle != null && uncle.red) {
      parent.red = uncle.red = BLACK;
      grand.red = RED;
      node = grand;
    } else {
      if (node == parent.right && parent == grand.left) { root = rotateLeft(root, parent); node = parent; }
      else if (node == parent.left && parent == grand.right) { root = rotateRight(root, parent); node = parent; }
      parent.red = BLACK;
      grand.red = RED;
      root = parent == grand.left ? rotateRight(root, grand) : rotateLeft(root, grand);
    }
  }
  root.red = BLACK;
  return root;
}`,
  ),
  explanation: [
    'A red-black tree relaxes AVL’s height balance into a *colour* balance: no red-red parent/child, and equal black heights on every path.',
    'Those rules bound the height at 2·log₂(n+1) while allowing cheaper updates — recolouring is O(1) and happens far more often than rotation.',
    'The two repair cases are decided by the uncle’s colour: red uncle → recolour and move the problem up; black uncle → rotate and finish.',
  ],
  learn: {
    useCases: ['std::map, std::set, Java TreeMap', 'Interval and order-statistic trees', 'Any ordered container that must stay worst-case logarithmic under updates'],
    quiz: [
      {
        question: 'Why is the root always repainted black at the end of the fixup?',
        options: ['For aesthetics', 'Because a red root would break the equal-black-height rule', 'To speed up search', 'It is optional'],
        answer: 1,
        why: 'Every path already passes through the root; making it black is what lets the black-height be measured consistently, and it may also absorb the last red-red violation.',
      },
    ],
  },
  defaultInput: TREE_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    // Rotations only appear once a few keys stack up on one side, so the default
    // seven keys would show recolouring and nothing else. Extra keys are
    // appended when the caller's input is too small to demonstrate a rotation;
    // a caller passing MIN_DEMO_KEYS or more gets exactly its input.
    const MIN_DEMO_KEYS = 12;
    const EXTRAS = Object.freeze([85, 15, 25, 95, 5, 65]);
    const sequence =
      values.length >= MIN_DEMO_KEYS ? values.slice(0, 14) : [...values, ...EXTRAS].slice(0, MIN_DEMO_KEYS);
    const model = new TreeModel();
    const parentOf = new Map<string, string | null>();
    const colorOf = new Map<string, Color>();
    let rootId: string | null = null;
    let operation: RbData['operation'] = 'insert';
    let rule: RbData['rule'];

    const applyColors = (): void => {
      for (const [id, color] of colorOf) model.setMeta(id, { color });
    };

    const label = (id: string | null | undefined): string => (id ? model.labelOf(id) : 'null');
    const value = (id: string | null | undefined): number => (id ? model.valueOf(id) : 0);
    const leftOf = (id: string | null): string | null => (id ? (model.get(id)?.children[0] ?? null) : null);
    const rightOf = (id: string | null): string | null => (id ? (model.get(id)?.children[1] ?? null) : null);
    const isRed = (id: string | null): boolean => (id ? colorOf.get(id) === 'red' : false);

    const builder = new TraceBuilder<TreeSnapshot, RbData>(() =>
      model.snapshot({
        kind: 'binary',
        caption: rule ? `fixup: uncle ${rule}` : 'root is black, red nodes may not touch',
        badges: {
          nodes: model.size,
          operation,
          reds: [...colorOf.values()].filter((c) => c === 'red').length,
          blackHeight: blackHeight(rootId, colorOf, model),
        },
      }),
    );

    builder.emit({
      kind: 'init',
      description: 'Empty red-black tree. Rules: root black, no red-red edges, equal black heights.',
      badges: { nodes: 0, operation },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    /** Standard BST insert followed by the red-black fix-up, narrated. */
    const insertKey = (key: number): void => {
      operation = 'insert';
      rule = undefined;
      const id = model.create(key, { prefix: 'r' });
      colorOf.set(id, 'red');
      applyColors();
      model.setRole([id], 'success');

      if (!rootId) {
        rootId = id;
        model.attach(id, null);
        colorOf.set(id, 'black');
        applyColors();
        builder.emit({
          kind: 'insert',
          description: `${key} becomes the root and is immediately painted black — rule 2.`,
          highlight: { nodes: [id] },
          badges: { nodes: model.size, operation, reds: 0, blackHeight: 1 },
          pseudocodeLine: 1,
          codeLine: 12,
          data: { operation, value: key },
          weight: 1.9,
          bump: ['writes'],
        });
        return;
      }

      let current: string = rootId;
      const path: string[] = [];
      while (true) {
        path.push(current);
        const goLeft = key < value(current);
        const next = goLeft ? leftOf(current) : rightOf(current);
        if (!next) break;
        current = next;
      }
      const side: 'left' | 'right' = key < value(current) ? 'left' : 'right';
      model.attach(id, current, side);
      parentOf.set(id, current);

      model.setRole(path, 'visited');
      model.setRole([id], 'success');
      builder.emit({
        kind: 'insert',
        description: `Insert ${key} as a ${side} child — new nodes start RED, which is what creates the violation to fix.`,
        highlight: { nodes: [id, current] },
        badges: { nodes: model.size, operation, reds: [...colorOf.values()].filter((c) => c === 'red').length },
        pseudocodeLine: 2,
        codeLine: 13,
        data: { operation, value: key },
        weight: 1.4,
        bump: ['writes', 'comparisons'],
      });

      let node = id;
      let guard = 0;
      while (isRed(parentOf.get(node) ?? null) && guard < 12) {
        guard += 1;
        const parent = parentOf.get(node) as string;
        const grand = parentOf.get(parent) ?? null;
        if (!grand) break;
        const uncle = leftOf(grand) === parent ? rightOf(grand) : leftOf(grand);

        if (isRed(uncle)) {
          rule = 'uncle-red';
          colorOf.set(parent, 'black');
          colorOf.set(uncle as string, 'black');
          colorOf.set(grand, 'red');
          applyColors();
          model.setRole([parent, uncle as string], 'active');
          model.setRole([grand], 'danger');
          operation = 'recolor';
          builder.emit({
            kind: 'balance',
            description: `Uncle ${label(uncle)} is red: repaint parent and uncle black, grandparent ${label(grand)} red — no rotation needed.`,
            highlight: { nodes: [parent, uncle as string, grand] },
            badges: { nodes: model.size, operation, rule, reds: [...colorOf.values()].filter((c) => c === 'red').length },
            pseudocodeLine: 6,
            codeLine: 22,
            data: { operation, value: key, rule },
            weight: 1.5,
            bump: ['writes'],
          });
          node = grand;
          continue;
        }

        rule = 'uncle-black';
        const parentIsLeft = leftOf(grand) === parent;
        let pivot = parent;
        if (node === rightOf(parent) && parentIsLeft) {
          rotate(model, parentOf, parent, 'left');
          model.setRole([parent], 'pivot');
          builder.emit({
            kind: 'rotate',
            description: `Inner case (node is the right child of a left child): rotate ${label(parent)} left to straighten the path.`,
            highlight: { nodes: [parent] },
            badges: { nodes: model.size, operation: 'rotate', rule },
            pseudocodeLine: 10,
            codeLine: 25,
            data: { operation: 'rotate', value: key, rule },
            weight: 1.3,
            bump: ['writes'],
          });
          node = pivot;
          pivot = parentOf.get(node) as string;
        } else if (node === leftOf(parent) && !parentIsLeft) {
          rotate(model, parentOf, parent, 'right');
          model.setRole([parent], 'pivot');
          builder.emit({
            kind: 'rotate',
            description: `Mirror case: rotate ${label(parent)} right first, then the grandparent.`,
            highlight: { nodes: [parent] },
            badges: { nodes: model.size, operation: 'rotate', rule },
            pseudocodeLine: 11,
            codeLine: 26,
            data: { operation: 'rotate', value: key, rule },
            weight: 1.3,
            bump: ['writes'],
          });
          node = pivot;
          pivot = parentOf.get(node) as string;
        }

        const newParent = parentOf.get(pivot) ?? null;
        colorOf.set(pivot, 'black');
        if (newParent) colorOf.set(newParent, 'red');
        applyColors();

        const newRoot = rotate(model, parentOf, newParent as string, parentIsLeft ? 'right' : 'left');
        rootId = parentOf.get(newRoot) === null || parentOf.get(newRoot) === undefined ? newRoot : rootId;
        model.setRole([newRoot], 'pivot');
        operation = 'rotate';
        builder.emit({
          kind: 'rotate',
          description: `Uncle is black: rotate the grandparent and repaint ${label(newRoot)} black — the subtree is balanced again.`,
          highlight: { nodes: [newRoot] },
          badges: { nodes: model.size, operation, rule, blackHeight: blackHeight(rootId, colorOf, model) },
          pseudocodeLine: 12,
          codeLine: 28,
          data: { operation, value: key, rule },
          weight: 1.8,
          bump: ['writes'],
        });
        break;
      }

      if (rootId) {
        colorOf.set(rootId, 'black');
        model.attach(rootId, null);
      }
      applyColors();
    };

    for (const key of sequence) insertKey(key);
    // Two extra keys chosen to force the recolour case as well as rotations.
    insertKey(85);
    insertKey(15);

    rootId = model.roots[0] ?? rootId;
    if (rootId) colorOf.set(rootId, 'black');
    applyColors();

    const inorder = model.inorderBinary();
    const output = inorder.map((id) => model.valueOf(id));
    model.setRole(inorder, 'success');
    builder.emit({
      kind: 'complete',
      description: `In-order still sorted (${output.join(', ')}) and the tree is colour-valid: black height ${blackHeight(rootId, colorOf, model)}.`,
      highlight: { nodes: inorder },
      badges: { nodes: model.size, operation, blackHeight: blackHeight(rootId, colorOf, model) },
      pseudocodeLine: 12,
      codeLine: 34,
      weight: 2.4,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Red-black tree built',
        detail: `${model.size} nodes, black height ${blackHeight(rootId, colorOf, model)}`,
        output,
      },
    });
  },
};

/* -------------------------------------------------------------------------- */
/*  Rotation helper shared by the fix-up                                       */
/* -------------------------------------------------------------------------- */

function rotate(
  model: TreeModel,
  parentOf: Map<string, string | null>,
  pivotId: string,
  direction: 'left' | 'right',
): string {
  const pivot = model.get(pivotId);
  if (!pivot) return pivotId;
  const childId = direction === 'left' ? pivot.children[1] : pivot.children[0];
  if (!childId) return pivotId;
  const child = model.get(childId);
  if (!child) return pivotId;

  const grand = parentOf.get(pivotId) ?? null;
  const carry = direction === 'left' ? child.children[0] : child.children[1];
  const pivotSide: 'left' | 'right' | undefined = grand
    ? (model.get(grand)?.children[0] === pivotId ? 'left' : 'right')
    : undefined;

  model.attach(childId, grand, pivotSide);
  if (direction === 'left') model.attach(pivotId, childId, 'left');
  else model.attach(pivotId, childId, 'right');
  if (carry) model.attach(carry, pivotId, direction === 'left' ? 'right' : 'left');

  parentOf.set(childId, grand);
  parentOf.set(pivotId, childId);
  if (carry) parentOf.set(carry, pivotId);

  return childId;
}

/**
 * Black height: black nodes on the leftmost root-to-leaf path, counting the
 * implicit null leaf as black. Invariant 4 says every path agrees with this
 * number, so measuring one path is enough to report it.
 *
 * @param rootId   Root of the tree, or null for an empty tree.
 * @param colorOf  Node id → colour at the moment of measurement.
 * @param model    The tree, needed to walk the leftmost path.
 */
function blackHeight(rootId: string | null, colorOf: Map<string, Color>, model: TreeModel): number {
  if (!rootId) return 0;
  let count = 1; // the null leaf every path ends on
  let current: string | null = rootId;
  while (current) {
    if (colorOf.get(current) === 'black') count += 1;
    current = model.get(current)?.children[0] ?? null;
  }
  return count;
}

export const definition: AlgorithmDefinition<TreeSnapshot, RbData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: TreeVisualizer });
