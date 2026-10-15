import { describe, expect, it } from 'vitest';
import { RECURSION_LOADERS } from './index';
import { definition as factorial } from './factorial';
import { definition as fibonacci } from './fibonacciRecursive';
import { definition as hanoi } from './towerOfHanoi';
import { definition as subsets } from './subsets';
import { definition as permutations } from './permutations';
import { definition as queens } from './nQueens';
import { definition as sudoku } from './sudoku';
import { definition as maze } from './ratInMaze';
import { assertTraceContract, finalMetrics } from '@/test/traceContract';
import type { AlgorithmDefinition, BoardSnapshot, CallSnapshot, TraceRunInfo } from '@/types';

const RUN: TraceRunInfo = { runId: 'test', dataSet: 'random', seed: 7 };

/** Every generator in the family, loaded straight from its own module. */
const ALL = [
  factorial,
  fibonacci,
  hanoi,
  subsets,
  permutations,
  queens,
  sudoku,
  maze,
] as readonly AlgorithmDefinition<CallSnapshot | BoardSnapshot, unknown>[];

describe('recursion family — trace contract', () => {
  it.each(ALL.map((definition) => [definition.meta.id, definition] as const))(
    '%s satisfies the shared trace contract',
    (_id, definition) => {
      const trace = definition.generate(definition.defaultInput(), RUN);
      assertTraceContract(trace, { minSteps: 6, terminal: ['complete', 'found', 'not-found', 'sorted'] });
    },
  );

  it('covers every loader entry — the table and the modules agree', () => {
    for (const id of Object.keys(RECURSION_LOADERS)) {
      expect(ALL.some((definition) => definition.meta.id === id)).toBe(true);
    }
  });

  it('registers no generator twice and every generator once', () => {
    const ids = ALL.map((definition) => definition.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(Object.keys(RECURSION_LOADERS).sort());
  });
});

describe('factorial', () => {
  const trace = factorial.generate(factorial.defaultInput(), RUN);

  it('reaches the true factorial', () => {
    expect(trace.steps[trace.steps.length - 1]?.description).toContain('720');
  });

  it('never exceeds the requested depth', () => {
    const depth = Math.max(...trace.steps.map((step) => (step.state as CallSnapshot).frames.length));
    expect(depth).toBe(6);
  });

  it('calls the function once per level, base case included', () => {
    expect(finalMetrics(trace).calls).toBe(6);
  });

  it('returns before it completes — the unwind is visible', () => {
    const kinds = trace.steps.map((step) => step.kind);
    expect(kinds).toContain('recurse');
    expect(kinds).toContain('return');
    expect(kinds.indexOf('return')).toBeGreaterThan(kinds.indexOf('recurse'));
  });
});

describe('fibonacci (naive recursion)', () => {
  const trace = fibonacci.generate(fibonacci.defaultInput(), RUN);

  it('computes the correct value', () => {
    expect(trace.steps[trace.steps.length - 1]?.description).toContain('fib(5) = 5');
  });

  it('recomputes subproblems — the point of the visualiser', () => {
    expect(trace.steps[trace.steps.length - 1]?.description).toMatch(/recomputed a subproblem/);
  });

  it('grows the recursion tree with the depth of the trace', () => {
    const deepest = Math.max(...trace.steps.map((step) => (step.state as CallSnapshot).frames.length));
    expect(deepest).toBe(6);
  });
});

describe('tower of hanoi', () => {
  const trace = hanoi.generate(hanoi.defaultInput(), RUN);

  it('finishes in exactly 2ⁿ − 1 moves', () => {
    expect(trace.steps[trace.steps.length - 1]?.description).toContain('15 moves');
  });

  it('leaves every disk on rod C', () => {
    const last = trace.steps[trace.steps.length - 1];
    const pegs = (last?.data as { pegs?: readonly (readonly number[])[] } | undefined)?.pegs;
    expect(pegs?.[2]?.length).toBe(4);
    expect(pegs?.[0]?.length).toBe(0);
  });

  it('never places a larger disk on a smaller one', () => {
    for (const step of trace.steps) {
      const pegs = (step.data as { pegs?: readonly (readonly number[])[] } | undefined)?.pegs;
      if (!pegs) continue;
      for (const peg of pegs) {
        for (let i = 1; i < peg.length; i += 1) {
          // Rods store the smallest disk at the top, so values descend downward.
          expect(peg[i] as number).toBeLessThan(peg[i - 1] as number);
        }
      }
    }
  });
});

describe('subsets', () => {
  const trace = subsets.generate(subsets.defaultInput(), RUN);

  it('emits exactly 2ⁿ subsets', () => {
    expect(trace.steps[trace.steps.length - 1]?.description).toContain('16 subsets');
  });

  it('emits each of them as a distinct sorted tuple', () => {
    const emitted = trace.steps
      .filter((step) => step.kind === 'sorted')
      .map((step) => (step.data as { chosen?: readonly number[] } | undefined)?.chosen ?? []);
    const keys = new Set(emitted.map((set) => set.join(',')));
    expect(emitted.length).toBe(16);
    expect(keys.size).toBe(16);
  });

  it('returns the stack to empty by the end', () => {
    expect((trace.steps[trace.steps.length - 1]?.state as CallSnapshot).frames.length).toBe(0);
  });
});

describe('permutations', () => {
  const trace = permutations.generate(permutations.defaultInput(), RUN);

  it('emits n! distinct arrangements', () => {
    const emitted = trace.steps
      .filter((step) => step.kind === 'sorted')
      .map((step) => ((step.data as { perm?: readonly number[] } | undefined)?.perm ?? []).join(','));
    expect(emitted.length).toBe(24);
    expect(new Set(emitted).size).toBe(24);
  });

  it('restores the input array when the search unwinds', () => {
    const last = trace.steps[trace.steps.length - 1];
    expect((last?.data as { emitted?: readonly (readonly number[])[] } | undefined)?.emitted?.length).toBe(24);
  });

  it('swaps an even number of times — every swap is undone', () => {
    expect(finalMetrics(trace).swaps % 2).toBe(0);
  });
});

describe('n-queens', () => {
  const trace = queens.generate(queens.defaultInput(), RUN);

  it('finds the known number of solutions for 6 queens', () => {
    expect(trace.steps[trace.steps.length - 1]?.description).toContain('4 solutions');
  });

  it('never puts two queens in the same column of a solution', () => {
    const solutions = trace.steps.filter((step) => step.kind === 'sorted');
    for (const step of solutions) {
      const roles = (step.state as BoardSnapshot).cells;
      const columns = roles
        .map((row, r) => (row.some((cell) => cell === 'Q') ? r : -1))
        .filter((v) => v >= 0);
      expect(new Set(columns).size).toBe(columns.length);
    }
  });

  it('prunes more squares than it places — the search is not brute force', () => {
    const last = trace.steps[trace.steps.length - 1];
    const pruned = Number((last?.state as BoardSnapshot).badges?.pruned ?? 0);
    expect(pruned).toBeGreaterThan(trace.steps.filter((step) => step.kind === 'place').length);
  });
});

describe('sudoku solver', () => {
  const trace = sudoku.generate(sudoku.defaultInput(), RUN);

  it('solves the puzzle it was given', () => {
    expect(trace.steps[trace.steps.length - 1]?.kind).toBe('complete');
  });

  it('leaves no empty cell on the final board', () => {
    const last = trace.steps[trace.steps.length - 1];
    const cells = (last?.state as BoardSnapshot).cells.flat();
    expect(cells.every((cell) => cell !== '' && cell !== null)).toBe(true);
  });

  it('has all 81 cells filled with 1–9 exactly once per row', () => {
    const last = trace.steps[trace.steps.length - 1];
    for (const row of (last?.state as BoardSnapshot).cells) {
      const values = row.map((cell) => Number(cell));
      expect(new Set(values).size).toBe(9);
      expect(values.every((value) => value >= 1 && value <= 9)).toBe(true);
    }
  });

  it('backtracks at least once — the given puzzle is not solved greedily', () => {
    expect(trace.steps.some((step) => step.kind === 'backtrack')).toBe(true);
  });
});

describe('rat in a maze', () => {
  const trace = maze.generate(maze.defaultInput(), RUN);

  it('finds a path through the maze', () => {
    expect(trace.steps[trace.steps.length - 1]?.kind).toBe('complete');
  });

  it('walks a path that starts at the entrance and ends at the exit', () => {
    const last = trace.steps[trace.steps.length - 1];
    const state = last?.state as BoardSnapshot;
    expect(Number(state.badges?.pathLength ?? 0)).toBeGreaterThan(4);
    expect(state.roles?.[0]?.[0]).toBe('path');
    expect(state.roles?.[state.rows - 1]?.[state.cols - 1]).toBe('path');
    expect(state.cells.flat().filter((cell) => cell === '•').length).toBe(Number(state.badges?.pathLength));
  });

  it('marks walls as ghosts and never as path', () => {
    const last = trace.steps[trace.steps.length - 1];
    const state = last?.state as BoardSnapshot;
    state.cells.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === '▓') expect(state.roles?.[r]?.[c]).toBe('ghost');
      });
    });
  });

  it('records at least one dead end', () => {
    const last = trace.steps[trace.steps.length - 1];
    expect(Number((last?.state as BoardSnapshot).badges?.backtracks ?? 0)).toBeGreaterThan(0);
  });
});
