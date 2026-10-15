import type { AlgorithmInput, Complexity } from '@/types';
import { SERIES } from './kit';

/** Every linear-structure algorithm starts from the same readable series. */
export const LINEAR_DEFAULT_INPUT = (): AlgorithmInput => ({ kind: 'array', values: [...SERIES] });

export const COMPLEXITY: Record<string, Complexity> = {
  'array-ops': {
    time: { best: 'O(1) append', average: 'O(n) insert', worst: 'O(n) insert/erase' },
    space: 'O(1)',
    kind: 'contiguous',
    notes: ['Append and index are O(1); inserting or deleting in the middle shifts the tail.', 'Cache-friendly: this is why arrays beat linked lists in practice despite the same Big-O for scans.'],
  },
  'singly-linked-list': {
    time: { best: 'O(1) head insert', average: 'O(n) search', worst: 'O(n) search/delete' },
    space: 'O(n) nodes',
    kind: 'pointer chain',
    notes: ['Only forward links: you cannot walk back, and delete needs the previous node.', 'Insertion and deletion are O(1) *once you hold the node* — that is the whole appeal.'],
  },
  'doubly-linked-list': {
    time: { best: 'O(1) ends', average: 'O(n) search', worst: 'O(n) search' },
    space: 'O(n) + one extra pointer per node',
    kind: 'two-way chain',
    notes: ['`prev` makes deletion O(1) and enables backwards traversal.', 'This is the structure behind LRU caches and browser history.'],
  },
  'circular-linked-list': {
    time: { best: 'O(1) rotate', average: 'O(n) search', worst: 'O(n) search' },
    space: 'O(n)',
    kind: 'ring',
    notes: ['No null terminator: traversal loops, so every walk needs a stopping rule.', 'Round-robin scheduling and circular buffers are built on this.'],
  },
  stack: {
    time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' },
    space: 'O(n)',
    kind: 'LIFO',
    notes: ['Push and pop touch only the top. Everything about a stack is O(1) except iteration.', 'The call stack, undo history and expression evaluation all are stacks.'],
  },
  queue: {
    time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' },
    space: 'O(n)',
    kind: 'FIFO',
    notes: ['Enqueue at the rear, dequeue at the front — the fair data structure.', 'Naive array queues shift every element; a linked or circular queue keeps O(1).'],
  },
  'circular-queue': {
    time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' },
    space: 'O(k) fixed',
    kind: 'ring buffer',
    notes: ['Fixed capacity, indices wrap with `(i + 1) % k` — no shifting on dequeue.', 'The bounded producer/consumer buffer in every operating system.'],
  },
  deque: {
    time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' },
    space: 'O(n)',
    kind: 'double-ended',
    notes: ['Both ends are O(1); the basis of sliding-window maxima and work stealing.', 'Used for 0-1 BFS and monotonic-deque DP optimisations.'],
  },
  'priority-queue': {
    time: { best: 'O(1) peek', average: 'O(log n) insert/extract', worst: 'O(log n)' },
    space: 'O(n)',
    kind: 'binary min-heap',
    notes: ['A heap is a complete tree stored as a plain array: children of i are 2i+1 and 2i+2.', 'Dijkstra, Huffman and task schedulers are all priority queues at work.'],
  },
};
