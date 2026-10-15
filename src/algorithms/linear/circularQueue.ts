import type { AlgorithmDefinition, SequenceSnapshot, VisualRole } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { SequenceVisualizer } from '@/visualizers/SequenceVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, LINEAR_DEFAULT_INPUT } from './specs';
import { SeqModel } from './kit';

export interface RingData {
  readonly operation: 'enqueue' | 'dequeue';
  readonly value?: number;
  readonly front: number;
  readonly rear: number;
  readonly size: number;
}

/**
 * Circular Queue (ring buffer) — fixed capacity, wrapping indices.
 *
 * The fixed array is the star: emptied slots are left as dashed ghosts so the
 * hole at index 0 is *visible* after several dequeues, and the rear index is
 * shown wrapping from `k − 1` back to `0`. This is the structure that makes a
 * bounded queue O(1) on both ends with no shifting and no allocation.
 */
const spec: AlgorithmSpec<SequenceSnapshot, RingData> = {
  id: 'circular-queue',
  complexity: COMPLEXITY['circular-queue']!,
  pseudocode: pseudo(`
#CircularQueue(k)                ▸ k slots, front = rear = 0, size = 0
#
#enqueue(x)                       ▸ O(1), wraps
#   if size = k: error("full")
#   ring[rear] ← x
#   rear ← (rear + 1) mod k
#   size ← size + 1
#
#dequeue()                        ▸ O(1), wraps
#   if size = 0: error("empty")
#   x ← ring[front]
#   ring[front] ← ∅
#   front ← (front + 1) mod k
#   size ← size − 1
#   return x`),
  code: code(
    `
class CircularQueue {
  #ring; #front = 0; #rear = 0; #size = 0;
  constructor(capacity) { this.#ring = new Array(capacity).fill(null); }
  enqueue(x) {
    if (this.#size === this.#ring.length) throw new Error("full");
    this.#ring[this.#rear] = x;
    this.#rear = (this.#rear + 1) % this.#ring.length;
    this.#size++;
  }
  dequeue() {
    if (this.#size === 0) throw new Error("empty");
    const x = this.#ring[this.#front];
    this.#ring[this.#front] = null;
    this.#front = (this.#front + 1) % this.#ring.length;
    this.#size--;
    return x;
  }
}`,
    `
class CircularQueue:
    def __init__(self, capacity):
        self.ring = [None] * capacity
        self.front = self.rear = self.size = 0

    def enqueue(self, x):
        if self.size == len(self.ring):
            raise OverflowError("full")
        self.ring[self.rear] = x
        self.rear = (self.rear + 1) % len(self.ring)
        self.size += 1

    def dequeue(self):
        if self.size == 0:
            raise IndexError("empty")
        x = self.ring[self.front]
        self.ring[self.front] = None
        self.front = (self.front + 1) % len(self.ring)
        self.size -= 1
        return x`,
    `
class CircularQueue {
  vector<int> ring;
  vector<bool> used;
  int front = 0, rear = 0, cnt = 0;
public:
  explicit CircularQueue(int k) : ring(k), used(k, false) {}
  void enqueue(int x) {
    if (cnt == (int)ring.size()) throw runtime_error("full");
    ring[rear] = x; used[rear] = true;
    rear = (rear + 1) % ring.size(); ++cnt;
  }
  int dequeue() {
    if (cnt == 0) throw runtime_error("empty");
    int x = ring[front]; used[front] = false;
    front = (front + 1) % ring.size(); --cnt;
    return x;
  }
};`,
    `
class CircularQueue {
  private final int[] ring;
  private final boolean[] used;
  private int front = 0, rear = 0, size = 0;

  CircularQueue(int k) { ring = new int[k]; used = new boolean[k]; }

  void enqueue(int x) {
    if (size == ring.length) throw new IllegalStateException("full");
    ring[rear] = x; used[rear] = true;
    rear = (rear + 1) % ring.length; size++;
  }

  int dequeue() {
    if (size == 0) throw new IllegalStateException("empty");
    int x = ring[front]; used[front] = false;
    front = (front + 1) % ring.length; size--;
    return x;
  }
}`,
  ),
  explanation: [
    'A circular queue keeps a fixed array and wraps both indices with `(i + 1) mod k`, so no element ever shifts.',
    '`front` marks the oldest live slot, `rear` the next free one; `size` distinguishes a full ring from an empty one.',
    'It is the standard bounded buffer: constant time, constant memory, zero allocation after construction.',
  ],
  learn: {
    useCases: ['Producer/consumer buffers with bounded memory', 'Audio and video ring buffers', 'Fixed-window rate limiting'],
    quiz: [
      {
        question: 'Why is a separate `size` (or a wasted slot) needed even with front and rear?',
        options: ['To make it faster', 'Because front == rear is ambiguous — it means both empty and full', 'Because arrays need it', 'It is not needed'],
        answer: 1,
        why: 'Without a counter the two states look identical, so the implementation cannot tell whether to overflow or underflow.',
      },
    ],
    practice: [{ title: 'Design Circular Queue', url: 'https://leetcode.com/problems/design-circular-queue/', difficulty: 'medium' }],
  },
  defaultInput: LINEAR_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const capacity = Math.max(4, Math.min(8, values.length));
    const model = new SeqModel([], 'queue');

    let front = 0;
    let rear = 0;
    let size = 0;
    let caption = `Capacity ${capacity} — ring is empty`;
    let operation: RingData['operation'] = 'enqueue';
    const dequeued: number[] = [];

    /** Rebuilds the fixed array as items with ghost holes for freed slots. */
    const sync = (slotValues: (string | null)[]): void => {
      model.items = slotValues.map((label, i) => ({
        id: `slot${i}`,
        label: label ?? '∅',
        sub: `[${i}]`,
        ...(label === null ? { ghost: true, role: 'ghost' as VisualRole } : { role: 'idle' as VisualRole }),
      }));
    };

    const slotValues: (string | null)[] = Array.from({ length: capacity }, () => null);
    sync(slotValues);

    const builder = new TraceBuilder<SequenceSnapshot, RingData>(() =>
      model.snapshot({
        cursors: [
          { name: 'front', index: front, role: size ? 'sorted' : 'ghost' },
          { name: 'rear', index: rear, role: 'active' },
        ],
        caption,
        badges: { size, capacity, front, rear },
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Casual ring buffer of capacity ${capacity}: front = rear = 0, size = 0.`,
      badges: { size: 0, capacity, front: 0, rear: 0 },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    /* ── enqueue until full, filling every slot ───────────────────────────── */
    operation = 'enqueue';
    const incoming = values.slice(0, capacity);
    for (const value of incoming) {
      const slot = rear;
      slotValues[slot] = String(value);
      sync(slotValues);
      model.paint([slot], 'active');
      size += 1;
      rear = (rear + 1) % capacity;
      caption = `ring[${slot}] ← ${value}; rear → (${slot} + 1) mod ${capacity} = ${rear}`;
      builder.emit({
        kind: 'push',
        description: `Enqueue ${value} into slot ${slot}; rear wraps to ${rear} after ${slot === capacity - 1 ? 'the last slot' : 'this write'}.`,
        highlight: { primary: [slot] },
        badges: { size, capacity, front, rear, operation },
        pseudocodeLine: 2,
        codeLine: 3,
        data: { operation, value, front, rear, size },
        weight: 1.05,
        bump: ['writes'],
      });
    }

    caption = 'Ring is full — rear has wrapped exactly onto front';
    builder.emit({
      kind: 'info',
      description: `Full: size = capacity = ${capacity}. rear has wrapped to ${rear}, which equals front — size is what disambiguates.`,
      highlight: { tertiary: [front] },
      badges: { size, capacity, front, rear, full: 'yes' },
      pseudocodeLine: 3,
      codeLine: 4,
      weight: 1.8,
      bump: ['writes'],
    });

    /* ── dequeue from the front, freeing wrapping holes ───────────────────── */
    operation = 'dequeue';
    const toRemove = Math.max(3, Math.ceil(capacity / 2));
    for (let i = 0; i < toRemove; i += 1) {
      const slot = front;
      const value = slotValues[slot];
      slotValues[slot] = null;
      sync(slotValues);
      model.paint([slot], 'danger');
      size -= 1;
      front = (front + 1) % capacity;
      dequeued.push(Number(value ?? 0));
      caption = `dequeue → ${value} from slot ${slot}; front wraps to ${front}`;
      builder.emit({
        kind: 'pop',
        description: `Dequeue ${value} from slot ${slot}; the slot becomes a hole and front wraps to ${front}.`,
        highlight: { danger: [slot] },
        badges: { size, capacity, front, rear, operation },
        pseudocodeLine: 6,
        codeLine: 8,
        data: { operation, value: Number(value ?? 0), front, rear, size },
        weight: 1.15,
        bump: ['reads', 'writes'],
      });
    }

    /* ── enqueue again: values land in the recycled holes ─────────────────── */
    operation = 'enqueue';
    const refill = Math.min(toRemove, capacity - size);
    for (let i = 0; i < refill; i += 1) {
      // Fresh arrivals reuse the freed slots — distinct from anything still live.
      const value = 100 + i * 7;
      const slot = rear;
      slotValues[slot] = String(value);
      sync(slotValues);
      model.paint([slot], 'swap');
      size += 1;
      rear = (rear + 1) % capacity;
      caption = `reuse slot ${slot} ← ${value}; rear → ${rear}`;
      builder.emit({
        kind: 'push',
        description: `Enqueue ${value} into the recycled slot ${slot} — no shift, no growth.`,
        highlight: { primary: [slot] },
        badges: { size, capacity, front, rear, operation },
        pseudocodeLine: 2,
        codeLine: 3,
        data: { operation, value, front, rear, size },
        weight: 1.15,
        bump: ['writes'],
      });
    }

    const live = slotValues.map((v, i) => ({ v, i })).filter((s) => s.v !== null);
    const output = live.map((s) => Number(s.v));
    builder.emit({
      kind: 'complete',
      description: `Live slots ${live.map((s) => s.i).join(', ')} — the ring wrapped without ever copying an element.`,
      highlight: {
        success: live.map((s) => s.i),
        muted: slotValues.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0),
      },
      badges: { size, capacity, front, rear, operation },
      pseudocodeLine: 7,
      codeLine: 9,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Ring wrapped cleanly',
        detail: `${output.length} live of ${capacity} slots, dequeued ${dequeued.join(' → ')}`,
        output,
      },
    });
  },
};

export const definition: AlgorithmDefinition<SequenceSnapshot, RingData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: SequenceVisualizer });
