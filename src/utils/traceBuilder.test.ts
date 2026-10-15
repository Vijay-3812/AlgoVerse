import { describe, expect, it } from 'vitest';
import { TraceBuilder } from './traceBuilder';
import type { Complexity } from '@/types';

interface State {
  readonly array: readonly number[];
  readonly note: string;
}

const complexity: Complexity = {
  time: { best: 'O(n)', average: 'O(n log n)', worst: 'O(n²)' },
  space: 'O(1)',
  stable: true,
};

const build = (builder: TraceBuilder<State>) =>
  builder.build({
    id: 'demo',
    algorithmId: 'demo',
    name: 'Demo',
    category: 'sorting',
    input: { kind: 'array', values: [3, 1, 2] },
    result: { headline: 'done', output: [1, 2, 3] },
    complexity,
    pseudocode: ['line 0', 'line 1'],
    code: { javascript: ['// code'] },
  });

describe('TraceBuilder', () => {
  it('assigns monotonic indices and freezes a metrics snapshot per step', () => {
    const builder = new TraceBuilder<State>({ array: [3, 1, 2], note: 'start' });

    builder.emit({ kind: 'init', description: 'start', pseudocodeLine: 0 });
    builder.bump('comparisons');
    builder.bump('comparisons');
    builder.emit({ kind: 'compare', description: 'compare', pseudocodeLine: 1 });

    const trace = build(builder);

    expect(trace.steps.map((s) => s.index)).toEqual([0, 1]);
    expect(trace.steps[0]?.metrics.comparisons).toBe(0);
    expect(trace.steps[1]?.metrics.comparisons).toBe(2);
    // Snapshot semantics: mutating counters later must not rewrite history.
    builder.bump('comparisons');
    expect(trace.steps[1]?.metrics.comparisons).toBe(2);
  });

  it('tracks recursion depth and call count across enter/exit', () => {
    const builder = new TraceBuilder<State>({ array: [], note: '' });
    builder.enter();
    builder.emit({ kind: 'recurse', description: 'depth 1' });
    builder.enter();
    builder.emit({ kind: 'recurse', description: 'depth 2' });
    builder.exit();
    builder.exit();

    const trace = build(builder);
    expect(trace.steps.map((s) => s.depth)).toEqual([1, 2]);
    expect(trace.steps.map((s) => s.metrics.calls)).toEqual([1, 2]);
    expect(trace.steps[1]?.metrics.depth).toBe(2);
  });

  it('never lets depth go negative', () => {
    const builder = new TraceBuilder<State>({ array: [], note: '' });
    builder.exit();
    builder.emit({ kind: 'info', description: 'still fine' });
    expect(build(builder).steps[0]?.depth).toBe(0);
  });

  it('applies default weight, empty highlight and null lines', () => {
    const builder = new TraceBuilder<State>({ array: [], note: '' });
    builder.emit({ kind: 'info', description: 'plain' });
    const step = build(builder).steps[0];
    expect(step?.weight).toBe(1);
    expect(step?.highlight).toEqual({});
    expect(step?.pseudocodeLine).toBeNull();
    expect(step?.codeLine).toBeNull();
  });

  it('supports state replacement without mutating earlier snapshots', () => {
    const initial: State = { array: [2, 1], note: 'a' };
    const builder = new TraceBuilder<State>(initial);

    builder.emit({ kind: 'init', description: 'before' });
    builder.setState({ array: [1, 2], note: 'b' });
    builder.emit({ kind: 'sorted', description: 'after' });

    const trace = build(builder);
    expect(trace.steps[0]?.state).toEqual({ array: [2, 1], note: 'a' });
    expect(trace.steps[1]?.state).toEqual({ array: [1, 2], note: 'b' });
  });

  it('reports generation time and carries the envelope through', () => {
    const builder = new TraceBuilder<State>({ array: [], note: '' });
    builder.emit({ kind: 'init', description: 'go' });
    const trace = build(builder);

    expect(trace.generatedInMs).toBeGreaterThanOrEqual(0);
    expect(trace.algorithmId).toBe('demo');
    expect(trace.pseudocode).toHaveLength(2);
    expect(trace.code.javascript).toHaveLength(1);
  });

  it('warns (but does not throw) when the final state assertion fails', () => {
    const builder = new TraceBuilder<State>({ array: [3, 1, 2], note: '' });
    builder.emit({ kind: 'init', description: 'unfinished' });
    const trace = builder.build({
      id: 'x',
      algorithmId: 'x',
      name: 'X',
      category: 'sorting',
      input: null,
      result: { headline: 'x' },
      complexity,
      pseudocode: [],
      code: {},
      expectedState: (state) => state.array.join() === '1,2,3',
    });
    expect(trace.steps).toHaveLength(1);
  });
});
