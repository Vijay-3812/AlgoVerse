import type { AlgorithmInput, Complexity, GraphEdgeInput, GraphNodeInput } from '@/types';

/* -------------------------------------------------------------------------- */
/*  Inputs                                                                    */
/* -------------------------------------------------------------------------- */
/**
 * All six graph inputs live here so the traces stay comparable: the same
 * lattice drives BFS, DFS, Dijkstra, A*, Prim, Kruskal, cycle detection and the
 * bipartite check, which means the *algorithm* is the only variable on screen.
 */

/** 4 × 3 lattice of twelve nodes, orthogonal edges, hand-picked weights. */
const LATTICE_NODES: readonly GraphNodeInput[] = [
  { id: 'A', x: 0.08, y: 0.12 },
  { id: 'B', x: 0.36, y: 0.12 },
  { id: 'C', x: 0.64, y: 0.12 },
  { id: 'D', x: 0.92, y: 0.12 },
  { id: 'E', x: 0.08, y: 0.5 },
  { id: 'F', x: 0.36, y: 0.5 },
  { id: 'G', x: 0.64, y: 0.5 },
  { id: 'H', x: 0.92, y: 0.5 },
  { id: 'I', x: 0.08, y: 0.88 },
  { id: 'J', x: 0.36, y: 0.88 },
  { id: 'K', x: 0.64, y: 0.88 },
  { id: 'L', x: 0.92, y: 0.88 },
];

const LATTICE_EDGES: readonly GraphEdgeInput[] = [
  // top rail
  { from: 'A', to: 'B', weight: 4 },
  { from: 'B', to: 'C', weight: 8 },
  { from: 'C', to: 'D', weight: 3 },
  // middle rail
  { from: 'E', to: 'F', weight: 2 },
  { from: 'F', to: 'G', weight: 6 },
  { from: 'G', to: 'H', weight: 7 },
  // bottom rail
  { from: 'I', to: 'J', weight: 5 },
  { from: 'J', to: 'K', weight: 1 },
  { from: 'K', to: 'L', weight: 9 },
  // rungs
  { from: 'A', to: 'E', weight: 5 },
  { from: 'E', to: 'I', weight: 3 },
  { from: 'B', to: 'F', weight: 3 },
  { from: 'F', to: 'J', weight: 4 },
  { from: 'C', to: 'G', weight: 2 },
  { from: 'G', to: 'K', weight: 8 },
  { from: 'D', to: 'H', weight: 2 },
  { from: 'H', to: 'L', weight: 6 },
];

/** The shared undirected, weighted default. */
export function GRAPH_DEFAULT_INPUT(): AlgorithmInput {
  return {
    kind: 'graph',
    nodes: LATTICE_NODES.map((node) => ({ ...node })),
    edges: LATTICE_EDGES.map((edge) => ({ ...edge })),
    directed: false,
    weighted: true,
    start: 'A',
    end: 'L',
  };
}

/** Same lattice, unweighted — for BFS/DFS where every edge costs the same. */
export function UNWEIGHTED_INPUT(): AlgorithmInput {
  return {
    ...GRAPH_DEFAULT_INPUT(),
    edges: LATTICE_EDGES.map(({ from, to }) => ({ from, to })),
    weighted: false,
  } as AlgorithmInput;
}

/** Layered DAG — the canonical input for both topological sorts. */
export function DAG_INPUT(): AlgorithmInput {
  return {
    kind: 'graph',
    nodes: [
      { id: 'A', x: 0.08, y: 0.5 },
      { id: 'B', x: 0.32, y: 0.16 },
      { id: 'C', x: 0.32, y: 0.84 },
      { id: 'D', x: 0.56, y: 0.28 },
      { id: 'E', x: 0.56, y: 0.78 },
      { id: 'F', x: 0.78, y: 0.5 },
      { id: 'G', x: 0.94, y: 0.5 },
    ],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
      { from: 'B', to: 'D' },
      { from: 'C', to: 'D' },
      { from: 'C', to: 'E' },
      { from: 'D', to: 'F' },
      { from: 'E', to: 'F' },
      { from: 'F', to: 'G' },
    ],
    directed: true,
    weighted: false,
    start: 'A',
    end: 'G',
  };
}

/**
 * Directed graph built to give Tarjan four components of three different
 * shapes: a 3-cycle, a second 3-cycle reachable from the first, and two
 * singleton sinks. An all-DAG input would make every component size 1 and the
 * visualisation pointless.
 */
export function SCC_INPUT(): AlgorithmInput {
  return {
    kind: 'graph',
    nodes: [
      { id: 'A', x: 0.08, y: 0.22 },
      { id: 'B', x: 0.28, y: 0.1 },
      { id: 'C', x: 0.24, y: 0.46 },
      { id: 'D', x: 0.5, y: 0.3 },
      { id: 'E', x: 0.7, y: 0.16 },
      { id: 'F', x: 0.68, y: 0.52 },
      { id: 'G', x: 0.9, y: 0.34 },
      { id: 'H', x: 0.86, y: 0.78 },
    ],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
      { from: 'C', to: 'D' },
      { from: 'D', to: 'E' },
      { from: 'E', to: 'F' },
      { from: 'F', to: 'D' },
      { from: 'G', to: 'H' },
      { from: 'H', to: 'D' },
    ],
    directed: true,
    weighted: false,
    start: 'A',
    end: 'H',
  };
}

/** Six-node directed graph with one negative edge — Bellman-Ford's reason to exist. */
export function NEGATIVE_INPUT(): AlgorithmInput {
  return {
    kind: 'graph',
    nodes: [
      { id: 'A', x: 0.1, y: 0.22 },
      { id: 'B', x: 0.34, y: 0.1 },
      { id: 'C', x: 0.34, y: 0.62 },
      { id: 'D', x: 0.6, y: 0.26 },
      { id: 'E', x: 0.6, y: 0.78 },
      { id: 'F', x: 0.88, y: 0.5 },
    ],
    edges: [
      { from: 'A', to: 'B', weight: 4 },
      { from: 'A', to: 'C', weight: 5 },
      { from: 'B', to: 'C', weight: -3 },
      { from: 'B', to: 'D', weight: 6 },
      { from: 'C', to: 'D', weight: 2 },
      { from: 'C', to: 'E', weight: 4 },
      { from: 'D', to: 'E', weight: 1 },
      { from: 'D', to: 'F', weight: 3 },
      { from: 'E', to: 'F', weight: 2 },
    ],
    directed: true,
    weighted: true,
    start: 'A',
    end: 'F',
  };
}

/**
 * Five-node directed graph from the classic all-pairs example — negative
 * edges, but no negative cycle, so Floyd–Warshall's matrix stays meaningful.
 */
export function ALL_PAIRS_INPUT(): AlgorithmInput {
  return {
    kind: 'graph',
    nodes: [
      { id: '1', x: 0.18, y: 0.16 },
      { id: '2', x: 0.72, y: 0.14 },
      { id: '3', x: 0.86, y: 0.5 },
      { id: '4', x: 0.5, y: 0.86 },
      { id: '5', x: 0.12, y: 0.58 },
    ],
    edges: [
      { from: '1', to: '2', weight: 3 },
      { from: '1', to: '3', weight: 8 },
      { from: '1', to: '5', weight: -4 },
      { from: '2', to: '4', weight: 1 },
      { from: '2', to: '5', weight: 7 },
      { from: '3', to: '2', weight: 4 },
      { from: '4', to: '1', weight: 2 },
      { from: '4', to: '3', weight: -5 },
      { from: '5', to: '4', weight: 6 },
    ],
    directed: true,
    weighted: true,
    start: '1',
    end: '3',
  };
}

/** A* needs a geometric graph: the lattice with coordinates is exactly that. */
export function ASTAR_INPUT(): AlgorithmInput {
  return GRAPH_DEFAULT_INPUT();
}

/* -------------------------------------------------------------------------- */
/*  Complexity                                                                */
/* -------------------------------------------------------------------------- */

export const COMPLEXITY: Record<string, Complexity> = {
  bfs: {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V) queue + O(V) visited',
    kind: 'level-order traversal',
    notes: [
      'Every vertex is enqueued at most once, every edge inspected at most twice — the bound is exact, not worst-case.',
      'The first time BFS reaches a node, it is by a shortest path in edge count. That is the whole proof.',
    ],
  },
  dfs: {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V) recursion (or an explicit stack)',
    kind: 'depth-first traversal',
    notes: [
      'Entry and exit times turn DFS into a toolkit: back edges find cycles, finish order gives topological order.',
      'Recursion depth equals the longest simple path explored, which is why deep graphs prefer an explicit stack.',
    ],
  },
  dijkstra: {
    time: { best: 'O((V + E) log V)', average: 'O((V + E) log V)', worst: 'O(V²) with a linear scan' },
    space: 'O(V)',
    kind: 'greedy single source',
    notes: [
      'Correct because edge weights are non-negative: once a node is extracted it can never be improved.',
      'A binary heap does the extraction in log V; a Fibonacci heap gets the whole run to O(E + V log V).',
    ],
  },
  'bellman-ford': {
    time: { best: 'O(E)', average: 'O(V·E)', worst: 'O(V·E)' },
    space: 'O(V)',
    kind: 'dynamic programming over edges',
    notes: [
      'Round k guarantees shortest paths that use at most k edges — so V − 1 rounds are enough.',
      'One extra round that still relaxes an edge proves a reachable negative cycle.',
    ],
  },
  'floyd-warshall': {
    time: { best: 'O(V³)', average: 'O(V³)', worst: 'O(V³)' },
    space: 'O(V²)',
    kind: 'all-pairs dynamic programming',
    notes: [
      'The recurrence is D⁽ᵏ⁾[i][j] = min(D⁽ᵏ⁻¹⁾[i][j], D⁽ᵏ⁻¹⁾[i][k] + D⁽ᵏ⁻¹⁾[k][j]) — three loops, no cleverness.',
      'The in-place version works because row k and column k are never invalidated mid-round.',
    ],
  },
  'a-star': {
    time: { best: 'O(E log V)', average: 'O(E log V)', worst: 'O(V²) with a weak heuristic' },
    space: 'O(V)',
    kind: 'informed search',
    notes: [
      'With an admissible (never over-estimating) heuristic A* finds the optimal path; with a consistent one it never re-expands a node.',
      'Dijkstra is A* with h ≡ 0 — the heuristic is the only difference, and it is worth a lot.',
    ],
  },
  prim: {
    time: { best: 'O(E + V log V)', average: 'O(E log V)', worst: 'O(V²) with a matrix' },
    space: 'O(V)',
    kind: 'greedy minimum spanning tree',
    notes: [
      'Grows a single tree, always adding the cheapest edge that leaves it — the cut property guarantees it is safe.',
      'Prim is dense-graph territory; Kruskal wins when the edge list is sparse and already sorted.',
    ],
  },
  kruskal: {
    time: { best: 'O(E log E)', average: 'O(E log E)', worst: 'O(E log E)' },
    space: 'O(V) for the DSU forest',
    kind: 'greedy minimum spanning tree + union-find',
    notes: [
      'Sorting the edges dominates; the DSU makes each cycle check run in near-constant amortised time (α(V)).',
      'The DSU’s two optimisations — union by size and path compression — are what turn O(V) find into O(α(V)).',
    ],
  },
  'topological-sort-kahn': {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V) for in-degrees + queue',
    kind: 'peeling in-degrees',
    notes: [
      'Nodes leave the queue only when every predecessor has left — so the order respects every edge.',
      'If the queue empties before all V nodes are emitted, a cycle ate the rest: Kahn finds cycles for free.',
    ],
  },
  'topological-sort-dfs': {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V)',
    kind: 'reverse finish order',
    notes: [
      'A node finishes only after its whole subtree, so pushing nodes onto the front as they finish yields a valid order.',
      'Reading the same DFS in finish order detects cycles: a back edge to a grey node is a cycle.',
    ],
  },
  'tarjan-scc': {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V)',
    kind: 'one-pass low-link',
    notes: [
      'One DFS, one index and low-link value per node — no second pass, no reversed graph (unlike Kosaraju).',
      'A node is the root of an SCC exactly when low-link == index; the stack slice above it is the component.',
    ],
  },
  'cycle-detection': {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V)',
    kind: 'DFS colouring (or union-find)',
    notes: [
      'Three colours: white unvisited, grey on the current path, black finished. A grey neighbour is a back edge → cycle.',
      'Undirected graphs need the parent check too — the edge you arrived on is not a cycle.',
    ],
  },
  'bipartite-check': {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V) for colours',
    kind: 'two-colouring',
    notes: [
      'A graph is bipartite exactly when it has no odd cycle — BFS colouring finds the clash if one exists.',
      'Every tree is bipartite, and so is every even cycle: no clash is ever possible there.',
    ],
  },
};
