import type {
  AlgorithmDefinition,
  AlgorithmInput,
  Complexity,
  Language,
  LearnContent,
  Trace,
  TraceResult,
  TraceRunInfo,
} from '@/types';
import { ALGORITHM_BY_ID } from '@/engine/catalogue';
import { buildCodeMap, type CodeMap } from '@/utils/codeAlign';
import { TraceBuilder } from '@/utils/traceBuilder';

/**
 * ---------------------------------------------------------------------------
 *  GENERATOR KIT
 * ---------------------------------------------------------------------------
 *  Everything a trace generator needs so that writing a new algorithm is about
 *  the algorithm, not about plumbing:
 *
 *   • typed input accessors (`valuesOf`, `graphOf`, `textOf`, …)
 *   • `code()` — four aligned language samples from one call each
 *   • `defineAlgorithm(spec)` — pulls `meta` from the catalogue by id, so a
 *     definition never repeats name/difficulty/category
 *   • `finish({…})` — closes a `TraceBuilder` into a `Trace`, filling the
 *     envelope from the same spec
 *   • `BarModel` — mutable working set + immutable snapshots
 *
 *  The intended shape of a generator module is:
 *
 *  ```ts
 *  const spec: AlgorithmSpec<ArraySnapshot, SwapData> = {
 *    id: 'bubble-sort',
 *    complexity: COMPLEXITY.bubble,
 *    pseudocode, code, explanation, learn,
 *    defaultInput: () => defaultArrayInput(),
 *    generate(input, run) {
 *      const model = new BarModel(valuesOf(input));
 *      const builder = new TraceBuilder(model.snapshot());
 *      // …record steps…
 *      return finish({ builder, spec, input, run, result: { headline: 'Sorted' } });
 *    },
 *  };
 *  export const definition = defineAlgorithm(spec);
 *  ```
 *
 *  `spec` referencing itself inside `generate` is safe: the closure resolves it
 *  when the generator runs, long after the const initialiser completed.
 */

/* -------------------------------------------------------------------------- */
/*  Input accessors                                                           */
/* -------------------------------------------------------------------------- */

export function valuesOf(input: AlgorithmInput): number[] {
  switch (input.kind) {
    case 'array':
      return [...input.values];
    case 'tree':
      return [...input.values];
    case 'number':
      return [input.value];
    default:
      return [];
  }
}

export function targetOf(input: AlgorithmInput): number | undefined {
  return input.kind === 'array' ? input.target : undefined;
}

export function textOf(input: AlgorithmInput): string {
  return input.kind === 'string' ? input.text : 'ALGOVERSE';
}

export function patternOf(input: AlgorithmInput): string {
  return input.kind === 'string' ? (input.pattern ?? 'VER') : 'VER';
}

export function matrixOf(input: AlgorithmInput): number[][] {
  return input.kind === 'matrix' ? input.grid.map((row) => [...row]) : [];
}

export function numberOf(input: AlgorithmInput, fallback = 12): number {
  return input.kind === 'number' ? input.value : fallback;
}

export function gridSizeOf(input: AlgorithmInput): { width: number; height: number } {
  return input.kind === 'grid' ? { width: input.width, height: input.height } : { width: 8, height: 8 };
}

export interface GraphInputView {
  readonly nodes: readonly { readonly id: string; readonly label?: string; readonly x?: number; readonly y?: number }[];
  readonly edges: readonly { readonly from: string; readonly to: string; readonly weight?: number }[];
  readonly directed: boolean;
  readonly weighted: boolean;
  readonly start: string;
  readonly end: string;
}

export function graphOf(input: AlgorithmInput): GraphInputView {
  if (input.kind !== 'graph') {
    return {
      nodes: [{ id: 'A' }, { id: 'B' }],
      edges: [{ from: 'A', to: 'B', weight: 1 }],
      directed: false,
      weighted: false,
      start: 'A',
      end: 'B',
    };
  }
  return {
    nodes: input.nodes,
    edges: input.edges,
    directed: input.directed,
    weighted: input.weighted,
    start: input.start ?? input.nodes[0]?.id ?? 'A',
    end: input.end ?? input.nodes[input.nodes.length - 1]?.id ?? 'B',
  };
}

/* -------------------------------------------------------------------------- */
/*  Four aligned language samples                                             */
/* -------------------------------------------------------------------------- */

const toLines = (source: string): string[] => {
  const lines = source.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  return lines.map((line) => (line.startsWith('#!') ? line.slice(2) : line));
};

/**
 * `code()` takes one template per language. Keeping the four implementations
 * line-aligned (comments in the same places, one statement per line) is what
 * lets a single `codeLine` index highlight the right line in *every* language —
 * the reason the language toggle needs no per-language translation table.
 */
export function code(js: string, py: string, cpp: string, java: string): CodeSamples {
  const lines: Record<Language, readonly string[]> = {
    javascript: toLines(js),
    python: toLines(py),
    cpp: toLines(cpp),
    java: toLines(java),
  };
  return { lines, map: buildCodeMap(lines) };
}

/** Code samples plus the derived cross-language line map. */
export interface CodeSamples {
  readonly lines: Record<Language, readonly string[]>;
  readonly map: CodeMap;
}

/** Pseudocode is just a line list; `pseudocodeLine` indexes into it. */
export const pseudo = toLines;

/* -------------------------------------------------------------------------- */
/*  BarModel — the working set behind an ArraySnapshot                        */
/* -------------------------------------------------------------------------- */

/**
 * A mutable working model plus an immutable-snapshot method.
 *
 * Generators mutate the model (swap, compare, write) and call `snapshot()`
 * whenever they emit a step; each snapshot copies the arrays, so history can
 * never be rewritten by a later mutation. Ids travel with the values, which is
 * what gives the bar renderer its FLIP identity.
 */
export class BarModel {
  values: number[];
  ids: string[];
  labels: string[] | undefined;

  constructor(values: readonly number[], options: { labels?: readonly string[]; prefix?: string } = {}) {
    this.values = [...values];
    this.ids = values.map((_, i) => `${options.prefix ?? 'e'}${i}`);
    this.labels = options.labels ? [...options.labels] : undefined;
  }

  get length(): number {
    return this.values.length;
  }

  at(i: number): number {
    return this.values[i] as number;
  }

  set(i: number, value: number, label?: string): void {
    this.values[i] = value;
    if (this.labels && label !== undefined) this.labels[i] = label;
  }

  swap(i: number, j: number): void {
    const vi = this.values[i] as number;
    const vj = this.values[j] as number;
    this.values[i] = vj;
    this.values[j] = vi;
    const ii = this.ids[i] as string;
    this.ids[i] = this.ids[j] as string;
    this.ids[j] = ii;
    if (this.labels) {
      const li = this.labels[i];
      this.labels[i] = this.labels[j] as string;
      this.labels[j] = li as string;
    }
  }

  /** Snapshot with extra decoration (pointers, window, aux rows, caption). */
  snapshot(extra: Omit<import('@/types').ArraySnapshot, 'values'> = {}): import('@/types').ArraySnapshot {
    return {
      values: [...this.values],
      ids: [...this.ids],
      ...(this.labels ? { labels: [...this.labels] } : {}),
      ...extra,
    };
  }
}

/** Helper for character-array snapshots (strings, KMP, Rabin–Karp, …). */
export function charModel(text: string): BarModel {
  const chars = [...text];
  return new BarModel(
    chars.map((c) => c.charCodeAt(0) - 64),
    { labels: chars, prefix: 'c' },
  );
}

/* -------------------------------------------------------------------------- */
/*  Definition + envelope                                                     */
/* -------------------------------------------------------------------------- */

export interface AlgorithmSpec<S, D> {
  readonly id: string;
  readonly complexity: Complexity;
  readonly pseudocode: readonly string[];
  readonly code: CodeSamples;
  readonly explanation: readonly string[];
  readonly learn?: LearnContent;
  readonly defaultInput: () => AlgorithmInput;
  readonly generate: (input: AlgorithmInput, run: TraceRunInfo) => Trace<S, D>;
}

/**
 * Fills in `meta` from the catalogue and marks the algorithm playable.
 * @throws at module-evaluation time if the id is not in the catalogue — a
 *         missing catalogue row is a build-time bug, not a runtime one.
 */
export function defineAlgorithm<S, D>(spec: AlgorithmSpec<S, D>): AlgorithmDefinition<S, D> {
  const meta = ALGORITHM_BY_ID.get(spec.id);
  if (!meta) throw new Error(`[AlgoVerse] "${spec.id}" is missing from the catalogue`);
  return {
    meta: { ...meta, status: 'ready' },
    complexity: spec.complexity,
    pseudocode: spec.pseudocode,
    code: spec.code.lines,
    explanation: spec.explanation,
    ...(spec.learn === undefined ? {} : { learn: spec.learn }),
    defaultInput: spec.defaultInput,
    generate: spec.generate,
  };
}

export interface FinishOptions<S, D> {
  readonly builder: TraceBuilder<S, D>;
  readonly spec: AlgorithmSpec<S, D>;
  readonly input: AlgorithmInput;
  readonly run: TraceRunInfo;
  readonly result: TraceResult;
  /** Assertion for tests; logs loudly when the generator is wrong. */
  readonly expectedState?: (state: S) => boolean;
}

/**
 * Closes a builder into a `Trace`, deriving id/name/category from the spec so
 * a generator can never disagree with the catalogue about what it is.
 */
export function finish<S, D>({
  builder,
  spec,
  input,
  run,
  result,
  expectedState,
}: FinishOptions<S, D>): Trace<S, D> {
  const meta = ALGORITHM_BY_ID.get(spec.id);
  return builder.build({
    id: `${spec.id}#${run.runId}`,
    algorithmId: spec.id,
    name: meta?.name ?? spec.id,
    category: meta?.category ?? 'misc',
    input,
    result,
    complexity: spec.complexity,
    pseudocode: spec.pseudocode,
    code: spec.code.lines,
    codeMap: spec.code.map,
    ...(expectedState === undefined ? {} : { expectedState }),
  });
}

/** Ascending-order assertion shared by every sorting generator's tests. */
export function isAscending(values: readonly number[]): boolean {
  for (let i = 1; i < values.length; i += 1) {
    if ((values[i - 1] as number) > (values[i] as number)) return false;
  }
  return true;
}
