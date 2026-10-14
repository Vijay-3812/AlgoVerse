import { describe, expect, it } from 'vitest';
import { ALGORITHMS } from '@/engine/catalogue';
import { createPlaceholderModule } from './placeholder';
import type { AnyStep } from '@/types';

/**
 * The "doctor" test.
 *
 * Every trace in the app must satisfy the same contract, so this asserts it for
 * *every* algorithm in the catalogue, not just a sample. When a real generator
 * arrives in Phase 2+, it inherits these checks for free — extend this file
 * with the module instead of writing a new suite per algorithm.
 */
const CONTRACT_CHECKS = (steps: readonly AnyStep[], pseudocode: readonly string[], code: readonly string[]) => {
  expect(steps.length).toBeGreaterThan(0);

  steps.forEach((step, i) => {
    expect(step.index).toBe(i);
    expect(step.description.length).toBeGreaterThan(0);
    expect(step.state).toBeDefined();
    expect(step.weight).toBeGreaterThan(0);

    if (step.pseudocodeLine !== null) {
      expect(step.pseudocodeLine).toBeGreaterThanOrEqual(0);
      expect(step.pseudocodeLine).toBeLessThan(pseudocode.length);
    }
    if (step.codeLine !== null) {
      expect(step.codeLine).toBeGreaterThanOrEqual(0);
      expect(step.codeLine).toBeLessThan(code.length);
    }
  });

  // Metrics are cumulative and may never go backwards.
  const keys = ['comparisons', 'swaps', 'writes', 'reads', 'calls'] as const;
  for (let i = 1; i < steps.length; i += 1) {
    const previous = steps[i - 1]?.metrics;
    const current = steps[i]?.metrics;
    if (!previous || !current) continue;
    for (const key of keys) expect(current[key]).toBeGreaterThanOrEqual(previous[key]);
  }
};

describe('placeholder modules (whole catalogue)', () => {
  it('ships a well-formed trace for every algorithm', () => {
    for (const meta of ALGORITHMS) {
      const module = createPlaceholderModule(meta);
      const trace = module.definition.generate(module.definition.defaultInput(), {
        runId: `${meta.id}#fixture`,
        dataSet: 'custom',
        seed: 1,
      });

      expect(trace.algorithmId).toBe(meta.id);
      expect(trace.category).toBe(meta.category);
      CONTRACT_CHECKS(
        trace.steps,
        trace.pseudocode,
        trace.code.javascript ?? [],
      );

      // Every code sample must exist in all four languages for the panel toggle.
      expect(Object.keys(trace.code).sort()).toEqual(['cpp', 'java', 'javascript', 'python']);
    }
  });

  it('is deterministic for the same run info', () => {
    const meta = ALGORITHMS[0];
    if (!meta) throw new Error('catalogue is empty');
    const module = createPlaceholderModule(meta);
    const run = { runId: 'r', dataSet: 'random' as const, seed: 42 };

    const a = module.definition.generate(module.definition.defaultInput(), run);
    const b = module.definition.generate(module.definition.defaultInput(), run);

    expect(a.steps.map((s) => s.description)).toEqual(b.steps.map((s) => s.description));
    expect(a.steps.map((s) => s.metrics)).toEqual(b.steps.map((s) => s.metrics));
  });
});
