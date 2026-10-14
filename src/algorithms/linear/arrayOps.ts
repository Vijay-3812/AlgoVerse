import type { AlgorithmDefinition, SequenceCursorSnapshot, SequenceSnapshot } from '@/types';
import { code, defineAlgorithm, finish, numberOf, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { SequenceVisualizer } from '@/visualizers/SequenceVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, LINEAR_DEFAULT_INPUT } from './specs';
import { SeqModel } from './kit';

export interface ArrayOpsData {
  readonly operation: string;
  readonly shiftCost?: number;
}

/**
 * Array operations — insert, delete, reverse, rotate.
 *
 * The point of this trace is the *shift cost*: watch every element to the right
 * of an insertion slide over, one step at a time. Indexing is free, but making
 * room is O(n), and that asymmetry is the whole dynamic-array story.
 */
const spec: AlgorithmSpec<SequenceSnapshot, ArrayOpsData> = {
  id: 'array-ops',
  complexity: COMPLEXITY['array-ops']!,
  pseudocode: pseudo(`
#insertAt(A, i, x)               ▸ shift the tail right
#   for j ← n − 1 down to i
#     A[j + 1] ← A[j]
#   A[i] ← x
#
#deleteAt(A, i)
#   for j ← i to n − 2
#     A[j] ← A[j + 1]
#   n ← n − 1
#
#reverse(A)                       ▸ swap from both ends
#   for k ← 0 to ⌊n/2⌋ − 1
#     swap(A[k], A[n − 1 − k])`),
  code: code(
    `
function insertAt(a, i, x) {
  a.push(0);
  for (let j = a.length - 2; j >= i; j--) a[j + 1] = a[j];
  a[i] = x;
}

function deleteAt(a, i) {
  for (let j = i; j < a.length - 1; j++) a[j] = a[j + 1];
  a.pop();
}

function reverse(a) {
  for (let k = 0; k < a.length >> 1; k++) {
    const t = a[k]; a[k] = a[a.length - 1 - k]; a[a.length - 1 - k] = t;
  }
}`,
    `
def insert_at(a, i, x):
    a.append(0)
    for j in range(len(a) - 2, i - 1, -1):
        a[j + 1] = a[j]
    a[i] = x

def delete_at(a, i):
    for j in range(i, len(a) - 1):
        a[j] = a[j + 1]
    a.pop()

def reverse(a):
    for k in range(len(a) // 2):
        a[k], a[-1 - k] = a[-1 - k], a[k]`,
    `
void insertAt(vector<int>& a, int i, int x) {
  a.push_back(0);
  for (int j = (int)a.size() - 2; j >= i; --j) a[j + 1] = a[j];
  a[i] = x;
}

void deleteAt(vector<int>& a, int i) {
  for (int j = i; j < (int)a.size() - 1; ++j) a[j] = a[j + 1];
  a.pop_back();
}

void reverse(vector<int>& a) {
  for (int k = 0; k < (int)a.size() / 2; ++k) swap(a[k], a[a.size() - 1 - k]);
}`,
    `
static void insertAt(int[] a, int n, int i, int x) {
  for (int j = n - 1; j >= i; j--) a[j + 1] = a[j];
  a[i] = x;
}

static void deleteAt(int[] a, int n, int i) {
  for (int j = i; j < n - 1; j++) a[j] = a[j + 1];
}

static void reverse(int[] a) {
  for (int k = 0; k < a.length / 2; k++) {
    int t = a[k]; a[k] = a[a.length - 1 - k]; a[a.length - 1 - k] = t;
  }
}`,
  ),
  explanation: [
    'An array is one contiguous block: reading A[i] is arithmetic, but inserting or deleting in the middle must shift every later element.',
    'That shift loop is the visible O(n) here — appending at the end costs nothing because nothing moves.',
    'Reverse is the same idea from both ends at once, halving the swaps.',
  ],
  learn: {
    useCases: ['Random-access lookups', 'Tight numeric loops (cache locality)', 'Fixed-size buffers'],
    quiz: [
      {
        question: 'Why is inserting at index 0 of an array O(n) but appending O(1)?',
        options: ['Because of the garbage collector', 'Because every later element must be shifted one slot over', 'Because arrays are immutable', 'It is O(1) too'],
        answer: 1,
        why: 'Contiguity means there is no gap to drop into: making room at the front moves the entire tail.',
      },
    ],
  },
  defaultInput: LINEAR_DEFAULT_INPUT,
  generate: (input, run) => {
    const model = new SeqModel(valuesOf(input), 'array');
    const n = model.size;
    const insertAt = Math.min(3, n);
    const insertValue = numberOf(input, 55);

    let caption = 'Array loaded';
    let cursors: SequenceCursorSnapshot[] = [];
    let op: string = 'load';

    const builder = new TraceBuilder<SequenceSnapshot, ArrayOpsData>(() =>
      model.snapshot({
        cursors,
        caption,
        badges: { size: model.size, operation: op },
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Loaded ${n} values into a contiguous array.`,
      highlight: { primary: Array.from({ length: n }, (_, i) => i) },
      badges: { size: n, operation: 'load' },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.5,
    });

    /* ── insertAt ─────────────────────────────────────────────────────────── */
    op = `insert ${insertValue} at ${insertAt}`;
    model.push(0);
    caption = `Make room: shift A[${insertAt}..${n - 1}] one slot right`;
    builder.emit({
      kind: 'resize',
      description: `Grow the array by one slot, then shift the tail right to open index ${insertAt}.`,
      highlight: { tertiary: [insertAt], danger: [model.size - 1] },
      badges: { operation: op },
      pseudocodeLine: 1,
      codeLine: 1,
      weight: 1.4,
      bump: ['writes'],
    });

    for (let j = model.size - 2; j >= insertAt; j -= 1) {
      cursors = [model.cursor('j', j), model.cursor('j+1', j + 1, 'danger')];
      model.paint([j, j + 1], 'compare');
      caption = `A[${j + 1}] ← A[${j}]`;
      builder.emit({
        kind: 'write',
        description: `Shift ${model.at(j)?.label} right into slot ${j + 1}.`,
        highlight: { primary: [j], tertiary: [j + 1] },
        badges: { operation: op, shifts: model.size - 1 - insertAt - (model.size - 2 - j) },
        pseudocodeLine: 2,
        codeLine: 2,
        weight: 0.8,
        bump: ['writes', 'reads'],
      });
      const moved = model.removeAt(j);
      if (moved) model.insertAt(j + 1, moved.label);
      model.items = model.items.map((item, i) => (i === j + 1 ? { ...item, role: 'swap' } : item));
    }

    model.set(insertAt, String(insertValue));
    model.paint([insertAt], 'success');
    cursors = [model.cursor('i', insertAt, 'success')];
    caption = `A[${insertAt}] ← ${insertValue}`;
    builder.emit({
      kind: 'write',
      description: `Drop ${insertValue} into the gap — insertion needed ${model.size - 1 - insertAt} shifts.`,
      highlight: { success: [insertAt] },
      badges: { operation: op },
      pseudocodeLine: 3,
      codeLine: 3,
      weight: 1.8,
      bump: ['writes'],
    });

    /* ── deleteAt ─────────────────────────────────────────────────────────── */
    const deleteAt = 1;
    const removed = model.at(deleteAt)?.label ?? '';
    op = `delete index ${deleteAt}`;
    model.paint([deleteAt], 'danger');
    caption = `Delete A[${deleteAt}] = ${removed} — close the hole from the right`;
    builder.emit({
      kind: 'mark',
      description: `Removing ${removed}: every later element must slide left to keep the array contiguous.`,
      highlight: { danger: [deleteAt] },
      badges: { operation: op },
      pseudocodeLine: 5,
      codeLine: 6,
      weight: 1.4,
      bump: ['writes'],
    });

    for (let j = deleteAt; j < model.size - 1; j += 1) {
      cursors = [model.cursor('j', j), model.cursor('j+1', j + 1, 'compare')];
      model.paint([j, j + 1], 'compare');
      caption = `A[${j}] ← A[${j + 1}]`;
      builder.emit({
        kind: 'write',
        description: `Slide ${model.at(j + 1)?.label} left into slot ${j}.`,
        highlight: { primary: [j + 1], tertiary: [j] },
        badges: { operation: op },
        pseudocodeLine: 6,
        codeLine: 7,
        weight: 0.8,
        bump: ['writes', 'reads'],
      });
      const pulled = model.removeAt(j + 1);
      if (pulled) model.insertAt(j, pulled.label);
      model.items = model.items.map((item, i) => (i === j ? { ...item, role: 'swap' } : item));
    }
    model.removeAt(model.size - 1);
    cursors = [];
    caption = `Removed ${removed}; size ${model.size}`;
    builder.emit({
      kind: 'delete',
      description: `Array is compact again — ${model.size} values, no holes.`,
      highlight: { muted: [model.size] },
      badges: { operation: op, size: model.size },
      pseudocodeLine: 7,
      codeLine: 8,
      weight: 1.6,
    });

    /* ── reverse ──────────────────────────────────────────────────────────── */
    op = 'reverse';
    const size = model.size;
    for (let k = 0; k < Math.floor(size / 2); k += 1) {
      const left = k;
      const right = size - 1 - k;
      cursors = [model.cursor('k', left), model.cursor('n−1−k', right, 'compare')];
      model.paint([left, right], 'compare');
      caption = `Swap A[${left}] ↔ A[${right}]`;
      builder.emit({
        kind: 'compare',
        description: `Mirror pair ${model.at(left)?.label} and ${model.at(right)?.label}.`,
        highlight: { primary: [left], secondary: [right] },
        badges: { operation: op, pair: k + 1 },
        pseudocodeLine: 9,
        codeLine: 10,
        weight: 0.9,
      });
      model.swap(left, right);
      model.paint([left, right], 'swap');
      builder.emit({
        kind: 'swap',
        description: `Swapped — the two ends trade places.`,
        highlight: { primary: [left], secondary: [right] },
        badges: { operation: op, swaps: k + 1 },
        pseudocodeLine: 10,
        codeLine: 11,
        data: { operation: op },
        weight: 1,
        bump: ['swaps', 'writes'],
      });
    }
    model.paint(Array.from({ length: size }, (_, i) => i), 'success');
    caption = 'Reversed';
    const output = model.values();
    builder.emit({
      kind: 'complete',
      description: `Reversed in ${Math.floor(size / 2)} swaps — half the array, twice the movement.`,
      highlight: { success: Array.from({ length: size }, (_, i) => i) },
      badges: { operation: op, swaps: Math.floor(size / 2) },
      pseudocodeLine: 10,
      codeLine: 11,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Array operations complete',
        detail: `${model.size} values after insert, delete and reverse`,
        output,
      },
    });
  },
};

export const definition: AlgorithmDefinition<SequenceSnapshot, ArrayOpsData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: SequenceVisualizer });
