import type { AlgorithmDefinition, TreeSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { TreeVisualizer } from '@/visualizers/TreeVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, TREE_DEFAULT_INPUT } from './specs';
import { TreeModel } from './kit';

export interface BTreeData {
  readonly operation: 'insert' | 'split' | 'delete' | 'borrow' | 'merge';
  readonly value?: number;
  readonly nodeKeys: number;
}

const ORDER = 4;

/**
 * B-Tree of order 4 — multi-way nodes, pre-emptive splits, borrows and merges.
 *
 * The defining property is the *shape*: every leaf sits at the same depth, and a
 * node holds `ORDER − 1` keys in sorted order. Splitting is pre-emptive (done on
 * the way down), which is why the trace never has to walk back up. Deletion
 * covers both repairs: borrowing a key from a rich sibling and merging two poor
 * ones.
 */
const spec: AlgorithmSpec<TreeSnapshot, BTreeData> = {
  id: 'b-tree',
  complexity: COMPLEXITY['b-tree']!,
  pseudocode: pseudo(`
#insert(key)                       ▸ O(log n · ORDER)
#   splitChildren(root)             ▸ pre-emptive: split every full node on the way
#   descend to the leaf that owns key, inserting into its sorted key list
#
#split(node)                        ▸ only when keys = ORDER − 1
#   mid ← keys[⌊len/2⌋]
#   left ← keys[:mid], right ← keys[mid+1:]
#   promote mid into the parent; node becomes two children
#
#delete(key)
#   remove the key from its leaf
#   if the leaf still has ≥ ⌈ORDER/2⌉ − 1 keys: done
#   else:
#     if a sibling has spare keys: borrow one through the parent   ▸ rotate
#     else: merge with the sibling, pulling the parent key down    ▸ height may drop`),
  code: code(
    `
class BNode {
  constructor(leaf = true) { this.keys = []; this.children = []; this.leaf = leaf; }
}

function splitChild(parent, i) {
  const node = parent.children[i];
  const mid = Math.floor(node.keys.length / 2);
  const sibling = new BNode(node.leaf);
  sibling.keys = node.keys.slice(mid + 1);
  const promote = node.keys[mid];
  node.keys = node.keys.slice(0, mid);
  if (!node.leaf) sibling.children = node.children.splice(mid + 1);
  parent.keys.splice(i, 0, promote);
  parent.children.splice(i + 1, 0, sibling);
  return promote;
}

function insert(root, key) {
  if (root.keys.length === 3) {                    // ORDER - 1
    const newRoot = new BNode(false);
    newRoot.children = [root];
    splitChild(newRoot, 0);
    root = newRoot;
  }
  let node = root;
  while (!node.leaf) {
    let i = node.keys.findIndex((k) => key < k);
    if (i === -1) i = node.keys.length;
    if (node.children[i].keys.length === 3) splitChild(node, i);
    node = node.children[key < node.keys[i] ? i : i + 1] ?? node.children[i];
  }
  node.keys.push(key);
  node.keys.sort((a, b) => a - b);
  return root;
}`,
    `
ORDER = 4


class BNode:
    def __init__(self, leaf=True):
        self.keys = []
        self.children = []
        self.leaf = leaf


def split_child(parent, i):
    node = parent.children[i]
    mid = len(node.keys) // 2
    sibling = BNode(node.leaf)
    sibling.keys = node.keys[mid + 1:]
    promote = node.keys[mid]
    node.keys = node.keys[:mid]
    if not node.leaf:
        sibling.children = node.children[mid + 1:]
        node.children = node.children[:mid + 1]
    parent.keys.insert(i, promote)
    parent.children.insert(i + 1, sibling)
    return promote


def insert(root, key):
    if len(root.keys) == ORDER - 1:
        new_root = BNode(leaf=False)
        new_root.children = [root]
        split_child(new_root, 0)
        root = new_root
    node = root
    while not node.leaf:
        i = next((k for k, keyk in enumerate(node.keys) if key < keyk), len(node.keys))
        if len(node.children[i].keys) == ORDER - 1:
            split_child(node, i)
        node = node.children[i] if key < node.keys[i] else node.children[i + 1]
    node.keys.append(key)
    node.keys.sort()
    return root`,
    `
constexpr int ORDER = 4;

struct BNode {
  vector<int> keys;
  vector<BNode*> children;
  bool leaf = true;
};

int splitChild(BNode* parent, int i) {
  BNode* node = parent->children[i];
  int mid = (int)node->keys.size() / 2;
  BNode* sibling = new BNode();
  sibling->leaf = node->leaf;
  sibling->keys.assign(node->keys.begin() + mid + 1, node->keys.end());
  int promote = node->keys[mid];
  node->keys.resize(mid);
  if (!node->leaf) {
    sibling->children.assign(node->children.begin() + mid + 1, node->children.end());
    node->children.resize(mid + 1);
  }
  parent->keys.insert(parent->keys.begin() + i, promote);
  parent->children.insert(parent->children.begin() + i + 1, sibling);
  return promote;
}

BNode* insert(BNode* root, int key) {
  if ((int)root->keys.size() == ORDER - 1) {
    BNode* newRoot = new BNode();
    newRoot->leaf = false;
    newRoot->children.push_back(root);
    splitChild(newRoot, 0);
    root = newRoot;
  }
  BNode* node = root;
  while (!node->leaf) {
    int i = 0;
    while (i < (int)node->keys.size() && key > node->keys[i]) ++i;
    if ((int)node->children[i]->keys.size() == ORDER - 1) splitChild(node, i);
    node = (key < node->keys[i]) ? node->children[i] : node->children[i + 1];
  }
  node->keys.push_back(key);
  sort(node->keys.begin(), node->keys.end());
  return root;
}`,
    `
private static final int ORDER = 4;

static final class BNode {
  final List<Integer> keys = new ArrayList<>();
  final List<BNode> children = new ArrayList<>();
  boolean leaf = true;
}

static int splitChild(BNode parent, int i) {
  BNode node = parent.children.get(i);
  int mid = node.keys.size() / 2;
  BNode sibling = new BNode();
  sibling.leaf = node.leaf;
  sibling.keys.addAll(node.keys.subList(mid + 1, node.keys.size()));
  int promote = node.keys.get(mid);
  node.keys.subList(mid, node.keys.size()).clear();
  if (!node.leaf) {
    sibling.children.addAll(node.children.subList(mid + 1, node.children.size()));
    node.children.subList(mid + 1, node.children.size()).clear();
  }
  parent.keys.add(i, promote);
  parent.children.add(i + 1, sibling);
  return promote;
}

static BNode insert(BNode root, int key) {
  if (root.keys.size() == ORDER - 1) {
    BNode newRoot = new BNode();
    newRoot.leaf = false;
    newRoot.children.add(root);
    splitChild(newRoot, 0);
    root = newRoot;
  }
  BNode node = root;
  while (!node.leaf) {
    int i = 0;
    while (i < node.keys.size() && key > node.keys.get(i)) i++;
    if (node.children.get(i).keys.size() == ORDER - 1) splitChild(node, i);
    node = key < node.keys.get(i) ? node.children.get(i) : node.children.get(i + 1);
  }
  node.keys.add(key);
  Collections.sort(node.keys);
  return root;
}`,
  ),
  explanation: [
    'A B-tree node holds many sorted keys and one more child, so the fan-out is huge and the height stays tiny — usually 2–4 levels for millions of rows.',
    'Splitting is done *on the way down*, so an insert needs one pass and no backtracking; the middle key is promoted to the parent.',
    'Deletion repairs underflow by borrowing from a sibling through the parent, or by merging two siblings — which is the only operation that can reduce the height.',
  ],
  learn: {
    useCases: ['Database indexes (MySQL InnoDB, PostgreSQL)', 'Filesystems (NTFS, HFS+, btrfs)', 'Any structure where each node is one disk page'],
    quiz: [
      {
        question: 'Why does a B-tree keep every leaf at the same depth?',
        options: ['For aesthetics', 'Because splits always promote upward and only the root grows, so all leaves grow together', 'Because of garbage collection', 'It does not'],
        answer: 1,
        why: 'New keys always enter at a leaf, and height increases only when the root splits — so no leaf is ever left behind.',
      },
    ],
  },
  defaultInput: TREE_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input).slice(0, 10);
    const model = new TreeModel();
    let operation: BTreeData['operation'] = 'insert';

    /** node id → mutable keys / children / leaf flag, mirrored into the model. */
    interface BNodeRec {
      id: string;
      keys: number[];
      children: string[];
      leaf: boolean;
    }
    const nodes = new Map<string, BNodeRec>();

    const makeNode = (leaf: boolean): BNodeRec => {
      const id = model.create('', { keys: [], prefix: 'b' });
      const rec: BNodeRec = { id, keys: [], children: [], leaf };
      nodes.set(id, rec);
      model.setSub(id, leaf ? 'leaf' : 'internal');
      return rec;
    };

    /** Walks the records to find the node that is nobody's child. */
    const rootRecord = (): BNodeRec | undefined => {
      const childIds = new Set([...nodes.values()].flatMap((rec) => rec.children));
      return [...nodes.values()].find((rec) => !childIds.has(rec.id)) ?? [...nodes.values()][0];
    };

    /** Pushes the in-memory node records into the visual model. */
    const sync = (): void => {
      for (const rec of nodes.values()) {
        model.setKeys(rec.id, rec.keys.length ? rec.keys.map(String) : ['∅']);
        // De-duplicate: a merge or split can transiently list the same child
        // twice, and the invariant is one parent per child.
        rec.children = [...new Set(rec.children.filter((c) => nodes.has(c)))];
        const node = model.get(rec.id);
        if (node) {
          node.children = [...rec.children];
          node.parentId = null;
        }
      }
      for (const rec of nodes.values()) {
        for (const childId of rec.children) {
          const child = model.get(childId);
          if (child) child.parentId = rec.id;
        }
      }
      const rootRec = rootRecord();
      model.roots = rootRec ? [rootRec.id] : [];
    };

    /** Drops `childId` from every record except `keeperId`, so ownership stays unique. */
    const detachFrom = (childId: string, keeperId: string | null): void => {
      for (const rec of nodes.values()) {
        if (rec.id === keeperId) continue;
        if (rec.children.includes(childId)) rec.children = rec.children.filter((c) => c !== childId);
      }
    };

    /** Keys currently stored across every node. */
    const keyTotal = (): number => [...nodes.values()].reduce((n, rec) => n + rec.keys.length, 0);

    let caption = `Order-${ORDER} B-tree: up to ${ORDER - 1} keys per node, all leaves at one depth`;

    const builder = new TraceBuilder<TreeSnapshot, BTreeData>(() => {
      sync();
      return model.snapshot({
        kind: 'nary',
        caption,
        badges: {
          nodes: nodes.size,
          keys: keyTotal(),
          height: treeHeight(nodes),
          operation,
        },
      });
    });

    const root = makeNode(true);
    sync();

    builder.emit({
      kind: 'init',
      description: `Empty order-${ORDER} B-tree: one empty leaf, and every key will land at the same depth.`,
      highlight: { nodes: [root.id] },
      badges: { nodes: 1, keys: 0, height: 1, operation },
      pseudocodeLine: 0,
      codeLine: 1,
      weight: 1.5,
    });

    /** Root split: the only move that can increase the height. */
    const splitNode = (parent: BNodeRec | null, index: number): void => {
      const node = parent ? nodes.get(parent.children[index] as string) : rootRecord() ?? root;
      if (!node) return;
      operation = 'split';
      const mid = Math.floor(node.keys.length / 2);
      const promote = node.keys[mid] as number;
      const sibling = makeNode(node.leaf);
      sibling.keys = node.keys.slice(mid + 1);
      node.keys = node.keys.slice(0, mid);
      if (!node.leaf) {
        sibling.children = node.children.slice(mid + 1);
        node.children = node.children.slice(0, mid + 1);
      }

      if (parent) {
        detachFrom(sibling.id, parent.id);
        parent.keys.push(promote);
        parent.keys.sort((a, b) => a - b);
        const at = parent.keys.indexOf(promote);
        parent.children.splice(at + 1, 0, sibling.id);
      } else {
        // The node was the root: it grows one level, so both halves now hang
        // off a brand-new root and nothing else may still claim them.
        const newRoot = makeNode(false);
        newRoot.keys = [promote];
        newRoot.children = [node.id, sibling.id];
        detachFrom(node.id, newRoot.id);
        detachFrom(sibling.id, newRoot.id);
        model.attach(node.id, newRoot.id);
        model.attach(sibling.id, newRoot.id);
      }

      model.setRole([node.id], 'compare');
      model.setRole([sibling.id], 'pivot');
      caption = `split: promote ${promote} into the parent`;
      builder.emit({
        kind: 'split',
        description: `Node was full: promote the middle key ${promote} to the parent and split the rest into two nodes.`,
        highlight: { nodes: [node.id, sibling.id] },
        badges: { nodes: nodes.size, keys: keyTotal(), promoted: promote, operation },
        pseudocodeLine: 7,
        codeLine: 9,
        data: { operation, value: promote, nodeKeys: node.keys.length },
        weight: 1.8,
        bump: ['writes'],
      });
    };

    /* ── insert every key, splitting pre-emptively ────────────────────────── */
    for (const key of values) {
      operation = 'insert';
      if ((rootRecord() ?? root).keys.length === ORDER - 1) splitNode(null, 0);
      let node: BNodeRec | undefined = rootRecord() ?? root;

      while (node && !node.leaf) {
        const childIndexAt = (rec: BNodeRec): number => {
          let i = 0;
          while (i < rec.keys.length && key > (rec.keys[i] as number)) i += 1;
          return Math.min(i, Math.max(0, rec.children.length - 1));
        };
        const i = childIndexAt(node);
        const child = nodes.get(node.children[i] as string);
        if (child && child.keys.length === ORDER - 1) {
          splitNode(node, i);
          // The split pushed a new separator in, so the path below is recomputed.
          node = nodes.get(node.children[childIndexAt(node)] as string);
        } else {
          node = child;
        }
      }
      if (!node) break;

      node.keys.push(key);
      node.keys.sort((a, b) => a - b);
      sync();
      model.clearRoles();
      model.setRole([node.id], 'success');
      caption = `insert ${key} into the leaf ${node.keys.join(',')}`;
      builder.emit({
        kind: 'insert',
        description: `Insert ${key} into the sorted key list of a leaf (${node.keys.length} of ${ORDER - 1} keys).`,
        highlight: { nodes: [node.id] },
        badges: { nodes: nodes.size, keys: keyTotal(), height: treeHeight(nodes), operation, key },
        pseudocodeLine: 2,
        codeLine: 31,
        data: { operation, value: key, nodeKeys: node.keys.length },
        weight: 1.2,
        bump: ['writes', 'comparisons'],
      });
    }

    /* ── delete keys until a leaf underflows, then repair it ─────────────── */

    /** Removes one key and repairs the underflow it causes, narrating the case. */
    const deleteKey = (victim: number): void => {
      const holder = [...nodes.values()].find((rec) => rec.leaf && rec.keys.includes(victim));
      if (!holder) return;
      const minKeys = Math.ceil(ORDER / 2) - 1;

      operation = 'delete';
      holder.keys = holder.keys.filter((k) => k !== victim);
      sync();
      model.clearRoles();
      model.setRole([holder.id], 'danger');
      caption = `delete ${victim} — leaf now holds ${holder.keys.length} key(s)`;
      builder.emit({
        kind: 'delete',
        description: `Remove ${victim} from its leaf. Minimum occupancy is ${minKeys}, so this leaf may underflow.`,
        highlight: { nodes: [holder.id] },
        badges: { nodes: nodes.size, keys: keyTotal(), height: treeHeight(nodes), operation },
        pseudocodeLine: 10,
        codeLine: 31,
        data: { operation, value: victim, nodeKeys: holder.keys.length },
        weight: 1.5,
        bump: ['writes'],
      });

      if (holder.keys.length >= minKeys) return;

      const parent = [...nodes.values()].find((rec) => rec.children.includes(holder.id));
      const index = parent ? parent.children.indexOf(holder.id) : -1;
      // Prefer the left sibling, fall back to the right one.
      const leftId = parent && index > 0 ? parent.children[index - 1] : undefined;
      const rightId = parent && index < parent.children.length - 1 ? parent.children[index + 1] : undefined;
      const side: 'left' | 'right' = leftId ? 'left' : 'right';
      const siblingId = side === 'left' ? leftId : rightId;
      const sibling = siblingId ? nodes.get(siblingId) : undefined;

      if (parent && sibling && sibling.keys.length > minKeys) {
        // Separator that sits between the two siblings in the parent.
        const sepIndex = side === 'left' ? index - 1 : index;
        const separator = parent.keys[sepIndex] as number;
        const borrowed = side === 'left' ? (sibling.keys.pop() as number) : (sibling.keys.shift() as number);
        holder.keys = [...holder.keys, separator].sort((a, b) => a - b);
        parent.keys = parent.keys.map((k, i) => (i === sepIndex ? borrowed : k));
        // An internal borrow hands over the adjacent child pointer as well.
        if (!sibling.leaf) {
          const moved = side === 'left' ? sibling.children.pop() : sibling.children.shift();
          if (moved) {
            if (side === 'left') holder.children.push(moved);
            else holder.children.unshift(moved);
            detachFrom(moved, holder.id);
            model.attach(moved, holder.id);
          }
        }
        operation = 'borrow';
        sync();
        model.clearRoles();
        model.setRole([holder.id], 'success');
        model.setRole([siblingId as string], 'compare');
        caption = `borrow ${borrowed} through the parent key ${separator}`;
        builder.emit({
          kind: 'rotate',
          description: `The ${side} sibling has a spare key: rotate it up into the parent and pull the separator ${separator} down into the underfull node.`,
          highlight: { nodes: [holder.id, siblingId as string] },
          badges: { nodes: nodes.size, keys: keyTotal(), operation, borrowed, side },
          pseudocodeLine: 13,
          codeLine: 31,
          data: { operation, value: borrowed, nodeKeys: holder.keys.length },
          weight: 1.9,
          bump: ['writes'],
        });
        return;
      }

      if (parent && sibling) {
        operation = 'merge';
        const sepIndex = side === 'left' ? index - 1 : index;
        const separator = parent.keys[sepIndex] as number;
        const [keep, gone] = side === 'left' ? [sibling, holder] : [holder, sibling];
        keep.keys = [...keep.keys, separator, ...gone.keys].sort((a, b) => a - b);
        keep.children = [...keep.children, ...gone.children];
        parent.keys = parent.keys.filter((_, i) => i !== sepIndex);
        parent.children = parent.children.filter((c) => c !== gone.id);
        nodes.delete(gone.id);
        model.remove(gone.id);
        for (const childId of keep.children) {
          detachFrom(childId, keep.id);
          model.attach(childId, keep.id);
        }
        caption = `merge through the separator ${separator}`;
        builder.emit({
          kind: 'merge',
          description: `Neither sibling can spare a key: merge them across the separator ${separator}. The parent loses a key, so an underflow bubbles upward — that is how a B-tree shrinks in height.`,
          highlight: { nodes: [keep.id] },
          badges: { nodes: nodes.size, keys: keyTotal(), height: treeHeight(nodes), operation, separator },
          pseudocodeLine: 14,
          codeLine: 31,
          data: { operation, value: separator, nodeKeys: keep.keys.length },
          weight: 2,
          bump: ['writes'],
        });

        // A root left with no keys collapses: its only child becomes the root.
        if (parent.keys.length === 0 && parent.children.length === 1) {
          const heirId = parent.children[0] as string;
          const heir = nodes.get(heirId);
          nodes.delete(parent.id);
          model.remove(parent.id);
          detachFrom(heirId, null);
          sync();
          model.clearRoles();
          if (heir) model.setRole([heir.id], 'success');
          caption = 'root collapsed — the tree got one level shallower';
          builder.emit({
            kind: 'merge',
            description: 'The root ran out of keys, so its only child is promoted: the tree is now one level shallower.',
            highlight: { nodes: [heirId] },
            badges: { nodes: nodes.size, keys: keyTotal(), height: treeHeight(nodes), operation },
            pseudocodeLine: 15,
            codeLine: 31,
            data: { operation, value: heir?.keys[0] ?? 0, nodeKeys: heir?.keys.length ?? 0 },
            weight: 1.6,
            bump: ['writes'],
          });
        }
      }
    };

    // Delete from the emptiest leaf until it underflows: the first deletions are
    // free, the one that dips below minimum occupancy forces the repair.
    const smallestLeaf = [...nodes.values()]
      .filter((rec) => rec.leaf && !rec.children.length)
      .sort((a, b) => a.keys.length - b.keys.length)[0];
    const victims = (smallestLeaf?.keys ?? values).slice(0, ORDER - 1);
    for (const victimKey of victims) deleteKey(victimKey);

    sync();
    const inorder = [...nodes.values()]
      .filter((rec) => rec.leaf)
      .flatMap((rec) => rec.keys)
      .sort((a, b) => a - b);
    const allKeys = [...nodes.values()].flatMap((rec) => rec.keys);
    model.clearRoles();
    model.setRole([...nodes.values()].map((rec) => rec.id), 'success');
    caption = `${nodes.size} nodes, height ${treeHeight(nodes)}, ${allKeys.length} keys`;
    builder.emit({
      kind: 'complete',
      description: `Leaves still hold every key in sorted order (${inorder.join(', ')}) and all sit at depth ${treeHeight(nodes) - 1}.`,
      highlight: { nodes: [...nodes.values()].map((rec) => rec.id) },
      badges: { nodes: nodes.size, keys: allKeys.length, height: treeHeight(nodes), operation },
      pseudocodeLine: 14,
      codeLine: 33,
      weight: 2.4,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'B-tree maintained',
        detail: `${nodes.size} nodes, height ${treeHeight(nodes)}, ${allKeys.length} keys`,
        output: inorder,
      },
    });
  },
};

/**
 * Height of the tree, counting a single leaf as 1.
 *
 * The root is the node that no other node lists as a child — which is also the
 * invariant the visualiser relies on to place the tree.
 */
function treeHeight(nodes: Map<string, { id: string; children: string[]; keys: number[] }>): number {
  const records = [...nodes.values()];
  const childIds = new Set(records.flatMap((rec) => rec.children));
  const root = records.find((rec) => !childIds.has(rec.id));
  const walk = (rec: { children: string[] } | undefined, depth: number): number => {
    if (!rec || rec.children.length === 0) return depth;
    return Math.max(...rec.children.map((id) => walk(nodes.get(id), depth + 1)));
  };
  return walk(root, 1);
}

export const definition: AlgorithmDefinition<TreeSnapshot, BTreeData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: TreeVisualizer });
