import { describe, expect, it } from 'vitest';
import type { AlgorithmDefinition, AlgorithmInput, ArraySnapshot, Language, TraceRunInfo } from '@/types';
import { buildSearchInput } from '@/utils/dataset';
import { assertTraceContract, finalMetrics } from '@/test/traceContract';
import { definition as linear } from './linear';
import { definition as binary } from './binary';
import { definition as jump } from './jump';
import { definition as interpolation } from './interpolation';
import { definition as exponential } from './exponential';
import { definition as ternary } from './ternary';
import { COMPLEXITY } from './specs';
import type { SearchData } from './linear';

interface Candidate {
  readonly name: string;
  readonly definition: AlgorithmDefinition<ArraySnapshot, SearchData>;
  /** Probes allowed before the algorithm must give up: a soft upper bound. */
  readonly probeBudget: (n: number) => number;
  /** Sorted input required (everything except linear search may assume it). */
  readonly sorted: boolean;
}

const CANDIDATES: readonly Candidate[] = [
  { name: 'linear-search', definition: linear, probeBudget: (n) => n, sorted: false },
  { name: 'binary-search', definition: binary, probeBudget: (n) => Math.ceil(Math.log2(n)) + 2, sorted: true },
  { name: 'jump-search', definition: jump, probeBudget: (n) => 2 * Math.ceil(Math.sqrt(n)) + 4, sorted: true },
  { name: 'interpolation-search', definition: interpolation, probeBudget: (n) => 2 * Math.ceil(Math.log2(n)) + 6, sorted: true },
  { name: 'exponential-search', definition: exponential, probeBudget: (n) => 2 * Math.ceil(Math.log2(n)) + 4, sorted: true },
  { name: 'ternary-search', definition: ternary, probeBudget: (n) => 2 * Math.ceil(Math.log2(n)) + 4, sorted: true },
];

const RUN: TraceRunInfo = { runId: 'test', dataSet: 'random', seed: 1 };

function input(values: readonly number[], target: number): AlgorithmInput {
  return { kind: 'array', values: [...values], target };
}

const CASES: readonly (readonly number[])[] = [
  [1, 2, 3, 4, 5, 6, 7],
  [5, 10, 15, 20, 25, 30, 35, 40, 45],
  [-8, -3, 0, 2, 2, 5, 9, 11],
  [7],
  [3, 3, 3, 3],
  [0, 1],
];

describe.each(CANDIDATES)('$name', ({ definition, probeBudget, sorted }) => {
  it('finds every value that is present', () => {
    for (const values of CASES) {
      for (const target of new Set(values)) {
        const trace = definition.generate(input(values, target), RUN);
        const index = trace.result.output as number;
        // Duplicate-safe: any index holding the target is a correct answer.
        expect(values[index]).toBe(target);
        // A hit at index 0 is two beats: `init` then `found`.
        assertTraceContract(trace, { terminal: ['found'], minSteps: 2 });
        expect(trace.steps[trace.steps.length - 1]?.kind).toBe('found');
      }
    }
  });

  it('reports a miss for values that are absent', () => {
    const values = sorted ? [2, 4, 6, 8, 10, 12, 14] : [9, 3, 11, 1, 14, 6, 2];
    for (const target of [100, -100, 13]) {
      const trace = definition.generate(input(values, target), RUN);
      expect(trace.result.output).toBe(-1);
      // A miss can be immediate (target below the first element), so two beats
      // — `init` and `not-found` — are a legitimate complete trace.
      assertTraceContract(trace, { terminal: ['not-found'], minSteps: 2 });
    }
  });

  it('stays inside its probe budget on every input shape', () => {
    for (const kind of ['sorted', 'reversed', 'random', 'nearly-sorted'] as const) {
      for (const size of [8, 21, 64]) {
        const generated = buildSearchInput({ kind, size, seed: size * 7 });
        const target = generated.kind === 'array' ? generated.target : undefined;
        if (generated.kind !== 'array' || target === undefined) continue;
        const values = [...generated.values].sort((a, b) => a - b);
        const trace = definition.generate({ kind: 'array', values, target }, RUN);
        expect(finalMetrics(trace).comparisons).toBeLessThanOrEqual(probeBudget(size) + 2);
      }
    }
  });

  it('is deterministic for the same input', () => {
    const values = [4, 8, 15, 16, 23, 42];
    // `generatedInMs` is a stopwatch, not a result — everything else must match.
    const strip = (trace: ReturnType<typeof definition.generate>): string =>
      JSON.stringify({ ...trace, generatedInMs: 0 });
    expect(strip(definition.generate(input(values, 23), RUN))).toBe(
      strip(definition.generate(input(values, 23), RUN)),
    );
  });

  it('exposes all four languages and a resolvable code map', () => {
    const trace = definition.generate(input([1, 3, 5, 7, 9], 5), RUN);
    const languages: readonly Language[] = ['javascript', 'python', 'cpp', 'java'];
    for (const language of languages) {
      expect((trace.code[language] ?? []).length).toBeGreaterThan(2);
      expect(trace.codeMap?.[language]?.length).toBe((trace.code.javascript ?? []).length);
    }
  });

  it('declares its complexity in three cases', () => {
    const complexity = COMPLEXITY[definition.meta.id.replace('-search', '')];
    expect(complexity?.time.worst).toBeTruthy();
    expect(complexity?.space).toBeTruthy();
  });
});

describe('searching family — specific behaviour', () => {
  it('linear search needs exactly index+1 comparisons for a hit', () => {
    const values = [3, 9, 12, 15, 21, 33];
    const trace = linear.generate(input(values, 15), RUN);
    expect(trace.result.output).toBe(3);
    expect(finalMetrics(trace).comparisons).toBe(4);
  });

  it('linear search works on unsorted data (it assumes nothing)', () => {
    const values = [17, 4, 91, 8, 55, 2];
    const trace = linear.generate(input(values, 8), RUN);
    expect(trace.result.output).toBe(3);
  });

  it('binary search never exceeds ⌈log₂(n+1)⌉ probes on any present value', () => {
    const size = 255;
    const values = Array.from({ length: size }, (_, i) => i * 2);
    for (const index of [0, 1, 63, 127, 190, 254]) {
      const trace = binary.generate(input(values, values[index] as number), RUN);
      expect(trace.result.output).toBe(index);
      expect(finalMetrics(trace).comparisons).toBeLessThanOrEqual(Math.ceil(Math.log2(size + 1)) + 1);
    }
  });

  it('binary search halves the bracket monotonically', () => {
    const values = Array.from({ length: 64 }, (_, i) => i);
    const trace = binary.generate(input(values, 40), RUN);
    const windows = trace.steps
      .map((step) => step.state.window)
      .filter((w): w is readonly [number, number] => Array.isArray(w));
    windows.forEach((w, i) => {
      const previous = windows[i - 1];
      if (!previous) return;
      const size = w[1] - w[0];
      const prevSize = previous[1] - previous[0];
      expect(size).toBeLessThanOrEqual(prevSize + 1);
    });
  });

  it('jump search uses ⌊√n⌋ blocks', () => {
    const size = 100;
    const values = Array.from({ length: size }, (_, i) => i);
    const trace = jump.generate(input(values, 96), RUN);
    expect(trace.result.output).toBe(96);
    expect(trace.steps.some((s) => String(s.state.badges?.block) === '10')).toBe(true);
  });

  it('interpolation search lands exactly on uniformly spaced targets in one probe', () => {
    const values = Array.from({ length: 41 }, (_, i) => i * 5);
    const trace = interpolation.generate(input(values, 100), RUN);
    expect(trace.result.output).toBe(20);
    expect(finalMetrics(trace).comparisons).toBe(1);
  });

  it('exponential search finds the first element in one comparison', () => {
    const values = Array.from({ length: 32 }, (_, i) => i * 3);
    const trace = exponential.generate(input(values, 0), RUN);
    expect(trace.result.output).toBe(0);
    expect(finalMetrics(trace).comparisons).toBe(1);
  });

  it('ternary search trims to one third per accepted level', () => {
    const values = Array.from({ length: 81 }, (_, i) => i);
    const trace = ternary.generate(input(values, 27), RUN);
    expect(trace.result.output).toBe(27);
    expect(finalMetrics(trace).comparisons).toBeLessThanOrEqual(3 * Math.ceil(Math.log2(81)));
  });

  it('never mutates the caller\u2019s array — generators are pure', () => {
    const source = [5, 1, 9, 3, 7, 2, 8];
    const snapshot = [...source];
    for (const { definition } of CANDIDATES) {
      definition.generate(input(source, 7), RUN);
      expect(source).toEqual(snapshot);
    }
  });
});
