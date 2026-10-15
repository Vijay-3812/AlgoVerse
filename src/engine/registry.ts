import type { AlgorithmMeta, AnyAlgorithmModule } from '@/types';

/**
 * ---------------------------------------------------------------------------
 *  MODULE REGISTRY
 * ---------------------------------------------------------------------------
 *  Algorithms are pulled in with dynamic `import()`, never statically, so each
 *  category becomes its own chunk (the Lighthouse 90+ budget depends on this).
 *  A registry entry is just metadata + a loader; the loader's module is cached
 *  after first load, so re-visiting an algorithm is instant.
 */

export type ModuleLoader = () => Promise<AnyAlgorithmModule>;

export interface RegistryEntry {
  readonly meta: AlgorithmMeta;
  readonly load: ModuleLoader;
}

const loaders = new Map<string, ModuleLoader>();
const cache = new Map<string, AnyAlgorithmModule>();
const inflight = new Map<string, Promise<AnyAlgorithmModule>>();

/** Idempotent: re-registering an id replaces the loader (used by lazy phases). */
export function registerAlgorithm(meta: AlgorithmMeta, load: ModuleLoader): void {
  if (loaders.has(meta.id)) {
    // Re-registration is legal (a phase upgrading a placeholder), but must reset caches.
    cache.delete(meta.id);
    inflight.delete(meta.id);
  }
  loaders.set(meta.id, load);
}

export function registerAlgorithms(entries: readonly { meta: AlgorithmMeta; load: ModuleLoader }[]): void {
  for (const entry of entries) registerAlgorithm(entry.meta, entry.load);
}

export function isRegistered(id: string): boolean {
  return loaders.has(id);
}

export function registeredIds(): string[] {
  return [...loaders.keys()];
}

/** Synchronous peek at an already-loaded module (visualisers need this). */
export function getLoadedModule(id: string): AnyAlgorithmModule | undefined {
  return cache.get(id);
}

/**
 * Loads (and caches) a module. Concurrent callers share one network request.
 * @throws if the id was never registered — a programming error worth surfacing.
 */
export async function loadAlgorithmModule(id: string): Promise<AnyAlgorithmModule> {
  const cached = cache.get(id);
  if (cached) return cached;

  const existing = inflight.get(id);
  if (existing) return existing;

  const loader = loaders.get(id);
  if (!loader) throw new Error(`[AlgoVerse] no module registered for "${id}"`);

  const promise = loader()
    .then((module) => {
      cache.set(id, module);
      inflight.delete(id);
      return module;
    })
    .catch((error: unknown) => {
      inflight.delete(id);
      throw error;
    });

  inflight.set(id, promise);
  return promise;
}

/** Prefetch on hover/focus — makes "click → animate" feel instantaneous. */
export function prefetchAlgorithm(id: string): void {
  if (cache.has(id) || inflight.has(id) || !loaders.has(id)) return;
  void loadAlgorithmModule(id).catch(() => {
    /* prefetch failures are silent; the real navigation reports them */
  });
}

/** Test helper. */
export function _resetRegistry(): void {
  loaders.clear();
  cache.clear();
  inflight.clear();
}
