import { useMemo } from 'react';
import { buildArrayDataset } from '@/utils/dataset';
import { useSessionStore } from '@/store/sessionStore';

/**
 * The dataset currently in play, derived from the session store.
 *
 * Why a hook instead of a selector: `buildArrayDataset` allocates a new array,
 * and a Zustand selector that returns a fresh reference on every call makes
 * `useSyncExternalStore` re-render forever. Subscribing to the four primitives
 * and memoising the derivation keeps the reference stable between changes —
 * which in turn keeps the trace `runId` (and therefore the playback cursor)
 * stable while nothing has actually changed.
 */
export function useArrayValues(): readonly number[] {
  const customValues = useSessionStore((s) => s.customValues);
  const datasetKind = useSessionStore((s) => s.datasetKind);
  const size = useSessionStore((s) => s.size);
  const seed = useSessionStore((s) => s.seed);

  return useMemo(() => {
    if (customValues && customValues.length >= 2) return customValues;
    const kind = datasetKind === 'custom' || datasetKind === 'imported' ? 'random' : datasetKind;
    return buildArrayDataset({ kind, size, seed });
  }, [customValues, datasetKind, seed, size]);
}
