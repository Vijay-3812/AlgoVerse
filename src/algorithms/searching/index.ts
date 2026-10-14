import type { ModuleLoader } from '@/engine/registry';

/**
 * Searching family loader table.
 *
 * Same contract as the sorting table: one dynamic import per algorithm, so the
 * generator and its trace only ever download when someone opens that algorithm.
 */
export const SEARCHING_LOADERS: Readonly<Record<string, ModuleLoader>> = {
  'linear-search': () => import('./linear').then((m) => m.module),
  'binary-search': () => import('./binary').then((m) => m.module),
  'jump-search': () => import('./jump').then((m) => m.module),
  'interpolation-search': () => import('./interpolation').then((m) => m.module),
  'exponential-search': () => import('./exponential').then((m) => m.module),
  'ternary-search': () => import('./ternary').then((m) => m.module),
};
