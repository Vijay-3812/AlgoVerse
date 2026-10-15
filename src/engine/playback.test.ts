import { describe, expect, it } from 'vitest';
import type { AnyStep, AnyTrace, Complexity, TraceStep } from '@/types';
import { ZERO_METRICS } from '@/types';
import {
  BASE_STEP_MS,
  INITIAL_PLAYBACK,
  advance,
  clampCursor,
  clampSpeed,
  cursorProgress,
  playbackReducer,
  progressToCursor,
  stepDurationMs,
  totalDurationMs,
  type PlaybackState,
} from './playback';

/** Minimal step factory — the engine only ever reads `weight` and `kind`. */
function step(index: number, weight = 1): TraceStep<null> {
  return {
    index,
    kind: 'info',
    description: `step ${index}`,
    state: null,
    highlight: {},
    pseudocodeLine: null,
    codeLine: null,
    metrics: ZERO_METRICS,
    depth: 0,
    weight,
  };
}

function trace(stepCount: number, weight = 1): AnyTrace {
  const complexity: Complexity = {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(1)',
  };
  return {
    id: 'test-trace',
    algorithmId: 'test',
    name: 'Test',
    category: 'sorting',
    input: null,
    steps: Array.from({ length: stepCount }, (_, i) => step(i, weight)) as AnyStep[],
    result: { headline: 'done' },
    complexity,
    pseudocode: [],
    code: {},
    generatedInMs: 1,
  };
}

const loaded = (length: number): PlaybackState =>
  playbackReducer(INITIAL_PLAYBACK, { type: 'load', runId: 'r1', length });

describe('playback reducer', () => {
  it('loads a trace at step 0, paused', () => {
    const state = loaded(10);
    expect(state.cursor).toBe(0);
    expect(state.status).toBe('paused');
    expect(state.length).toBe(10);
  });

  it('can autoplay on load', () => {
    const state = playbackReducer(INITIAL_PLAYBACK, {
      type: 'load',
      runId: 'r1',
      length: 10,
      autoplay: true,
    });
    expect(state.status).toBe('playing');
  });

  it('resets the cursor when a different trace is loaded but keeps it for the same trace', () => {
    const first = playbackReducer(loaded(10), { type: 'seek', cursor: 6 });
    const sameTrace = playbackReducer(first, { type: 'load', runId: 'r1', length: 10 });
    const newTrace = playbackReducer(first, { type: 'load', runId: 'r2', length: 10 });

    expect(sameTrace.cursor).toBe(6);
    expect(newTrace.cursor).toBe(0);
  });

  it('clamps the cursor inside the trace', () => {
    expect(clampCursor(-5, 10)).toBe(0);
    expect(clampCursor(99, 10)).toBe(9);
    expect(clampCursor(4.6, 10)).toBe(4);
    expect(clampCursor(Number.NaN, 10)).toBe(0);
  });

  it('pauses when the user steps or seeks', () => {
    const playing = playbackReducer(loaded(10), { type: 'play' });
    expect(playbackReducer(playing, { type: 'step', delta: 1 }).status).toBe('paused');
    expect(playbackReducer(playing, { type: 'seek', cursor: 3 }).status).toBe('paused');
    expect(playbackReducer(playing, { type: 'jump', to: 'start' }).status).toBe('paused');
  });

  it('restarts from the beginning when play is pressed at the end', () => {
    const atEnd = playbackReducer(loaded(10), { type: 'jump', to: 'end' });
    const restarted = playbackReducer(atEnd, { type: 'play' });
    expect(restarted.cursor).toBe(0);
    expect(restarted.status).toBe('playing');
  });

  it('toggles between play and pause', () => {
    const playing = playbackReducer(loaded(10), { type: 'toggle' });
    expect(playing.status).toBe('playing');
    expect(playbackReducer(playing, { type: 'toggle' }).status).toBe('paused');
  });

  it('clamps speed to the documented range', () => {
    expect(clampSpeed(0.01)).toBe(0.25);
    expect(clampSpeed(99)).toBe(8);
    expect(clampSpeed(Number.NaN)).toBe(1);
    expect(playbackReducer(loaded(3), { type: 'speed', speed: 100 }).speed).toBe(8);
  });

  it('ignores play on a degenerate single-step trace', () => {
    const single = loaded(1);
    expect(playbackReducer(single, { type: 'play' })).toBe(single);
  });
});

describe('time model', () => {
  it('scales step duration by weight and speed, with a floor', () => {
    expect(stepDurationMs(step(0, 1), 1)).toBe(BASE_STEP_MS);
    expect(stepDurationMs(step(0, 2), 1)).toBe(BASE_STEP_MS * 2);
    expect(stepDurationMs(step(0, 1), 2)).toBe(BASE_STEP_MS / 2);
    expect(stepDurationMs(step(0, 0.001), 8)).toBe(8); // clamped by MIN_STEP_MS
    expect(stepDurationMs(undefined, 1)).toBe(BASE_STEP_MS);
  });

  it('sums the whole trace duration', () => {
    expect(totalDurationMs(trace(10, 1), 1)).toBe(BASE_STEP_MS * 10);
    expect(totalDurationMs(trace(10, 1), 2)).toBe((BASE_STEP_MS * 10) / 2);
    expect(totalDurationMs(null, 1)).toBe(0);
  });
});

describe('advance', () => {
  it('does not move before a full step has elapsed', () => {
    const state = playbackReducer(loaded(10), { type: 'play' });
    const result = advance(state, trace(10), 0, 100, 1);
    expect(result.state.cursor).toBe(0);
    expect(result.accumulatorMs).toBe(100);
  });

  it('advances exactly one step per completed duration and drops the remainder', () => {
    const state = playbackReducer(loaded(10), { type: 'play' });
    // A 5× long frame must not skip 5 steps.
    const result = advance(state, trace(10), 0, BASE_STEP_MS * 5, 1);
    expect(result.state.cursor).toBe(1);
    expect(result.accumulatorMs).toBe(0);
  });

  it('marks the trace complete on the final step', () => {
    const state = playbackReducer(
      { ...loaded(3), cursor: 1, status: 'playing' },
      { type: 'seek', cursor: 1 },
    );
    const playing = { ...state, status: 'playing' as const };
    const result = advance(playing, trace(3), 0, BASE_STEP_MS, 1);
    expect(result.state.cursor).toBe(2);
    expect(result.state.status).toBe('completed');
    expect(result.finished).toBe(true);
  });

  it('loops back to the start when looping is on', () => {
    const end: PlaybackState = { ...loaded(3), cursor: 2, status: 'playing', loop: true };
    const result = advance(end, trace(3), BASE_STEP_MS, BASE_STEP_MS, 1);
    expect(result.state.cursor).toBe(0);
    expect(result.state.status).toBe('playing');
  });

  it('is a no-op while paused', () => {
    const paused = loaded(10);
    const result = advance(paused, trace(10), 500, 5000, 1);
    expect(result.state).toBe(paused);
  });
});

describe('progress mapping', () => {
  it('maps cursor to progress and back without drift', () => {
    expect(cursorProgress(0, 5)).toBe(0);
    expect(cursorProgress(4, 5)).toBe(1);
    expect(progressToCursor(0, 11)).toBe(0);
    expect(progressToCursor(1, 11)).toBe(10);
    expect(progressToCursor(0.5, 11)).toBe(5);
  });

  it('handles degenerate lengths', () => {
    expect(cursorProgress(0, 1)).toBe(1);
    expect(cursorProgress(0, 0)).toBe(0);
    expect(progressToCursor(0.4, 0)).toBe(0);
  });
});
