import type { AlgorithmInput, GraphEdgeInput, GraphNodeInput } from '@/types';

/**
 * ---------------------------------------------------------------------------
 *  GRAPH PRESETS — the "choose your graph" row
 * ---------------------------------------------------------------------------
 *  The algorithms category needs a graph, and hand-authoring one through a text
 *  box is a terrible first experience. These presets are small, generated, and
 *  each one exists to make a specific family of algorithms look good:
 *
 *   • **Lattice** — planar, weighted, full of cycles. BFS/DFS ripples, Dijkstra
 *     relaxations, Prim/Kruskal competing, cycle detection succeeding.
 *   • **Ring** — one cycle, maximum clarity for bipartite checks and rotations.
 *   • **DAG** — layered and acyclic, for both topological sorts.
 *   • **Clusters** — two 3-cycles joined one-way, so Tarjan has real SCCs.
 *   • **Negative** — one negative edge; the reason Bellman-Ford exists.
 *   • **All pairs** — the five-node classic for Floyd–Warshall's matrix.
 *
 *  `'auto'` is not a preset: it means "let the algorithm's own `defaultInput()`
 *  choose", which is what a first-time visitor sees.
 */

export type GraphPresetId = 'auto' | 'lattice' | 'ring' | 'dag' | 'clusters' | 'negative' | 'pairs';

export interface GraphPreset {
  readonly id: GraphPresetId;
  readonly label: string;
  readonly hint: string;
  /** `null` for `'auto'` — the generator supplies its own input. */
  readonly build: (() => AlgorithmInput) | null;
}

const node = (id: string, x: number, y: number): GraphNodeInput => ({
  id,
  x: Number(x.toFixed(4)),
  y: Number(y.toFixed(4)),
});

const edge = (from: string, to: string, weight?: number): GraphEdgeInput =>
  weight === undefined ? { from, to } : { from, to, weight };

/** Simple deterministic PRNG so "Randomise" is reproducible from a seed. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

/** 4 × 3 weighted lattice — the workhorse preset. */
function lattice(): AlgorithmInput {
  const columns = 4;
  const rows = 3;
  const ids: string[][] = [];
  const nodes: GraphNodeInput[] = [];
  let letter = 0;
  for (let r = 0; r < rows; r += 1) {
    const row: string[] = [];
    for (let c = 0; c < columns; c += 1) {
      const id = String.fromCharCode(65 + letter);
      letter += 1;
      row.push(id);
      nodes.push(node(id, 0.08 + (c / (columns - 1)) * 0.84, 0.12 + (r / (rows - 1)) * 0.76));
    }
    ids.push(row);
  }

  const weights = [4, 8, 3, 2, 6, 7, 5, 1, 9, 5, 3, 2, 4, 6, 3, 4, 8, 2, 4, 6];
  const edges: GraphEdgeInput[] = [];
  let w = 0;
  const next = (): number => weights[(w += 1) % weights.length] as number;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const id = ids[r]?.[c] as string;
      if (c + 1 < columns) edges.push(edge(id, ids[r]?.[c + 1] as string, next()));
      if (r + 1 < rows) edges.push(edge(id, ids[r + 1]?.[c] as string, next()));
    }
  }

  return {
    kind: 'graph',
    nodes,
    edges,
    directed: false,
    weighted: true,
    start: ids[0]?.[0] as string,
    end: ids[rows - 1]?.[columns - 1] as string,
  };
}

/** One big cycle: the clearest possible bipartite / cycle example. */
function ring(): AlgorithmInput {
  const count = 8;
  const nodes: GraphNodeInput[] = [];
  const edges: GraphEdgeInput[] = [];
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = String.fromCharCode(65 + i);
    ids.push(id);
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    nodes.push(node(id, 0.5 + Math.cos(angle) * 0.38, 0.5 + Math.sin(angle) * 0.4));
  }
  ids.forEach((id, i) => edges.push(edge(id, ids[(i + 1) % count] as string, ((i * 5) % 9) + 1)));
  return { kind: 'graph', nodes, edges, directed: false, weighted: true, start: 'A', end: 'E' };
}

/** Layered acyclic digraph — both topological sorts, and DAG-shaped DP. */
function dag(): AlgorithmInput {
  return {
    kind: 'graph',
    nodes: [
      node('A', 0.08, 0.5),
      node('B', 0.32, 0.16),
      node('C', 0.32, 0.84),
      node('D', 0.56, 0.28),
      node('E', 0.56, 0.78),
      node('F', 0.78, 0.5),
      node('G', 0.94, 0.5),
    ],
    edges: [
      edge('A', 'B'),
      edge('A', 'C'),
      edge('B', 'D'),
      edge('C', 'D'),
      edge('C', 'E'),
      edge('D', 'F'),
      edge('E', 'F'),
      edge('F', 'G'),
    ],
    directed: true,
    weighted: false,
    start: 'A',
    end: 'G',
  };
}

/** Two 3-cycles joined one-way — Tarjan's showcase. */
function clusters(): AlgorithmInput {
  return {
    kind: 'graph',
    nodes: [
      node('A', 0.08, 0.22),
      node('B', 0.28, 0.1),
      node('C', 0.24, 0.46),
      node('D', 0.5, 0.3),
      node('E', 0.7, 0.16),
      node('F', 0.68, 0.52),
      node('G', 0.9, 0.34),
      node('H', 0.86, 0.78),
    ],
    edges: [
      edge('A', 'B'),
      edge('B', 'C'),
      edge('C', 'A'),
      edge('C', 'D'),
      edge('D', 'E'),
      edge('E', 'F'),
      edge('F', 'D'),
      edge('G', 'H'),
      edge('H', 'D'),
    ],
    directed: true,
    weighted: false,
    start: 'A',
    end: 'H',
  };
}

/** Directed, weighted, one negative edge. */
function negative(): AlgorithmInput {
  return {
    kind: 'graph',
    nodes: [
      node('A', 0.1, 0.22),
      node('B', 0.34, 0.1),
      node('C', 0.34, 0.62),
      node('D', 0.6, 0.26),
      node('E', 0.6, 0.78),
      node('F', 0.88, 0.5),
    ],
    edges: [
      edge('A', 'B', 4),
      edge('A', 'C', 5),
      edge('B', 'C', -3),
      edge('B', 'D', 6),
      edge('C', 'D', 2),
      edge('C', 'E', 4),
      edge('D', 'E', 1),
      edge('D', 'F', 3),
      edge('E', 'F', 2),
    ],
    directed: true,
    weighted: true,
    start: 'A',
    end: 'F',
  };
}

/** The classic five-node all-pairs example (negative edges, no negative cycle). */
function pairs(): AlgorithmInput {
  return {
    kind: 'graph',
    nodes: [
      node('1', 0.18, 0.16),
      node('2', 0.72, 0.14),
      node('3', 0.86, 0.5),
      node('4', 0.5, 0.86),
      node('5', 0.12, 0.58),
    ],
    edges: [
      edge('1', '2', 3),
      edge('1', '3', 8),
      edge('1', '5', -4),
      edge('2', '4', 1),
      edge('2', '5', 7),
      edge('3', '2', 4),
      edge('4', '1', 2),
      edge('4', '3', -5),
      edge('5', '4', 6),
    ],
    directed: true,
    weighted: true,
    start: '1',
    end: '3',
  };
}

/**
 * A random connected graph: a spanning tree first (so it is always connected),
 * then a handful of extra edges, so it always has cycles to find.
 */
export function randomGraph(seed: number, size = 9): AlgorithmInput {
  const rng = makeRng(seed);
  const count = Math.max(4, Math.min(size, 14));
  const nodes: GraphNodeInput[] = [];
  const ids: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const id = count <= 26 ? String.fromCharCode(65 + i) : `n${i}`;
    ids.push(id);
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2 + (rng() - 0.5) * 0.5;
    const radius = 0.3 + rng() * 0.12;
    nodes.push(node(id, 0.5 + Math.cos(angle) * radius, 0.5 + Math.sin(angle) * radius * 1.05));
  }

  const edges: GraphEdgeInput[] = [];
  const seen = new Set<string>();
  const addEdge = (a: string, b: string, weight: number): void => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || seen.has(key)) return;
    seen.add(key);
    edges.push(edge(a, b, weight));
  };

  // Spanning path keeps it connected even if a shuffle goes badly.
  for (let i = 1; i < count; i += 1) {
    addEdge(ids[i - 1] as string, ids[i] as string, Math.max(1, Math.round(rng() * 9)));
  }
  const extra = Math.round(count * 0.7);
  for (let i = 0; i < extra; i += 1) {
    const a = ids[Math.floor(rng() * count)] as string;
    const b = ids[Math.floor(rng() * count)] as string;
    addEdge(a, b, Math.max(1, Math.round(rng() * 9)));
  }

  return {
    kind: 'graph',
    nodes,
    edges,
    directed: false,
    weighted: true,
    start: ids[0] as string,
    end: ids[count - 1] as string,
  };
}

export const GRAPH_PRESETS: readonly GraphPreset[] = [
  { id: 'auto', label: 'Recommended', hint: 'The graph this algorithm is best demonstrated on', build: null },
  { id: 'lattice', label: 'Lattice', hint: '4 × 3 weighted grid — planar, cyclic, 12 nodes', build: lattice },
  { id: 'ring', label: 'Ring', hint: 'One 8-cycle — even, so bipartite passes', build: ring },
  { id: 'dag', label: 'DAG', hint: 'Layered and acyclic — both topological sorts', build: dag },
  { id: 'clusters', label: 'SCC clusters', hint: 'Two 3-cycles joined one-way — Tarjan’s showcase', build: clusters },
  { id: 'negative', label: 'Negative edge', hint: 'Directed with a −3 edge — Bellman-Ford territory', build: negative },
  { id: 'pairs', label: 'All pairs', hint: 'Five-node classic — Floyd–Warshall’s matrix', build: pairs },
];

export const PRESET_BY_ID: ReadonlyMap<GraphPresetId, GraphPreset> = new Map(GRAPH_PRESETS.map((p) => [p.id, p]));
