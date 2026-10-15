import type { AlgorithmDefinition, SequenceCursorSnapshot, SequenceSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { SequenceVisualizer } from '@/visualizers/SequenceVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, LINEAR_DEFAULT_INPUT } from './specs';
import { SeqModel } from './kit';

export interface DequeData {
  readonly operation: 'push-front' | 'push-back' | 'pop-front' | 'pop-back';
  readonly value?: number;
  readonly size: number;
}

/**
 * Deque — constant time at both ends.
 *
 * The trace alternates sides deliberately: back, front, back, front. Watching
 * the two cursors work the opposite ends of the same buffer is the clearest way
 * to see why a deque (and not a stack or a queue) is what sliding-window
 * algorithms reach for.
 */
const spec: AlgorithmSpec<SequenceSnapshot, DequeData> = {
  id: 'deque',
  complexity: COMPLEXITY.deque!,
  pseudocode: pseudo(`
#pushFront(x)          ▸ O(1): head.prev ← node, head ← node
#pushBack(x)           ▸ O(1): tail.next ← node, tail ← node
#
#popFront()            ▸ O(1)
#   x ← head.value, head ← head.next, head.prev ← null
#   return x
#
#popBack()             ▸ O(1)
#   x ← tail.value, tail ← tail.prev, tail.next ← null
#   return x`),
  code: code(
    `
class Deque {
  #items = new Map();
  #lo = 0; #hi = 0;
  pushFront(x) { this.#items.set(--this.#lo, x); }
  pushBack(x) { this.#items.set(this.#hi++, x); }
  popFront() { const x = this.#items.get(this.#lo); this.#items.delete(this.#lo++); return x; }
  popBack() { const x = this.#items.get(--this.#hi); this.#items.delete(this.#hi); return x; }
  get size() { return this.#items.size; }
}`,
    `
from collections import deque

class Deque:
    def __init__(self):
        self._items = deque()

    def push_front(self, x):
        self._items.appendleft(x)

    def push_back(self, x):
        self._items.append(x)

    def pop_front(self):
        return self._items.popleft()

    def pop_back(self):
        return self._items.pop()`,
    `
class Deque {
  deque<int> items;
public:
  void pushFront(int x) { items.push_front(x); }
  void pushBack(int x) { items.push_back(x); }
  int popFront() { int x = items.front(); items.pop_front(); return x; }
  int popBack() { int x = items.back(); items.pop_back(); return x; }
};`,
    `
class Deque {
  private final ArrayDeque<Integer> items = new ArrayDeque<>();

  void pushFront(int x) { items.addFirst(x); }
  void pushBack(int x) { items.addLast(x); }
  int popFront() { return items.pollFirst(); }
  int popBack() { return items.pollLast(); }
}`,
  ),
  explanation: [
    'A deque allows insertion and removal at both ends, each in O(1).',
    'Implement it as a doubly linked list of blocks or a circular buffer — never as a shifting array.',
    'Sliding-window maximum, 0-1 BFS and work-stealing schedulers all need exactly this shape.',
  ],
  learn: {
    useCases: ['Monotonic deque for sliding-window maxima', '0-1 BFS (push front on 0-weight edges)', 'Work-stealing task schedulers'],
    quiz: [
      {
        question: 'In a sliding-window maximum, why is the deque’s front always the answer?',
        options: ['Because it sorts the window', 'Because it keeps indices in decreasing value order, evicting smaller ones', 'Because it is a stack', 'It is not'],
        answer: 1,
        why: 'Anything smaller than the newest element can never be a maximum while the newer one is in the window, so it is discarded from the back.',
      },
    ],
  },
  defaultInput: LINEAR_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new SeqModel([], 'deque');

    let cursors: SequenceCursorSnapshot[] = [];
    let caption = 'Empty deque';
    let operation: DequeData['operation'] = 'push-back';
    const removed: number[] = [];

    const builder = new TraceBuilder<SequenceSnapshot, DequeData>(() =>
      model.snapshot({
        cursors,
        links: model.links(['next', 'prev']),
        caption,
        badges: { size: model.size, front: model.at(0)?.label ?? '—', back: model.at(model.size - 1)?.label ?? '—' },
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Empty deque. Alternating pushes to the front and the back of ${values.length} values.`,
      badges: { size: 0 },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.4,
    });

    /* ── interleaved double-ended pushes ──────────────────────────────────── */
    values.forEach((value, i) => {
      const fromFront = i % 2 === 1;
      model.paint([], 'active', { clear: true });
      if (fromFront) {
        const item = model.unshift(value);
        model.paintId(item.id, 'active');
        operation = 'push-front';
        caption = `pushFront(${value})`;
      } else {
        const item = model.push(value);
        model.paintId(item.id, 'active');
        operation = 'push-back';
        caption = `pushBack(${value})`;
      }
      cursors = [
        { name: 'front', index: 0, role: 'sorted' },
        { name: 'back', index: model.size - 1, role: 'active' },
      ];
      builder.emit({
        kind: 'push',
        description:
          operation === 'push-front'
            ? `pushFront(${value}): the new node becomes the head — no shifting.`
            : `pushBack(${value}): the new node becomes the tail — no shifting.`,
        highlight: { primary: [operation === 'push-front' ? 0 : model.size - 1] },
        badges: { size: model.size, operation },
        pseudocodeLine: operation === 'push-front' ? 0 : 1,
        codeLine: operation === 'push-front' ? 3 : 4,
        data: { operation, value, size: model.size },
        weight: 1,
        bump: ['writes'],
      });
    });

    /* ── alternate pops: the deque empties from both ends ─────────────────── */
    let side: 'front' | 'back' = 'back';
    while (model.size > 0) {
      const fromBack = side === 'back';
      const index = fromBack ? model.size - 1 : 0;
      const victim = model.at(index);
      if (!victim) break;
      operation = fromBack ? 'pop-back' : 'pop-front';
      model.paint([index], 'danger');
      cursors = [{ name: fromBack ? 'back' : 'front', index, role: 'danger' }];
      caption = `${operation}() → ${victim.label}`;
      builder.emit({
        kind: 'pop',
        description: `${operation === 'pop-back' ? 'popBack' : 'popFront'}() removes ${victim.label} — the other end is untouched.`,
        highlight: { danger: [index] },
        badges: { size: model.size, operation },
        pseudocodeLine: fromBack ? 7 : 3,
        codeLine: fromBack ? 6 : 5,
        data: { operation, value: Number(victim.label), size: model.size },
        weight: 1.1,
        bump: ['reads', 'writes'],
      });

      model.removeAt(index);
      model.items.splice(Math.min(index, model.items.length), 0, model.ghost(victim));
      removed.push(Number(victim.label));
      cursors = model.size
        ? [
            { name: 'front', index: 0, role: 'sorted' },
            { name: 'back', index: Math.max(0, model.size - 1), role: 'active' },
          ]
        : [];
      caption = `size ${model.size}`;
      builder.emit({
        kind: 'pop',
        description: `${victim.label} removed; size is now ${model.size}.`,
        highlight: { muted: [Math.min(index, Math.max(0, model.size - 1))] },
        badges: { size: model.size, operation },
        pseudocodeLine: fromBack ? 8 : 4,
        codeLine: fromBack ? 6 : 5,
        weight: 0.75,
      });
      model.items = model.items.filter((item) => !item.ghost);
      side = side === 'back' ? 'front' : 'back';
    }

    cursors = [];
    caption = 'Deque is empty';
    builder.emit({
      kind: 'complete',
      description: `Emptied from both ends: ${removed.join(' → ')}.`,
      badges: { size: 0, operation },
      pseudocodeLine: 8,
      codeLine: 6,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Both ends exercised',
        detail: `${removed.length} removals alternating back and front`,
        output: removed,
      },
    });
  },
};

export const definition: AlgorithmDefinition<SequenceSnapshot, DequeData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: SequenceVisualizer });
