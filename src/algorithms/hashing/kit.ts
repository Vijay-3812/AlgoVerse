import type {
  AlgorithmInput,
  Complexity,
  HashBucketSnapshot,
  HashEntrySnapshot,
  HashSnapshot,
  LearnContent,
  Trace,
  TraceResult,
  TraceRunInfo,
  VisualRole,
} from '@/types';
import { defineModule, type AlgorithmDefinition } from '@/types';
import { defineAlgorithm, type AlgorithmSpec } from '@/algorithms/kit';
import { HashVisualizer } from '@/visualizers/HashVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { finish } from '@/algorithms/kit';
import type { CodeSamples } from '@/algorithms/kit';

/**
 * ---------------------------------------------------------------------------
 *  HASH TABLE MODEL
 * ---------------------------------------------------------------------------
 *  A table of buckets plus the probe strategies that decide where a key lands.
 *  All four open-addressing variants and chaining share this model because they
 *  differ in exactly one place — the function that yields the next candidate
 *  slot — which is why the visualiser can treat them identically and the
 *  narration can be specific.
 *
 *  Every mutation happens through `insert`/`lookup`/`remove`, and every emitted
 *  step asks the model for a fresh snapshot, so the trace never aliases live
 *  state.
 */

export type ProbeKind = HashSnapshot['probeKind'];

/** Action payload every hashing step carries. */
export interface HashData {
  readonly op: string;
  readonly key?: string;
}

export interface HashEntry {
  key: string;
  value: string;
  role?: VisualRole;
  probe?: number;
}

export interface HashOptions {
  readonly buckets: number;
  readonly probe: ProbeKind;
  /** Hash function seed — a different seed is a different table, same algorithm. */
  readonly seed?: number;
  /** Load factor at which `insert` reports that a rehash is due. */
  readonly loadFactorLimit?: number;
}

/** Polynomial rolling hash over char codes. Deterministic and dependency-free. */
export function hashKey(key: string, buckets: number, seed = 7): number {
  let hash = seed;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100003;
  }
  return hash % buckets;
}

/** The second hash used by double hashing. Must never return 0 for the table to progress. */
export function hashKey2(key: string, buckets: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 131 + key.charCodeAt(i)) % 100003;
  return 1 + (hash % Math.max(1, buckets - 1));
}

export class HashModel {
  readonly entries: (HashEntry | null)[];
  /** Chaining keeps a chain per bucket; open addressing keeps one entry per slot. */
  readonly chains: HashEntry[][];
  readonly probe: ProbeKind;
  private readonly seed: number;

  constructor(options: HashOptions) {
    this.probe = options.probe;
    this.seed = options.seed ?? 7;
    this.entries = new Array<HashEntry | null>(options.buckets).fill(null);
    this.chains = Array.from({ length: options.buckets }, () => []);
  }

  get size(): number {
    return this.probe === 'chaining'
      ? this.chains.reduce((sum, chain) => sum + chain.length, 0)
      : this.entries.filter(Boolean).length;
  }

  get buckets(): number {
    return this.probe === 'chaining' ? this.chains.length : this.entries.length;
  }

  get loadFactor(): number {
    return this.size / Math.max(1, this.buckets);
  }

  /** Where a key *would* start: the hash, before any probing. */
  home(key: string): number {
    return hashKey(key, this.buckets, this.seed);
  }

  /**
   * The probe sequence for a key, as slot indices.
   *
   * Returned lazily-ish as a plain array (bounded by the table size) so the
   * generator can narrate each hop without allocating per step.
   */
  probeSequence(key: string, limit = this.buckets): number[] {
    const start = this.home(key);
    const buckets = this.buckets;
    const sequence: number[] = [];
    const stride = this.probe === 'double' ? hashKey2(key, buckets) : 1;

    for (let i = 0; i < limit; i += 1) {
      const index =
        this.probe === 'linear'
          ? (start + i) % buckets
          : this.probe === 'quadratic'
            ? (start + i * i) % buckets
            : this.probe === 'double'
              ? (start + i * stride) % buckets
              : start;
      sequence.push(index);
      if (this.probe === 'chaining') break;
    }
    return sequence;
  }

  clearRoles(): void {
    for (const entry of this.entries) if (entry) delete entry.role;
    for (const chain of this.chains) for (const entry of chain) delete entry.role;
  }

  at(index: number): HashEntry | undefined {
    return this.probe === 'chaining' ? this.chains[index]?.[0] : (this.entries[index] ?? undefined);
  }

  snapshot(extra: Omit<HashSnapshot, 'buckets' | 'probeKind' | 'loadFactor'> = {}): HashSnapshot {
    const buckets: HashBucketSnapshot[] = Array.from({ length: this.buckets }, (_, index) => {
      const entries: HashEntrySnapshot[] =
        this.probe === 'chaining'
          ? (this.chains[index] ?? []).map((entry) => ({
              key: entry.key,
              value: entry.value,
              ...(entry.role ? { role: entry.role } : {}),
              ...(entry.probe !== undefined ? { probe: entry.probe } : {}),
            }))
          : (() => {
              const entry = this.entries[index];
              return entry
                ? [
                    {
                      key: entry.key,
                      value: entry.value,
                      ...(entry.role ? { role: entry.role } : {}),
                      ...(entry.probe !== undefined ? { probe: entry.probe } : {}),
                    },
                  ]
                : [];
            })();

      return { index, entries };
    });

    return { buckets, probeKind: this.probe, loadFactor: this.loadFactor, ...extra };
  }
}

/* -------------------------------------------------------------------------- */
/*  Scripted runs                                                             */
/* -------------------------------------------------------------------------- */

export interface HashOperation {
  readonly op: 'insert' | 'lookup' | 'remove';
  readonly key: string;
  readonly value?: string;
}

export interface HashScript {
  readonly options: HashOptions;
  readonly operations: readonly HashOperation[];
}

/**
 * Runs a script of table operations and records one step per meaningful beat:
 * hash, each probe hop, placement, hit, miss, and the rehash itself.
 *
 * The narration is generated here rather than in the visualiser because it
 * depends on the probe strategy — `linear probing: bucket 3 is taken, step to
 * 4` is only true for one of the four variants.
 */
export function runHashing(
  spec: HashingFullSpec,
  input: AlgorithmInput,
  run: TraceRunInfo,
): Trace<HashSnapshot, HashData> {
  const script = spec.script(input);
  const model = new HashModel(script.options);
  const builder = new TraceBuilder<HashSnapshot, HashData>(() => model.snapshot());

  /**
   * Clamp narration line numbers.
   *
   * A strategy whose pseudocode block is shorter than the narration would index
   * out of range, and the trace contract (rightly) rejects that — but the fix
   * belongs here rather than in five pseudocode blocks that must each remember
   * how many trailing notes the runner appends.
   */
  const line = (value: number): number => Math.max(0, Math.min(value, spec.pseudocode.length - 1));
  const jsLines = spec.code.lines.javascript.length;
  const codeAt = (value: number): number => Math.max(0, Math.min(value, jsLines - 1));

  builder.emit({
    kind: 'init',
    description: `Empty table: ${model.buckets} buckets, ${PROBE_NAME[script.options.probe]}.`,
    pseudocodeLine: 0,
    codeLine: 0,
    weight: 1.6,
    data: { op: 'init' },
  });

  const probeLine = Math.min(PROBE_LINE[script.options.probe], spec.pseudocode.length - 1);
  const limit = script.options.loadFactorLimit ?? 0.75;
  let rehashes = 0;

  for (const operation of script.operations) {
    model.clearRoles();
    const start = model.home(operation.key);

    builder.emit({
      kind: 'info',
      description:
        operation.op === 'insert'
          ? `insert(“${operation.key}”) — h(${operation.key}) = ${start}.`
          : operation.op === 'lookup'
            ? `find(“${operation.key}”) — h(${operation.key}) = ${start}.`
            : `remove(“${operation.key}”) — h(${operation.key}) = ${start}.`,
      highlight: {},
      pseudocodeLine: codeAt(2),
      codeLine: codeAt(2),
      weight: 1.1,
      bump: 'reads',
      data: { op: 'hash', key: operation.key },
    });

    const sequence = model.probeSequence(operation.key);
    let placed = false;
    let found = false;

    for (let hop = 0; hop < sequence.length; hop += 1) {
      const index = sequence[hop] as number;
      const occupant = model.at(index);

      if (operation.op === 'insert' && script.options.probe === 'chaining') {
        // Chaining never probes: the bucket *is* the answer, occupied or not.
        (model.chains[index] as HashEntry[]).push({
          key: operation.key,
          value: operation.value ?? operation.key.toUpperCase(),
          role: 'sorted',
          probe: hop,
        });
        builder.emit({
          kind: 'write',
          description: `Bucket ${index} — append to the chain (${(model.chains[index] as HashEntry[]).length} entr${(model.chains[index] as HashEntry[]).length === 1 ? 'y' : 'ies'}).`,
          highlight: {},
          pseudocodeLine: codeAt(probeLine),
          codeLine: codeAt(probeLine),
          weight: 1.3,
          bump: 'writes',
          data: { op: 'insert', key: operation.key },
        });
        placed = true;
        break;
      }

      if (!occupant || operation.op === 'insert') {
        if (occupant && occupant.key === operation.key) {
          builder.emit({
            kind: 'write',
            description: `Bucket ${index} already holds “${operation.key}” — update its value.`,
            pseudocodeLine: probeLine,
            codeLine: probeLine,
            weight: 1.2,
            bump: 'writes',
            data: { op: 'update', key: operation.key },
          });
          occupant.value = operation.value ?? operation.value ?? occupant.value;
          occupant.role = 'active';
          placed = true;
          break;
        }
      }

      builder.emit({
        kind: occupant ? 'collision' : 'probe',
        description: occupant
          ? `Bucket ${index} is taken by “${occupant.key}” — collision.`
          : `Bucket ${index} is free.`,
        highlight: {},
        pseudocodeLine: codeAt(probeLine),
        codeLine: codeAt(probeLine),
        weight: occupant ? 1 : 0.8,
        bump: ['comparisons', 'reads'],
        ...(occupant ? { data: { op: 'collision', key: operation.key } } : {}),
      });

      if (operation.op === 'lookup' || operation.op === 'remove') {
        if (occupant && occupant.key === operation.key) {
          occupant.role = operation.op === 'remove' ? 'danger' : 'success';
          found = true;
          if (operation.op === 'remove') {
            model.entries[index] = null;
            model.clearRoles();
          }
          builder.emit({
            kind: operation.op === 'lookup' ? 'found' : 'write',
            description:
              operation.op === 'lookup'
                ? `Found “${operation.key}” in bucket ${index} after ${hop + 1} probe${hop === 0 ? '' : 's'}.`
                : `Removed “${operation.key}” from bucket ${index}.`,
            highlight: {},
            pseudocodeLine: codeAt(probeLine + 1),
            codeLine: codeAt(probeLine + 1),
            weight: 1.6,
            bump: operation.op === 'remove' ? 'writes' : 'reads',
            data: { op: operation.op, key: operation.key },
          });
          break;
        }
        if (!occupant) break;
        continue;
      }

      if (!occupant) {
        const role: VisualRole = 'sorted';
        model.entries[index] = {
          key: operation.key,
          value: operation.value ?? operation.key.toUpperCase(),
          role,
          probe: hop,
        };
        placed = true;
        builder.emit({
          kind: 'write',
          description:
            hop === 0
              ? `Store “${operation.key}” in bucket ${index} — first try.`
              : `Store “${operation.key}” in bucket ${index} after ${hop} probe${hop === 1 ? '' : 's'}.`,
          highlight: {},
          pseudocodeLine: codeAt(probeLine),
          codeLine: codeAt(probeLine),
          weight: 1.4,
          bump: 'writes',
          data: { op: 'insert', key: operation.key },
        });
        break;
      }
    }

    if (operation.op === 'lookup' && !found) {
      builder.emit({
        kind: 'not-found',
        description: `“${operation.key}” is not in the table — the probe sequence ran out.`,
        pseudocodeLine: codeAt(probeLine + 1),
        codeLine: codeAt(probeLine + 1),
        weight: 1.6,
        data: { op: 'miss', key: operation.key },
      });
    }

    if (operation.op === 'insert' && !placed) {
      builder.emit({
        kind: 'info',
        description: `The table is full — “${operation.key}” cannot be placed without rehashing.`,
        pseudocodeLine: codeAt(probeLine),
        codeLine: codeAt(probeLine),
        weight: 1.8,
        data: { op: 'full', key: operation.key },
      });
    }

    if (operation.op === 'insert' && model.loadFactor > limit && script.options.probe !== 'chaining') {
      rehashes += 1;
      const before = model.buckets;
      const after = before * 2;
      const moved = model.size;
      builder.emit({
        kind: 'info',
        description: `Load factor ${model.loadFactor.toFixed(2)} > ${limit} — rehash to ${after} buckets.`,
        pseudocodeLine: codeAt(probeLine + 2),
        codeLine: codeAt(probeLine + 2),
        weight: 2.4,
        data: { op: 'rehash', key: operation.key },
      });

      // Rebuild in place: same model so the visualiser animates the growth.
      const previous = model.entries.filter((entry): entry is HashEntry => entry !== null);
      model.entries.length = after;
      model.entries.fill(null);
      for (const entry of previous) {
        delete entry.role;
        delete entry.probe;
        const slot = model.probeSequence(entry.key).find((index) => !model.entries[index]);
        if (slot !== undefined) model.entries[slot] = { ...entry, role: 'visited' as VisualRole };
      }

      builder.emit({
        kind: 'complete',
        description: `Rehashed ${moved} entries into ${after} buckets.`,
        pseudocodeLine: codeAt(probeLine + 3),
        codeLine: codeAt(probeLine + 3),
        weight: 2.6,
        bump: 'writes',
        data: { op: 'rehash-done', key: operation.key },
      });
    }
  }

  model.clearRoles();

  /**
   * A closing beat. Tables are structures rather than computations, so without
   * this the trace would end on whichever operation happened to run last — and
   * the playback store (and the trace contract) expect a terminal step.
   */
  builder.emit({
    kind: 'complete',
    description: `Table holds ${model.size} entries across ${model.buckets} buckets — load factor ${model.loadFactor.toFixed(2)}.`,
    pseudocodeLine: line(0),
    codeLine: codeAt(0),
    weight: 2,
    data: { op: 'done' },
  });

  const result: TraceResult = {
    headline: spec.headline,
    detail: `${model.size} entries · load factor ${model.loadFactor.toFixed(2)}${rehashes ? ` · ${rehashes} rehash` : ''}`,
    output: model.snapshot(),
  };

  return finish({ builder, spec, input, run, result });
}

const PROBE_NAME: Record<ProbeKind, string> = {
  chaining: 'separate chaining',
  linear: 'linear probing',
  quadratic: 'quadratic probing',
  double: 'double hashing',
};

/** The pseudocode line each strategy's inner loop sits on. */
const PROBE_LINE: Record<ProbeKind, number> = {
  chaining: 3,
  linear: 4,
  quadratic: 4,
  double: 5,
};

export interface HashingSpec {
  readonly id: string;
  readonly complexity: Complexity;
  readonly pseudocode: readonly string[];
  readonly code: CodeSamples;
  readonly explanation: readonly string[];
  readonly learn?: LearnContent;
  readonly headline: string;
  readonly defaultInput: () => AlgorithmInput;
  readonly script: (input: AlgorithmInput) => HashScript;
}

/** A hashing spec with the shared runner attached. */
export type HashingFullSpec = AlgorithmSpec<HashSnapshot, HashData> & Pick<HashingSpec, 'script' | 'headline'>;

/**
 * Assembles the full algorithm spec from the hashing-specific one.
 *
 * Every hashing algorithm shares one runner, so the `generate` field is filled
 * in here instead of being repeated (and mis-typed) in five files.
 */
export function defineHashing(spec: HashingSpec): AlgorithmDefinition<HashSnapshot, HashData> {
  const full: HashingFullSpec = {
    ...spec,
    generate: (input, run) => runHashing(full, input, run),
  };
  return defineAlgorithm(full);
}

/** The loadable module: definition + renderer, consumed by the registry. */
export function hashingModule(spec: HashingSpec) {
  return defineModule({ definition: defineHashing(spec), Visualizer: HashVisualizer });
}
