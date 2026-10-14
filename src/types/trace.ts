/**
 * ---------------------------------------------------------------------------
 *  THE TRACE SYSTEM
 * ---------------------------------------------------------------------------
 *  AlgoVerse's one non-negotiable rule: **algorithms never touch the DOM.**
 *
 *  An algorithm is a *pure function* that walks its own data structure and
 *  records what it did as an ordered list of immutable `TraceStep`s. The UI is
 *  a dumb replayer: given `steps[i]` it renders that snapshot. Nothing else.
 *
 *  Consequences that make the rest of the app cheap:
 *   • Scrub / rewind / jump-to-end are O(1) array indexing, not re-execution.
 *   • Playback speed, sound, metrics and narration come free for every
 *     algorithm ever added, because they all speak this one shape.
 *   • Traces are serialisable → shareable URLs, GIF export, and fixture-based
 *     unit tests without a browser.
 *
 *  Purity contract for generators:
 *   1. `generate()` must be deterministic given `(input, rngSeed)`.
 *   2. Snapshots are immutable-by-convention: create a *new* state object when
 *      something changes (structural sharing), never mutate one already
 *      handed to `emit()`. Cloning per step would blow memory on large inputs.
 *   3. Metrics are cumulative counters, snapshotted per step.
 * ---------------------------------------------------------------------------
 */

/** Language of the code panel. */
export type Language = 'javascript' | 'python' | 'cpp' | 'java';

/**
 * What an operation *is*, independent of the structure it happens on.
 * Kept as a flat union so the timeline, the sound engine and the narration
 * layer can switch on it generically for any future algorithm.
 */
export type StepKind =
  // lifecycle
  | 'init'
  | 'info'
  | 'complete'
  // primitive reads / writes
  | 'read'
  | 'write'
  | 'compare'
  | 'swap'
  | 'shift'
  | 'update'
  // containers
  | 'insert'
  | 'delete'
  | 'push'
  | 'pop'
  | 'enqueue'
  | 'dequeue'
  | 'peek'
  | 'rotate'
  | 'resize'
  // sorting / partitioning
  | 'pivot'
  | 'partition'
  | 'merge'
  | 'split'
  | 'sorted'
  | 'heapify'
  | 'sift-up'
  | 'sift-down'
  // search
  | 'search'
  | 'found'
  | 'not-found'
  | 'window'
  // trees
  | 'visit'
  | 'recurse'
  | 'return'
  | 'balance'
  // graphs
  | 'explore'
  | 'frontier'
  | 'relax'
  | 'path'
  | 'topo'
  | 'union'
  | 'find'
  // hashing
  | 'hash'
  | 'collision'
  | 'probe'
  | 'rehash'
  // dp / greedy / strings
  | 'memo'
  | 'fill'
  | 'choose'
  | 'backtrack'
  | 'place'
  | 'conflict'
  | 'prune'
  | 'match'
  | 'mismatch'
  // backtracking boards
  | 'mark'
  | 'unmark';

/**
 * Semantic colour roles. The theme maps these to tokens; a visualiser never
 * hard-codes a hex value, so the cyberpunk theme works everywhere for free.
 */
export type VisualRole =
  | 'idle'
  | 'active'
  | 'compare'
  | 'swap'
  | 'pivot'
  | 'sorted'
  | 'visited'
  | 'frontier'
  | 'path'
  | 'success'
  | 'danger'
  | 'ghost'
  | 'muted';

/**
 * Per-step emphasis. Indices are the algorithm's own addressing scheme
 * (array positions, node ids, DP cell coords as `${r}:${c}`, etc.).
 */
export interface Highlight {
  /** Primary subject of the step — the `i` cursor, the node being visited. */
  readonly primary?: readonly number[];
  /** Secondary subject — the `j` comparison partner. */
  readonly secondary?: readonly number[];
  /** Boundaries: pivot, window start/end, partition edge. */
  readonly tertiary?: readonly number[];
  /** Finished / correct elements (sorted tail, confirmed path). */
  readonly success?: readonly number[];
  /** Removed, rejected or conflicting elements. */
  readonly danger?: readonly number[];
  /** Eliminated search space — rendered dimmed. */
  readonly muted?: readonly number[];
  /** Graph/tree node ids. */
  readonly nodes?: readonly string[];
  /** Graph edges as `"a->b"` (undirected edges are stored once, source-first). */
  readonly edges?: readonly string[];
  /** Non-indexical extras, e.g. DP dependency coords `["2:3","1:3"]`. */
  readonly deps?: readonly string[];
}

export const EMPTY_HIGHLIGHT: Highlight = Object.freeze({});

/** Cumulative counters, snapshotted on every step so metrics scrub too. */
export interface MetricsSnapshot {
  /** Key comparisons (sorting/searching) or edge relaxations (graphs). */
  readonly comparisons: number;
  /** Element swaps. */
  readonly swaps: number;
  /** Mutations of the underlying structure (swaps count as 2 writes). */
  readonly writes: number;
  /** Reads / lookups / dequeues that inspected state without mutating it. */
  readonly reads: number;
  /** Recursive calls made so far. */
  readonly calls: number;
  /** Current recursion depth (0 outside recursion). */
  readonly depth: number;
}

export const ZERO_METRICS: MetricsSnapshot = Object.freeze({
  comparisons: 0,
  swaps: 0,
  writes: 0,
  reads: 0,
  calls: 0,
  depth: 0,
});

/** Keys a generator is allowed to increment. */
export type MetricKey = keyof MetricsSnapshot;

/**
 * A single immutable frame of the recording.
 *
 * @template TState  Shape of the data structure snapshot (e.g. `SortState`).
 * @template TData   Optional action payload (e.g. `{ i: number; j: number }`).
 */
export interface TraceStep<TState = unknown, TData = unknown> {
  /** Monotonic index, assigned by the builder. */
  readonly index: number;
  readonly kind: StepKind;
  /** One-line narration shown in the explanation panel and timeline tooltip. */
  readonly description: string;
  /** Structural snapshot. Treat as frozen. */
  readonly state: TState;
  readonly highlight: Highlight;
  /** Kind-specific payload for visualisers that need exact operands. */
  readonly data?: TData;
  /** 0-based line in `pseudocode` that is executing. */
  readonly pseudocodeLine: number | null;
  /** 0-based line in the active language's source that is executing. */
  readonly codeLine: number | null;
  readonly metrics: MetricsSnapshot;
  /** Recursion depth at this step (mirrors `metrics.depth`, kept for clarity). */
  readonly depth: number;
  /**
   * Relative duration at 1× speed. 1 = normal beat, 0.25 = very quick
   * (e.g. an inner-loop read), 3 = a dramatic beat (rotation, partition).
   */
  readonly weight: number;
}

/** Big-O descriptor rendered as a badge with best/average/worst tabs. */
export interface Complexity {
  readonly time: { readonly best: string; readonly average: string; readonly worst: string };
  readonly space: string;
  /** True when equal keys keep their original relative order. */
  readonly stable?: boolean;
  /** In-place / out-of-place / streaming etc. */
  readonly kind?: string;
  /** Free-form notes shown in the complexity tab. */
  readonly notes?: readonly string[];
}

/** Result summary shown when playback reaches the last step. */
export interface TraceResult {
  readonly headline: string;
  readonly detail?: string;
  /** Machine-readable output (sorted array, shortest path, …) for tests. */
  readonly output?: unknown;
}

/**
 * The complete recording handed to the UI.
 *
 * @template TState Shape of a single snapshot.
 * @template TData  Action payload union produced by this algorithm.
 */
export interface Trace<TState = unknown, TData = unknown> {
  readonly id: string;
  readonly algorithmId: string;
  readonly name: string;
  /** Which category route this trace belongs to (mirrors AlgorithmMeta). */
  readonly category: string;
  readonly input: unknown;
  readonly steps: readonly TraceStep<TState, TData>[];
  readonly result: TraceResult;
  readonly complexity: Complexity;
  readonly pseudocode: readonly string[];
  readonly code: Partial<Record<Language, readonly string[]>>;
  /**
   * Per-language line lookup: `codeMap[language][javascriptLine]` → that
   * language's equivalent line. Built by `code()` (see utils/codeAlign.ts) so
   * one `codeLine` index drives the sync highlight in all four languages.
   */
  readonly codeMap?: Partial<Record<Language, readonly number[]>>;
  /** Wall-clock cost of generating the trace, shown in the metrics strip. */
  readonly generatedInMs: number;
  /**
   * Low-level steps the builder dropped to stay under its step budget. Metrics
   * remain exact; only playback granularity is sampled. Shown in the UI so the
   * trade-off is visible rather than silent.
   */
  readonly elidedSteps?: number;
}

/** Trace with its type parameters erased — what the playback store holds. */
export type AnyTrace = Trace<unknown, unknown>;
export type AnyStep = TraceStep<unknown, unknown>;
