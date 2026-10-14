import type { AlgorithmDefinition, TreeSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { TreeVisualizer } from '@/visualizers/TreeVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, TREE_DEFAULT_INPUT } from './specs';
import { TreeModel } from './kit';

export interface TraversalData {
  readonly order: 'inorder' | 'preorder' | 'postorder' | 'level';
  readonly visitIndex: number;
  readonly value: number;
}

/**
 * Binary Tree Traversals — all four orders on the same tree.
 *
 * The tree is built once (level by level, so it is complete), then walked four
 * times. The output strip builds a visited sequence for each order, which is
 * what makes the difference between them concrete: same tree, four different
 * readings, and only in-order comes out sorted.
 */
const spec: AlgorithmSpec<TreeSnapshot, TraversalData> = {
  id: 'bt-traversals',
  complexity: COMPLEXITY['bt-traversals']!,
  pseudocode: pseudo(`
#inorder(node)                  ▸ left, node, right
#   if node = null: return
#   inorder(node.left); visit(node); inorder(node.right)
#
#preorder(node)                 ▸ node, left, right
#   if node = null: return
#   visit(node); preorder(node.left); preorder(node.right)
#
#postorder(node)                ▸ left, right, node
#   if node = null: return
#   postorder(node.left); postorder(node.right); visit(node)
#
#levelOrder(root)               ▸ queue frontier
#   q ← [root]
#   while q: node ← q.dequeue(); visit(node); q.enqueue(node.left, node.right)`),
  code: code(
    `
function inorder(node, out = []) {
  if (!node) return out;
  inorder(node.left, out);
  out.push(node.key);
  inorder(node.right, out);
  return out;
}

function preorder(node, out = []) {
  if (!node) return out;
  out.push(node.key);
  preorder(node.left, out);
  preorder(node.right, out);
  return out;
}

function levelOrder(root) {
  const out = [], queue = [root];
  while (queue.length) {
    const node = queue.shift();
    out.push(node.key);
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
  return out;
}`,
    `
def inorder(node, out=None):
    out = [] if out is None else out
    if node is None:
        return out
    inorder(node.left, out)
    out.append(node.key)
    inorder(node.right, out)
    return out


def preorder(node, out=None):
    out = [] if out is None else out
    if node is None:
        return out
    out.append(node.key)
    preorder(node.left, out)
    preorder(node.right, out)
    return out


def level_order(root):
    out, queue = [], [root]
    while queue:
        node = queue.pop(0)
        out.append(node.key)
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
    return out`,
    `
void inorder(Node* node, vector<int>& out) {
  if (!node) return;
  inorder(node->left, out);
  out.push_back(node->key);
  inorder(node->right, out);
}

void preorder(Node* node, vector<int>& out) {
  if (!node) return;
  out.push_back(node->key);
  preorder(node->left, out);
  preorder(node->right, out);
}

vector<int> levelOrder(Node* root) {
  vector<int> out;
  queue<Node*> q; q.push(root);
  while (!q.empty()) {
    Node* node = q.front(); q.pop();
    out.push_back(node->key);
    if (node->left) q.push(node->left);
    if (node->right) q.push(node->right);
  }
  return out;
}`,
    `
static void inorder(Node node, List<Integer> out) {
  if (node == null) return;
  inorder(node.left, out);
  out.add(node.key);
  inorder(node.right, out);
}

static void preorder(Node node, List<Integer> out) {
  if (node == null) return;
  out.add(node.key);
  preorder(node.left, out);
  preorder(node.right, out);
}

static List<Integer> levelOrder(Node root) {
  List<Integer> out = new ArrayList<>();
  Deque<Node> queue = new ArrayDeque<>();
  queue.add(root);
  while (!queue.isEmpty()) {
    Node node = queue.poll();
    out.add(node.key);
    if (node.left != null) queue.add(node.left);
    if (node.right != null) queue.add(node.right);
  }
  return out;
}`,
  ),
  explanation: [
    'All four traversals visit every node once — they differ only in *when* the node itself is read relative to its subtrees.',
    'In-order (left, node, right) prints a BST in sorted order; pre-order copies a tree; post-order frees one.',
    'Level order drops recursion for a queue and walks the tree breadth first.',
  ],
  learn: {
    useCases: [
      'In-order: sorted iteration, range queries, validating a BST.',
      'Pre-order: serialising a tree so it can be rebuilt.',
      'Post-order: deleting or evaluating expression trees.',
      'Level order: shortest path on unweighted trees, printing by depth.',
    ],
    quiz: [
      {
        question: 'Which traversal of a BST returns keys in ascending order?',
        options: ['Pre-order', 'In-order', 'Post-order', 'Level order'],
        answer: 1,
        why: 'Left subtree (all smaller) is emitted before the node, and the right subtree (all larger) after — that *is* sorted order.',
      },
    ],
    practice: [{ title: 'Binary Tree Inorder Traversal', url: 'https://leetcode.com/problems/binary-tree-inorder-traversal/', difficulty: 'easy' }],
  },
  defaultInput: TREE_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new TreeModel();

    /* ── build a complete tree so all four orders are easy to read ────────── */
    const ids: string[] = values.map((v) => model.create(v));
    ids.forEach((id, i) => {
      const parentIndex = Math.floor((i - 1) / 2);
      if (i === 0) model.attach(id, null);
      else model.attach(id, ids[parentIndex] as string, i % 2 === 1 ? 'left' : 'right');
    });

    const visits: Readonly<Record<TraversalData['order'], string[]>> = {
      inorder: model.inorderBinary(),
      preorder: preOrder(model),
      postorder: postOrder(model),
      level: model.levelOrder().flat(),
    };

    const ORDER_LABEL: Record<TraversalData['order'], string> = {
      inorder: 'in-order (L · N · R)',
      preorder: 'pre-order (N · L · R)',
      postorder: 'post-order (L · R · N)',
      level: 'level order (BFS)',
    };

    const ORDER_PSEUDO: Record<TraversalData['order'], { pseudo: number; code: number }> = {
      inorder: { pseudo: 2, code: 3 },
      preorder: { pseudo: 6, code: 10 },
      // The sample snippet only shows in-order, pre-order and level order; the
      // post-order step points at the pre-order line it mirrors.
      postorder: { pseudo: 10, code: 12 },
      level: { pseudo: 14, code: 20 },
    };

    let order: TraversalData['order'] = 'inorder';
    let visitIndex = 0;
    let lastValue = 0;
    let caption = `Tree built from ${values.length} values`;

    const builder = new TraceBuilder<TreeSnapshot, TraversalData>(() =>
      model.snapshot({
        kind: 'binary',
        caption,
        badges: { nodes: model.size, order: ORDER_LABEL[order], visited: visitIndex },
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Complete binary tree of ${values.length} nodes — now walk it four ways.`,
      highlight: { nodes: ids },
      badges: { nodes: model.size },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
    });

    const orders: readonly TraversalData['order'][] = ['inorder', 'preorder', 'postorder', 'level'];
    const results: Record<string, number[]> = {};

    for (const current of orders) {
      order = current;
      visitIndex = 0;
      model.clearRoles();
      caption = `Starting ${ORDER_LABEL[order]}`;
      builder.emit({
        kind: 'info',
        description: `Traversal: ${ORDER_LABEL[order]}.`,
        highlight: { nodes: [model.roots[0] as string] },
        badges: { nodes: model.size, order: ORDER_LABEL[order], visited: 0 },
        pseudocodeLine: ORDER_PSEUDO[order].pseudo,
        codeLine: ORDER_PSEUDO[order].code,
        data: { order, visitIndex: 0, value: 0 },
        weight: 1.4,
      });

      for (const id of visits[current]) {
        visitIndex += 1;
        lastValue = model.valueOf(id);
        const path = pathTo(model, id);
        model.setRole(path, 'visited');
        model.setRole([id], 'active');
        caption = `${ORDER_LABEL[order]} · visiting ${lastValue}`;
        builder.emit({
          kind: 'visit',
          description: `Visit ${lastValue} (${visitIndex} of ${model.size}) — ${ORDER_LABEL[order]}.`,
          highlight: { nodes: [id] },
          badges: { nodes: model.size, order: ORDER_LABEL[order], visited: visitIndex },
          pseudocodeLine: ORDER_PSEUDO[order].pseudo,
          codeLine: ORDER_PSEUDO[order].code,
          data: { order, visitIndex, value: lastValue },
          weight: current === 'level' ? 1 : 0.9,
          bump: ['reads'],
        });
      }

      model.clearRoles();
      const sequence = visits[current].map((id) => model.valueOf(id));
      results[order] = sequence;
      model.setRole(visits[current], 'success');
      caption = `${ORDER_LABEL[order]} → ${sequence.join(' → ')}`;
      builder.emit({
        kind: 'complete',
        description: `${ORDER_LABEL[order]} visits: ${sequence.join(', ')}.`,
        highlight: { nodes: visits[current] },
        badges: { nodes: model.size, order: ORDER_LABEL[order], visited: visitIndex },
        pseudocodeLine: ORDER_PSEUDO[order].pseudo,
        codeLine: ORDER_PSEUDO[order].code,
        data: { order, visitIndex, value: lastValue },
        weight: 2.2,
      });
    }

    const output = results.inorder ?? [];
    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Four traversals compared',
        detail: 'in-order is the sorted one',
        output: {
          values: output,
          sequences: results,
        },
      },
    });
  },
};

/** Ids from the root down to `id`, inclusive. */
function pathTo(model: TreeModel, id: string): string[] {
  const path: string[] = [id];
  let current = model.get(id)?.parentId ?? null;
  while (current) {
    path.unshift(current);
    current = model.get(current)?.parentId ?? null;
  }
  return path;
}

/** Node, left, right. */
function preOrder(model: TreeModel): string[] {
  const out: string[] = [];
  const walk = (id: string | null | undefined): void => {
    if (!id) return;
    out.push(id);
    const [left, right] = model.get(id)?.children ?? [];
    walk(left);
    walk(right);
  };
  walk(model.roots[0]);
  return out;
}

/** Left, right, node. */
function postOrder(model: TreeModel): string[] {
  const out: string[] = [];
  const walk = (id: string | null | undefined): void => {
    if (!id) return;
    const [left, right] = model.get(id)?.children ?? [];
    walk(left);
    walk(right);
    out.push(id);
  };
  walk(model.roots[0]);
  return out;
}

export const definition: AlgorithmDefinition<TreeSnapshot, TraversalData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: TreeVisualizer });
