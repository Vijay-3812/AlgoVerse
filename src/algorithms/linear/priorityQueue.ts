import type { AlgorithmDefinition, SequenceCursorSnapshot, SequenceSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { SequenceVisualizer } from '@/visualizers/SequenceVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, LINEAR_DEFAULT_INPUT } from './specs';
import { SeqModel } from './kit';

export interface PqData {
  readonly operation: 'insert' | 'extract-min' | 'sift-up' | 'sift-down';
  readonly value?: number;
  readonly heapSize: number;
}

/**
 * Priority Queue as a binary min-heap.
 *
 * Stored as a plain array with the children of `i` at `2i+1` and `2i+2`, which
 * is why this belongs to the linear-structure family even though it models a
 * tree. `sift-up` on insert and `sift-down` on extract-min are animated as real
 * swaps, so the "min always bubbles to index 0" invariant is visible rather
 * than asserted.
 */
const spec: AlgorithmSpec<SequenceSnapshot, PqData> = {
  id: 'priority-queue',
  complexity: COMPLEXITY['priority-queue']!,
  pseudocode: pseudo(`
#insert(x)                  ▸ O(log n)
#   heap[size] ← x, size ← size + 1
#   siftUp(size − 1)
#
#siftUp(i)                  ▸ while parent is greater
#   while i > 0 and heap[parent(i)] > heap[i]
#     swap(heap[i], heap[parent(i)]), i ← parent(i)
#
#extractMin()               ▸ O(log n)
#   m ← heap[0], heap[0] ← heap[size − 1], size ← size − 1
#   siftDown(0)
#   return m
#
#siftDown(i)                ▸ sink past the smaller child
#   while heap[2i+1] < heap[i] or heap[2i+2] < heap[i]: swap with the smaller child`),
  code: code(
    `
class MinHeap {
  #h = [];
  get size() { return this.#h.length; }
  peek() { return this.#h[0]; }
  insert(x) { this.#h.push(x); this.#siftUp(this.#h.length - 1); }
  extractMin() {
    const min = this.#h[0], last = this.#h.pop();
    if (this.#h.length) { this.#h[0] = last; this.#siftDown(0); }
    return min;
  }
  #siftUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.#h[p] <= this.#h[i]) break;
      [this.#h[p], this.#h[i]] = [this.#h[i], this.#h[p]];
      i = p;
    }
  }
  #siftDown(i) {
    while (true) {
      const l = 2 * i + 1, r = l + 1;
      let small = i;
      if (l < this.#h.length && this.#h[l] < this.#h[small]) small = l;
      if (r < this.#h.length && this.#h[r] < this.#h[small]) small = r;
      if (small === i) break;
      [this.#h[small], this.#h[i]] = [this.#h[i], this.#h[small]];
      i = small;
    }
  }
}`,
    `
import heapq

class MinHeap:
    def __init__(self):
        self.h = []

    def insert(self, x):
        heapq.heappush(self.h, x)

    def extract_min(self):
        return heapq.heappop(self.h)

    def peek(self):
        return self.h[0] if self.h else None`,
    `
class MinHeap {
  vector<int> h;
  void siftUp(int i) {
    while (i > 0) {
      int p = (i - 1) / 2;
      if (h[p] <= h[i]) break;
      swap(h[p], h[i]); i = p;
    }
  }
  void siftDown(int i) {
    int n = h.size();
    while (true) {
      int l = 2 * i + 1, r = l + 1, small = i;
      if (l < n && h[l] < h[small]) small = l;
      if (r < n && h[r] < h[small]) small = r;
      if (small == i) break;
      swap(h[small], h[i]); i = small;
    }
  }
public:
  void insert(int x) { h.push_back(x); siftUp(h.size() - 1); }
  int extractMin() {
    int m = h[0], last = h.back(); h.pop_back();
    if (!h.empty()) { h[0] = last; siftDown(0); }
    return m;
  }
};`,
    `
class MinHeap {
  private final List<Integer> h = new ArrayList<>();

  void insert(int x) { h.add(x); siftUp(h.size() - 1); }

  int extractMin() {
    int min = h.get(0), last = h.remove(h.size() - 1);
    if (!h.isEmpty()) { h.set(0, last); siftDown(0); }
    return min;
  }

  private void siftUp(int i) {
    while (i > 0) {
      int p = (i - 1) / 2;
      if (h.get(p) <= h.get(i)) break;
      Collections.swap(h, p, i); i = p;
    }
  }

  private void siftDown(int i) {
    int n = h.size();
    while (true) {
      int l = 2 * i + 1, r = l + 1, small = i;
      if (l < n && h.get(l) < h.get(small)) small = l;
      if (r < n && h.get(r) < h.get(small)) small = r;
      if (small == i) break;
      Collections.swap(h, small, i); i = small;
    }
  }
}`,
  ),
  explanation: [
    'A binary heap is a complete tree flattened into an array: the children of index i live at 2i+1 and 2i+2.',
    'Insert appends and sifts up; extract-min moves the last leaf to the root and sifts down. Both are O(log n).',
    'Only the root is guaranteed to be the minimum, and that is all a priority queue ever needs to promise.',
  ],
  learn: {
    useCases: ['Dijkstra and Prim frontier', 'Huffman coding', 'Task schedulers and event simulation'],
    quiz: [
      {
        question: 'Where is the smallest element of a min-heap?',
        options: ['In the last slot', 'At the root, heap[0]', 'Anywhere on the last level', 'In the middle'],
        answer: 1,
        why: 'Sift-up guarantees every parent is ≤ its children, so the root is the global minimum — but only the root.',
      },
    ],
    practice: [{ title: 'Kth Largest Element in an Array', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/', difficulty: 'medium' }],
  },
  defaultInput: LINEAR_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new SeqModel([], 'heap');

    let cursors: SequenceCursorSnapshot[] = [];
    let caption = 'Empty heap';
    let operation: PqData['operation'] = 'insert';
    const extracted: number[] = [];

    const builder = new TraceBuilder<SequenceSnapshot, PqData>(() =>
      model.snapshot({
        cursors,
        caption,
        badges: { heapSize: model.size, min: model.at(0)?.label ?? '—' },
      }),
    );

    builder.emit({
      kind: 'init',
      description: 'Empty min-heap. The root (index 0) will always hold the smallest value.',
      badges: { heapSize: 0 },
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.4,
    });

    /* ── insert each value with a visible sift-up ─────────────────────────── */
    for (const value of values) {
      operation = 'insert';
      model.paint([], 'active', { clear: true });
      const item = model.push(value);
      model.paintId(item.id, 'active');
      let i = model.size - 1;
      cursors = [{ name: 'i', index: i, role: 'active' }];
      caption = `insert(${value}) → leaf at index ${i}`;
      builder.emit({
        kind: 'insert',
        description: `Append ${value} as the last leaf at index ${i}.`,
        highlight: { primary: [i] },
        badges: { heapSize: model.size, operation, min: model.at(0)?.label ?? '—' },
        pseudocodeLine: 1,
        codeLine: 3,
        data: { operation, value, heapSize: model.size },
        weight: 1,
        bump: ['writes'],
      });

      operation = 'sift-up';
      while (i > 0) {
        const parent = (i - 1) >> 1;
        const parentValue = Number(model.at(parent)?.label);
        const currentValue = Number(model.at(i)?.label);
        model.paint([parent, i], 'compare');
        cursors = [
          { name: 'i', index: i, role: 'compare' },
          { name: 'parent', index: parent, role: 'pivot' },
        ];
        builder.emit({
          kind: 'compare',
          description: `Compare heap[${i}] = ${currentValue} with its parent heap[${parent}] = ${parentValue}.`,
          highlight: { primary: [i], tertiary: [parent] },
          badges: { heapSize: model.size, operation, min: model.at(0)?.label ?? '—' },
          pseudocodeLine: 4,
          codeLine: 12,
          data: { operation, value: currentValue, heapSize: model.size },
          weight: 0.85,
          bump: ['comparisons', 'reads'],
        });

        if (parentValue <= currentValue) {
          model.paint([i], 'success');
          builder.emit({
            kind: 'info',
            description: `Heap property holds: ${parentValue} ≤ ${currentValue}. Sift-up stops here.`,
            highlight: { success: [i] },
            badges: { heapSize: model.size, operation, min: model.at(0)?.label ?? '—' },
            pseudocodeLine: 4,
            codeLine: 12,
            weight: 0.9,
          });
          break;
        }

        model.swap(i, parent);
        model.paint([parent, i], 'swap');
        cursors = [{ name: 'i', index: parent, role: 'swap' }];
        builder.emit({
          kind: 'swap',
          description: `${currentValue} < ${parentValue} — swap upward; the small value keeps climbing.`,
          highlight: { primary: [parent], secondary: [i] },
          badges: { heapSize: model.size, operation, min: model.at(0)?.label ?? '—' },
          pseudocodeLine: 5,
          codeLine: 13,
          data: { operation, value: currentValue, heapSize: model.size },
          weight: 1.1,
          bump: ['swaps', 'writes'],
        });
        i = parent;
      }
    }

    builder.emit({
      kind: 'info',
      description: `Heap built: root = ${model.at(0)?.label}, the minimum of all ${model.size} values.`,
      highlight: { success: [0] },
      badges: { heapSize: model.size, min: model.at(0)?.label ?? '—' },
      pseudocodeLine: 5,
      codeLine: 13,
      weight: 1.7,
    });

    /* ── extract-min repeatedly: sorted output proves the invariant ───────── */
    operation = 'extract-min';
    while (model.size > 0) {
      const min = Number(model.at(0)?.label);
      model.paint([0], 'danger');
      cursors = [{ name: 'root', index: 0, role: 'danger' }];
      caption = `extractMin() → ${min}`;
      builder.emit({
        kind: 'pop',
        description: `extractMin(): take the root ${min}, then move the last leaf into index 0.`,
        highlight: { danger: [0] },
        badges: { heapSize: model.size, operation, min },
        pseudocodeLine: 8,
        codeLine: 6,
        data: { operation, value: min, heapSize: model.size },
        weight: 1.3,
        bump: ['reads', 'writes'],
      });
      extracted.push(min);

      // Standard trickle-down: pop the last leaf, then overwrite the root with
      // it. When the heap held exactly one node, the leaf *is* the root, so the
      // first removal already emptied the heap.
      const last = model.at(model.size - 1);
      model.removeAt(model.size - 1);
      if (model.size > 0) {
        model.removeAt(0);
        if (last) model.items.unshift(last);
      }

      if (model.size > 0) {
        model.paint([0], 'active');
        cursors = [{ name: 'i', index: 0, role: 'active' }];
        builder.emit({
          kind: 'write',
          description: `Last leaf ${last?.label} is now the root — but it probably violates the heap property.`,
          highlight: { primary: [0] },
          badges: { heapSize: model.size, operation, min: model.at(0)?.label ?? '—' },
          pseudocodeLine: 8,
          codeLine: 8,
          weight: 0.9,
          bump: ['writes'],
        });
      }

      operation = 'sift-down';
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = left + 1;
        let small = i;
        if (left < model.size && Number(model.at(left)?.label) < Number(model.at(small)?.label)) small = left;
        if (right < model.size && Number(model.at(right)?.label) < Number(model.at(small)?.label)) small = right;
        if (small === i || model.size === 0) {
          if (model.size > 0) {
            model.paint([i], 'success');
            builder.emit({
              kind: 'info',
              description: `Sift-down stops: ${model.at(i)?.label} is already the smallest of its family.`,
              highlight: { success: [i] },
              badges: { heapSize: model.size, operation, min: model.at(0)?.label ?? '—' },
              pseudocodeLine: 12,
              codeLine: 20,
              weight: 0.9,
            });
          }
          break;
        }
        cursors = [
          { name: 'i', index: i, role: 'pivot' },
          { name: 'small', index: small, role: 'compare' },
        ];
        model.paint([i, small], 'swap');
        builder.emit({
          kind: 'swap',
          description: `Sink: swap heap[${i}] with the smaller child heap[${small}].`,
          highlight: { primary: [small], secondary: [i] },
          badges: { heapSize: model.size, operation, min: model.at(0)?.label ?? '—' },
          pseudocodeLine: 12,
          codeLine: 21,
          data: { operation, value: Number(model.at(small)?.label), heapSize: model.size },
          weight: 1,
          bump: ['swaps', 'writes', 'comparisons'],
        });
        model.swap(i, small);
        i = small;
      }
      model.paint([i], 'success');
      operation = 'extract-min';
    }

    cursors = [];
    caption = 'Heap emptied';
    builder.emit({
      kind: 'complete',
      description: `Extracted in ascending order: ${extracted.join(', ')} — a heap sorts only when you drain it.`,
      badges: { heapSize: 0, operation },
      pseudocodeLine: 9,
      codeLine: 9,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Heap drained in order',
        detail: `${extracted.length} extractions, ${builder.metrics.comparisons} comparisons`,
        output: extracted,
      },
    });
  },
};

export const definition: AlgorithmDefinition<SequenceSnapshot, PqData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: SequenceVisualizer });
