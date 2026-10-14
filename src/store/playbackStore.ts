import { create } from 'zustand';
import type { AnyStep, AnyTrace, PlaybackStatus } from '@/types';
import {
  INITIAL_PLAYBACK,
  MAX_SPEED,
  MIN_SPEED,
  SPEED_STOPS,
  advance,
  clampSpeed,
  cursorProgress,
  playbackReducer,
  progressToCursor,
  totalDurationMs,
  type PlaybackAction,
  type PlaybackState,
} from '@/engine/playback';

/**
 * The transport. Everything about *where we are in the trace* lives here;
 * nothing about *what the trace looks like* does.
 *
 * Frame ticks are pushed in by `usePlaybackClock()` (a single rAF loop for the
 * whole app) rather than living in the store, so the store stays testable and
 * there is exactly one animation frame in flight.
 */
export interface PlaybackStore {
  readonly trace: AnyTrace | null;
  readonly playback: PlaybackState;
  /** Total trace duration at the current speed, in ms (memoised on speed). */
  readonly durationMs: number;

  loadTrace: (trace: AnyTrace | null, options?: { autoplay?: boolean; preserveCursor?: boolean }) => void;
  clearTrace: () => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  stepBy: (delta: 1 | -1) => void;
  seek: (cursor: number) => void;
  seekProgress: (progress: number) => void;
  jumpTo: (to: 'start' | 'end') => void;
  setSpeed: (speed: number) => void;
  nudgeSpeed: (direction: 1 | -1) => void;
  setLoop: (loop: boolean) => void;
  tick: (deltaMs: number) => void;
}

/** Not part of state: a mutable accumulator for partial step time. */
let accumulatorMs = 0;

export const usePlaybackStore = create<PlaybackStore>()((set, get) => {
  const dispatch = (action: PlaybackAction, options: { resetAccumulator?: boolean } = {}): void => {
    const previous = get().playback;
    const next = playbackReducer(previous, action);
    if (next === previous) return;
    if (options.resetAccumulator !== false) accumulatorMs = 0;
    const trace = get().trace;
    set({
      playback: next,
      durationMs: totalDurationMs(trace, next.speed),
    });
  };

  return {
    trace: null,
    playback: INITIAL_PLAYBACK,
    durationMs: 0,

    loadTrace: (trace, options) => {
      accumulatorMs = 0;
      if (!trace || trace.steps.length === 0) {
        set({ trace: null, playback: INITIAL_PLAYBACK, durationMs: 0 });
        return;
      }
      const runId = trace.id;
      const { playback } = get();
      const sameTrace = playback.runId === runId;
      set({
        trace,
        playback: playbackReducer(playback, {
          type: 'load',
          runId,
          length: trace.steps.length,
          autoplay: options?.autoplay ?? false,
        }),
        durationMs: totalDurationMs(trace, playback.speed),
      });
      if (sameTrace && options?.preserveCursor) {
        // Cursor deliberately kept (e.g. a visualiser remount mid-session).
      }
    },

    clearTrace: () => {
      accumulatorMs = 0;
      set({ trace: null, playback: INITIAL_PLAYBACK, durationMs: 0 });
    },

    play: () => dispatch({ type: 'play' }),
    pause: () => dispatch({ type: 'pause' }),
    toggle: () => dispatch({ type: 'toggle' }),
    reset: () => dispatch({ type: 'reset' }),
    stepBy: (delta) => dispatch({ type: 'step', delta }),
    seek: (cursor) => dispatch({ type: 'seek', cursor }),
    seekProgress: (progress) => {
      const { playback } = get();
      dispatch({ type: 'seek', cursor: progressToCursor(progress, playback.length) });
    },
    jumpTo: (to) => dispatch({ type: 'jump', to }),
    setSpeed: (speed) => dispatch({ type: 'speed', speed: clampSpeed(speed) }),

    nudgeSpeed: (direction) => {
      const current = get().playback.speed;
      const stops = SPEED_STOPS as readonly number[];
      const epsilon = 1e-3;
      const next =
        direction === 1
          ? (stops.find((s) => s > current + epsilon) ?? MAX_SPEED)
          : ([...stops].reverse().find((s) => s < current - epsilon) ?? MIN_SPEED);
      dispatch({ type: 'speed', speed: next });
    },

    setLoop: (loop) => dispatch({ type: 'loop', loop }),

    tick: (deltaMs) => {
      const { trace, playback } = get();
      if (!trace || playback.status !== 'playing') {
        accumulatorMs = 0;
        return;
      }
      const result = advance(playback, trace, accumulatorMs, deltaMs, playback.speed);
      accumulatorMs = result.accumulatorMs;
      if (result.state === playback) return;
      if (result.state.status !== playback.status) {
        set({ playback: { ...result.state, status: result.state.status as PlaybackStatus } });
        return;
      }
      set({ playback: result.state });
    },
  };
});

/* -------------------------------------------------------------------------- */
/*  Selectors — components subscribe to the narrowest possible slice.          */
/* -------------------------------------------------------------------------- */

export const selectStep = (state: PlaybackStore): AnyStep | null => {
  const trace = state.trace;
  if (!trace || trace.steps.length === 0) return null;
  return trace.steps[state.playback.cursor] ?? null;
};

export const selectProgress = (state: PlaybackStore): number =>
  cursorProgress(state.playback.cursor, state.playback.length);

export const selectStatus = (state: PlaybackStore): PlaybackStatus => state.playback.status;
export const selectSpeed = (state: PlaybackStore): number => state.playback.speed;
export const selectCursor = (state: PlaybackStore): number => state.playback.cursor;
export const selectLength = (state: PlaybackStore): number => state.playback.length;
