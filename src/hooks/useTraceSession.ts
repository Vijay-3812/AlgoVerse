import { useEffect, useMemo } from 'react';
import type { AlgorithmInput, AnyAlgorithmModule, AnyTrace, DataSetKind } from '@/types';
import { useAlgorithmModule } from './useAlgorithmModule';
import { usePlaybackStore } from '@/store/playbackStore';

/**
 * Stable, order-insensitive fingerprint of an input.
 * Two runs with the same fingerprint share a `runId`, which is what makes the
 * URL shareable and keeps the cursor stable across re-renders.
 */
export function inputFingerprint(input: AlgorithmInput): string {
  switch (input.kind) {
    case 'array':
      return `a:${input.values.join(',')}${input.target === undefined ? '' : `:t${input.target}`}`;
    case 'graph':
      return `g:${input.nodes.map((n) => n.id).join(',')}|${input.edges
        .map((e) => `${e.from}>${e.to}${e.weight === undefined ? '' : `w${e.weight}`}`)
        .join(',')}|${input.directed ? 'd' : 'u'}${input.start ?? ''}${input.end ?? ''}`;
    case 'tree':
      return `t:${input.values.join(',')}`;
    case 'string':
      return `s:${input.text}|${input.pattern ?? ''}`;
    case 'number':
      return `n:${input.value}`;
    case 'matrix':
      return `m:${input.grid.map((row) => row.join(',')).join(';')}`;
    case 'grid':
      return `x:${input.width}x${input.height}`;
    default:
      return 'unknown';
  }
}

export interface TraceSession {
  /** The loaded module (definition + visualiser) once the chunk has arrived. */
  readonly module: AnyAlgorithmModule | null;
  readonly trace: AnyTrace | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly error: string | null;
  readonly runId: string;
  /** Re-runs the generator (same input) — used by "Replay". */
  readonly rerun: () => void;
  readonly generationMs: number;
}

/**
 * Owns the lifecycle of one trace: load module → generate → hand to the
 * playback store. Generation happens in a `useMemo` (pure, synchronously cheap
 * for every algorithm in the catalogue) and the store is updated in an effect
 * so React never sees a store write during render.
 */
export function useTraceSession(
  algorithmId: string,
  /**
   * The input to replay, or `null` for "whatever this algorithm ships".
   *
   * `null` is not a missing value: graph, string and DP generators each carry a
   * `defaultInput()` chosen to show off their own idea (a lattice for Dijkstra,
   * a DAG for the topological sorts), and no single shared input can do that.
   * It is resolved once per module, so the fingerprint stays stable.
   */
  input: AlgorithmInput | null,
  options: { dataSet?: DataSetKind; seed?: number; autoplay?: boolean } = {},
): TraceSession {
  const { module, status, error } = useAlgorithmModule(algorithmId);
  const loadTrace = usePlaybackStore((s) => s.loadTrace);

  const resolvedInput = useMemo<AlgorithmInput | null>(
    () => input ?? module?.definition.defaultInput() ?? null,
    [input, module],
  );

  const fingerprint = resolvedInput ? inputFingerprint(resolvedInput) : 'pending';
  const runId = `${algorithmId}#${fingerprint}`;

  const trace = useMemo<AnyTrace | null>(() => {
    if (!module || !resolvedInput) return null;
    try {
      return module.definition.generate(resolvedInput, {
        runId,
        dataSet: options.dataSet ?? 'random',
        seed: options.seed ?? 1,
      });
    } catch (cause) {
      // A generator bug must never take the page down with it.
      console.error('[AlgoVerse] trace generation failed', cause);
      return null;
    }
  }, [module, input, runId, options.dataSet, options.seed]);

  const autoplay = options.autoplay ?? false;

  useEffect(() => {
    if (!trace) return;
    loadTrace(trace, { autoplay });
  }, [trace, loadTrace, autoplay]);

  return {
    module,
    trace,
    status,
    error,
    runId,
    generationMs: trace?.generatedInMs ?? 0,
    rerun: () => {
      if (trace) loadTrace(trace, { autoplay: true });
    },
  };
}
