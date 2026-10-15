import type { ModuleLoader } from '@/engine/registry';

/**
 * Sorting family loader table.
 *
 * Each entry is a dynamic import of exactly one algorithm file, so the browser
 * downloads `merge-sort`'s generator only when someone opens merge sort. Vite
 * hoists the shared `BarVisualizer` into its own chunk automatically, since all
 * eleven modules import it.
 */
export const SORTING_LOADERS: Readonly<Record<string, ModuleLoader>> = {
  'bubble-sort': () => import('./bubble').then((m) => m.module),
  'selection-sort': () => import('./selection').then((m) => m.module),
  'insertion-sort': () => import('./insertion').then((m) => m.module),
  'merge-sort': () => import('./merge').then((m) => m.module),
  'quick-sort': () => import('./quick').then((m) => m.module),
  'heap-sort': () => import('./heap').then((m) => m.module),
  'counting-sort': () => import('./counting').then((m) => m.module),
  'radix-sort': () => import('./radix').then((m) => m.module),
  'shell-sort': () => import('./shell').then((m) => m.module),
  'bucket-sort': () => import('./bucket').then((m) => m.module),
  'tim-sort': () => import('./tim').then((m) => m.module),
};
