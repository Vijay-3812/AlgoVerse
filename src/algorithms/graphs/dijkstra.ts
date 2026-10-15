import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, GRAPH_DEFAULT_INPUT } from './specs';
import { GraphModel, RolePainter, columnTable, distLabel, markTerminals } from './kit';

export interface DijkstraData {
  readonly operation: 'settle' | 'relax' | 'skip' | 'extract' | 'done';
  readonly node?: string;
  readonly from?: string;
  readonly distance?: number;
}

/**
 * Dijkstra's shortest paths.
 *
 * Greedy with a receipt: because every weight is non-negative, the cheapest
 * unfinished node can never be improved later, so it can be *settled* — and it
 * is never touched again. The trace keeps a distance table beside the canvas so
 * the reader watches `∞ → tentative → final` happen one node at a time, and
 * re-draws the shortest-path tree as the parents change.
 */
const spec: AlgorithmSpec<GraphSnapshot, DijkstraData> = {
  id: 'dijkstra',
  complexity: COMPLEXITY.dijkstra!,
  pseudocode: pseudo(`
#dijkstra(graph, source)
#   dist[source] ← 0, dist[everything else] ← ∞
#   ready ← ∅                              ▸ settled nodes
#   while an unsettled node remains
#     u ← unsettled node with the smallest dist   ▸ greedy choice
#     ready ← ready ∪ {u}
#     for each edge (u, v, w) leaving u
#       if dist[u] + w < dist[v]                 ▸ relaxation
#         dist[v] ← dist[u] + w
#         prev[v] ← u
#       else: keep dist[v]                       ▸ no better route yet
#   return dist, prev`),
  code: code(
    `
function dijkstra(adj, source) {
  const dist = new Map();
  const prev = new Map();
  const settled = new Set();
  for (const node of Object.keys(adj)) dist.set(node, Infinity);
  dist.set(source, 0);

  while (settled.size < Object.keys(adj).length) {
    const u = pickCheapestUnsettled(dist, settled);
    if (u === undefined) break;
    settled.add(u);

    for (const { to, weight } of adj[u]) {
      if (dist.get(u) + weight < dist.get(to)) {
        dist.set(to, dist.get(u) + weight);
        prev.set(to, u);
      }
    }
  }

  return { dist, prev };
}`,
    `
import heapq


def dijkstra(adj, source):
    dist = {node: float('inf') for node in adj}
    prev = {}
    dist[source] = 0
    heap = [(0, source)]

    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for to, weight in adj[u]:
            if dist[u] + weight < dist[to]:
                dist[to] = dist[u] + weight
                prev[to] = u
                heapq.heappush(heap, (dist[to], to))

    return dist, prev`,
    `
map<string, int> dijkstra(const map<string, vector<pair<string, int>>>& adj,
                          const string& source) {
  map<string, int> dist;
  set<string> settled;
  for (const auto& [node, edges] : adj) dist[node] = INT_MAX;
  dist[source] = 0;

  while (settled.size() < adj.size()) {
    string u;
    int best = INT_MAX;
    for (const auto& [node, d] : dist) {
      if (!settled.count(node) && d < best) { best = d; u = node; }
    }
    if (u.empty()) break;
    settled.insert(u);

    for (const auto& [to, weight] : adj.at(u)) {
      if (dist[u] + weight < dist[to]) dist[to] = dist[u] + weight;
    }
  }

  return dist;
}`,
    `
static int[] dijkstra(List<List<int[]>> adj, int source, int n) {
  int[] dist = new int[n];
  boolean[] settled = new boolean[n];
  Arrays.fill(dist, Integer.MAX_VALUE);
  dist[source] = 0;

  for (int step = 0; step < n; step++) {
    int u = -1;
    for (int i = 0; i < n; i++) {
      if (!settled[i] && (u < 0 || dist[i] < dist[u])) u = i;
    }
    if (u < 0 || dist[u] == Integer.MAX_VALUE) break;
    settled[u] = true;

    for (int[] edge : adj.get(u)) {
      int to = edge[0], weight = edge[1];
      if (dist[u] + weight < dist[to]) dist[to] = dist[u] + weight;
    }
  }

  return dist;
}`,
  ),
  explanation: [
    'Settling the cheapest unfinished node is safe only because weights are non-negative: any other route to it would have to pass through a node that is already at least as expensive.',
    'Relaxation is the inner loop: if going through `u` reaches `v` more cheaply than the best route known so far, overwrite `dist[v]` and remember `u` as its parent.',
    'The parent pointers form the shortest-path tree — following them from any node back to the source prints the route the algorithm chose.',
  ],
  learn: {
    useCases: [
      'Road routing and map navigation (the original 1956 motivation: “the shortest route between Rotterdam and Groningen”)',
      'Network routing protocols (OSPF, IS-IS) and packet-switch cost models',
      'Any “cheapest way to get there” problem with non-negative costs',
    ],
    quiz: [
      {
        question: 'What breaks if an edge weight is negative?',
        options: ['Nothing', 'A node may already be settled when a cheaper path to it appears, so the result is wrong', 'The algorithm loops forever', 'Only the memory usage changes'],
        answer: 1,
        why: 'That is exactly why Bellman-Ford exists: it re-relaxes every edge V − 1 times instead of trusting the greedy choice.',
      },
      {
        question: 'Which node does Dijkstra settle second (after the source) on the default lattice?',
        options: ['B, its cheapest neighbour', 'E, weight 5', 'Any node, the order is unspecified', 'The farthest node'],
        answer: 0,
        why: 'The source settles first at 0, then the unsettled node with the smallest distance — here A→B costs 4, beating A→E’s 5.',
      },
    ],
    practice: [
      { title: 'Network Delay Time', url: 'https://leetcode.com/problems/network-delay-time/', difficulty: 'medium' },
      { title: 'Path With Minimum Effort', url: 'https://leetcode.com/problems/path-with-minimum-effort/', difficulty: 'medium' },
    ],
  },
  defaultInput: GRAPH_DEFAULT_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const source = view.start;

    const dist = new Map<string, number>(model.order.map((id) => [id, Number.POSITIVE_INFINITY]));
    const prev = new Map<string, string>();
    const settled = new Set<string>();
    dist.set(source, 0);

    /** Distance/parent table — the side panel that makes relaxation readable. */
    const tableFor = (highlight?: { row?: number; head?: string }) =>
      columnTable(
        ['node', 'dist', 'prev'],
        model.order.map((id) => [id, distLabel(dist.get(id) ?? Infinity), prev.get(id) ?? '—']),
        highlight?.row === undefined ? undefined : { row: highlight.row },
      );

    const rowOf = (id: string): number => model.order.indexOf(id);

    let caption = `Dijkstra from ${source}: settle the cheapest node, then relax its edges`;
    let highlightRow: number | undefined = rowOf(source);

    const builder = new TraceBuilder<GraphSnapshot, DijkstraData>(() => {
      painter.apply(model);
      for (const id of model.order) {
        const value = dist.get(id) ?? Number.POSITIVE_INFINITY;
        model.setNodeBadge(id, settled.has(id) ? distLabel(value) : value === Number.POSITIVE_INFINITY ? distLabel(value) : `(${value})`);
      }
      return model.snapshot({
        caption,
        table: tableFor(highlightRow === undefined ? undefined : { row: highlightRow }),
        badges: { nodes: model.size, settled: settled.size, frontier: model.size - settled.size },
      });
    });

    markTerminals(model, view.start, view.end);
    painter.setNode(source, 'active');
    model.setNodeSub(source, 'start');

    builder.emit({
      kind: 'init',
      description: `dist[${source}] ← 0 and every other node ← ∞. Nothing is settled yet, so the greedy choice is free.`,
      highlight: { nodes: [source] },
      pseudocodeLine: 1,
      codeLine: 4,
      weight: 1.5,
      bump: ['writes'],
    });

    while (settled.size < model.size) {
      let u: string | undefined;
      for (const id of model.order) {
        if (settled.has(id)) continue;
        if (u === undefined || (dist.get(id) ?? Infinity) < (dist.get(u) ?? Infinity)) u = id;
      }
      if (u === undefined || !Number.isFinite(dist.get(u) ?? Infinity)) break;

      const uDistance = dist.get(u) as number;
      highlightRow = rowOf(u);
      painter.setNode(u, 'active');
      caption = `extract ${u} at ${uDistance} — the cheapest unfinished node`;

      builder.emit({
        kind: 'frontier',
        description: `Pick ${u}: distance ${uDistance} is the smallest among unsettled nodes, so no future route can beat it.`,
        highlight: { nodes: [u] },
        data: { operation: 'extract', node: u, distance: uDistance },
        pseudocodeLine: 4,
        codeLine: 9,
        weight: 1.4,
        bump: ['comparisons', 'reads'],
      });

      settled.add(u);
      painter.setNode(u, 'visited');
      model.setNodeBadge(u, distLabel(uDistance));
      model.setNodeSub(u, u === view.start ? 'start' : distLabel(uDistance));

      builder.emit({
        kind: 'update',
        description: `${u} is settled at ${uDistance}: its distance is final and it will never enter the queue again.`,
        highlight: { nodes: [u] },
        data: { operation: 'settle', node: u, distance: uDistance },
        pseudocodeLine: 5,
        codeLine: 10,
        weight: 1.5,
        bump: ['writes'],
      });

      for (const neighbour of model.neighbours(u)) {
        if (settled.has(neighbour.id)) {
          painter.setEdge(u, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${neighbour.id} is already settled — relaxations to settled nodes are ignored.`,
            highlight: { nodes: [u, neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'skip', node: neighbour.id, from: u },
            pseudocodeLine: 6,
            codeLine: 12,
            weight: 0.7,
            bump: ['comparisons', 'reads'],
          });
          continue;
        }

        const candidate = uDistance + neighbour.weight;
        const current = dist.get(neighbour.id) ?? Number.POSITIVE_INFINITY;
        highlightRow = rowOf(neighbour.id);
        painter.setEdge(u, neighbour.id, candidate < current ? 'compare' : 'muted');

        builder.emit({
          kind: 'compare',
          description: `Check edge ${u}→${neighbour.id} (w=${neighbour.weight}): ${uDistance} + ${neighbour.weight} = ${candidate} vs known ${distLabel(current)}.`,
          highlight: { nodes: [u, neighbour.id], edges: [`${u}->${neighbour.id}`] },
          data: { operation: 'relax', node: neighbour.id, from: u, distance: candidate },
          pseudocodeLine: 7,
          codeLine: 13,
          weight: 0.95,
          bump: ['comparisons', 'reads'],
        });

        if (candidate < current) {
          dist.set(neighbour.id, candidate);
          prev.set(neighbour.id, u);
          painter.setNode(neighbour.id, 'frontier');
          painter.setEdge(u, neighbour.id, 'path');
          builder.bump('writes', 2);

          builder.emit({
            kind: 'relax',
            description: `Relax ${neighbour.id}: ${candidate} < ${distLabel(current)}, so its distance drops and its parent becomes ${u}.`,
            highlight: { nodes: [neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'relax', node: neighbour.id, from: u, distance: candidate },
            pseudocodeLine: 8,
            codeLine: 14,
            weight: 1.3,
            bump: ['writes'],
          });
        }
      }
      painter.setNode(u, 'visited');
    }

    const reachable = model.order.filter((id) => Number.isFinite(dist.get(id) ?? Infinity));
    const targetDistance = dist.get(view.end) ?? Number.POSITIVE_INFINITY;
    const path: string[] = [];
    for (let cursor: string | undefined = view.end; cursor !== undefined; cursor = prev.get(cursor)) {
      path.unshift(cursor);
      if (cursor === view.start) break;
    }
    const drawable = path[0] === view.start;

    painter.clear();
    if (drawable) {
      const onPath = new Set(path);
      for (const id of model.order) painter.setNode(id, onPath.has(id) ? 'path' : 'muted');
      path.forEach((id, i) => {
        const next = path[i + 1];
        if (next) painter.setEdge(id, next, 'path');
      });
    }
    highlightRow = undefined;
    caption = `Done: ${view.end} costs ${distLabel(targetDistance)} by ${drawable ? path.join(' → ') : 'no route'}`;

    builder.emit({
      kind: 'complete',
      description: caption,
      highlight: { nodes: drawable ? path : [], edges: drawable ? path.slice(1).map((id, i) => `${path[i]}->${id}`) : [] },
      data: { operation: 'done', node: view.end, distance: targetDistance },
      pseudocodeLine: 9,
      codeLine: 17,
      weight: 2.4,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `Shortest path ${view.start} → ${view.end} costs ${distLabel(targetDistance)}`,
        detail: drawable ? path.join(' → ') : 'No route exists',
        output: { distances: Object.fromEntries(dist), path: drawable ? path : [] },
      },
      expectedState: () => settled.size > 0 && reachable.length > 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, DijkstraData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
