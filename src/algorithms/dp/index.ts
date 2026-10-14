import type { ModuleLoader } from '@/engine/registry';

/**
 * Dynamic-programming family loader table.
 *
 * Every page here renders through `TableVisualizer`, so the whole category
 * shares one chunk of rendering code and one visual language: arrows for
 * dependencies, a highlighted path for the backtrack.
 */
export const DP_LOADERS: Readonly<Record<string, ModuleLoader>> = {
  'dp-fibonacci': () => import('./fibonacciTab').then((m) => m.module),
  'coin-change': () => import('./coinChange').then((m) => m.module),
  lis: () => import('./lis').then((m) => m.module),
  'knapsack-01': () => import('./knapsack01').then((m) => m.module),
  lcs: () => import('./lcs').then((m) => m.module),
  'edit-distance': () => import('./editDistance').then((m) => m.module),
  'matrix-chain-multiplication': () => import('./matrixChain').then((m) => m.module),
};
