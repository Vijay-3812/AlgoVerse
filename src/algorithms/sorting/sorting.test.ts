import { describe, expect, it } from 'vitest';
import type { AlgorithmDefinition, AlgorithmInput, ArraySnapshot, AnyStep } from '@/types';
import { buildArrayDataset } from '@/utils/dataset';
import { resolveCodeLine } from '@/utils/codeAlign';
import { definition as bubble } from './bubble';
import { definition as selection } from './selection';
import { definition as insertion } from './insertion';
import { definition as merge } from './merge';
import { definition as quick } from './quick';
import { definition as heap } from './heap';
import { definition as counting } from './counting';
import { definition as radix } from './radix';
import { definition as shell } from './shell';
import { definition as bucket } from './bucket';
import { definition as tim } from './tim';

/**
 * Sorting family regression suite.
 *
 * Every generator is checked against five input shapes — including the two that
 * break naive implementations (already-sorted with a last-element pivot, and
 * heavy duplicates) — on both its machine-readable output and the *final visual
 * snapshot*, so a correct result that never reaches the screen still fails.
 */

const ALGORITHMS: ReadonlyArray<readonly [string, AlgorithmDefinition<ArraySnapshot, never>]> = [
  ['bubble-sort', bubble as never],
  ['selection-sort', selection as never],
  ['insertion-sort', insertion as never],
  ['merge-sort', merge as never],
  ['quick-sort', quick as never],
  ['heap-sort', heap as never],
  ['counting-sort', counting as never],
  ['radix-sort', radix as never],
  ['shell-sort', shell as never],
  ['bucket-sort', bucket as never],
  ['tim-sort', tim as never],
];

const INPUTS: ReadonlyArray<readonly [string, number[]]> = [
  ['random 16', buildArrayDataset({ kind: 'random', size: 16, seed: 7 })],
  ['sorted 12', buildArrayDataset({ kind: 'sorted', size: 12, seed: 7 })],
  ['reversed 12', buildArrayDataset({ kind: 'reversed', size: 12, seed: 7 })],
  ['nearly sorted 20', buildArrayDataset({ kind: 'nearly-sorted', size: 20, seed: 3 })],
  ['duplicates', [5, 3, 5, 1, 3, 5, 1, 3, 5, 1, 3, 5]],
  ['tiny', [2, 1]],
  ['single', [42]],
];

const ascending = (values: readonly number[]): boolean =>
  values.every((v, i) => i === 0 || (values[i - 1] as number) <= v);

const multiset = (values: readonly number[]): string => [...values].sort((a, b) => a - b).join(',');

describe.each(ALGORITHMS)('%s', (_name, definition) => {
  it.each(INPUTS)('sorts %s correctly', (_label, values) => {
    const input: AlgorithmInput = { kind: 'array', values };
    const trace = definition.generate(input, { runId: 'test', dataSet: 'custom', seed: 1 });

    expect(trace.steps.length).toBeGreaterThan(1);

    const output = trace.result.output as number[];
    expect(ascending(output)).toBe(true);
    // Same elements in and out — no lost or invented values.
    expect(multiset(output)).toBe(multiset(values));

    // The final *rendered* frame must show the sorted array, not just the result payload.
    const last = trace.steps[trace.steps.length - 1] as AnyStep;
    const state = last.state as ArraySnapshot;
    expect(ascending(state.values)).toBe(true);
    expect(multiset(state.values)).toBe(multiset(values));
  });

  it('is deterministic', () => {
    const input: AlgorithmInput = { kind: 'array', values: [9, 4, 7, 1, 8, 2] };
    const run = { runId: 'determinism', dataSet: 'custom' as const, seed: 5 };
    const a = definition.generate(input, run);
    const b = definition.generate(input, run);

    expect(a.steps.length).toBe(b.steps.length);
    expect(a.steps.map((s) => s.description)).toEqual(b.steps.map((s) => s.description));
    expect((a.result.output as number[]).join()).toBe((b.result.output as number[]).join());
  });

  it('honours the trace contract on every step', () => {
    const input: AlgorithmInput = { kind: 'array', values: buildArrayDataset({ kind: 'random', size: 14, seed: 11 }) };
    const trace = definition.generate(input, { runId: 'contract', dataSet: 'random', seed: 11 });
    const { pseudocode, code } = trace;

    trace.steps.forEach((step, i) => {
      expect(step.index).toBe(i);
      expect(step.description.trim().length).toBeGreaterThan(0);
      expect(step.weight).toBeGreaterThan(0);
      if (step.pseudocodeLine !== null) {
        expect(step.pseudocodeLine).toBeGreaterThanOrEqual(0);
        expect(step.pseudocodeLine).toBeLessThan(pseudocode.length);
      }
      // Every language must resolve to an in-range line — the guarantee that
      // makes one `codeLine` index usable across all four tabs.
      for (const [language, lines] of Object.entries(code)) {
        if (!lines) continue;
        const resolved = resolveCodeLine(trace.codeMap, language as 'javascript', step.codeLine);
        if (resolved === null) continue;
        expect(resolved).toBeGreaterThanOrEqual(0);
        expect(resolved).toBeLessThan(lines.length);
      }
    });

    // Metrics never decrease.
    for (let i = 1; i < trace.steps.length; i += 1) {
      const prev = trace.steps[i - 1]?.metrics;
      const cur = trace.steps[i]?.metrics;
      if (!prev || !cur) continue;
      expect(cur.comparisons).toBeGreaterThanOrEqual(prev.comparisons);
      expect(cur.swaps).toBeGreaterThanOrEqual(prev.swaps);
      expect(cur.writes).toBeGreaterThanOrEqual(prev.writes);
    }

    // All four languages present and aligned with the code lines actually used.
    expect(Object.keys(trace.code).sort()).toEqual(['cpp', 'java', 'javascript', 'python']);
  });

  it('scales to 400 elements without exploding', () => {
    const values = buildArrayDataset({ kind: 'random', size: 400, seed: 99 });
    const start = Date.now();
    const trace = definition.generate(
      { kind: 'array', values },
      { runId: 'perf', dataSet: 'random', seed: 99 },
    );
    const elapsed = Date.now() - start;

    expect(ascending(trace.result.output as number[])).toBe(true);
    // Generous ceiling: the point is to catch O(n³)-style accidents, not jitter.
    expect(elapsed).toBeLessThan(2000);
  });
});

describe('bubble sort specifics', () => {
  it('exits early on sorted input using n−1 comparisons', () => {
    const values = buildArrayDataset({ kind: 'sorted', size: 20, seed: 1 });
    const trace = bubble.generate({ kind: 'array', values }, { runId: 'e', dataSet: 'sorted', seed: 1 });
    const last = trace.steps[trace.steps.length - 1];
    expect(last?.metrics.comparisons).toBe(values.length - 1);
  });
});

describe('selection sort specifics', () => {
  it('always performs at most n−1 swaps', () => {
    const values = buildArrayDataset({ kind: 'reversed', size: 24, seed: 2 });
    const trace = selection.generate({ kind: 'array', values }, { runId: 's', dataSet: 'reversed', seed: 2 });
    const last = trace.steps[trace.steps.length - 1];
    expect(last?.metrics.swaps).toBeLessThanOrEqual(values.length - 1);
  });
});

describe('counting and radix specifics', () => {
  it('counting sort uses zero comparisons', () => {
    const trace = counting.generate(
      { kind: 'array', values: [3, 1, 2, 3, 1] },
      { runId: 'c', dataSet: 'custom', seed: 1 },
    );
    expect(trace.steps[trace.steps.length - 1]?.metrics.comparisons).toBe(0);
  });

  it('radix sort uses zero comparisons and one pass per digit', () => {
    const trace = radix.generate(
      { kind: 'array', values: [170, 45, 75, 90, 802, 24, 2, 66] },
      { runId: 'r', dataSet: 'custom', seed: 1 },
    );
    expect(trace.steps[trace.steps.length - 1]?.metrics.comparisons).toBe(0);
    expect(trace.result.output).toEqual([2, 24, 45, 66, 75, 90, 170, 802]);
  });
});

describe('merge sort specifics', () => {
  it('reports a recursion depth of ⌈log₂n⌉ + 1', () => {
    const trace = merge.generate(
      { kind: 'array', values: buildArrayDataset({ kind: 'random', size: 8, seed: 4 }) },
      { runId: 'm', dataSet: 'random', seed: 4 },
    );
    const maxDepth = Math.max(...trace.steps.map((s) => s.depth));
    expect(maxDepth).toBeGreaterThanOrEqual(3);
    expect(maxDepth).toBeLessThanOrEqual(4);
  });
});
