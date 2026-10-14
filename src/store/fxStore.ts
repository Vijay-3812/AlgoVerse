import { create } from 'zustand';

/**
 * A tiny mailbox between "something happened" (a trace completed, an insert
 * landed) and the single canvas particle system that renders it.
 *
 * Deliberately not React state: bursts are one-shot events, not UI state, and
 * routing them through a store keeps the particle engine mounted once, outside
 * the re-render path, so a burst can never cause a frame drop.
 */
export interface Burst {
  readonly id: number;
  /** Normalised viewport coords (0..1). */
  readonly x: number;
  readonly y: number;
  readonly count: number;
  /** Minimum particle speed in px/s. */
  readonly power: number;
  readonly colors: readonly string[];
}

export interface FxStore {
  readonly queue: readonly Burst[];
  readonly reducedMotion: boolean;
  burst: (options?: Partial<Omit<Burst, 'id'>>) => void;
  setReducedMotion: (value: boolean) => void;
  drain: () => Burst[];
}

const CELEBRATION_COLORS = ['#00F5FF', '#8B5CF6', '#FF2E97', '#A3FF12', '#FFB020'] as const;

let counter = 0;

export const useFxStore = create<FxStore>()((set, get) => ({
  queue: [],
  reducedMotion: false,

  burst: (options) => {
    counter += 1;
    const burst: Burst = {
      id: counter,
      x: options?.x ?? 0.5,
      y: options?.y ?? 0.45,
      count: options?.count ?? 90,
      power: options?.power ?? 460,
      colors: options?.colors ?? CELEBRATION_COLORS,
    };
    set({ queue: [...get().queue, burst].slice(-6) });
  },

  setReducedMotion: (value) => set({ reducedMotion: value }),

  drain: () => {
    const { queue } = get();
    if (queue.length === 0) return queue as Burst[];
    set({ queue: [] });
    return queue as Burst[];
  },
}));

/** Fires from anywhere: `celebrate()` — a full-screen confetti cannon. */
export function celebrate(x = 0.5, y = 0.45): void {
  useFxStore.getState().burst({ x, y, count: 110, power: 520 });
}

/** Smaller, directional burst for local events (inserts, matches, wins). */
export function sparkle(x: number, y: number, colors?: readonly string[]): void {
  useFxStore.getState().burst({ x, y, count: 26, power: 260, ...(colors ? { colors } : {}) });
}
