import type { ModuleLoader } from '@/engine/registry';

/**
 * Graph family loader table.
 *
 * Thirteen traversals, shortest-path algorithms, spanning trees and structural
 * checks — each one its own dynamic import, so opening BFS does not ship
 * Tarjan's recursion.
 */
export const GRAPH_LOADERS: Readonly<Record<string, ModuleLoader>> = {
  bfs: () => import('./bfs').then((m) => m.module),
  dfs: () => import('./dfs').then((m) => m.module),
  dijkstra: () => import('./dijkstra').then((m) => m.module),
  'bellman-ford': () => import('./bellmanFord').then((m) => m.module),
  'floyd-warshall': () => import('./floydWarshall').then((m) => m.module),
  'a-star': () => import('./aStar').then((m) => m.module),
  prim: () => import('./prim').then((m) => m.module),
  kruskal: () => import('./kruskal').then((m) => m.module),
  'topological-sort-kahn': () => import('./topoKahn').then((m) => m.module),
  'topological-sort-dfs': () => import('./topoDfs').then((m) => m.module),
  'tarjan-scc': () => import('./tarjanScc').then((m) => m.module),
  'cycle-detection': () => import('./cycleDetection').then((m) => m.module),
  'bipartite-check': () => import('./bipartite').then((m) => m.module),
};
