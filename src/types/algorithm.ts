import type { ComponentType } from 'react';
import type { AnyStep, AnyTrace, Complexity, Language, Trace, TraceStep } from './trace';

/** Top-level navigation buckets. Order drives the sidebar. */
export type CategoryId =
  | 'sorting'
  | 'searching'
  | 'linear'
  | 'hashing'
  | 'trees'
  | 'graphs'
  | 'recursion'
  | 'dp'
  | 'greedy'
  | 'strings'
  | 'misc';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** `ready` = ships a trace; `soon` = visible in the catalogue, landing in a later phase. */
export type AlgorithmStatus = 'ready' | 'soon';

export interface CategoryMeta {
  readonly id: CategoryId;
  readonly name: string;
  /** Emoji-free: a key into the icon set so the UI stays consistent. */
  readonly icon: string;
  /** Tailwind-safe accent key resolved from tokens. */
  readonly accent: 'cyan' | 'violet' | 'pink' | 'lime' | 'amber';
  readonly blurb: string;
  /** Delivery phase that fills this category in. */
  readonly phase: number;
}

export interface AlgorithmMeta {
  readonly id: string;
  readonly name: string;
  readonly category: CategoryId;
  readonly difficulty: Difficulty;
  readonly status: AlgorithmStatus;
  /** Phase in which the trace generator + visualiser land. */
  readonly phase: number;
  /**
   * The input shape this algorithm consumes.
   *
   * Declared in the catalogue rather than discovered from the module because
   * the shell has to build the input *before* the algorithm's chunk arrives —
   * which controls the input bar shows, and whether the stage even has a
   * meaningful "randomise" button.
   */
  readonly inputKind: InputKind;
  readonly blurb: string;
  readonly tags: readonly string[];
  /** Extra search terms (aliases, acronyms) for the command palette + sidebar. */
  readonly aliases?: readonly string[];
}

/* -------------------------------------------------------------------------- */
/*  Inputs                                                                    */
/* -------------------------------------------------------------------------- */

export interface GraphNodeInput {
  readonly id: string;
  /** Optional authored position; layout engine fills the gaps. */
  readonly x?: number;
  readonly y?: number;
  readonly label?: string;
}

export interface GraphEdgeInput {
  readonly from: string;
  readonly to: string;
  readonly weight?: number;
}

/** Discriminated union: every algorithm declares which shape it consumes. */
export type AlgorithmInput =
  | { readonly kind: 'array'; readonly values: readonly number[]; readonly target?: number }
  | {
      readonly kind: 'graph';
      readonly nodes: readonly GraphNodeInput[];
      readonly edges: readonly GraphEdgeInput[];
      readonly directed: boolean;
      readonly weighted: boolean;
      readonly start?: string;
      readonly end?: string;
    }
  | { readonly kind: 'tree'; readonly values: readonly number[] }
  | { readonly kind: 'string'; readonly text: string; readonly pattern?: string }
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'matrix'; readonly grid: readonly (readonly number[])[] }
  | { readonly kind: 'grid'; readonly width: number; readonly height: number };

export type InputKind = AlgorithmInput['kind'];

/** How an input was produced — drives the "Random / Sorted / Custom" chips. */
export type DataSetKind = 'random' | 'sorted' | 'reversed' | 'nearly-sorted' | 'custom' | 'imported';

/* -------------------------------------------------------------------------- */
/*  Learn Mode content                                                        */
/* -------------------------------------------------------------------------- */

export interface QuizQuestion {
  readonly question: string;
  readonly options: readonly string[];
  /** Index into `options`. */
  readonly answer: number;
  readonly why: string;
}

export interface PracticeLink {
  readonly title: string;
  readonly url: string;
  readonly difficulty?: Difficulty;
}

/**
 * Learn Mode payload. `useCases` is required (it is the "why would I care"
 * answer); quizzes and practice links are optional and are also partly
 * generated from real complexity/tag data in Phase 8, so no algorithm ships
 * with an empty Learn tab.
 */
export interface LearnContent {
  readonly intro?: readonly string[];
  readonly useCases: readonly string[];
  readonly quiz?: readonly QuizQuestion[];
  readonly practice?: readonly PracticeLink[];
}

/* -------------------------------------------------------------------------- */
/*  Algorithm modules                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Provenance for a generated trace. `runId` changes when the input, the
 * dataset preset or the algorithm changes — the playback store resets on it,
 * and it is what a shareable URL encodes.
 */
export interface TraceRunInfo {
  readonly runId: string;
  readonly dataSet: DataSetKind;
  readonly seed: number;
}

/**
 * What every algorithm ships: pure metadata + a pure `generate`.
 *
 * @template TState Snapshot shape produced by this algorithm.
 * @template TData  Action payload union produced by this algorithm.
 */
export interface AlgorithmDefinition<TState = unknown, TData = unknown> {
  readonly meta: AlgorithmMeta;
  readonly complexity: Complexity;
  /** Pseudocode, one entry per line. `pseudocodeLine` indexes into this. */
  readonly pseudocode: readonly string[];
  /** Reference implementations, one entry per line, for the synced code panel. */
  readonly code: Partial<Record<Language, readonly string[]>>;
  /** Plain-English intro for the Explanation tab (Learn Mode, Phase 8). */
  readonly explanation: readonly string[];
  /** Use cases, quiz and practice links for the Learn tab. */
  readonly learn?: LearnContent;
  readonly defaultInput: () => AlgorithmInput;
  /** PURE. Same input + seed ⇒ identical trace. */
  readonly generate: (input: AlgorithmInput, run: TraceRunInfo) => Trace<TState, TData>;
}

/** Props handed to the renderer half of a module. */
export interface VisualizerProps<TState = unknown, TData = unknown> {
  readonly trace: Trace<TState, TData>;
  readonly step: TraceStep<TState, TData>;
  readonly index: number;
  readonly total: number;
  /** 0..1 progress through the whole trace, for ambient effects. */
  readonly progress: number;
  /** Playback speed — visualisers may shorten effects at high speed. */
  readonly speed: number;
  /** Emit a short-lived burst (completion confetti, ripple, …). */
  readonly celebrate: (message?: string) => void;
}

/**
 * A loadable algorithm = definition + renderer. `loadRegistry()` dynamic-imports
 * these so each category is its own chunk (code-splitting bar: Lighthouse 90+).
 */
export interface AlgorithmModule<TState = unknown, TData = unknown> {
  readonly definition: AlgorithmDefinition<TState, TData>;
  readonly Visualizer: ComponentType<VisualizerProps<TState, TData>>;
}

/** Type-erased module as stored in the registry. */
export type AnyAlgorithmModule = AlgorithmModule<unknown, unknown>;
export type AnyDefinition = AlgorithmDefinition<unknown, unknown>;

/**
 * The single documented escape hatch in the codebase.
 *
 * Generics are erased exactly once, at registration, because the registry must
 * hold heterogeneous modules in one map. The pairing is preserved at runtime:
 * a module's own Visualizer only ever receives traces its own `generate`
 * produced, so the erased types are re-attached safely in
 * `<VisualizerFrame />` via `isStepOf`.
 */
export function defineModule<TState, TData>(
  module: AlgorithmModule<TState, TData>,
): AnyAlgorithmModule {
  return module as unknown as AnyAlgorithmModule;
}

export type { AnyStep, AnyTrace };
