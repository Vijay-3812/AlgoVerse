import type { AlgorithmDefinition, TreeSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, valuesOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { TreeVisualizer } from '@/visualizers/TreeVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, TREE_DEFAULT_INPUT } from './specs';
import { TreeModel } from './kit';

export interface HeapData {
  readonly operation: 'build' | 'heapify' | 'sift-down' | 'extract-min';
  readonly index?: number;
  readonly value?: number;
  /**
   * True only on the beats where the *whole* tree satisfies the min-heap
   * property. Mid-heapify frames repair individual subtrees while their
   * ancestors are still out of order, so they stay unflagged.
   */
  readonly settled?: boolean;
}

/**
 * Binary Heap — heapify, sift-down and extract-min, drawn as the tree it is.
 *
 * Two views in one: the snapshot carries both the tree structure *and* the flat
 * array indices as node subtitles, which is the mental leap this visualisation
 * exists to make. `heapify` repairs from the last parent upwards in O(n) — not
 * by n sifts — and the trace shows why: the bottom levels have nothing to do.
 */
const spec: AlgorithmSpec<TreeSnapshot, HeapData> = {
  id: 'heap',
  complexity: COMPLEXITY.heap!,
  pseudocode: pseudo(`
#heapify(A)                      ▸ O(n): start at the last parent
#   for i ← ⌊n/2⌋ − 1 down to 0
#     siftDown(A, i, n)
#
#siftDown(A, i, n)                ▸ while a child is smaller
#   while 2i + 1 < n
#     child ← min(A[2i+1], A[2i+2])
#     if A[i] ≤ A[child]: break
#     swap(A[i], A[child]); i ← child
#
#extractMin(A)
#   min ← A[0]; A[0] ← A[n − 1]; n ← n − 1
#   siftDown(A, 0, n); return min`),
  code: code(
    `
function siftDown(a, i, n) {
  while (2 * i + 1 < n) {
    let child = 2 * i + 1;
    const right = child + 1;
    if (right < n && a[right] < a[child]) child = right;
    if (a[i] <= a[child]) break;
    [a[i], a[child]] = [a[child], a[i]];
    i = child;
  }
}

function heapify(a) {
  for (let i = (a.length >> 1) - 1; i >= 0; i--) siftDown(a, i, a.length);
  return a;
}

function extractMin(a) {
  const min = a[0];
  a[0] = a[a.length - 1];
  a.pop();
  siftDown(a, 0, a.length);
  return min;
}`,
    `
def sift_down(a, i, n):
    while 2 * i + 1 < n:
        child = 2 * i + 1
        right = child + 1
        if right < n and a[right] < a[child]:
            child = right
        if a[i] <= a[child]:
            break
        a[i], a[child] = a[child], a[i]
        i = child


def heapify(a):
    for i in range(len(a) // 2 - 1, -1, -1):
        sift_down(a, i, len(a))
    return a


def extract_min(a):
    smallest = a[0]
    a[0] = a[-1]
    a.pop()
    sift_down(a, 0, len(a))
    return smallest`,
    `
void siftDown(vector<int>& a, int i, int n) {
  while (2 * i + 1 < n) {
    int child = 2 * i + 1;
    int right = child + 1;
    if (right < n && a[right] < a[child]) child = right;
    if (a[i] <= a[child]) break;
    swap(a[i], a[child]);
    i = child;
  }
}

void heapify(vector<int>& a) {
  for (int i = (int)a.size() / 2 - 1; i >= 0; --i) siftDown(a, i, (int)a.size());
}

int extractMin(vector<int>& a) {
  int smallest = a[0];
  a[0] = a.back();
  a.pop_back();
  siftDown(a, 0, (int)a.size());
  return smallest;
}`,
    `
static void siftDown(int[] a, int i, int n) {
  while (2 * i + 1 < n) {
    int child = 2 * i + 1;
    int right = child + 1;
    if (right < n && a[right] < a[child]) child = right;
    if (a[i] <= a[child]) break;
    int t = a[i]; a[i] = a[child]; a[child] = t;
    i = child;
  }
}

static void heapify(int[] a) {
  for (int i = a.length / 2 - 1; i >= 0; i--) siftDown(a, i, a.length);
}

static int extractMin(int[] a, int n) {
  int smallest = a[0];
  a[0] = a[n - 1];
  siftDown(a, 0, n - 1);
  return smallest;
}`,
  ),
  explanation: [
    'A binary heap is a *complete* tree stored as an array: index i has children 2i+1 and 2i+2 and parent ⌊(i−1)/2⌋.',
    'Heapify walks parents bottom-up, so each sift is short — the total cost is O(n), not O(n log n).',
    'Only the root is guaranteed to be the minimum, which is all a priority queue needs.',
  ],
  learn: {
    useCases: ['Priority queues and schedulers', 'Heap sort’s build phase', 'Streaming top-k with a bounded heap'],
    quiz: [
      {
        question: 'Why is heapify O(n) rather than O(n log n) even though it calls sift-down n/2 times?',
        options: ['Because sift-down is O(1)', 'Because most nodes are near the bottom and their sifts are at most a couple of levels', 'Because it uses recursion', 'It is O(n log n)'],
        answer: 1,
        why: 'The count of nodes with sift cost h is n/2^(h+1); summing h·n/2^(h+1) converges to n.',
      },
    ],
  },
  defaultInput: TREE_DEFAULT_INPUT,
  generate: (input, run) => {
    const values = valuesOf(input);
    const model = new TreeModel();
    let operation: HeapData['operation'] = 'build';
    let caption = 'Array loaded — a heap is a complete tree, so shape comes for free';

    const ids = values.map((v) => model.create(v));

    /** Re-parents the model so it mirrors the array: children of i at 2i+1, 2i+2. */
    const relink = (): void => {
      const live = ids.filter((id) => model.get(id) !== undefined);
      // Detach everything, then rebuild the links top-down so `parentId` and the
      // child slots always agree with the array.
      for (const id of live) {
        const node = model.get(id);
        if (!node) continue;
        node.children = [];
        node.parentId = null;
      }
      model.roots = [];
      live.forEach((id, i) => {
        if (i === 0) {
          model.attach(id, null);
          return;
        }
        const parentIndex = Math.floor((i - 1) / 2);
        const parentId = live[parentIndex];
        if (!parentId) return;
        model.attach(id, parentId, i % 2 === 1 ? 'left' : 'right');
      });
    };

    /** Swaps two array slots AND keeps the visual ids aligned with the array. */
    const swapSlots = (i: number, j: number): void => {
      const a = ids[i];
      const b = ids[j];
      if (a === undefined || b === undefined) return;
      ids[i] = b;
      ids[j] = a;
      relink();
    };

    relink();
    ids.forEach((id, i) => model.setSub(id, `A[${i}]`));

    const builder = new TraceBuilder<TreeSnapshot, HeapData>(() =>
      model.snapshot({
        kind: 'binary',
        caption,
        badges: { nodes: model.size, root: model.valueOf(model.roots[0] ?? '') || '—', operation },
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Shape is free: ${values.length} values already form a complete tree, so only the heap order is missing.`,
      highlight: { nodes: ids },
      badges: { nodes: model.size, operation: 'build' },
      pseudocodeLine: 0,
      codeLine: 5,
      weight: 1.5,
    });

    /* ── heapify bottom-up ────────────────────────────────────────────────── */
    operation = 'heapify';
    for (let i = Math.floor(values.length / 2) - 1; i >= 0; i -= 1) {
      model.clearRoles();
      model.setRole([ids[i]], 'compare');
      caption = `heapify: sift down from index ${i} (${model.valueOf(ids[i] as string)})`;
      builder.emit({
        kind: 'heapify',
        description: `Start at the last parent, index ${i}: the entire bottom level is already a valid heap.`,
        highlight: { nodes: [ids[i] as string] },
        badges: { nodes: model.size, index: i, operation },
        pseudocodeLine: 1,
        codeLine: 6,
        data: { operation, index: i, settled: false },
        weight: 1.1,
      });

      let current = i;
      while (2 * current + 1 < ids.length) {
        const leftIndex = 2 * current + 1;
        const rightIndex = leftIndex + 1;
        let childIndex = leftIndex;
        const leftId = ids[leftIndex] as string;
        const rightId = ids[rightIndex];
        if (rightId && model.valueOf(rightId) < model.valueOf(leftId)) childIndex = rightIndex;

        const childId = ids[childIndex] as string;
        const parentId = ids[current] as string;
        model.setRole([parentId], 'compare');
        model.setRole([childId], 'pivot');

        operation = 'sift-down';
        builder.emit({
          kind: 'compare',
          description: `Compare ${model.valueOf(parentId)} with its smaller child ${model.valueOf(childId)}.`,
          highlight: { nodes: [parentId, childId] },
          badges: { nodes: model.size, index: current, operation },
          pseudocodeLine: 4,
          codeLine: 11,
          data: { operation, index: current, settled: false },
          weight: 0.85,
          bump: ['comparisons', 'reads'],
        });

        if (model.valueOf(parentId) <= model.valueOf(childId)) {
          model.setRole([parentId], 'success');
          builder.emit({
            kind: 'info',
            description: `${model.valueOf(parentId)} ≤ ${model.valueOf(childId)} — this subtree is a valid heap, so the sift stops here.`,
            highlight: { nodes: [parentId] },
            badges: { nodes: model.size, index: current, operation },
            pseudocodeLine: 4,
            codeLine: 11,
            data: { operation, index: current, settled: false },
            weight: 0.9,
          });
          break;
        }

        swapSlots(current, childIndex);
        model.setRole([ids[childIndex] as string], 'swap');
        builder.emit({
          kind: 'swap',
          description: `Swap ${model.valueOf(ids[childIndex] as string)} up into index ${current}.`,
          highlight: { nodes: [ids[current] as string] },
          badges: { nodes: model.size, index: current, operation },
          pseudocodeLine: 5,
          codeLine: 12,
          data: { operation, index: current },
          weight: 1,
          bump: ['swaps', 'writes'],
        });
        current = childIndex;
      }

      // Settled beat: the subtree rooted at the starting index is a valid heap
      // again, which is the state a caller would observe between operations.
      model.clearRoles();
      model.setRole([ids[i] as string], 'success');
      builder.emit({
        kind: 'info',
        description:
          i === 0
            ? `Sift from the root settled — every parent is now ≤ its children, so the array is a heap.`
            : `Sift from index ${i} settled — that subtree is a heap; the ancestors get fixed on the way up.`,
        highlight: { nodes: [ids[i] as string] },
        badges: { nodes: model.size, index: i, operation: 'heapify' },
        pseudocodeLine: 2,
        codeLine: 7,
        data: { operation: 'heapify', index: i, settled: i === 0 },
        weight: 0.7,
      });
    }

    model.clearRoles();
    ids.forEach((id, i) => model.setSub(id, `A[${i}]`));
    model.setRole([ids[0] as string], 'success');
    caption = `Heapified: root ${model.valueOf(ids[0] as string)} is the minimum`;
    builder.emit({
      kind: 'complete',
      description: `Heap built in O(n): the root holds the minimum, ${model.valueOf(ids[0] as string)}.`,
      highlight: { nodes: [ids[0] as string] },
      badges: { nodes: model.size, root: model.valueOf(ids[0] as string), operation: 'heapify' },
      pseudocodeLine: 2,
      codeLine: 6,
      data: { operation: 'heapify', settled: true },
      weight: 2.1,
    });

    /* ── extract-min twice, watching the last leaf travel to the root ─────── */
    operation = 'extract-min';
    const extracted: number[] = [];
    for (let round = 0; round < 2 && ids.length > 1; round += 1) {
      const minId = ids[0] as string;
      const minValue = model.valueOf(minId);
      extracted.push(minValue);
      model.setRole([minId], 'danger');
      caption = `extractMin() → ${minValue}`;
      builder.emit({
        kind: 'pop',
        description: `extractMin() returns ${minValue}; the last leaf (${model.valueOf(ids[ids.length - 1] as string)}) takes the root slot.`,
        highlight: { nodes: [minId] },
        badges: { nodes: model.size, root: minValue, operation },
        pseudocodeLine: 8,
        codeLine: 15,
        data: { operation, value: minValue, settled: false },
        weight: 1.5,
        bump: ['reads', 'writes'],
      });

      const lastIndex = ids.length - 1;
      swapSlots(0, lastIndex);
      const removedId = ids.pop() as string;
      model.remove(removedId);
      relink();
      ids.forEach((id, i) => model.setSub(id, `A[${i}]`));

      if (ids.length > 0) {
        model.setRole([ids[0] as string], 'compare');
        builder.emit({
          kind: 'write',
          description: `${model.valueOf(ids[0] as string)} is now the root and must sift down to its place.`,
          highlight: { nodes: [ids[0] as string] },
          badges: { nodes: model.size, index: 0, operation },
          pseudocodeLine: 8,
          codeLine: 16,
          data: { operation, index: 0, settled: false },
          weight: 1,
        });
      }

      let current = 0;
      while (2 * current + 1 < ids.length) {
        const leftIndex = 2 * current + 1;
        const rightIndex = leftIndex + 1;
        let childIndex = leftIndex;
        const leftId = ids[leftIndex] as string;
        const rightId = ids[rightIndex];
        if (rightId && model.valueOf(rightId) < model.valueOf(leftId)) childIndex = rightIndex;
        const parentId = ids[current] as string;
        const childId = ids[childIndex] as string;
        if (model.valueOf(parentId) <= model.valueOf(childId)) break;

        swapSlots(current, childIndex);
        model.setRole([ids[childIndex] as string], 'swap');
        builder.emit({
          kind: 'swap',
          description: `Sift down: swap ${model.valueOf(ids[childIndex] as string)} into index ${current}.`,
          highlight: { nodes: [ids[current] as string] },
          badges: { nodes: model.size, index: current, operation },
          pseudocodeLine: 5,
          codeLine: 12,
          data: { operation, index: current, settled: false },
          weight: 1,
          bump: ['swaps', 'writes', 'comparisons'],
        });
        current = childIndex;
      }

      // Settled beat: what remains is a valid heap again, ready for the next pop.
      model.clearRoles();
      model.setRole([ids[0] as string], 'success');
      builder.emit({
        kind: 'info',
        description: `Array is a heap again — ${model.valueOf(ids[0] as string)} is the new minimum, still at index 0.`,
        highlight: { nodes: [ids[0] as string] },
        badges: { nodes: model.size, index: 0, operation },
        pseudocodeLine: 9,
        codeLine: 17,
        data: { operation, index: 0, settled: true },
        weight: 0.9,
      });
    }

    model.clearRoles();
    ids.forEach((id, i) => model.setSub(id, `A[${i}]`));
    const output = ids.map((id) => model.valueOf(id));
    model.setRole([ids[0] as string], 'success');
    builder.emit({
      kind: 'complete',
      description: `Extracted ${extracted.join(', ')}; ${output.length} values remain heaped.`,
      highlight: { nodes: [ids[0] as string] },
      badges: { nodes: model.size, root: model.valueOf(ids[0] as string), operation },
      pseudocodeLine: 9,
      codeLine: 17,
      data: { operation, settled: true },
      weight: 2.3,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Heap built and drained',
        detail: `extracted ${extracted.join(' → ')} in sorted order; ${output.length} values remain heaped`,
        output: { extracted, remaining: output },
      },
    });
  },
};

export const definition: AlgorithmDefinition<TreeSnapshot, HeapData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: TreeVisualizer });
