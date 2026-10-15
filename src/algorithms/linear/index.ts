import type { ModuleLoader } from '@/engine/registry';

/**
 * Linear-structure family loader table.
 *
 * Arrays, the three linked-list shapes, stacks, queues, the ring buffer, the
 * deque and the heap-backed priority queue. One dynamic import each — the
 * `SequenceVisualizer` they share is hoisted into a common chunk by Vite.
 */
export const LINEAR_LOADERS: Readonly<Record<string, ModuleLoader>> = {
  'array-ops': () => import('./arrayOps').then((m) => m.module),
  'singly-linked-list': () => import('./singlyLinkedList').then((m) => m.module),
  'doubly-linked-list': () => import('./doublyLinkedList').then((m) => m.module),
  'circular-linked-list': () => import('./circularLinkedList').then((m) => m.module),
  stack: () => import('./stack').then((m) => m.module),
  queue: () => import('./queue').then((m) => m.module),
  'circular-queue': () => import('./circularQueue').then((m) => m.module),
  deque: () => import('./deque').then((m) => m.module),
  'priority-queue': () => import('./priorityQueue').then((m) => m.module),
};
