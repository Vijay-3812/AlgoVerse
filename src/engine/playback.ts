import type { AnyTrace, PlaybackStatus, TraceStep } from '@/types';
import { clamp } from '@/utils/math';

/**
 * ---------------------------------------------------------------------------
 *  PLAYBACK ENGINE — pure, framework-free, fully unit-tested.
 * ---------------------------------------------------------------------------
 *  The engine knows nothing about React, Framer Motion or the DOM. It is a
 *  reducer over a cursor plus a time model, which means:
 *   • scrubbing / stepping / reversing are O(1),
 *   • the same code drives the scrubber, the keyboard, the rAF clock and
 *     (Phase 8) the GIF exporter, which walks the same cursor off-screen.
 *
 *  Time model: every step carries a `weight`; a step lasts
 *  `BASE_STEP_MS * weight / speed`, clamped so 8× on 10 000 steps stays smooth
 *  and 0.25× never feels frozen.
 */

export const MIN_SPEED = 0.25;
export const MAX_SPEED = 8;
export const SPEED_STOPS = [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8] as const;

export const BASE_STEP_MS = 340;
const MIN_STEP_MS = 8;
const MAX_STEP_MS = 2600;

export interface PlaybackState {
  /** Identifies the loaded trace; changing it resets the cursor. */
  readonly runId: string | null;
  readonly length: number;
  /** Index of the step currently displayed. */
  readonly cursor: number;
  readonly status: PlaybackStatus;
  readonly speed: number;
  /** Loop back to step 0 after the last step. */
  readonly loop: boolean;
}

export const INITIAL_PLAYBACK: PlaybackState = Object.freeze({
  runId: null,
  length: 0,
  cursor: 0,
  status: 'idle',
  speed: 1,
  loop: false,
});

export type PlaybackAction =
  | { readonly type: 'load'; readonly runId: string; readonly length: number; readonly autoplay?: boolean }
  | { readonly type: 'unload' }
  | { readonly type: 'play' }
  | { readonly type: 'pause' }
  | { readonly type: 'toggle' }
  | { readonly type: 'reset' }
  | { readonly type: 'step'; readonly delta: 1 | -1 }
  | { readonly type: 'seek'; readonly cursor: number }
  | { readonly type: 'jump'; readonly to: 'start' | 'end' }
  | { readonly type: 'settle'; readonly cursor: number; readonly status: PlaybackStatus }
  | { readonly type: 'speed'; readonly speed: number }
  | { readonly type: 'loop'; readonly loop: boolean };

export function clampSpeed(speed: number): number {
  return clamp(Number.isFinite(speed) ? speed : 1, MIN_SPEED, MAX_SPEED);
}

export function clampCursor(cursor: number, length: number): number {
  if (!Number.isFinite(cursor)) return 0;
  return clamp(Math.trunc(cursor), 0, Math.max(0, length - 1));
}

/** Duration of one step in milliseconds at the given speed. */
export function stepDurationMs(step: TraceStep<unknown, unknown> | undefined, speed: number): number {
  if (!step) return BASE_STEP_MS;
  const raw = (BASE_STEP_MS * step.weight) / clampSpeed(speed);
  return clamp(raw, MIN_STEP_MS, MAX_STEP_MS);
}

export function totalDurationMs(trace: AnyTrace | null, speed: number): number {
  if (!trace) return 0;
  let total = 0;
  for (const step of trace.steps) total += stepDurationMs(step, speed);
  return total;
}

export function cursorProgress(cursor: number, length: number): number {
  if (length <= 1) return length === 1 ? 1 : 0;
  return clamp(cursor / (length - 1), 0, 1);
}

/** Pure reducer. Every transport action goes through here. */
export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'load': {
      const length = Math.max(0, action.length);
      const sameTrace = state.runId === action.runId;
      return {
        ...state,
        runId: action.runId,
        length,
        cursor: sameTrace ? clampCursor(state.cursor, length) : 0,
        status: length <= 1 ? 'completed' : action.autoplay ? 'playing' : 'paused',
      };
    }
    case 'unload':
      return { ...INITIAL_PLAYBACK, speed: state.speed, loop: state.loop };
    case 'play':
      if (state.length <= 1) return state;
      if (state.cursor >= state.length - 1) return { ...state, cursor: 0, status: 'playing' };
      return { ...state, status: 'playing' };
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;
    case 'toggle':
      return playbackReducer(state, { type: state.status === 'playing' ? 'pause' : 'play' });
    case 'reset':
      return { ...state, cursor: 0, status: 'paused' };
    case 'step':
      return {
        ...state,
        cursor: clampCursor(state.cursor + action.delta, state.length),
        status: 'paused',
      };
    case 'seek':
      return { ...state, cursor: clampCursor(action.cursor, state.length), status: 'paused' };
    case 'jump': {
      const cursor = action.to === 'start' ? 0 : Math.max(0, state.length - 1);
      return { ...state, cursor, status: action.to === 'end' ? 'completed' : 'paused' };
    }
    case 'settle':
      return { ...state, cursor: clampCursor(action.cursor, state.length), status: action.status };
    case 'speed':
      return { ...state, speed: clampSpeed(action.speed) };
    case 'loop':
      return { ...state, loop: action.loop };
    default:
      return state;
  }
}

export interface AdvanceResult {
  readonly state: PlaybackState;
  /** Leftover milliseconds inside the next step. */
  readonly accumulatorMs: number;
  /** True when playback crossed the final step during this tick. */
  readonly finished: boolean;
}

/**
 * Advances the cursor by elapsed wall-clock time.
 *
 * Deliberately *not* a `while` over `dt`: a 200 ms frame stall must not skip
 * 8 steps and hide the interesting part of the algorithm. We spend the budget
 * on at most one step and drop the remainder, so playback degrades to a
 * slightly slower replay instead of a slideshow.
 */
export function advance(
  state: PlaybackState,
  trace: AnyTrace,
  accumulatorMs: number,
  deltaMs: number,
  speed: number,
): AdvanceResult {
  if (state.status !== 'playing' || trace.steps.length === 0) {
    return { state, accumulatorMs: 0, finished: false };
  }

  const current = trace.steps[state.cursor];
  const duration = stepDurationMs(current, speed);
  // Cap a single frame's contribution at one step's duration: after a stall or
  // a backgrounded tab we advance exactly one step (never a slideshow), and the
  // leftover time is carried so long-run pacing stays true to the speed slider.
  const delta = Math.max(0, Math.min(deltaMs, duration));
  const accumulator = accumulatorMs + delta;

  if (accumulator < duration) {
    return { state, accumulatorMs: accumulator, finished: false };
  }

  const atEnd = state.cursor >= state.length - 1;
  if (atEnd) {
    if (state.loop) {
      return {
        state: { ...state, cursor: 0, status: 'playing' },
        accumulatorMs: 0,
        finished: false,
      };
    }
    return {
      state: { ...state, status: 'completed' },
      accumulatorMs: 0,
      finished: true,
    };
  }

  const nextCursor = clampCursor(state.cursor + 1, state.length);
  const isLast = nextCursor >= state.length - 1;
  return {
    state: {
      ...state,
      cursor: nextCursor,
      status: isLast && !state.loop ? 'completed' : 'playing',
    },
    // Carry the overshoot (bounded by one duration) so 1× really is 1×.
    accumulatorMs: Math.max(0, accumulator - duration),
    finished: isLast,
  };
}

/** Index of the nearest step marker to a 0..1 scrub position. */
export function progressToCursor(progress: number, length: number): number {
  if (length <= 1) return 0;
  return clampCursor(Math.round(clamp(progress, 0, 1) * (length - 1)), length);
}
