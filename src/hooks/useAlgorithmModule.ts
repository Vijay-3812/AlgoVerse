import { useCallback, useEffect, useState } from 'react';
import type { AnyAlgorithmModule } from '@/types';
import { getLoadedModule, loadAlgorithmModule } from '@/engine/registry';
import { toast } from '@/store/toastStore';

export interface AlgorithmModuleState {
  readonly module: AnyAlgorithmModule | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly error: string | null;
  readonly retry: () => void;
}

/**
 * Dynamically imports an algorithm module (definition + visualiser) and caches
 * it in the registry. Because the module arrives asynchronously, the page can
 * render its skeleton immediately and animate the swap in.
 */
export function useAlgorithmModule(algorithmId: string): AlgorithmModuleState {
  const [module, setModule] = useState<AnyAlgorithmModule | null>(() => getLoadedModule(algorithmId) ?? null);
  const [status, setStatus] = useState<AlgorithmModuleState['status']>(() =>
    getLoadedModule(algorithmId) ? 'ready' : 'loading',
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const already = getLoadedModule(algorithmId);
    if (already) {
      setModule(already);
      setStatus('ready');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);
    loadAlgorithmModule(algorithmId)
      .then((loaded) => {
        if (cancelled) return;
        setModule(loaded);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const message = cause instanceof Error ? cause.message : 'Failed to load algorithm module';
        setError(message);
        setStatus('error');
        toast.error('Could not load algorithm', message);
      });

    return () => {
      cancelled = true;
    };
  }, [algorithmId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { module, status, error, retry };
}
