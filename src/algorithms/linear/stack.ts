import type { AlgorithmDefinition, SequenceCursorSnapshot, SequenceSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { SequenceVisualizer } from '@/visualizers/SequenceVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, LINEAR_DEFAULT_INPUT } from './specs';
import { SeqModel } from './kit';

export interface StackData {
  readonly operation: 'push' | 'pop' | 'peek';
  readonly value?: number;
  readonly depth: number;
}

/**
 * Stack — LIFO push/pop with the top always at the same place.
 *
 * The layout stays fixed while items stack upward, which is exactly the mental
 * model: a pop never touches anything but the top. Pops leave a ghost slot for
 * one beat so the value that left is still visible when the cursor moves.
 */
const spec: AlgorithmSpec<SequenceSnapshot, StackData> = {
  id: 'stack',
  complexity: COMPLEXITY.stack!,
  pseudocode: pseudo(`
#push(x)          ▸ O(1)
#   top ← top + 1
#   S[top] ← x
#
#pop()             ▸ O(1)
#   if top < 0: error("underflow")
#   x ← S[top]
#   top ← top − 1
#   return x
#
#peek()            ▸ O(1)
#   return S[top]`),
  code: code(
    `
class Stack {
  #items = [];
  push(x) { this.#items.push(x); return this; }
  pop() { if (!this.#items.length) throw new Error("underflow"); return this.#items.pop(); }
  peek() { return this.#items[this.#items.length - 1]; }
  get size() { return this.#items.length; }
}`,
    `
class Stack:
    def __init__(self):
        self._items = []

    def push(self, x):
        self._items.append(x)

    def pop(self):
        if not self._items:
            raise IndexError("underflow")
        return self._items.pop()

    def peek(self):
        return self._items[-1] if self._items else None`,
    `
class Stack {
  vector<int> items;
public:
  void push(int x) { items.push_back(x); }
  int pop() {
    if (items.empty()) throw runtime_error("underflow");
    int x = items.back(); items.pop_back(); return x;
  }
  int peek() const { return items.back(); }
};`,
    `
class Stack {
  private final ArrayDeque<Integer> items = new ArrayDeque<>();

  void push(int x) { items.push(x); }

  int pop() {
    if (items.isEmpty()) throw new IllegalStateException("underflow");
    return items.pop();
  }

  int peek() { return items.peek(); }
}`,
  ),
  explanation: [
    'A stack is LIFO: the last value pushed is the first popped, so all mutation happens at one end.',
    'That single-end discipline makes push, pop and peek O(1) — no shifting, ever.',
    'The call stack, undo/redo, DFS frontier and bracket matching are all this structure.',
  ],
  learn: {
    useCases: ['Expression evaluation and bracket matching', 'DFS and backtracking', 'Undo history'],
    quiz: [
      {
        question: 'Push 1, 2, 3 then pop twice. What is on top now?',
        options: ['3', '2', '1', 'empty'],
        answer: 2,
        why: 'Pops remove 3 then 2, leaving 1 on top — the first value survives the longest.',
      },
    ],
    practice: [{ title: 'Valid Parentheses', url: 'https://leetcode.com/problems/valid-parentheses/', difficulty: 'easy' }],
  },
  defaultInput: LINEAR_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new SeqModel([], 'stack');

    let cursors: SequenceCursorSnapshot[] = [];
    let caption = 'Stack is empty';
    let operation: StackData['operation'] = 'push';
    let popped: number[] = [];

    const builder = new TraceBuilder<SequenceSnapshot, StackData>(() =>
      model.snapshot({
        cursors,
        caption,
        badges: { depth: model.size, operation },
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Empty stack — LIFO. Pushing ${values.length} values.`,
      badges: { depth: 0, operation: 'push' },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.4,
    });

    /* ── push every value ─────────────────────────────────────────────────── */
    operation = 'push';
    for (const value of values) {
      model.paint([], 'active', { clear: true });
      const item = model.push(value);
      model.paintId(item.id, 'active');
      cursors = [{ name: 'top', itemId: item.id, role: 'active' }];
      caption = `push(${value}) → depth ${model.size}`;
      builder.emit({
        kind: 'push',
        description: `Push ${value}: it becomes the new top of the stack.`,
        highlight: { primary: [model.size - 1] },
        badges: { depth: model.size, operation, value },
        pseudocodeLine: 1,
        codeLine: 1,
        data: { operation, value, depth: model.size },
        weight: 1,
        bump: ['writes'],
      });
    }

    /* ── peek ─────────────────────────────────────────────────────────────── */
    operation = 'peek';
    const top = model.at(model.size - 1);
    model.paint([model.size - 1], 'pivot');
    cursors = top ? [{ name: 'top', itemId: top.id, role: 'pivot' }] : [];
    caption = `peek() → ${top?.label ?? '—'}`;
    builder.emit({
      kind: 'peek',
      description: `peek() reads ${top?.label} without removing it — still depth ${model.size}.`,
      highlight: { primary: [model.size - 1] },
      badges: { depth: model.size, operation },
      pseudocodeLine: 9,
      codeLine: 6,
      weight: 1.6,
      bump: ['reads'],
    });

    /* ── pop everything, recording the LIFO order ─────────────────────────── */
    operation = 'pop';
    popped = [];
    let lastGhost: string | null = null;
    while (model.size > 0) {
      const index = model.size - 1;
      const item = model.at(index);
      if (!item) break;
      lastGhost = item.id;
      model.paint([index], 'danger');
      cursors = [{ name: 'top', itemId: item.id, role: 'danger' }];
      caption = `pop() → ${item.label}`;
      builder.emit({
        kind: 'pop',
        description: `Pop ${item.label} off the top — the most recent push is the first to leave.`,
        highlight: { danger: [index] },
        badges: { depth: model.size, operation, value: item.label },
        pseudocodeLine: 4,
        codeLine: 3,
        data: { operation, value: Number(item.label), depth: model.size },
        weight: 1.1,
        bump: ['reads', 'writes'],
      });

      const removed = model.removeAt(index);
      popped.push(Number(removed?.label ?? 0));
      if (removed) model.items.splice(index, 0, model.ghost(removed));
      cursors = model.size ? [model.cursor('top', model.size - 1, 'active')] : [];
      caption = `depth ${model.size}`;
      builder.emit({
        kind: 'pop',
        description: `${removed?.label} left the stack; depth is now ${model.size}.`,
        highlight: { muted: [index] },
        badges: { depth: model.size, operation },
        pseudocodeLine: 5,
        codeLine: 4,
        weight: 0.7,
      });
      model.items.pop();
      if (model.items.length === 0 && lastGhost) model.items = [];
    }

    cursors = [];
    caption = 'Stack is empty again';
    builder.emit({
      kind: 'complete',
      description: `Popped in reverse push order: ${popped.join(', ')}.`,
      badges: { depth: 0, operation },
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
        headline: 'LIFO verified',
        detail: `popped ${popped.join(' → ')}`,
        output: popped,
      },
    });
  },
};

export const definition: AlgorithmDefinition<SequenceSnapshot, StackData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: SequenceVisualizer });
