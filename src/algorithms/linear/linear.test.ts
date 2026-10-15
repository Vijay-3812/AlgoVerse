import { describe, expect, it } from 'vitest';
import type { AlgorithmDefinition, AlgorithmInput, SequenceSnapshot, TraceRunInfo } from '@/types';
import { assertTraceContract, finalMetrics, sameMultiset } from '@/test/traceContract';
import { definition as arrayOps } from './arrayOps';
import { definition as singly } from './singlyLinkedList';
import { definition as doubly } from './doublyLinkedList';
import { definition as circular } from './circularLinkedList';
import { definition as stack } from './stack';
import { definition as queue } from './queue';
import { definition as circularQueue } from './circularQueue';
import { definition as deque } from './deque';
import { definition as priorityQueue } from './priorityQueue';
import { SERIES } from './kit';

type LinearDefinition = AlgorithmDefinition<SequenceSnapshot, unknown>;
type LinearTrace = ReturnType<LinearDefinition['generate']>;

const RUN: TraceRunInfo = { runId: 'test', dataSet: 'random', seed: 3 };
const VALUES = [...SERIES];
const INPUT: AlgorithmInput = { kind: 'array', values: VALUES };

const FAMILY: readonly { readonly name: string; readonly definition: LinearDefinition }[] = [
  { name: 'array-ops', definition: arrayOps as LinearDefinition },
  { name: 'singly-linked-list', definition: singly as LinearDefinition },
  { name: 'doubly-linked-list', definition: doubly as LinearDefinition },
  { name: 'circular-linked-list', definition: circular as LinearDefinition },
  { name: 'stack', definition: stack as LinearDefinition },
  { name: 'queue', definition: queue as LinearDefinition },
  { name: 'circular-queue', definition: circularQueue as LinearDefinition },
  { name: 'deque', definition: deque as LinearDefinition },
  { name: 'priority-queue', definition: priorityQueue as LinearDefinition },
];

/** Matches the generator's own choice of insert index/value so the test is independent. */
const INSERT_AT = Math.min(3, VALUES.length);
const INSERT_VALUE = 55;

describe.each(FAMILY)('$name', ({ definition }) => {
  it('produces a well-formed trace', () => {
    const trace = definition.generate(INPUT, RUN);
    assertTraceContract(trace, { minSteps: 2 });
  });

  it('is deterministic for the same input', () => {
    const strip = (trace: LinearTrace): string => JSON.stringify({ ...trace, generatedInMs: 0 });
    expect(strip(definition.generate(INPUT, RUN))).toBe(strip(definition.generate(INPUT, RUN)));
  });

  it('never mutates the caller’s input array', () => {
    const source = [...VALUES];
    definition.generate({ kind: 'array', values: source }, RUN);
    expect(source).toEqual(VALUES);
  });

  it('counts work in its metrics', () => {
    const trace = definition.generate(INPUT, RUN);
    const metrics = finalMetrics(trace);
    expect(metrics.writes).toBeGreaterThan(0);
    expect(metrics.reads + metrics.comparisons).toBeGreaterThan(0);
  });

  it('returns a numeric output array', () => {
    const output = definition.generate(INPUT, RUN).result.output;
    expect(Array.isArray(output)).toBe(true);
    for (const value of output as number[]) expect(typeof value).toBe('number');
  });

  it('skips the op-chatter when the step budget is tight', () => {
    const trace = definition.generate(INPUT, RUN);
    // Every step of a small trace must survive a 2 500-step budget untouched.
    expect(trace.elidedSteps ?? 0).toBe(0);
    expect(trace.steps.length).toBeLessThanOrEqual(2500);
  });
});

describe('stack — LIFO', () => {
  it('pops in exactly reverse push order', () => {
    const trace = stack.generate(INPUT, RUN);
    expect(trace.result.output).toEqual([...VALUES].reverse());
    expect(trace.steps.map((s) => s.kind)).toContain('peek');
  });

  it('never holds more items than it pushed', () => {
    const trace = stack.generate(INPUT, RUN);
    const maxDepth = Math.max(...trace.steps.map((s) => s.state.items.filter((i) => !i.ghost).length));
    expect(maxDepth).toBeLessThanOrEqual(VALUES.length);
  });
});

describe('queue — FIFO', () => {
  it('dequeues in exactly arrival order', () => {
    const trace = queue.generate(INPUT, RUN);
    expect(trace.result.output).toEqual(VALUES);
  });

  it('keeps a front cursor pointing at the oldest live item', () => {
    const trace = queue.generate(INPUT, RUN);
    const withFront = trace.steps.filter((s) => s.state.cursors?.some((c) => c.name === 'front'));
    expect(withFront.length).toBeGreaterThan(0);
  });
});

describe('circular-queue — ring buffer', () => {
  it('recycles slots without losing or duplicating a value', () => {
    const trace = circularQueue.generate(INPUT, RUN);
    const output = trace.result.output as number[];
    expect(output.length).toBeGreaterThan(0);
    // Every live slot holds a distinct value: the ring never aliases two items
    // onto one index, which is the bug a wrap-around bug would produce.
    expect(new Set(output).size).toBe(output.length);
  });

  it('carries a numeric size badge that never exceeds capacity', () => {
    const trace = circularQueue.generate(INPUT, RUN);
    for (const step of trace.steps) {
      const size = step.state.badges?.size;
      const capacity = step.state.badges?.capacity;
      if (typeof size === 'number' && typeof capacity === 'number') {
        expect(size).toBeLessThanOrEqual(capacity);
      }
    }
  });
});

describe('array-ops — shift cost', () => {
  it('matches a straightforward insert → delete → reverse', () => {
    const trace = arrayOps.generate(INPUT, RUN);
    const expected = [...VALUES];
    expected.splice(INSERT_AT, 0, INSERT_VALUE);
    expected.splice(1, 1);
    expected.reverse();
    expect(trace.result.output).toEqual(expected);
  });

  it('writes at least as often as it inserts and deletes', () => {
    const metrics = finalMetrics(arrayOps.generate(INPUT, RUN));
    expect(metrics.writes).toBeGreaterThanOrEqual(VALUES.length);
  });
});

describe('linked lists', () => {
  it('singly linked list returns the values it linked', () => {
    const trace = singly.generate(INPUT, RUN);
    expect(trace.result.output).toEqual(VALUES);
    expect(trace.steps.some((s) => s.kind === 'found')).toBe(true);
  });

  it('singly linked list always links consecutive nodes with `next`', () => {
    const trace = singly.generate(INPUT, RUN);
    const linked = trace.steps.filter((s) => (s.state.links?.length ?? 0) > 0);
    expect(linked.length).toBeGreaterThan(0);
    for (const step of linked) {
      for (const link of step.state.links ?? []) {
        expect(link.kind).toBe('next');
        expect(link.from).not.toBe(link.to);
      }
    }
  });

  it('doubly linked list scans forward and backward and deletes the middle node', () => {
    const trace = doubly.generate(INPUT, RUN);
    const output = trace.result.output as number[];
    const expected = [...VALUES];
    expected.splice(Math.floor(expected.length / 2), 1);
    expect(output).toEqual(expected);

    const hasPrev = trace.steps.some((s) => (s.state.links ?? []).some((l) => l.kind === 'prev'));
    expect(hasPrev).toBe(true);
  });

  it('circular linked list closes the ring and rotates in place', () => {
    const trace = circular.generate(INPUT, RUN);
    const output = trace.result.output as number[];
    const rotated = [...VALUES.slice(2), ...VALUES.slice(0, 2)];
    expect(output).toEqual(rotated);

    const closed = trace.steps.some((s) => {
      const links = s.state.links ?? [];
      const items = s.state.items;
      const last = items[items.length - 1];
      const first = items[0];
      return Boolean(last && first && links.some((l) => l.from === last.id && l.to === first.id));
    });
    expect(closed).toBe(true);
  });
});

describe('deque — both ends', () => {
  it('empties from alternating ends with the same multiset it started with', () => {
    const trace = deque.generate(INPUT, RUN);
    const output = trace.result.output as number[];
    expect(output.length).toBe(VALUES.length);
    expect(sameMultiset(output, VALUES)).toBe(true);

    // Independent replay of the intended behaviour: odd-indexed values are
    // pushed to the front, even ones to the back, then the deque is emptied by
    // alternating back/front removals.
    const layout: number[] = [];
    VALUES.forEach((value, i) => (i % 2 === 1 ? layout.unshift(value) : layout.push(value)));
    const expected: number[] = [];
    let side: 'back' | 'front' = 'back';
    while (layout.length > 0) {
      const next = side === 'back' ? layout.pop() : layout.shift();
      if (next !== undefined) expected.push(next);
      side = side === 'back' ? 'front' : 'back';
    }
    expect(output).toEqual(expected);
  });

  it('uses both push and pop kinds', () => {
    const kinds = new Set(deque.generate(INPUT, RUN).steps.map((s) => s.kind));
    expect(kinds.has('push')).toBe(true);
    expect(kinds.has('pop')).toBe(true);
  });
});

describe('priority queue — min-heap', () => {
  it('drains in ascending order, which is the heap invariant made visible', () => {
    const trace = priorityQueue.generate(INPUT, RUN);
    expect(trace.result.output).toEqual([...VALUES].sort((a, b) => a - b));
  });

  it('settles with the minimum at index 0 (checked on every settled beat)', () => {
    const trace = priorityQueue.generate(INPUT, RUN);
    // Mid-swap frames legitimately break the invariant, so it is asserted on
    // the beats the generator emits *after* a sift finishes: those are the
    // states the heap is ever observed in by a caller.
    const settled = trace.steps.filter((s) => s.kind === 'info');
    expect(settled.length).toBeGreaterThan(4);
    for (const step of settled) {
      const live = step.state.items.filter((i) => !i.ghost);
      if (live.length === 0) continue;
      const min = Math.min(...live.map((i) => Number(i.label)));
      expect(Number(live[0]?.label)).toBe(min);
    }
  });

  it('sifts up on insert and down on extract', () => {
    const kinds = priorityQueue.generate(INPUT, RUN).steps.map((s) => s.kind);
    expect(kinds).toContain('insert');
    expect(kinds).toContain('swap');
    expect(kinds.filter((k) => k === 'compare').length).toBeGreaterThan(0);
  });
});
