import { describe, expect, it } from 'vitest';
import type {
  AlgorithmDefinition,
  AlgorithmInput,
  GraphSnapshot,
  TraceRunInfo,
  VisualRole,
} from '@/types';
import { assertTraceContract } from '@/test/traceContract';
import { definition as bfs } from './bfs';
import { definition as dfs } from './dfs';
import { definition as dijkstra } from './dijkstra';
import { definition as bellmanFord } from './bellmanFord';
import { definition as floydWarshall } from './floydWarshall';
import { definition as aStar } from './aStar';
import { definition as prim } from './prim';
import { definition as kruskal } from './kruskal';
import { definition as topoKahn } from './topoKahn';
import { definition as topoDfs } from './topoDfs';
import { definition as tarjan } from './tarjanScc';
import { definition as cycleDetection } from './cycleDetection';
import { definition as bipartite } from './bipartite';
import {
  ALL_PAIRS_INPUT,
  DAG_INPUT,
  GRAPH_DEFAULT_INPUT,
  NEGATIVE_INPUT,
  SCC_INPUT,
  UNWEIGHTED_INPUT,
} from './specs';

type GraphDefinition = AlgorithmDefinition<GraphSnapshot, unknown>;
type GraphTrace = ReturnType<GraphDefinition['generate']>;

const RUN: TraceRunInfo = { runId: 'test', dataSet: 'random', seed: 7 };

const FAMILY: readonly { readonly name: string; readonly definition: GraphDefinition; readonly input: AlgorithmInput }[] = [
  { name: 'bfs', definition: bfs as GraphDefinition, input: UNWEIGHTED_INPUT() },
  { name: 'dfs', definition: dfs as GraphDefinition, input: UNWEIGHTED_INPUT() },
  { name: 'dijkstra', definition: dijkstra as GraphDefinition, input: GRAPH_DEFAULT_INPUT() },
  { name: 'bellman-ford', definition: bellmanFord as GraphDefinition, input: NEGATIVE_INPUT() },
  { name: 'floyd-warshall', definition: floydWarshall as GraphDefinition, input: ALL_PAIRS_INPUT() },
  { name: 'a-star', definition: aStar as GraphDefinition, input: GRAPH_DEFAULT_INPUT() },
  { name: 'prim', definition: prim as GraphDefinition, input: GRAPH_DEFAULT_INPUT() },
  { name: 'kruskal', definition: kruskal as GraphDefinition, input: GRAPH_DEFAULT_INPUT() },
  { name: 'topological-sort-kahn', definition: topoKahn as GraphDefinition, input: DAG_INPUT() },
  { name: 'topological-sort-dfs', definition: topoDfs as GraphDefinition, input: DAG_INPUT() },
  { name: 'tarjan-scc', definition: tarjan as GraphDefinition, input: SCC_INPUT() },
  { name: 'cycle-detection', definition: cycleDetection as GraphDefinition, input: GRAPH_DEFAULT_INPUT() },
  { name: 'bipartite-check', definition: bipartite as GraphDefinition, input: UNWEIGHTED_INPUT() },
];

const VALID_ROLES: ReadonlySet<VisualRole> = new Set<VisualRole>([
  'idle',
  'active',
  'compare',
  'swap',
  'pivot',
  'sorted',
  'visited',
  'frontier',
  'path',
  'success',
  'danger',
  'ghost',
  'muted',
]);

/** Every snapshot in every trace must describe a real graph. */
function assertWellFormed(snapshot: GraphSnapshot): void {
  const ids = snapshot.nodes.map((node) => node.id);
  expect(new Set(ids).size).toBe(ids.length);

  const known = new Set(ids);
  for (const node of snapshot.nodes) {
    expect(node.x).toBeGreaterThanOrEqual(0);
    expect(node.x).toBeLessThanOrEqual(1);
    expect(node.y).toBeGreaterThanOrEqual(0);
    expect(node.y).toBeLessThanOrEqual(1);
    if (node.role) expect(VALID_ROLES.has(node.role)).toBe(true);
  }

  for (const edge of snapshot.edges) {
    expect(known.has(edge.from)).toBe(true);
    expect(known.has(edge.to)).toBe(true);
    if (edge.role) expect(VALID_ROLES.has(edge.role)).toBe(true);
  }

  if (snapshot.table) {
    for (const row of snapshot.table.rows) {
      expect(row.length).toBe(snapshot.table.headers.length);
    }
  }
}

/** Adjacency derived from the input, used by the correctness assertions. */
function adjacencyOf(input: AlgorithmInput, directed: boolean): Map<string, { to: string; weight: number }[]> {
  const map = new Map<string, { to: string; weight: number }[]>();
  if (input.kind !== 'graph') return map;
  for (const node of input.nodes) map.set(node.id, []);
  for (const edge of input.edges) {
    map.get(edge.from)?.push({ to: edge.to, weight: edge.weight ?? 1 });
    if (!directed) map.get(edge.to)?.push({ to: edge.from, weight: edge.weight ?? 1 });
  }
  return map;
}

/** Independent reference implementation — the tests' own Dijkstra. */
function referenceDijkstra(input: AlgorithmInput, start: string): Map<string, number> {
  const adj = adjacencyOf(input, false);
  const dist = new Map<string, number>();
  for (const id of adj.keys()) dist.set(id, Number.POSITIVE_INFINITY);
  dist.set(start, 0);
  const done = new Set<string>();

  while (done.size < adj.size) {
    let u: string | undefined;
    for (const id of adj.keys()) {
      if (done.has(id)) continue;
      if (u === undefined || (dist.get(id) ?? Infinity) < (dist.get(u) ?? Infinity)) u = id;
    }
    if (u === undefined || !Number.isFinite(dist.get(u) ?? Infinity)) break;
    done.add(u);
    for (const { to, weight } of adj.get(u) ?? []) {
      const candidate = (dist.get(u) as number) + weight;
      if (candidate < (dist.get(to) ?? Infinity)) dist.set(to, candidate);
    }
  }
  return dist;
}

describe.each(FAMILY)('$name', ({ definition, input }) => {
  it('satisfies the shared trace contract', () => {
    const trace = definition.generate(input, RUN);
    assertTraceContract(trace, { minSteps: 4 });
  });

  it('keeps every snapshot structurally valid', () => {
    const trace = definition.generate(input, RUN) as GraphTrace;
    for (const step of trace.steps) assertWellFormed(step.state);
  });

  it('is deterministic for the same input', () => {
    const strip = (trace: GraphTrace): string => JSON.stringify({ ...trace, generatedInMs: 0 });
    expect(strip(definition.generate(input, RUN) as GraphTrace)).toBe(
      strip(definition.generate(input, RUN) as GraphTrace),
    );
  });

  it('never mutates the caller’s input', () => {
    const source = GRAPH_DEFAULT_INPUT();
    if (source.kind !== 'graph') throw new Error('expected a graph input');
    const copy = JSON.parse(JSON.stringify(source)) as unknown;
    definition.generate(source, RUN);
    expect(JSON.parse(JSON.stringify(source))).toEqual(copy);
  });

  it('stays well under the step budget', () => {
    const trace = definition.generate(input, RUN);
    expect(trace.steps.length).toBeLessThan(2500);
  });
});

/* -------------------------------------------------------------------------- */
/*  Per-algorithm invariants                                                  */
/* -------------------------------------------------------------------------- */

describe('BFS', () => {
  it('levels differ by at most one across every edge', () => {
    const output = bfs.generate(UNWEIGHTED_INPUT(), RUN).result.output as {
      levels: Record<string, number>;
    };
    const adj = adjacencyOf(UNWEIGHTED_INPUT(), false);
    expect(Object.keys(output.levels).length).toBe(adj.size);
    for (const [from, neighbours] of adj) {
      for (const { to } of neighbours) {
        expect(Math.abs((output.levels[from] as number) - (output.levels[to] as number))).toBeLessThanOrEqual(1);
      }
    }
    expect(output.levels['A']).toBe(0);
  });
});

describe('DFS', () => {
  it('visits every reachable vertex exactly once', () => {
    const output = dfs.generate(UNWEIGHTED_INPUT(), RUN).result.output as { order: string[] };
    const adj = adjacencyOf(UNWEIGHTED_INPUT(), false);
    expect(new Set(output.order).size).toBe(output.order.length);
    expect(output.order.length).toBe(adj.size);
  });
});

describe('Dijkstra', () => {
  it('matches an independent shortest-path computation', () => {
    const trace = dijkstra.generate(GRAPH_DEFAULT_INPUT(), RUN);
    const output = trace.result.output as { distances: Record<string, number>; path: string[] };
    const reference = referenceDijkstra(GRAPH_DEFAULT_INPUT(), 'A');
    for (const [id, distance] of reference) {
      expect(output.distances[id]).toBe(distance);
    }
    expect(output.path[0]).toBe('A');
    expect(output.path[output.path.length - 1]).toBe('L');
  });
});

describe('Bellman-Ford', () => {
  it('handles the negative edge and reports no negative cycle', () => {
    const output = bellmanFord.generate(NEGATIVE_INPUT(), RUN).result.output as {
      distances: Record<string, number>;
      negativeCycle: string | null;
    };
    expect(output.negativeCycle).toBeNull();
    // Hand-computed: the −3 edge makes C cheaper than the direct route.
    expect(output.distances['A']).toBe(0);
    expect(output.distances['C']).toBe(1);
    expect(output.distances['F']).toBe(6);
  });
});

describe('Floyd–Warshall', () => {
  it('reproduces the classic all-pairs row', () => {
    const output = floydWarshall.generate(ALL_PAIRS_INPUT(), RUN).result.output as {
      matrix: (number | null)[][];
    };
    const row = output.matrix[0]?.map((value) => (value === null ? '∞' : value));
    expect(row).toEqual([0, 1, -3, 2, -4]);
    for (const [i, values] of (output.matrix as (number | null)[][]).entries()) {
      expect(values[i]).toBe(0);
    }
  });
});

describe('A*', () => {
  it('returns a walkable path whose cost matches its edges', () => {
    const output = aStar.generate(GRAPH_DEFAULT_INPUT(), RUN).result.output as {
      path: string[];
      cost: number | null;
    };
    const adj = adjacencyOf(GRAPH_DEFAULT_INPUT(), false);
    expect(output.path[0]).toBe('A');
    expect(output.path[output.path.length - 1]).toBe('L');

    let cost = 0;
    for (let i = 0; i < output.path.length - 1; i += 1) {
      const from = output.path[i] as string;
      const to = output.path[i + 1] as string;
      const edge = (adj.get(from) ?? []).find((entry) => entry.to === to);
      expect(edge, `${from} → ${to} must be a real edge`).toBeDefined();
      cost += edge?.weight ?? 0;
    }
    expect(output.cost).toBe(cost);
  });
});

describe('spanning trees', () => {
  it('Prim and Kruskal agree on the total weight', () => {
    const primOutput = prim.generate(GRAPH_DEFAULT_INPUT(), RUN).result.output as { total: number; inTree: string[] };
    const kruskalOutput = kruskal.generate(GRAPH_DEFAULT_INPUT(), RUN).result.output as {
      total: number;
      edges: { from: string; to: string; weight: number }[];
    };
    const defaultInput = GRAPH_DEFAULT_INPUT();
    const vertexCount = defaultInput.kind === 'graph' ? defaultInput.nodes.length : 0;
    expect(primOutput.total).toBe(kruskalOutput.total);
    expect(primOutput.inTree.length).toBe(vertexCount);
    expect(kruskalOutput.edges.length).toBe(vertexCount - 1);
  });
});

describe('Union-Find inside Kruskal', () => {
  it('never accepts an edge that would close a cycle', () => {
    const output = kruskal.generate(GRAPH_DEFAULT_INPUT(), RUN).result.output as {
      edges: { from: string; to: string; weight: number }[];
    };
    // Build the forest edge by edge: adding an edge must always join two components.
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let cursor = x;
      while ((parent.get(cursor) ?? cursor) !== cursor) cursor = parent.get(cursor) as string;
      return cursor;
    };
    for (const edge of output.edges) {
      for (const id of [edge.from, edge.to]) if (!parent.has(id)) parent.set(id, id);
      const ru = find(edge.from);
      const rv = find(edge.to);
      expect(ru).not.toBe(rv);
      parent.set(rv, ru);
    }
  });
});

describe('topological sorts', () => {
  const isValidOrder = (order: string[]): boolean => {
    const input = DAG_INPUT();
    if (input.kind !== 'graph') return false;
    const position = new Map(order.map((id, i) => [id, i]));
    if (order.length !== input.nodes.length) return false;
    return input.edges.every((edge) => (position.get(edge.from) ?? -1) < (position.get(edge.to) ?? -1));
  };

  it('Kahn emits a valid topological order', () => {
    const output = topoKahn.generate(DAG_INPUT(), RUN).result.output as { order: string[]; cyclic: boolean };
    expect(output.cyclic).toBe(false);
    expect(isValidOrder(output.order)).toBe(true);
  });

  it('the DFS variant emits a valid topological order too', () => {
    const output = topoDfs.generate(DAG_INPUT(), RUN).result.output as { order: string[]; cyclic: boolean };
    expect(output.cyclic).toBe(false);
    expect(isValidOrder(output.order)).toBe(true);
  });
});

describe('Tarjan', () => {
  it('finds the two 3-cycles and covers every vertex', () => {
    const output = tarjan.generate(SCC_INPUT(), RUN).result.output as { components: string[][] };
    const flat = output.components.flat().sort();
    const input = SCC_INPUT();
    if (input.kind !== 'graph') throw new Error('expected a graph input');
    expect(flat).toEqual(input.nodes.map((n) => n.id).sort());

    const sized = output.components.map((component) => [...component].sort().join(''));
    expect(sized).toContain('ABC');
    expect(sized).toContain('DEF');
    expect(flat).toContain('G');
    expect(flat).toContain('H');
    // Four components: {A,B,C} and {D,E,F} are 3-cycles, G and H are singletons.
    expect(output.components.length).toBe(4);
  });

  it('vertices in the same component are mutually reachable', () => {
    const output = tarjan.generate(SCC_INPUT(), RUN).result.output as { components: string[][] };
    const input = SCC_INPUT();
    if (input.kind !== 'graph') throw new Error('expected a graph input');
    const adj = adjacencyOf(input, true);

    const reachable = (from: string): Set<string> => {
      const seen = new Set<string>([from]);
      const queue = [from];
      while (queue.length) {
        const node = queue.shift() as string;
        for (const { to } of adj.get(node) ?? []) {
          if (!seen.has(to)) {
            seen.add(to);
            queue.push(to);
          }
        }
      }
      return seen;
    };

    for (const component of output.components) {
      for (const a of component) {
        for (const b of component) {
          expect(reachable(a).has(b), `${a} ⇝ ${b}`).toBe(true);
        }
      }
      // And nothing outside the component can be reached and come back.
      const outside = output.components.filter((other) => other !== component).flat();
      for (const a of component) {
        const canReach = reachable(a);
        for (const b of outside) {
          if (canReach.has(b)) expect(reachable(b).has(a)).toBe(false);
        }
      }
    }
  });
});

describe('cycle detection', () => {
  it('finds the cycles a lattice is full of', () => {
    const output = cycleDetection.generate(GRAPH_DEFAULT_INPUT(), RUN).result.output as {
      hasCycle: boolean;
      backEdge: string | null;
    };
    expect(output.hasCycle).toBe(true);
    expect(output.backEdge).not.toBeNull();
  });

  it('reports no cycle for a spanning tree of the same vertices', () => {
    const input = GRAPH_DEFAULT_INPUT();
    if (input.kind !== 'graph') throw new Error('expected a graph input');
    // Keep only the first n − 1 edges that do not close a loop (a DFS forest).
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let cursor = x;
      while ((parent.get(cursor) ?? cursor) !== cursor) cursor = parent.get(cursor) as string;
      return cursor;
    };
    for (const node of input.nodes) parent.set(node.id, node.id);
    const treeEdges = input.edges.filter((edge) => {
      const ru = find(edge.from);
      const rv = find(edge.to);
      if (ru === rv) return false;
      parent.set(rv, ru);
      return true;
    });
    expect(treeEdges.length).toBe(input.nodes.length - 1);

    const output = cycleDetection.generate({ ...input, edges: treeEdges }, RUN).result.output as {
      hasCycle: boolean;
    };
    expect(output.hasCycle).toBe(false);
  });
});

describe('bipartite check', () => {
  it('passes the lattice and produces genuinely independent sides', () => {
    const trace = bipartite.generate(UNWEIGHTED_INPUT(), RUN);
    const output = trace.result.output as { bipartite: boolean; groups: string[][] };
    expect(output.bipartite).toBe(true);

    const input = UNWEIGHTED_INPUT();
    if (input.kind !== 'graph') throw new Error('expected a graph input');
    const adjacency = adjacencyOf(input, false);
    const sideOf = new Map<string, number>();
    output.groups.forEach((group, index) => group.forEach((id) => sideOf.set(id, index)));
    for (const edge of input.edges) {
      expect(sideOf.get(edge.from)).not.toBe(sideOf.get(edge.to));
    }
    expect(adjacency.size).toBe(output.groups[0]!.length + output.groups[1]!.length);
  });

  it('detects the triangle that breaks bipartiteness', () => {
    const input = GRAPH_DEFAULT_INPUT();
    if (input.kind !== 'graph') throw new Error('expected a graph input');
    const withTriangle = {
      ...input,
      edges: [...input.edges, { from: 'A', to: 'B', weight: 1 }, { from: 'B', to: 'E', weight: 1 }, { from: 'E', to: 'A', weight: 1 }],
    };
    const output = bipartite.generate(withTriangle, RUN).result.output as { bipartite: boolean };
    expect(output.bipartite).toBe(false);
  });
});
