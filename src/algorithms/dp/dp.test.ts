import { describe, expect, it } from 'vitest';
import type { AlgorithmDefinition, TableSnapshot, TraceRunInfo } from '@/types';
import { assertTraceContract, finalMetrics } from '@/test/traceContract';
import { DP_LOADERS } from './index';
import { definition as fibonacciTab } from './fibonacciTab';
import { definition as coinChange } from './coinChange';
import { definition as lis } from './lis';
import { definition as knapsack } from './knapsack01';
import { definition as lcs } from './lcs';
import { definition as editDistance } from './editDistance';
import { definition as matrixChain } from './matrixChain';

const RUN: TraceRunInfo = { runId: 'test', dataSet: 'random', seed: 5 };

const ALL = [
  fibonacciTab,
  coinChange,
  lis,
  knapsack,
  lcs,
  editDistance,
  matrixChain,
] as readonly AlgorithmDefinition<TableSnapshot, unknown>[];

describe('dp family — trace contract', () => {
  it.each(ALL.map((definition) => [definition.meta.id, definition] as const))(
    '%s satisfies the shared trace contract',
    (_id, definition) => {
      const trace = definition.generate(definition.defaultInput(), RUN);
      assertTraceContract(trace, { minSteps: 8, terminal: ['complete', 'found', 'not-found', 'sorted'] });
    },
  );

  it('registers exactly the generators it ships', () => {
    const ids = ALL.map((definition) => definition.meta.id).sort();
    expect(ids).toEqual(Object.keys(DP_LOADERS).sort());
  });
});

describe('dp-fibonacci (tabulation)', () => {
  const trace = fibonacciTab.generate(fibonacciTab.defaultInput(), RUN);

  it('reaches fib(10) = 55', () => {
    expect(finalMetrics(trace).writes).toBeGreaterThan(10);
    expect((trace.result?.output as number) ?? 0).toBe(55);
  });

  it('fills every cell exactly once — no repeats, unlike the recursion tree', () => {
    const fills = trace.steps.filter((step) => step.kind === 'fill').length;
    expect(fills).toBe(10);
  });

  it('draws dependency arrows onto the two cells it reads', () => {
    const reads = trace.steps.filter((step) => step.kind === 'read');
    expect(reads.length).toBe(9);
    expect(reads.every((step) => (step.state as TableSnapshot).deps?.length === 2)).toBe(true);
  });
});

describe('coin-change', () => {
  const trace = coinChange.generate(coinChange.defaultInput(), RUN);

  it('finds the minimum coin count for 13 with {1,3,5,7} — 7 + 3 + 3', () => {
    expect(trace.result?.output).toBe(3);
  });

  it('never uses an amount cell that is larger than the target', () => {
    const last = trace.steps[trace.steps.length - 1];
    expect((last?.state as TableSnapshot).cols.length).toBe(14);
  });
});

describe('lis', () => {
  const trace = lis.generate(lis.defaultInput(), RUN);

  it('finds the known longest run in the default array', () => {
    expect(trace.result?.output).toEqual([10, 22, 33, 50, 60, 80]);
  });

  it('marks a strictly increasing path', () => {
    const output = trace.result?.output as number[];
    for (let i = 1; i < output.length; i += 1) expect(output[i]).toBeGreaterThan(output[i - 1] as number);
  });
});

describe('0/1 knapsack', () => {
  const trace = knapsack.generate(knapsack.defaultInput(), RUN);

  it('maximises value without exceeding the capacity', () => {
    // map(2,3) + rope(3,4) + tent(5,8) = weight 10, value 15.
    expect(trace.result?.output).toBe(15);
  });

  it('ends with a backtrack path through the table', () => {
    const last = trace.steps[trace.steps.length - 1];
    expect(((last?.state as TableSnapshot).path ?? []).length).toBeGreaterThan(1);
  });
});

describe('lcs', () => {
  const trace = lcs.generate(lcs.defaultInput(), RUN);

  it('agrees with the known LCS of AGGTAB and GXTXAYB', () => {
    expect(trace.result?.output).toBe('GTAB');
  });

  it('backtracks along diagonal matches', () => {
    const last = trace.steps[trace.steps.length - 1];
    expect(((last?.state as TableSnapshot).path ?? []).length).toBeGreaterThan(4);
  });
});

describe('edit distance', () => {
  const trace = editDistance.generate(editDistance.defaultInput(), RUN);

  it('computes the textbook kitten → sitting distance', () => {
    expect(trace.result?.output).toBe(3);
  });

  it('never writes a cost larger than the longer word', () => {
    const last = trace.steps[trace.steps.length - 1] as { state: TableSnapshot };
    for (const row of last.state.cells) {
      for (const cell of row) expect(Number(cell ?? 0)).toBeLessThanOrEqual(7);
    }
  });
});

describe('matrix chain multiplication', () => {
  const trace = matrixChain.generate(matrixChain.defaultInput(), RUN);

  it('matches the textbook cost for 30×35×15×5×10×20×25', () => {
    expect(trace.result?.output).toBe(15125);
  });

  it('explores every split point of every chain length', () => {
    const tries = trace.steps.filter((step) => step.kind === 'compare').length;
    // Sum over lengths 2..n of (n − len + 1)(len − 1) split trials.
    expect(tries).toBeGreaterThan(20);
  });

  it('leaves the lower triangle untouched and keeps the answer in the top-right corner', () => {
    const last = trace.steps[trace.steps.length - 1];
    const state = last?.state as TableSnapshot;
    expect(state.cells[3]?.[1]).toBeNull();
    const topRow = state.cells[0];
    expect(Number(topRow?.[topRow.length - 1])).toBe(15125);
  });
});
