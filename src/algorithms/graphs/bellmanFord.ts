import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, NEGATIVE_INPUT } from './specs';
import { GraphModel, RolePainter, columnTable, distLabel, markTerminals } from './kit';

export interface BellmanFordData {
  readonly operation: 'round' | 'relax' | 'skip' | 'settle' | 'negative-cycle';
  readonly node?: string;
  readonly from?: string;
  readonly round?: number;
  readonly distance?: number;
}

/**
 * Bellman-Ford.
 *
 * Dijkstra trusts its greedy choice; Bellman-Ford does not trust anything and
 * simply relaxes **every edge, V − 1 times**. After round k, every shortest path
 * that uses at most k edges is exact — so after V − 1 rounds all of them are.
 * That patience is what buys negative weights, and the *V*-th round that still
 * finds an improvement is the certified proof of a negative cycle.
 */
const spec: AlgorithmSpec<GraphSnapshot, BellmanFordData> = {
  id: 'bellman-ford',
  complexity: COMPLEXITY['bellman-ford']!,
  pseudocode: pseudo(`
#bellmanFord(graph, source)
#   dist[source] ← 0, dist[everything else] ← ∞
#   repeat V − 1 times                     ▸ k rounds ⇔ paths with ≤ k edges
#     for each edge (u, v, w) in the graph
#       if dist[u] + w < dist[v]           ▸ relax every edge, no exceptions
#         dist[v] ← dist[u] + w
#         prev[v] ← u
#   for each edge (u, v, w) once more       ▸ the audit round
#     if dist[u] + w < dist[v]
#       report a negative cycle reachable from source
#   return dist, prev`),
  code: code(
    `
function bellmanFord(edges, nodes, source) {
  const dist = new Map(nodes.map((n) => [n, Infinity]));
  const prev = new Map();
  dist.set(source, 0);

  for (let round = 1; round < nodes.length; round++) {
    for (const { from, to, weight } of edges) {
      if (dist.get(from) + weight < dist.get(to)) {
        dist.set(to, dist.get(from) + weight);
        prev.set(to, from);
      }
    }
  }

  for (const { from, to, weight } of edges) {
    if (dist.get(from) + weight < dist.get(to)) return { dist, prev, cycle: true };
  }

  return { dist, prev, cycle: false };
}`,
    `
def bellman_ford(edges, nodes, source):
    dist = {node: float('inf') for node in nodes}
    prev = {}
    dist[source] = 0

    for round_number in range(len(nodes) - 1):
        for source_node, to, weight in edges:
            if dist[source_node] + weight < dist[to]:
                dist[to] = dist[source_node] + weight
                prev[to] = source_node

    for source_node, to, weight in edges:
        if dist[source_node] + weight < dist[to]:
            return dist, prev, True

    return dist, prev, False`,
    `
struct Result { map<string, int> dist; bool negativeCycle; };

Result bellmanFord(const vector<Edge>& edges, const vector<string>& nodes,
                   const string& source) {
  map<string, int> dist;
  for (const string& node : nodes) dist[node] = INT_MAX;
  dist[source] = 0;

  for (size_t round = 1; round < nodes.size(); ++round) {
    for (const Edge& e : edges) {
      if (dist[e.from] != INT_MAX && dist[e.from] + e.weight < dist[e.to]) {
        dist[e.to] = dist[e.from] + e.weight;
      }
    }
  }

  for (const Edge& e : edges) {
    if (dist[e.from] != INT_MAX && dist[e.from] + e.weight < dist[e.to]) {
      return { dist, true };
    }
  }

  return { dist, false };
}`,
    `
static boolean bellmanFord(int[][] edges, int n, int source) {
  int[] dist = new int[n];
  Arrays.fill(dist, Integer.MAX_VALUE);
  dist[source] = 0;

  for (int round = 1; round < n; round++) {
    for (int[] e : edges) {
      if (dist[e[0]] != Integer.MAX_VALUE && dist[e[0]] + e[2] < dist[e[1]]) {
        dist[e[1]] = dist[e[0]] + e[2];
      }
    }
  }

  for (int[] e : edges) {
    if (dist[e[0]] != Integer.MAX_VALUE && dist[e[0]] + e[2] < dist[e[1]]) {
      return true;
    }
  }

  return false;
}`,
  ),
  explanation: [
    'Round k is a promise: “all shortest paths using at most k edges are already correct”. Induction on k turns that promise into the whole algorithm.',
    'No priority queue and no greedy choice — every edge is offered the chance to improve its target, which is precisely why negative weights are harmless.',
    'If the extra audit round still relaxes something, some cycle has total negative weight and “shortest path” is not a well-defined question any more.',
  ],
  learn: {
    useCases: [
      'Routing protocols that must tolerate negative costs (distance-vector, RIP)',
      'Currency arbitrage detection: log of exchange rates turns a profitable cycle into a negative cycle',
      'Any shortest-path problem where an edge weight can dip below zero',
    ],
    quiz: [
      {
        question: 'Why exactly V − 1 rounds?',
        options: ['An arbitrary convention', 'A simple path visits each vertex once, so it has at most V − 1 edges — and shortest paths never repeat vertices unless a negative cycle exists', 'Because the graph has V nodes', 'To make the complexity look bigger'],
        answer: 1,
        why: 'Any shortest walk that repeats a vertex contains a cycle; with non-negative cycles, removing it is never worse.',
      },
    ],
    practice: [
      { title: 'Cheapest Flights Within K Stops', url: 'https://leetcode.com/problems/cheapest-flights-within-k-stops/', difficulty: 'medium' },
    ],
  },
  defaultInput: NEGATIVE_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const source = view.start;
    const nodes = model.order;
    const edges = model.edgeList();

    const dist = new Map<string, number>(nodes.map((id) => [id, Number.POSITIVE_INFINITY]));
    const prev = new Map<string, string>();
    dist.set(source, 0);

    const rowOf = (id: string): number => nodes.indexOf(id);
    const tableFor = (round: number, row?: number) =>
      columnTable(
        ['node', 'dist', 'prev', 'round'],
        nodes.map((id) => [id, distLabel(dist.get(id) ?? Infinity), prev.get(id) ?? '—', round]),
        row === undefined ? undefined : { row },
      );

    let caption = `Bellman-Ford from ${source}: relax every edge, ${nodes.length - 1} times over`;
    let round = 0;
    let highlightRow: number | undefined = rowOf(source);

    const builder = new TraceBuilder<GraphSnapshot, BellmanFordData>(() => {
      painter.apply(model);
      for (const id of nodes) {
        const value = dist.get(id) ?? Number.POSITIVE_INFINITY;
        model.setNodeBadge(id, distLabel(value));
      }
      return model.snapshot({
        caption,
        table: tableFor(round, highlightRow),
        badges: { nodes: model.size, edges: edges.length, round: `${round}/${nodes.length - 1}` },
      });
    });

    markTerminals(model, view.start, view.end);
    painter.setNode(source, 'active');

    builder.emit({
      kind: 'init',
      description: `dist[${source}] ← 0, everything else ∞. Round 0 means “paths with no edges at all”.`,
      highlight: { nodes: [source] },
      pseudocodeLine: 1,
      codeLine: 4,
      weight: 1.4,
      bump: ['writes'],
    });

    let changedLastRound = true;
    for (round = 1; round < nodes.length && changedLastRound; round += 1) {
      changedLastRound = false;
      caption = `round ${round}: every edge gets one chance to improve its target`;

      builder.emit({
        kind: 'info',
        description: `Round ${round} of ${nodes.length - 1}: after this pass every shortest path with at most ${round} edge${round === 1 ? '' : 's'} is exact.`,
        highlight: { nodes: [] },
        data: { operation: 'round', round },
        pseudocodeLine: 3,
        codeLine: 7,
        weight: 1.2,
        bump: ['reads'],
      });

      for (const edge of edges) {
        const fromDistance = dist.get(edge.from) ?? Number.POSITIVE_INFINITY;
        const known = dist.get(edge.to) ?? Number.POSITIVE_INFINITY;
        const candidate = fromDistance + edge.weight;
        highlightRow = rowOf(edge.to);
        painter.setEdge(edge.from, edge.to, 'compare');
        painter.setNode(edge.from, 'active');
        painter.setNode(edge.to, 'frontier');
        if (Number.isFinite(fromDistance)) builder.bump('comparisons');

        builder.emit({
          kind: 'compare',
          description: Number.isFinite(fromDistance)
            ? `Edge ${edge.from}→${edge.to} (w=${edge.weight}): ${fromDistance} + ${edge.weight} = ${candidate} vs ${distLabel(known)}.`
            : `Edge ${edge.from}→${edge.to} is unreachable from ${source} in ${round - 1} edge${round === 1 ? '' : 's'} — nothing to relax.`,
          highlight: { nodes: [edge.from, edge.to], edges: [`${edge.from}->${edge.to}`] },
          data: { operation: 'relax', node: edge.to, from: edge.from, round, distance: candidate },
          pseudocodeLine: 4,
          codeLine: 9,
          weight: 0.8,
          bump: ['reads'],
        });

        if (candidate < known) {
          dist.set(edge.to, candidate);
          prev.set(edge.to, edge.from);
          changedLastRound = true;
          painter.setEdge(edge.from, edge.to, 'path');
          builder.bump('writes', 2);

          builder.emit({
            kind: 'relax',
            description: `Improve ${edge.to}: ${candidate} < ${distLabel(known)} — one more edge buys a shorter path.`,
            highlight: { nodes: [edge.to], edges: [`${edge.from}->${edge.to}`] },
            data: { operation: 'relax', node: edge.to, from: edge.from, round, distance: candidate },
            pseudocodeLine: 5,
            codeLine: 10,
            weight: 1.15,
            bump: ['writes'],
          });
        } else {
          painter.setEdge(edge.from, edge.to, undefined);
        }
      }

      for (const edge of edges) painter.setEdge(edge.from, edge.to, undefined);
    }

    caption = 'audit round: does any edge still improve?';
    builder.emit({
      kind: 'info',
      description: `Audit round: relaxing once more after ${Math.min(round - 1, nodes.length - 1)} productive rounds finds no improvement, so no negative cycle is reachable from ${source}.`,
      highlight: { nodes: nodes },
      data: { operation: 'round', round: nodes.length - 1 },
      pseudocodeLine: 7,
      codeLine: 15,
      weight: 1.3,
      bump: ['reads'],
    });

    let negativeCycle: string | undefined;
    for (const edge of edges) {
      const fromDistance = dist.get(edge.from) ?? Number.POSITIVE_INFINITY;
      const candidate = fromDistance + edge.weight;
      if (Number.isFinite(fromDistance) && candidate < (dist.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        negativeCycle = edge.to;
        painter.setEdge(edge.from, edge.to, 'danger');
        painter.setNode(edge.from, 'danger');
        painter.setNode(edge.to, 'danger');
        builder.emit({
          kind: 'relax',
          description: `Edge ${edge.from}→${edge.to} still improves after V − 1 rounds: a negative cycle is reachable from ${source}.`,
          highlight: { nodes: [edge.from, edge.to], edges: [`${edge.from}->${edge.to}`] },
          data: { operation: 'negative-cycle', node: edge.to, from: edge.from, round: nodes.length },
          pseudocodeLine: 9,
          codeLine: 16,
          weight: 2.2,
          bump: ['comparisons'],
        });
        break;
      }
    }

    if (negativeCycle === undefined) {
      painter.clear();
      for (const id of nodes) painter.setNode(id, Number.isFinite(dist.get(id) ?? Infinity) ? 'visited' : 'muted');
      const path: string[] = [];
      for (let cursor: string | undefined = view.end; cursor !== undefined; cursor = prev.get(cursor)) {
        path.unshift(cursor);
        if (cursor === view.start) break;
      }
      if (path[0] === view.start) {
        path.forEach((id, i) => {
          painter.setNode(id, 'path');
          const next = path[i + 1];
          if (next) painter.setEdge(id, next, 'path');
        });
        painter.setNode(source, 'path');
      }
    }

    highlightRow = undefined;
    const targetDistance = dist.get(view.end) ?? Number.POSITIVE_INFINITY;
    caption =
      negativeCycle === undefined
        ? `${view.end} costs ${distLabel(targetDistance)} after ${Math.min(round - 1, nodes.length - 1)} rounds`
        : `negative cycle detected through ${negativeCycle}`;

    builder.emit({
      kind: 'complete',
      description: caption,
      highlight: { nodes: negativeCycle === undefined ? [view.end] : [negativeCycle] },
      data: { operation: negativeCycle === undefined ? 'settle' : 'negative-cycle', node: negativeCycle ?? view.end },
      pseudocodeLine: 10,
      codeLine: 19,
      weight: 2.3,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: negativeCycle === undefined ? `${view.start} → ${view.end} costs ${distLabel(targetDistance)}` : 'Negative cycle detected',
        detail: negativeCycle === undefined ? 'Distances are final after V − 1 productive rounds' : `Edge into ${negativeCycle} still improves — distances are undefined`,
        output: { distances: Object.fromEntries(dist), negativeCycle: negativeCycle ?? null },
      },
      expectedState: () => dist.get(view.start) === 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, BellmanFordData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
