import type {
  Complexity,
  Highlight,
  Language,
  MetricKey,
  MetricsSnapshot,
  StepKind,
  Trace,
  TraceResult,
  TraceStep,
} from '@/types';
import { EMPTY_HIGHLIGHT, ZERO_METRICS } from '@/types';
import { nowMs } from './time';

/**
 * `TraceBuilder` is the ergonomic front door for writing trace generators.
 *
 * A generator reads like the algorithm it records:
 *
 * ```ts
 * const t = new TraceBuilder<SortState, SortData>({ array: [...values] });
 * t.emit({ kind: 'init', description: `Sorting ${n} items`, pseudocodeLine: 0 });
 * for (…) {
 *   t.bump('comparisons', 1, 'read');
 *   t.emit({ kind: 'compare', description: `Compare ${a} and ${b}`, primary: [i], secondary: [j], pseudocodeLine: 3 });
 *   t.swap(i, j);
 * }
 * return t.build({ headline: 'Sorted', output: t.state.array });
 * ```
 *
 * It owns the bookkeeping nobody should hand-write: step indices, cumulative
 * metrics snapshots, recursion depth, timing, and the trace envelope.
 */
/**
 * Step kinds that may be elided once a trace is over budget.
 *
 * Highest-frequency, lowest-information events: an 80 000-step bubble sort on
 * 400 elements is 80 000 full snapshots. Metrics are still counted (the `bump`
 * happens before the budget check), so the counters and the Big-O story stay
 * exact while memory and DOM work stay bounded — the same trade-off a profiler
 * makes when it samples.
 */
const DROPPABLE_KINDS: ReadonlySet<StepKind> = new Set<StepKind>([
  'compare',
  'read',
  'info',
  'peek',
  'probe',
]);

/** Default trace length ceiling (~2 500 steps keeps the scrubber usable). */
export const DEFAULT_MAX_STEPS = 2500;

export interface EmitOptions<TData> {
  readonly kind: StepKind;
  readonly description: string;
  readonly highlight?: Highlight;
  readonly data?: TData;
  readonly pseudocodeLine?: number | null;
  readonly codeLine?: number | null;
  /** Relative duration at 1× (default 1). */
  readonly weight?: number;
  /** Increment these counters *before* the snapshot is taken. */
  readonly bump?: MetricKey | readonly MetricKey[];
  /**
   * Display badges for this frame (`{ gap: 4, pass: 2 }`).
   *
   * Badges belong to the snapshot, not the step, so the builder merges them
   * into the current state when it has a `badges` field. Doing it here rather
   * than in every generator keeps `emit()` the single line that records a beat.
   */
  readonly badges?: Readonly<Record<string, string | number>>;
}

export interface BuildOptions<TState> {
  readonly id: string;
  readonly algorithmId: string;
  readonly name: string;
  readonly category: string;
  readonly input: unknown;
  readonly result: TraceResult;
  readonly complexity: Complexity;
  readonly pseudocode: readonly string[];
  readonly code: Partial<Record<Language, readonly string[]>>;
  readonly codeMap?: Partial<Record<Language, readonly number[]>>;
  /** Sanity check used by tests: assert the final snapshot matches. */
  readonly expectedState?: (state: TState) => boolean;
}

/** Merges badges into a snapshot that supports them (every visual shape does). */
function withBadges<TState>(state: TState, badges: Readonly<Record<string, string | number>>): TState {
  if (typeof state !== 'object' || state === null) return state;
  return { ...(state as Record<string, unknown>), badges } as TState;
}

export class TraceBuilder<TState, TData = undefined> {
  private steps: TraceStep<TState, TData>[] = [];
  private counters: MetricsSnapshot = ZERO_METRICS;
  private currentDepth = 0;
  private readonly startedAt = nowMs();
  /** When set, every `emit()` re-reads the live state instead of a stored copy. */
  private readonly stateSource: (() => TState) | null;
  private currentState: TState;
  private lastState: TState;
  private readonly maxSteps: number;
  private elided = 0;

  /**
   * @param state Either a snapshot, or a **thunk** that returns one.
   *
   * Pass a thunk (`() => model.snapshot()`) whenever the algorithm mutates a
   * working model: the trace then always records the *live* state at the moment
   * of each `emit()`, which is the natural way to write these generators and
   * removes an entire class of "the snapshot never updated" bugs.
   *
   * Pass a plain value when each step computes a whole new state (DP tables,
   * graph snapshots built from scratch); then call `setState()` between emits.
   */
  constructor(state: TState | (() => TState), options: { maxSteps?: number } = {}) {
    this.maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
    if (typeof state === 'function') {
      this.stateSource = state as () => TState;
      this.currentState = (state as () => TState)();
      this.lastState = this.currentState;
    } else {
      this.stateSource = null;
      this.currentState = state;
      this.lastState = state;
    }
  }

  /** Latest snapshot (read-only by convention). */
  get state(): TState {
    return this.stateSource ? this.stateSource() : this.currentState;
  }

  get metrics(): MetricsSnapshot {
    return this.counters;
  }

  get stepCount(): number {
    return this.steps.length;
  }

  /** Steps dropped by the budget (surfaced in the Complexity tab). */
  get elidedSteps(): number {
    return this.elided;
  }

  /**
   * Replaces the snapshot. Callers must build a *new* object (no mutation).
   * Ignored when a thunk was supplied — the thunk is the source of truth.
   */
  setState(next: TState): void {
    this.currentState = next;
  }

  /** Convenience for array-ish states: `t.setState({ array: next })`. */
  update(updater: (state: TState) => TState): void {
    this.setState(updater(this.currentState));
  }

  /** Raises/lowers the recursion depth recorded on subsequent steps. */
  setDepth(depth: number): void {
    this.currentDepth = Math.max(0, depth);
    this.counters = { ...this.counters, depth: this.currentDepth };
  }

  enter(): void {
    this.counters = { ...this.counters, calls: this.counters.calls + 1 };
    this.setDepth(this.currentDepth + 1);
  }

  exit(): void {
    this.setDepth(this.currentDepth - 1);
  }

  /** Increments one or more counters without emitting a step. */
  bump(keys: MetricKey | readonly MetricKey[], amount = 1): void {
    const list: readonly MetricKey[] = Array.isArray(keys) ? keys : [keys as MetricKey];
    let next: MetricsSnapshot = this.counters;
    for (const key of list) {
      if (key === 'depth') {
        next = { ...next, depth: this.currentDepth };
        continue;
      }
      const counter: number = next[key];
      next = { ...next, [key]: counter + amount } as MetricsSnapshot;
    }
    this.counters = next;
  }

  /** Record one frame. */
  emit(options: EmitOptions<TData>): void {
    const { bump, badges } = options;
    if (bump) this.bump(bump);

    // Over budget: keep the structural beats, drop the chatter.
    if (this.steps.length >= this.maxSteps && DROPPABLE_KINDS.has(options.kind)) {
      this.elided += 1;
      return;
    }

    const resolved = this.stateSource ? this.stateSource() : this.currentState;
    this.lastState = resolved;
    const state = badges ? withBadges(resolved, badges) : resolved;

    const step: TraceStep<TState, TData> = {
      index: this.steps.length,
      kind: options.kind,
      description: options.description,
      state,
      highlight: options.highlight ?? EMPTY_HIGHLIGHT,
      pseudocodeLine: options.pseudocodeLine ?? null,
      codeLine: options.codeLine ?? null,
      metrics: this.counters, // frozen copy already — `bump` replaces the object
      depth: this.currentDepth,
      weight: options.weight ?? 1,
      ...(options.data === undefined ? {} : { data: options.data }),
    };
    this.steps.push(step);
  }

  /** Restores the last emitted snapshot (used by generators that branch). */
  resetState(): void {
    this.currentState = this.lastState;
  }

  build(options: BuildOptions<TState>): Trace<TState, TData> {
    const final = this.stateSource ? this.stateSource() : this.currentState;
    if (options.expectedState && !options.expectedState(final)) {
      // Loud in tests, harmless in production: a wrong trace is a bug, not a crash.
      console.warn(`[AlgoVerse] trace "${options.algorithmId}" failed its state assertion`);
    }
    return {
      id: options.id,
      algorithmId: options.algorithmId,
      name: options.name,
      category: options.category,
      input: options.input,
      steps: this.steps,
      result: options.result,
      complexity: options.complexity,
      pseudocode: options.pseudocode,
      code: options.code,
      ...(options.codeMap === undefined ? {} : { codeMap: options.codeMap }),
      ...(this.elided > 0 ? { elidedSteps: this.elided } : {}),
      generatedInMs: nowMs() - this.startedAt,
    };
  }
}
