import type { AlgorithmInput, DataSetKind } from '@/types';
import { createRng, randInt, shuffle } from './math';

/**
 * Dataset factories for the input bar. All seeded, so "Random" is reproducible
 * — which is what makes shareable URLs and regression tests possible.
 */

export interface DatasetOptions {
  readonly kind: DataSetKind;
  readonly size: number;
  readonly seed: number;
  /** Upper bound of generated values (defaults to `size`). */
  readonly max?: number;
}

export function buildArrayDataset({ kind, size, seed, max }: DatasetOptions): number[] {
  const n = Math.max(2, Math.trunc(size));
  const top = max ?? Math.max(2, n);
  const rng = createRng(seed);

  switch (kind) {
    case 'random': {
      return Array.from({ length: n }, () => randInt(rng, 1, top));
    }
    case 'sorted': {
      const step = top / n;
      return Array.from({ length: n }, (_, i) => Math.max(1, Math.round(step * (i + 1))));
    }
    case 'reversed': {
      const step = top / n;
      return Array.from({ length: n }, (_, i) => Math.max(1, Math.round(step * (n - i))));
    }
    case 'nearly-sorted': {
      const base = buildArrayDataset({ kind: 'sorted', size: n, seed, max: top });
      const swaps = Math.max(1, Math.round(n * 0.08));
      for (let s = 0; s < swaps; s += 1) {
        const i = randInt(rng, 0, n - 1);
        const j = Math.min(n - 1, Math.max(0, i + randInt(rng, -3, 3)));
        const a = base[i] as number;
        base[i] = base[j] as number;
        base[j] = a;
      }
      return base;
    }
    case 'custom':
    case 'imported': {
      // Callers supply values; this is the safety net.
      return buildArrayDataset({ kind: 'random', size: n, seed, max: top });
    }
    default: {
      return buildArrayDataset({ kind: 'random', size: n, seed, max: top });
    }
  }
}

/** `{ kind: 'array', values, target }` with the target always present somewhere. */
export function buildSearchInput(options: DatasetOptions): AlgorithmInput {
  const values = buildArrayDataset({ ...options, kind: options.kind === 'custom' ? 'sorted' : options.kind });
  const sorted = options.kind === 'random' ? values.slice() : values;
  const rng = createRng(options.seed + 7);
  const sortedValues = sorted.slice().sort((a, b) => a - b);
  const pick = options.kind === 'sorted' || options.kind === 'nearly-sorted' || options.kind === 'reversed';
  const target = pick
    ? (sortedValues[randInt(rng, 0, sortedValues.length - 1)] as number)
    : randInt(rng, 1, Math.max(2, options.max ?? options.size));
  return { kind: 'array', values: sortedValues, target };
}

/**
 * A small, readable default graph (6 nodes / 8 edges) used by every graph
 * algorithm until the user draws their own in Phase 5.
 */
export function buildDefaultGraph(): AlgorithmInput {
  return {
    kind: 'graph',
    directed: false,
    weighted: true,
    start: 'A',
    end: 'F',
    nodes: [
      { id: 'A', x: 0.1, y: 0.5 },
      { id: 'B', x: 0.3, y: 0.18 },
      { id: 'C', x: 0.34, y: 0.82 },
      { id: 'D', x: 0.6, y: 0.32 },
      { id: 'E', x: 0.62, y: 0.78 },
      { id: 'F', x: 0.88, y: 0.5 },
    ],
    edges: [
      { from: 'A', to: 'B', weight: 4 },
      { from: 'A', to: 'C', weight: 3 },
      { from: 'B', to: 'D', weight: 2 },
      { from: 'B', to: 'C', weight: 1 },
      { from: 'C', to: 'E', weight: 6 },
      { from: 'D', to: 'E', weight: 2 },
      { from: 'D', to: 'F', weight: 8 },
      { from: 'E', to: 'F', weight: 3 },
    ],
  };
}

/** Guarantees a fresh, well-formed array input for any algorithm. */
export function defaultArrayInput(size = 16, seed = 1): AlgorithmInput {
  return { kind: 'array', values: shuffle(buildArrayDataset({ kind: 'random', size, seed }), createRng(seed)) };
}
