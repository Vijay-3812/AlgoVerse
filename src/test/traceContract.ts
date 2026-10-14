import { expect } from 'vitest';
import type { Language, MetricsSnapshot, Trace } from '@/types';
import { ZERO_METRICS } from '@/types';
import { resolveCodeLine } from '@/utils/codeAlign';

const LANGUAGES: readonly Language[] = ['javascript', 'python', 'cpp', 'java'];

/**
 * Cumulative counters — these may only ever grow.
 *
 * `depth` is deliberately absent: recursion depth rises *and falls*, so it is a
 * gauge read off the call stack, not a counter. Asserting monotonicity on it
 * would fail every trace that ever returns from a recursive call.
 */
const METRIC_KEYS = ['comparisons', 'swaps', 'writes', 'reads', 'calls'] as const;

/**
 * The shared assertion every trace generator must satisfy.
 *
 * This is deliberately one function rather than a copy per family: the whole
 * architecture rests on "a generator returns a well-formed `Trace` and nothing
 * else", so the checks that matter are structural, not per-algorithm. Family
 * tests call this first and then add their own correctness assertions.
 *
 * It verifies, in order:
 *  1. the envelope agrees with its own algorithm id and carries an input;
 *  2. the step list is non-empty, ordered, and every step has a description;
 *  3. every `pseudocodeLine` and `codeLine` is in range — and for the code
 *     lines, in range *after* `resolveCodeLine`, which is what the four
 *     language tabs actually render;
 *  4. cumulative metrics never go backwards;
 *  5. the trace opens with `init` and closes with a terminal kind.
 */
export function assertTraceContract<S, D>(
  trace: Trace<S, D>,
  options: { minSteps?: number; languages?: readonly Language[]; terminal?: readonly string[] } = {},
): void {
  const { minSteps = 3, languages = LANGUAGES } = options;
  const terminal = options.terminal ?? ['complete', 'found', 'not-found', 'sorted'];

  expect(trace.id.startsWith(`${trace.algorithmId}#`)).toBe(true);
  expect(trace.name.length).toBeGreaterThan(0);
  expect(trace.input).toBeTruthy();
  expect(trace.generatedInMs).toBeGreaterThanOrEqual(0);

  expect(trace.steps.length).toBeGreaterThanOrEqual(minSteps);
  const { elidedSteps = 0 } = trace;
  expect(elidedSteps).toBeGreaterThanOrEqual(0);

  trace.steps.forEach((step, i) => {
    expect(step.index).toBe(i);
    expect(step.description.length).toBeGreaterThan(0);
    expect(step.weight).toBeGreaterThan(0);

    if (step.pseudocodeLine !== null) {
      expect(step.pseudocodeLine).toBeGreaterThanOrEqual(0);
      expect(step.pseudocodeLine).toBeLessThan(trace.pseudocode.length);
    }

    if (step.codeLine !== null) {
      for (const language of languages) {
        const lines = trace.code[language];
        if (!lines) continue;
        const resolved = resolveCodeLine(trace.codeMap, language, step.codeLine);
        if (resolved === null) continue;
        expect(resolved).toBeGreaterThanOrEqual(0);
        expect(resolved).toBeLessThan(lines.length);
      }
    }

    if (i > 0) {
      const prev = trace.steps[i - 1];
      if (prev) {
        for (const key of METRIC_KEYS) {
          expect(step.metrics[key]).toBeGreaterThanOrEqual(prev.metrics[key]);
        }
      }
    }
  });

  expect(trace.steps[0]?.kind).toBe('init');
  const last = trace.steps[trace.steps.length - 1];
  expect(terminal).toContain(last?.kind ?? '');
}

/** Cumulative metrics as of the last step — what the metrics strip shows when playback ends. */
export function finalMetrics<S, D>(trace: Trace<S, D>): MetricsSnapshot {
  return trace.steps[trace.steps.length - 1]?.metrics ?? ZERO_METRICS;
}

/** Multiset equality — the "nothing was invented or lost" check. */
export function sameMultiset(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = (xs: readonly number[]): number[] => [...xs].sort((x, y) => x - y);
  const sa = sorted(a);
  const sb = sorted(b);
  return sa.every((v, i) => v === sb[i]);
}
