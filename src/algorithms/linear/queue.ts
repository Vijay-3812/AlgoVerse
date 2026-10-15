import type { AlgorithmDefinition, SequenceCursorSnapshot, SequenceSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { SequenceVisualizer } from '@/visualizers/SequenceVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, LINEAR_DEFAULT_INPUT } from './specs';
import { SeqModel } from './kit';

export interface QueueData {
  readonly operation: 'enqueue' | 'dequeue';
  readonly value?: number;
  readonly size: number;
}

/**
 * Queue — FIFO enqueue/dequeue on a linked rear.
 *
 * The trace makes the fairness literal: values leave in the order they arrived,
 * and the two cursors (`front`, `rear`) never trade places. The comparison with
 * the array-shift cost from `array-ops` is the point — a queue that shifts on
 * dequeue is O(n) per dequeue, which is why real queues are linked or circular.
 */
const spec: AlgorithmSpec<SequenceSnapshot, QueueData> = {
  id: 'queue',
  complexity: COMPLEXITY.queue!,
  pseudocode: pseudo(`
#enqueue(x)            ▸ O(1)
#   node ← new Node(x)
#   if empty: front ← rear ← node
#   else: rear.next ← node, rear ← node
#
#dequeue()              ▸ O(1)
#   if empty: error("underflow")
#   x ← front.value
#   front ← front.next
#   if front = null: rear ← null
#   return x`),
  code: code(
    `
class Queue {
  #items = new Map();
  #head = 0;
  enqueue(x) { this.#items.set(this.#items.size + this.#head, x); }
  dequeue() {
    if (this.#head >= this.#items.size + this.#head) throw new Error("underflow");
    const x = this.#items.get(this.#head);
    this.#items.delete(this.#head++);
    return x;
  }
  get size() { return this.#items.size; }
}`,
    `
from collections import deque

class Queue:
    def __init__(self):
        self._items = deque()

    def enqueue(self, x):
        self._items.append(x)

    def dequeue(self):
        if not self._items:
            raise IndexError("underflow")
        return self._items.popleft()`,
    `
class Queue {
  // A std::deque gives O(1) at both ends.
  deque<int> items;
public:
  void enqueue(int x) { items.push_back(x); }
  int dequeue() {
    if (items.empty()) throw runtime_error("underflow");
    int x = items.front(); items.pop_front(); return x;
  }
};`,
    `
class Queue {
  private final ArrayDeque<Integer> items = new ArrayDeque<>();

  void enqueue(int x) { items.addLast(x); }

  int dequeue() {
    if (items.isEmpty()) throw new IllegalStateException("underflow");
    return items.pollFirst();
  }
}`,
  ),
  explanation: [
    'A queue is FIFO: enqueue at the rear, dequeue at the front, so arrival order is preserved.',
    'With a linked or circular implementation both ends are O(1) — nothing is ever shifted.',
    'BFS frontiers, schedulers, printer spoolers and buffered streams are queues.',
  ],
  learn: {
    useCases: ['BFS level order', 'Task and I/O scheduling', 'Producer/consumer buffering'],
    quiz: [
      {
        question: 'Why is dequeuing from a plain array front O(n)?',
        options: ['Because of pointer chasing', 'Because every remaining element shifts one slot left', 'Because arrays are sorted', 'It is O(1)'],
        answer: 1,
        why: 'Contiguity again: removing the first slot must compact the rest, which is the same shift loop seen in array operations.',
      },
    ],
    practice: [{ title: 'Implement Queue using Stacks', url: 'https://leetcode.com/problems/implement-queue-using-stacks/', difficulty: 'easy' }],
  },
  defaultInput: LINEAR_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new SeqModel([], 'queue');

    let cursors: SequenceCursorSnapshot[] = [];
    let caption = 'Queue is empty';
    let dequeueOrder: number[] = [];

    const builder = new TraceBuilder<SequenceSnapshot, QueueData>(() =>
      model.snapshot({
        cursors,
        links: model.links(['next']),
        caption,
        badges: { size: model.size, front: model.at(0)?.label ?? '—', rear: model.at(model.size - 1)?.label ?? '—' },
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Empty queue — FIFO. Enqueuing ${values.length} values.`,
      badges: { size: 0 },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.4,
    });

    for (const value of values) {
      model.paint([], 'active', { clear: true });
      const item = model.push(value);
      model.paintId(item.id, 'active');
      cursors = [
        ...(model.size > 1 ? [{ name: 'front', index: 0, role: 'sorted' as const }] : []),
        { name: 'rear', itemId: item.id, role: 'active' },
      ];
      caption = `enqueue(${value}) → rear`;
      builder.emit({
        kind: 'push',
        description: `Enqueue ${value} at the rear — size ${model.size}.`,
        highlight: { primary: [model.size - 1] },
        badges: { size: model.size, operation: 'enqueue' },
        pseudocodeLine: 1,
        codeLine: 1,
        data: { operation: 'enqueue', value, size: model.size },
        weight: 1,
        bump: ['writes'],
      });
    }

    dequeueOrder = [];
    while (model.size > 0) {
      const front = model.at(0);
      if (!front) break;
      model.paint([0], 'danger');
      cursors = [
        { name: 'front', index: 0, role: 'danger' },
        ...(model.size > 1 ? [{ name: 'rear', index: model.size - 1, role: 'active' as const }] : []),
      ];
      caption = `dequeue() → ${front.label}`;
      builder.emit({
        kind: 'pop',
        description: `Dequeue ${front.label} from the front — it has waited the longest.`,
        highlight: { danger: [0] },
        badges: { size: model.size, operation: 'dequeue' },
        pseudocodeLine: 4,
        codeLine: 3,
        data: { operation: 'dequeue', value: Number(front.label), size: model.size },
        weight: 1.1,
        bump: ['reads', 'writes'],
      });

      const removed = model.removeAt(0);
      dequeueOrder.push(Number(removed?.label ?? 0));
      if (removed) model.items.unshift(model.ghost(removed));
      cursors = model.size
        ? [{ name: 'front', index: 1, role: 'sorted' }, { name: 'rear', index: model.size, role: 'active' }]
        : [];
      caption = `front is now ${model.at(1)?.label ?? '—'}`;
      builder.emit({
        kind: 'pop',
        description: `${removed?.label} left the queue; size ${model.size - 1}.`,
        highlight: { muted: [0] },
        badges: { size: model.size - 1, operation: 'dequeue' },
        pseudocodeLine: 5,
        codeLine: 4,
        weight: 0.7,
      });
      model.items.shift();
      cursors = model.size ? [{ name: 'front', index: 0, role: 'sorted' }] : [];
    }

    cursors = [];
    caption = 'Queue is empty again';
    builder.emit({
      kind: 'complete',
      description: `Dequeued in arrival order: ${dequeueOrder.join(', ')} — FIFO holds.`,
      badges: { size: 0, operation: 'dequeue' },
      pseudocodeLine: 6,
      codeLine: 5,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'FIFO verified',
        detail: `dequeued ${dequeueOrder.join(' → ')}`,
        output: dequeueOrder,
      },
    });
  },
};

export const definition: AlgorithmDefinition<SequenceSnapshot, QueueData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: SequenceVisualizer });
