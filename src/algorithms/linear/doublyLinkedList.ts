import type { AlgorithmDefinition, SequenceCursorSnapshot, SequenceSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { SequenceVisualizer } from '@/visualizers/SequenceVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, LINEAR_DEFAULT_INPUT } from './specs';
import { SeqModel } from './kit';

export interface DoublyData {
  readonly operation: 'append' | 'delete' | 'forward-scan' | 'backward-scan';
  readonly hops?: number;
}

/**
 * Doubly Linked List — every node knows both neighbours.
 *
 * Two counter-marching scans are the centrepiece: forward with `next`, then
 * backward with `prev` from the tail. Then a delete is performed by rewiring
 * *from the node itself*, which is the capability a singly linked list lacks.
 */
const spec: AlgorithmSpec<SequenceSnapshot, DoublyData> = {
  id: 'doubly-linked-list',
  complexity: COMPLEXITY['doubly-linked-list']!,
  pseudocode: pseudo(`
#Node { value, prev, next }
#
#append(x)                      ▸ O(1) with tail
#   node ← new Node(x, prev: tail)
#   tail.next ← node, tail ← node
#
#unlink(node)                   ▸ O(1) — needs no search
#   node.prev.next ← node.next
#   node.next.prev ← node.prev
#
#walkForward()                  ▸ cur ← head; while cur: visit(cur), cur ← cur.next
#walkBackward()                 ▸ cur ← tail; while cur: visit(cur), cur ← cur.prev`),
  code: code(
    `
class DNode {
  constructor(value, prev = null, next = null) { this.value = value; this.prev = prev; this.next = next; }
}

function append(tail, x) {
  const node = new DNode(x, tail);
  if (tail) tail.next = node;
  return node;
}

function unlink(node) {
  if (node.prev) node.prev.next = node.next;
  if (node.next) node.next.prev = node.prev;
}

function walkForward(head) {
  let cur = head;
  while (cur) { visit(cur); cur = cur.next; }
}

function walkBackward(tail) {
  let cur = tail;
  while (cur) { visit(cur); cur = cur.prev; }
}`,
    `
class DNode:
    __slots__ = ("value", "prev", "next")

    def __init__(self, value, prev=None, next=None):
        self.value = value
        self.prev = prev
        self.next = next


def append(tail, x):
    node = DNode(x, prev=tail)
    if tail:
        tail.next = node
    return node


def unlink(node):
    if node.prev:
        node.prev.next = node.next
    if node.next:
        node.next.prev = node.prev


def walk_forward(head):
    cur = head
    while cur:
        visit(cur)
        cur = cur.next


def walk_backward(tail):
    cur = tail
    while cur:
        visit(cur)
        cur = cur.prev`,
    `
struct DNode {
  int value;
  DNode *prev, *next;
  DNode(int v, DNode* p = nullptr, DNode* n = nullptr) : value(v), prev(p), next(n) {}
};

DNode* append(DNode* tail, int x) {
  DNode* node = new DNode(x, tail);
  if (tail) tail->next = node;
  return node;
}

void unlink(DNode* node) {
  if (node->prev) node->prev->next = node->next;
  if (node->next) node->next->prev = node->prev;
}

void walkForward(DNode* head) {
  for (DNode* cur = head; cur; cur = cur->next) visit(cur);
}

void walkBackward(DNode* tail) {
  for (DNode* cur = tail; cur; cur = cur->prev) visit(cur);
}`,
    `
static final class DNode {
  int value;
  DNode prev, next;
  DNode(int value, DNode prev) { this.value = value; this.prev = prev; }
}

static DNode append(DNode tail, int x) {
  DNode node = new DNode(x, tail);
  if (tail != null) tail.next = node;
  return node;
}

static void unlink(DNode node) {
  if (node.prev != null) node.prev.next = node.next;
  if (node.next != null) node.next.prev = node.prev;
}

static void walkForward(DNode head) {
  for (DNode cur = head; cur != null; cur = cur.next) visit(cur);
}

static void walkBackward(DNode tail) {
  for (DNode cur = tail; cur != null; cur = cur.prev) visit(cur);
}`,
  ),
  explanation: [
    'Each node carries a `prev` and a `next` pointer, so traversal works in both directions.',
    'Given a pointer to a node, deletion is O(1): rewire the two neighbours and the node is gone — no walk to find its predecessor.',
    'The price is one extra pointer per node and twice the book-keeping on every insert.',
  ],
  learn: {
    useCases: ['LRU caches (O(1) move-to-front)', 'Text editors’ undo chains', 'Browser forward/back history'],
    quiz: [
      {
        question: 'What does `prev` buy you that a singly linked list cannot have?',
        options: ['Faster search', 'O(1) deletion given the node, and backward traversal', 'Less memory use', 'Sorted order'],
        answer: 1,
        why: 'Having the predecessor in hand removes the walk that a singly linked list needs before it can unlink a node.',
      },
    ],
  },
  defaultInput: LINEAR_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new SeqModel([], 'list');

    let cursors: SequenceCursorSnapshot[] = [];
    let caption = 'Empty list';
    let operation: DoublyData['operation'] = 'append';

    const builder = new TraceBuilder<SequenceSnapshot, DoublyData>(() =>
      model.snapshot({
        cursors,
        links: model.links(['next', 'prev']),
        caption,
        badges: {
          nodes: model.size,
          head: model.at(0)?.label ?? 'null',
          tail: model.at(model.size - 1)?.label ?? 'null',
        },
      }),
    );

    builder.emit({
      kind: 'init',
      description: 'Empty doubly linked list: head = tail = null.',
      badges: { nodes: 0 },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.4,
    });

    /* ── append with an O(1) tail pointer ─────────────────────────────────── */
    operation = 'append';
    for (const value of values) {
      model.paint([], 'active', { clear: true });
      const prevTail = model.size - 1;
      const item = model.push(value);
      model.paintId(item.id, 'active');
      cursors = [
        { name: 'tail', itemId: item.id, role: 'active' },
        ...(model.size > 1 ? [{ name: 'head', index: 0, role: 'sorted' as const }] : []),
      ];
      caption = `tail.next = ${value}; ${value}.prev = ${model.at(prevTail)?.label ?? 'null'}`;
      builder.emit({
        kind: 'insert',
        description:
          model.size === 1
            ? `${value} is the whole list: head = tail = ${value}.`
            : `Append ${value} at the tail — two writes (old tail’s next, new node’s prev).`,
        highlight: { primary: [model.size - 1], tertiary: prevTail >= 0 ? [prevTail] : [] },
        badges: { nodes: model.size, operation },
        pseudocodeLine: 3,
        codeLine: 6,
        data: { operation },
        weight: 1.05,
        bump: ['writes'],
      });
    }

    /* ── forward scan ─────────────────────────────────────────────────────── */
    operation = 'forward-scan';
    const visited: number[] = [];
    for (let i = 0; i < model.size; i += 1) {
      model.paint([i], 'compare');
      cursors = [{ name: 'cur', index: i, role: 'compare' }];
      caption = `forward: cur = ${model.at(i)?.label}`;
      visited.push(Number(model.at(i)?.label));
      builder.emit({
        kind: 'visit',
        description: `Follow next → ${model.at(i)?.label}.`,
        highlight: { primary: [i], success: visited.slice(0, i) },
        badges: { nodes: model.size, operation, hop: i + 1 },
        pseudocodeLine: 10,
        codeLine: 15,
        data: { operation, hops: i + 1 },
        weight: 0.7,
        bump: ['reads'],
      });
    }

    /* ── backward scan ────────────────────────────────────────────────────── */
    operation = 'backward-scan';
    for (let i = model.size - 1; i >= 0; i -= 1) {
      model.paint([i], 'pivot');
      cursors = [{ name: 'cur', index: i, role: 'pivot' }];
      caption = `backward: cur = ${model.at(i)?.label}`;
      builder.emit({
        kind: 'visit',
        description: `Follow prev ← ${model.at(i)?.label}.`,
        highlight: { primary: [i] },
        badges: { nodes: model.size, operation, hop: model.size - i },
        pseudocodeLine: 11,
        codeLine: 20,
        data: { operation, hops: model.size - i },
        weight: 0.7,
        bump: ['reads'],
      });
    }

    /* ── O(1) delete from the middle using the node itself ────────────────── */
    operation = 'delete';
    const middle = Math.floor(model.size / 2);
    const victim = model.at(middle);
    if (victim) {
      model.paint([middle], 'danger');
      cursors = [{ name: 'node', index: middle, role: 'danger' }];
      caption = `unlink(${victim.label}) — node.prev.next = node.next`;
      builder.emit({
        kind: 'mark',
        description: `Holding ${victim.label} directly: both neighbours are reachable, so no search is needed.`,
        highlight: { danger: [middle] },
        badges: { nodes: model.size, operation },
        pseudocodeLine: 6,
        codeLine: 10,
        data: { operation },
        weight: 1.4,
        bump: ['reads'],
      });

      model.removeAt(middle);
      model.items.splice(middle, 0, model.ghost(victim));
      cursors = [
        ...(middle > 0 ? [{ name: 'prev', index: middle - 1, role: 'pivot' as const }] : []),
        ...(middle + 1 < model.size ? [{ name: 'next', index: middle + 1, role: 'pivot' as const }] : []),
      ];
      caption = `prev.next → next; next.prev → prev`;
      builder.emit({
        kind: 'delete',
        description: `${victim.label} is spliced out in two writes, O(1) — the neighbours close the gap.`,
        highlight: { muted: [middle] },
        badges: { nodes: model.size - 1, operation },
        pseudocodeLine: 7,
        codeLine: 11,
        data: { operation },
        weight: 1.6,
        bump: ['writes'],
      });
      model.removeAt(middle);
    }

    const output = model.values();
    cursors = [];
    caption = `List holds ${model.size} nodes`;
    builder.emit({
      kind: 'complete',
      description: `Forward and backward traversal agree; ${output.join(' ↔ ')}.`,
      highlight: { success: Array.from({ length: model.size }, (_, i) => i) },
      badges: { nodes: model.size, head: model.at(0)?.label ?? 'null', tail: model.at(model.size - 1)?.label ?? 'null' },
      pseudocodeLine: 11,
      codeLine: 20,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Doubly linked list built',
        detail: `${output.length} nodes after an O(1) middle delete`,
        output,
      },
    });
  },
};

export const definition: AlgorithmDefinition<SequenceSnapshot, DoublyData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: SequenceVisualizer });
