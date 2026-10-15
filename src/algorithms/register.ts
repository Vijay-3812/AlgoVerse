import type { AlgorithmMeta } from '@/types';
import { ALGORITHMS, ALGORITHM_BY_ID } from '@/engine/catalogue';
import { registerAlgorithm, isRegistered, type ModuleLoader } from '@/engine/registry';

/**
 * Registration table for the whole app.
 *
 * Phase 1 wires every catalogue entry to the roadmap placeholder so the shell
 * is exercisable end to end. Each later phase replaces its own entries with a
 * real module via `registerAlgorithm(meta, () => import('./sorting/bubble'))`.
 *
 * The imports are all dynamic: nothing here is in the initial bundle.
 */

function registerPlaceholders(): void {
  for (const meta of ALGORITHMS) {
    if (isRegistered(meta.id)) continue;
    registerAlgorithm(meta, async () => {
      const { createPlaceholderModule } = await import('./placeholder');
      const { defineModule } = await import('@/types');
      return defineModule(createPlaceholderModule(meta));
    });
  }
}

/**
 * Swaps the placeholder loaders for real modules, category by category.
 * Called before the placeholders so the real generator always wins.
 */
async function registerReal(): Promise<void> {
  const { ALGORITHMS } = await import('@/engine/catalogue');
  const { SORTING_LOADERS } = await import('./sorting');
  const { SEARCHING_LOADERS } = await import('./searching');
  const { LINEAR_LOADERS } = await import('./linear');
  const { TREE_LOADERS } = await import('./trees');
  const { GRAPH_LOADERS } = await import('./graphs');
  const { HASHING_LOADERS } = await import('./hashing');
  const { RECURSION_LOADERS } = await import('./recursion');
  const { DP_LOADERS } = await import('./dp');

  const tables: readonly Readonly<Record<string, ModuleLoader>>[] = [
    SORTING_LOADERS,
    SEARCHING_LOADERS,
    LINEAR_LOADERS,
    TREE_LOADERS,
    GRAPH_LOADERS,
    HASHING_LOADERS,
    RECURSION_LOADERS,
    DP_LOADERS,
  ];

  for (const table of tables) {
    for (const [id, load] of Object.entries(table)) {
      const meta = ALGORITHMS.find((a) => a.id === id);
      if (meta) registerAlgorithm({ ...meta, status: 'ready' }, load);
    }
  }
}

/** Called once from `main.tsx`, before the first render. Idempotent. */
export function registerBuiltins(): void {
  registerPlaceholders();
  // The real-module table is imported asynchronously (its entries are dynamic
  // imports of their own), so navigation during the first frames still gets a
  // working placeholder rather than a rejected promise.
  void registerReal();
}

/** Metadata lookup used by routes, breadcrumbs and the sidebar. */
export function metaFor(id: string): AlgorithmMeta | undefined {
  return ALGORITHM_BY_ID.get(id);
}
