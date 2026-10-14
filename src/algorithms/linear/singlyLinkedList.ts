import type { AlgorithmDefinition, SequenceCursorSnapshot, SequenceSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { SequenceVisualizer } from '@/visualizers/SequenceVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, LINEAR_DEFAULT_INPUT } from './specs';
import { SeqModel } from './kit';

export interface LinkedListData {
  readonly operation: 'insert-head' | 'insert-tail' | 'insert-after' | 'delete' | 'search';
  readonly value?: number;
  readonly links: number;
}

/**
 * Singly Linked List — nodes chained by `next`.
 *
 * Building the list is the show: each new node's `next` arrow snaps onto the
 * previous head, and the `head` tag moves. Insertion and deletion are then O(1)
 * *once the node is in hand* — the cost is the walk that finds it, drawn as the
 * `cur` cursor hopping forward.
 */
const spec: AlgorithmSpec<SequenceSnapshot, LinkedListData> = {
  id: 'singly-linked-list',
  complexity: COMPLEXITY['singly-linked-list']!,
  pseudocode: pseudo(`
#Node { value, next }
#
#insertHead(x)                 ▸ O(1)
#   node ← new Node(x)
#   node.next ← head, head ← node
#
#insertAfter(p, x)             ▸ O(1) given p
#   node ← new Node(x)
#   node.next ← p.next, p.next ← node
#
#deleteAfter(p)                ▸ O(1) given p
#   target ← p.next
#   p.next ← target.next
#
#search(x)                     ▸ O(n)
#   cur ← head
#   while cur ≠ null and cur.value ≠ x: cur ← cur.next`),
  code: code(
    `
class Node {
  constructor(value, next = null) { this.value = value; this.next = next; }
}

function insertHead(head, x) { return new Node(x, head); }

function insertAfter(node, x) {
  node.next = new Node(x, node.next);
  return node.next;
}

function deleteAfter(node) {
  if (!node.next) return null;
  node.next = node.next.next;
  return node.next;
}

function traverse(head) {
  let cur = head;
  while (cur) { visit(cur); cur = cur.next; }
}`,
    `
class Node:
    __slots__ = ("value", "next")

    def __init__(self, value, nxt=None):
        self.value = value
        self.next = nxt


def insert_head(head, x):
    return Node(x, head)


def insert_after(node, x):
    node.next = Node(x, node.next)
    return node.next


def delete_after(node):
    if node.next:
        node.next = node.next.next
    return node.next


def traverse(head):
    cur = head
    while cur:
        visit(cur)
        cur = cur.next`,
    `
struct Node {
  int value;
  Node* next;
  Node(int v, Node* n = nullptr) : value(v), next(n) {}
};

Node* insertHead(Node* head, int x) { return new Node(x, head); }

Node* insertAfter(Node* node, int x) {
  node->next = new Node(x, node->next);
  return node->next;
}

void deleteAfter(Node* node) {
  if (!node->next) return;
  Node* dead = node->next;
  node->next = dead->next;
  delete dead;
}

void traverse(Node* head) {
  for (Node* cur = head; cur; cur = cur->next) visit(cur);
}`,
    `
static final class Node {
  int value;
  Node next;
  Node(int value, Node next) { this.value = value; this.next = next; }
}

static Node insertHead(Node head, int x) { return new Node(x, head); }

static Node insertAfter(Node node, int x) {
  node.next = new Node(x, node.next);
  return node.next;
}

static void deleteAfter(Node node) {
  if (node.next != null) node.next = node.next.next;
}

static void traverse(Node head) {
  for (Node cur = head; cur != null; cur = cur.next) visit(cur);
}`,
  ),
  explanation: [
    'A singly linked list stores each value with a pointer to the next node — the nodes need not be adjacent in memory.',
    'Inserting or deleting is rewiring two pointers, O(1), but only after an O(n) walk to reach the position.',
    'No shifting ever happens: that is the trade against an array’s cheap indexing.',
  ],
  learn: {
    useCases: ['Stacks and queues with unbounded size', 'Hash bucket chains', 'Streaming data where you only append'],
    quiz: [
      {
        question: 'Why can’t a singly linked list delete a node given only that node?',
        options: ['Because of the garbage collector', 'Because you cannot reach its predecessor to rewire `next`', 'Because deletion is O(n) always', 'You can delete it in O(1)'],
        answer: 1,
        why: 'Without a `prev` pointer the only way to reach the predecessor is another walk — exactly why doubly linked lists exist.',
      },
    ],
    practice: [{ title: 'Reverse Linked List', url: 'https://leetcode.com/problems/reverse-linked-list/', difficulty: 'easy' }],
  },
  defaultInput: LINEAR_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new SeqModel([], 'list');

    let cursors: SequenceCursorSnapshot[] = [];
    let caption = 'Empty list';
    let operation: LinkedListData['operation'] = 'insert-tail';

    const builder = new TraceBuilder<SequenceSnapshot, LinkedListData>(() =>
      model.snapshot({
        cursors,
        links: model.links(['next']),
        caption,
        badges: { nodes: model.size, head: model.at(0)?.label ?? 'null', tail: model.at(model.size - 1)?.label ?? 'null' },
      }),
    );

    builder.emit({
      kind: 'init',
      description: 'Empty singly linked list: head = null.',
      badges: { nodes: 0 },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.4,
    });

    /* ── insertTail for every value: the O(1) head insert, shown once ─────── */
    operation = 'insert-tail';
    for (const value of values) {
      model.paint([], 'active', { clear: true });
      if (model.size === 0) {
        const item = model.push(value);
        model.paintId(item.id, 'success');
        cursors = [{ name: 'head', itemId: item.id, role: 'success' }];
        caption = `head = new Node(${value})`;
        builder.emit({
          kind: 'insert',
          description: `First node ${value} becomes both head and tail.`,
          highlight: { success: [0] },
          badges: { nodes: 1, operation },
          pseudocodeLine: 1,
          codeLine: 4,
          data: { operation, value, links: 0 },
          weight: 1.2,
          bump: ['writes'],
        });
        continue;
      }
      const tailIndex = model.size - 1;
      model.paint([tailIndex], 'pivot');
      cursors = [
        { name: 'head', index: 0, role: 'sorted' },
        { name: 'tail', index: tailIndex, role: 'pivot' },
      ];
      caption = `Walk to the tail (${model.at(tailIndex)?.label}) to append ${value}`;
      builder.emit({
        kind: 'visit',
        description: `Find the tail: a singly linked list has no rear pointer, so append costs an O(n) walk.`,
        highlight: { tertiary: [tailIndex] },
        badges: { nodes: model.size, operation },
        pseudocodeLine: 16,
        codeLine: 18,
        data: { operation, value, links: tailIndex },
        weight: 1.1,
        bump: ['reads'],
      });

      const item = model.push(value);
      model.paintId(item.id, 'active');
      cursors = [
        { name: 'head', index: 0, role: 'sorted' },
        { name: 'rear', itemId: item.id, role: 'active' },
      ];
      caption = `tail.next = new Node(${value})`;
      builder.emit({
        kind: 'insert',
        description: `Rewire tail.next → ${value}. Node count ${model.size}.`,
        highlight: { primary: [model.size - 1], tertiary: [tailIndex] },
        badges: { nodes: model.size, operation },
        pseudocodeLine: 8,
        codeLine: 7,
        data: { operation, value, links: 1 },
        weight: 1.2,
        bump: ['writes'],
      });
    }

    /* ── insertAfter the head (O(1) with the node in hand) ────────────────── */
    operation = 'insert-after';
    if (model.size >= 2) {
      const head = model.at(0);
      const anchor = 0;
      model.paint([anchor], 'pivot');
      cursors = [{ name: 'p', index: anchor, role: 'pivot' }];
      builder.emit({
        kind: 'info',
        description: `Holding node ${head?.label} directly — no search needed.`,
        highlight: { tertiary: [anchor] },
        badges: { nodes: model.size, operation },
        pseudocodeLine: 6,
        codeLine: 6,
        weight: 1,
      });

      const inserted = model.insertAt(1, head ? Number(head.label) : 0);
      model.paintId(inserted.id, 'success');
      cursors = [
        { name: 'p', index: 0, role: 'pivot' },
        { name: 'new', index: 1, role: 'success' },
      ];
      builder.emit({
        kind: 'insert',
        description: `Spliced ${inserted.label} between ${head?.label} and ${model.at(2)?.label ?? 'null'} — two pointer writes, O(1).`,
        highlight: { success: [1] },
        badges: { nodes: model.size, operation },
        pseudocodeLine: 8,
        codeLine: 7,
        data: { operation, value: Number(inserted.label), links: 2 },
        weight: 1.5,
        bump: ['writes'],
      });

      /* ── delete the inserted node ───────────────────────────────────────── */
      operation = 'delete';
      model.paint([1], 'danger');
      cursors = [{ name: 'dead', index: 1, role: 'danger' }];
      builder.emit({
        kind: 'delete',
        description: `Delete ${inserted.label}: point predecessor.next past it.`,
        highlight: { danger: [1] },
        badges: { nodes: model.size, operation },
        pseudocodeLine: 10,
        codeLine: 11,
        weight: 1.4,
        bump: ['writes'],
      });
      const dead = model.removeAt(1);
      if (dead) model.items.splice(1, 0, model.ghost(dead));
      builder.emit({
        kind: 'delete',
        description: `${dead?.label} is unlinked and unreachable — the list is immediately consistent.`,
        highlight: { muted: [1] },
        badges: { nodes: model.size - 1, operation },
        pseudocodeLine: 12,
        codeLine: 13,
        weight: 0.9,
      });
      model.removeAt(1);
    }

    /* ── search ───────────────────────────────────────────────────────────── */
    operation = 'search';
    const needle = values[Math.min(values.length - 1, 3)] ?? 0;
    let found = -1;
    for (let i = 0; i < model.size; i += 1) {
      model.paint([i], 'compare');
      cursors = [{ name: 'cur', index: i, role: 'compare' }];
      caption = `cur.value = ${model.at(i)?.label}`;
      builder.emit({
        kind: 'compare',
        description: `Compare ${model.at(i)?.label} with ${needle}.`,
        highlight: { primary: [i] },
        badges: { nodes: model.size, operation, hops: i + 1 },
        pseudocodeLine: 16,
        codeLine: 18,
        data: { operation, value: needle, links: i },
        weight: 0.7,
        bump: ['comparisons', 'reads'],
      });
      if (Number(model.at(i)?.label) === needle) {
        found = i;
        model.paint([i], 'success');
        cursors = [{ name: 'cur', index: i, role: 'success' }];
        builder.emit({
          kind: 'found',
          description: `Found ${needle} after ${i + 1} hops — no indexing, every step is a pointer dereference.`,
          highlight: { success: [i] },
          badges: { nodes: model.size, operation, hops: i + 1 },
          pseudocodeLine: 15,
          codeLine: 19,
          weight: 1.8,
        });
        break;
      }
    }

    const output = model.values();
    builder.emit({
      kind: 'complete',
      description: `List holds ${output.join(' → ')}${found >= 0 ? `; ${needle} found at node ${found + 1}` : ''}.`,
      highlight: { success: Array.from({ length: model.size }, (_, i) => i) },
      badges: { nodes: model.size, head: model.at(0)?.label ?? 'null' },
      pseudocodeLine: 15,
      codeLine: 19,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: found >= 0 ? `Found ${needle} at node ${found + 1}` : 'Search miss',
        detail: `${model.size} nodes, ${builder.metrics.comparisons} comparisons`,
        output,
      },
    });
  },
};

export const definition: AlgorithmDefinition<SequenceSnapshot, LinkedListData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: SequenceVisualizer });
