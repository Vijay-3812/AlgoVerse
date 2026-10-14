import type { AlgorithmDefinition, SequenceCursorSnapshot, SequenceSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { SequenceVisualizer } from '@/visualizers/SequenceVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, LINEAR_DEFAULT_INPUT } from './specs';
import { SeqModel } from './kit';

export interface CircularData {
  readonly operation: 'build' | 'rotate' | 'traverse' | 'insert' | 'delete';
  readonly rotations?: number;
}

/**
 * Circular Linked List — a ring with no null terminator.
 *
 * The last node points back at the head, so the trace closes the ring visually
 * (the renderer draws the wrap-around link). Rotation is O(1) — just move the
 * head and tail tags — and traversal needs an explicit stop condition, since
 * "until null" would loop forever. That is the lesson this algorithm teaches.
 */
const spec: AlgorithmSpec<SequenceSnapshot, CircularData> = {
  id: 'circular-linked-list',
  complexity: COMPLEXITY['circular-linked-list']!,
  pseudocode: pseudo(`
#build(values)                  ▸ close the ring
#   for x in values: tail.next ← new Node(x); tail ← tail.next
#   tail.next ← head
#
#rotateBy(k)                    ▸ O(k), O(1) per step
#   repeat k times: head ← head.next, tail ← tail.next
#
#traverseOnce()                 ▸ must remember where it started
#   start ← head; cur ← head
#   repeat: visit(cur); cur ← cur.next   until cur = start
#
#insertAfterTail(x)             ▸ O(1)
#   node ← new Node(x, next: head), tail.next ← node, tail ← node`),
  code: code(
    `
function build(values) {
  let head = null, tail = null;
  for (const x of values) {
    const node = { value: x, next: null };
    if (!head) head = node;
    else tail.next = node;
    tail = node;
  }
  tail.next = head;          // close the ring
  return { head, tail };
}

function rotate(head, tail, k) {
  for (let i = 0; i < k; i++) { head = head.next; tail = tail.next; }
  return { head, tail };
}

function traverseOnce(head) {
  let cur = head;
  do { visit(cur); cur = cur.next; } while (cur !== head);
}

function insertAfterTail(tail, head, x) {
  tail.next = { value: x, next: head };
  return tail.next;
}

function deleteHead(head, tail) {
  head = head.next;
  tail.next = head;
  return head;
}`,
    `
def build(values):
    head = tail = None
    for x in values:
        node = {"value": x, "next": None}
        if head is None:
            head = node
        else:
            tail["next"] = node
        tail = node
    tail["next"] = head        # close the ring
    return head, tail


def rotate(head, tail, k):
    for _ in range(k):
        head, tail = head["next"], tail["next"]
    return head, tail


def traverse_once(head):
    cur = head
    while True:
        visit(cur)
        cur = cur["next"]
        if cur is head:
            break


def insert_after_tail(tail, head, x):
    tail["next"] = {"value": x, "next": head}
    return tail["next"]


def delete_head(head, tail):
    head = head["next"]
    tail["next"] = head
    return head`,
    `
pair<Node*, Node*> build(const vector<int>& values) {
  Node *head = nullptr, *tail = nullptr;
  for (int x : values) {
    Node* node = new Node{x, nullptr};
    if (!head) head = node; else tail->next = node;
    tail = node;
  }
  tail->next = head;         // close the ring
  return {head, tail};
}

void rotate(Node*& head, Node*& tail, int k) {
  for (int i = 0; i < k; ++i) { head = head->next; tail = tail->next; }
}

void traverseOnce(Node* head) {
  Node* cur = head;
  do { visit(cur); cur = cur->next; } while (cur != head);
}

void insertAfterTail(Node* tail, Node* head, int x) {
  tail->next = new Node{x, head};
}

Node* deleteHead(Node*& head, Node* tail) {
  head = head->next;
  tail->next = head;
  return head;
}`,
    `
static Node[] build(int[] values) {
  Node head = null, tail = null;
  for (int x : values) {
    Node node = new Node(x);
    if (head == null) head = node; else tail.next = node;
    tail = node;
  }
  tail.next = head;          // close the ring
  return new Node[] { head, tail };
}

static Node[] rotate(Node head, Node tail, int k) {
  for (int i = 0; i < k; i++) { head = head.next; tail = tail.next; }
  return new Node[] { head, tail };
}

static void traverseOnce(Node head) {
  Node cur = head;
  do { visit(cur); cur = cur.next; } while (cur != head);
}

static void insertAfterTail(Node tail, Node head, int x) {
  tail.next = new Node(x, head);
}

static Node deleteHead(Node head, Node tail) {
  head = head.next;
  tail.next = head;
  return head;
}`,
  ),
  explanation: [
    'In a circular list the last node points at the first, so there is no null to stop a traversal.',
    'Every walk therefore needs a remembered start; that book-keeping is the cost of the ring.',
    'Rotation is the payoff: moving the head and tail tags changes the logical order without touching a single node.',
  ],
  learn: {
    useCases: ['Round-robin CPU scheduling', 'Circular buffers and playlists on repeat', 'Josephus-style elimination problems'],
    quiz: [
      {
        question: 'Why does `while (cur !== null)` never terminate on a circular list?',
        options: ['Because null is undefined', 'Because the walk cycles forever — the ring has no null terminator', 'Because pointers are slow', 'It does terminate'],
        answer: 1,
        why: 'The ring closes on itself: the walk must stop when it returns to the node it started from.',
      },
    ],
    practice: [{ title: 'Linked List Cycle', url: 'https://leetcode.com/problems/linked-list-cycle/', difficulty: 'easy' }],
  },
  defaultInput: LINEAR_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new SeqModel([], 'list');

    let cursors: SequenceCursorSnapshot[] = [];
    let caption = 'Empty ring';
    let operation: CircularData['operation'] = 'build';
    let rotations = 0;

    const builder = new TraceBuilder<SequenceSnapshot, CircularData>(() =>
      model.snapshot({
        cursors,
        links: model.ringLinks(['next']),
        caption,
        badges: { nodes: model.size, head: model.at(0)?.label ?? 'null', closed: model.size > 1 ? 'yes' : 'no' },
      }),
    );

    builder.emit({
      kind: 'init',
      description: 'Building a ring of nodes — the last one will point back at the first.',
      badges: { nodes: 0, closed: 'no' },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.4,
    });

    operation = 'build';
    for (const value of values) {
      model.paint([], 'active', { clear: true });
      const item = model.push(value);
      model.paintId(item.id, 'active');
      if (model.size === 1) {
        cursors = [
          { name: 'head', itemId: item.id, role: 'success' },
          { name: 'tail', itemId: item.id, role: 'pivot' },
        ];
        caption = `head = tail = ${value}`;
      } else {
        cursors = [
          { name: 'head', index: 0, role: 'success' },
          { name: 'tail', itemId: item.id, role: 'pivot' },
        ];
        caption = `tail.next = ${value} (temporarily → null)`;
      }
      builder.emit({
        kind: 'insert',
        description: `Append ${value}; the ring stays open until the last node is linked back.`,
        highlight: { primary: [model.size - 1] },
        badges: { nodes: model.size, operation: 'build', closed: 'no' },
        pseudocodeLine: 1,
        codeLine: 5,
        data: { operation: 'build' },
        weight: 1,
        bump: ['writes'],
      });
    }

    /* close the ring */
    const head = model.at(0);
    const tail = model.at(model.size - 1);
    cursors = [
      { name: 'head', index: 0, role: 'success' },
      { name: 'tail', index: model.size - 1, role: 'pivot' },
    ];
    caption = `tail.next = head (${head?.label}) — ring closed`;
    builder.emit({
      kind: 'update',
      description: `${tail?.label}.next = ${head?.label}: the ring is closed, and no node is null-terminated.`,
      highlight: { success: [0], tertiary: [model.size - 1] },
      badges: { nodes: model.size, operation: 'build', closed: 'yes' },
      pseudocodeLine: 2,
      codeLine: 8,
      data: { operation: 'build' },
      weight: 1.9,
      bump: ['writes'],
    });

    /* traverse exactly once, remembering the start */
    operation = 'traverse';
    for (let i = 0; i < model.size; i += 1) {
      model.paint([i], 'compare');
      cursors = [
        { name: 'start', index: 0, role: 'success' },
        { name: 'cur', index: i, role: 'compare' },
      ];
      caption = `visit ${model.at(i)?.label}; cur = cur.next`;
      builder.emit({
        kind: 'visit',
        description: `Visit ${model.at(i)?.label} — stop when cur returns to the start (${head?.label}).`,
        highlight: { primary: [i] },
        badges: { nodes: model.size, operation, hop: i + 1 },
        pseudocodeLine: 9,
        codeLine: 19,
        data: { operation, rotations },
        weight: 0.75,
        bump: ['reads'],
      });
    }

    /* rotate: O(1) relabelling of the same ring */
    operation = 'rotate';
    const k = 2 % Math.max(1, model.size);
    for (let i = 0; i < k; i += 1) {
      rotations += 1;
      const first = model.removeAt(0);
      if (first) model.items.push(first);
      model.paint([model.size - 1], 'swap');
      cursors = [
        { name: 'head', index: 0, role: 'success' },
        { name: 'tail', index: model.size - 1, role: 'pivot' },
      ];
      caption = `head ← head.next (rotation ${rotations})`;
      builder.emit({
        kind: 'rotate',
        description: `Rotate left: head becomes ${model.at(0)?.label}. Not a single node moved in memory.`,
        highlight: { primary: [0], tertiary: [model.size - 1] },
        badges: { nodes: model.size, operation, rotations },
        pseudocodeLine: 5,
        codeLine: 13,
        data: { operation, rotations },
        weight: 1.3,
        bump: ['writes'],
      });
    }

    /* insert just before the (new) head and delete it again */
    operation = 'insert';
    const inserted = model.insertAt(0, 99);
    model.paintId(inserted.id, 'success');
    cursors = [
      { name: 'head', index: 0, role: 'success' },
      { name: 'tail', index: model.size - 1, role: 'pivot' },
    ];
    caption = `Insert ${inserted.label} at the head — tail.next must be rewritten too`;
    builder.emit({
      kind: 'insert',
      description: `Insert ${inserted.label}: because the ring closes through the tail, an insert also rewrites tail.next.`,
      highlight: { success: [0] },
      badges: { nodes: model.size, operation, rotations },
      pseudocodeLine: 11,
      codeLine: 23,
      data: { operation, rotations },
      weight: 1.5,
      bump: ['writes'],
    });

    operation = 'delete';
    model.paint([0], 'danger');
    cursors = [{ name: 'dead', index: 0, role: 'danger' }];
    builder.emit({
      kind: 'delete',
      description: `Delete ${inserted.label}: two pointer writes, and the ring closes again behind it.`,
      highlight: { danger: [0] },
      badges: { nodes: model.size, operation, rotations },
      pseudocodeLine: 11,
      codeLine: 29,
      data: { operation, rotations },
      weight: 1.3,
      bump: ['writes'],
    });
    model.removeAt(0);

    const output = model.values();
    model.paint(Array.from({ length: model.size }, (_, i) => i), 'success');
    cursors = [
      { name: 'head', index: 0, role: 'success' },
      { name: 'tail', index: model.size - 1, role: 'pivot' },
    ];
    caption = 'Ring closed and intact';
    builder.emit({
      kind: 'complete',
      description: `Ring: ${output.join(' → ')} → back to ${output[0]}.`,
      highlight: { success: Array.from({ length: model.size }, (_, i) => i) },
      badges: { nodes: model.size, operation: 'delete', rotations, closed: 'yes' },
      pseudocodeLine: 11,
      codeLine: 29,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Ring built and rotated',
        detail: `${output.length} nodes, ${rotations} rotations, no node copies`,
        output,
      },
    });
  },
};

export const definition: AlgorithmDefinition<SequenceSnapshot, CircularData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: SequenceVisualizer });
