import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { ALL_PAIRS_INPUT, COMPLEXITY } from './specs';
import { GraphModel, RolePainter, distLabel, markTerminals } from './kit';

export interface FloydWarshallData {
  readonly operation: 'init' | 'candidate' | 'improve' | 'keep' | 'round' | 'done';
  readonly i?: string;
  readonly j?: string;
  readonly k?: string;
  readonly distance?: number;
}

/**
 * Floyd–Warshall — all pairs at once.
 *
 * Three nested loops and one sentence: “the best route from i to j either
 * avoids k, or goes i → k → j”. The interesting part is the *order* — k is the
 * outermost loop, so after round k the matrix is exactly the answer for paths
 * allowed to use the first k vertices. That makes the matrix itself the
 * visualisation: the graph stays on screen, and the distance table updates
 * cell by cell behind it.
 */
const spec: AlgorithmSpec<GraphSnapshot, FloydWarshallData> = {
  id: 'floyd-warshall',
  complexity: COMPLEXITY['floyd-warshall']!,
  pseudocode: pseudo(`
#floydWarshall(graph)
#   D[i][j] ← w(i, j) if the edge exists, ∞ otherwise, 0 on the diagonal
#   for k in vertices                        ▸ k is the *outer* loop
#     for i in vertices
#       for j in vertices
#         through ← D[i][k] + D[k][j]
#         if through < D[i][j]               ▸ driving through k wins
#           D[i][j] ← through
#         else: keep D[i][j]                 ▸ the direct route still wins
#   return D                                 ▸ every pair, one matrix`),
  code: code(
    `
function floydWarshall(nodes, edges) {
  const n = nodes.length;
  const D = nodes.map(() => nodes.map(() => Infinity));
  nodes.forEach((_, i) => { D[i][i] = 0; });
  for (const { from, to, weight } of edges) D[nodes.indexOf(from)][nodes.indexOf(to)] = weight;

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const through = D[i][k] + D[k][j];
        if (through < D[i][j]) D[i][j] = through;
      }
    }
  }

  return D;
}`,
    `
def floyd_warshall(nodes, edges):
    n = len(nodes)
    index = {node: i for i, node in enumerate(nodes)}
    D = [[float('inf')] * n for _ in range(n)]
    for i in range(n):
        D[i][i] = 0
    for source, to, weight in edges:
        D[index[source]][index[to]] = weight

    for k in range(n):
        for i in range(n):
            for j in range(n):
                through = D[i][k] + D[k][j]
                if through < D[i][j]:
                    D[i][j] = through

    return D`,
    `
vector<vector<int>> floydWarshall(int n, const vector<Edge>& edges) {
  vector<vector<int>> D(n, vector<int>(n, INT_MAX));
  for (int i = 0; i < n; ++i) D[i][i] = 0;
  for (const Edge& e : edges) D[e.from][e.to] = e.weight;

  for (int k = 0; k < n; ++k) {
    for (int i = 0; i < n; ++i) {
      for (int j = 0; j < n; ++j) {
        if (D[i][k] == INT_MAX || D[k][j] == INT_MAX) continue;
        int through = D[i][k] + D[k][j];
        if (through < D[i][j]) D[i][j] = through;
      }
    }
  }

  return D;
}`,
    `
static int[][] floydWarshall(int n, int[][] edges) {
  int[][] d = new int[n][n];
  for (int[] row : d) Arrays.fill(row, Integer.MAX_VALUE / 4);
  for (int i = 0; i < n; i++) d[i][i] = 0;

  for (int[] e : edges) {
    d[e[0]][e[1]] = e[2];
  }

  for (int k = 0; k < n; k++) {
    for (int i = 0; i < n; i++) {
      for (int j = 0; j < n; j++) {
        int through = d[i][k] + d[k][j];
        if (through < d[i][j]) d[i][j] = through;
      }
    }
  }

  return d;
}`,
  ),
  explanation: [
    'The outer loop over k is the whole trick: after round k the matrix holds the exact answer for paths whose intermediate vertices are all drawn from {0…k}.',
    'Because the recurrence reads only row k and column k, updating the matrix in place is safe — no third dimension is needed.',
    'It also answers questions Dijkstra cannot: “all pairs”, “is there a route”, and (with the diagonal) “is there a negative cycle passing through me”.',
  ],
  learn: {
    useCases: [
      'Pre-computing a routing table once so every later query is O(1)',
      'Transitive closure (reachability) by replacing min with OR',
      'Detecting negative cycles anywhere in the graph: any D[i][i] < 0 says so',
    ],
    quiz: [
      {
        question: 'Why must k be the outermost loop?',
        options: ['Cache friendliness', 'Because round k must be complete for every pair before k+1 builds on it — swapping the loops breaks the recurrence', 'It does not matter', 'To keep the diagonal intact'],
        answer: 1,
        why: 'With i or j outermost, a later k could read a cell that still mixes intermediate vertices from a different round.',
      },
    ],
    practice: [
      { title: 'Find the City With the Smallest Number of Neighbors', url: 'https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/', difficulty: 'medium' },
    ],
  },
  defaultInput: ALL_PAIRS_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const nodes = model.order;
    const n = nodes.length;
    const indexOf = new Map(nodes.map((id, i) => [id, i]));

    const INF = Number.POSITIVE_INFINITY;
    const dist: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)),
    );
    for (const edge of model.edgeList()) {
      const i = indexOf.get(edge.from) ?? 0;
      const j = indexOf.get(edge.to) ?? 0;
      dist[i]![j] = edge.weight;
    }

    let caption = 'Floyd–Warshall builds one V × V matrix of all-pairs distances';
    let activeRow = -1;
    let activeCol = -1;

    const tableFor = () => ({
      headers: ['from \\ to', ...nodes],
      rows: nodes.map((id, i) => [id, ...(dist[i] ?? []).map((value) => distLabel(value))]),
      ...(activeRow >= 0 ? { highlightRow: activeRow } : {}),
      ...(activeCol >= 0 ? { highlightCol: activeCol + 1 } : {}),
    });

    const builder = new TraceBuilder<GraphSnapshot, FloydWarshallData>(() => {
      painter.apply(model);
      return model.snapshot({
        caption,
        table: tableFor(),
        badges: {
          nodes: n,
          pairs: n * n,
          ...(activeRow >= 0 ? { i: nodes[activeRow] as string } : {}),
          ...(activeCol >= 0 ? { j: nodes[activeCol] as string } : {}),
        },
      });
    });

    markTerminals(model, view.start, view.end);
    painter.setNode(view.start, 'active');

    builder.emit({
      kind: 'init',
      description: `Start from the adjacency matrix: 0 on the diagonal, edge weights where an edge exists, ∞ everywhere else.`,
      highlight: { nodes: [view.start] },
      pseudocodeLine: 1,
      codeLine: 4,
      weight: 1.5,
      bump: ['writes'],
    });

    for (let k = 0; k < n; k += 1) {
      const kId = nodes[k] as string;
      painter.clear();
      painter.setNode(kId, 'pivot');
      caption = `round k = ${kId}: every pair is re-checked against a route through ${kId}`;

      builder.emit({
        kind: 'info',
        description: `Round k = ${kId}: from here on, paths may use {${nodes.slice(0, k + 1).join(', ')}} as intermediate vertices.`,
        highlight: { nodes: [kId] },
        data: { operation: 'round', k: kId },
        pseudocodeLine: 2,
        codeLine: 7,
        weight: 1.3,
        bump: ['reads'],
      });

      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          if (i === j) continue;
          const through = (dist[i]?.[k] ?? INF) + (dist[k]?.[j] ?? INF);
          activeRow = i;
          activeCol = j;
          const iId = nodes[i] as string;
          const jId = nodes[j] as string;
          const current = dist[i]?.[j] ?? INF;

          painter.setEdge(iId, kId, 'compare');
          painter.setEdge(kId, jId, 'compare');
          painter.setNode(iId, 'active');

          builder.emit({
            kind: 'compare',
            description: `D[${iId}][${jId}] = ${distLabel(current)} vs D[${iId}][${kId}] + D[${kId}][${jId}] = ${distLabel(dist[i]?.[k] ?? INF)} + ${distLabel(dist[k]?.[j] ?? INF)} = ${distLabel(through)}.`,
            highlight: { nodes: [iId, kId, jId] },
            data: { operation: 'candidate', i: iId, j: jId, k: kId, distance: through },
            pseudocodeLine: 5,
            codeLine: 14,
            weight: 0.55,
            bump: ['comparisons', 'reads'],
          });

          if (through < current) {
            dist[i]![j] = through;
            builder.bump('writes');

            builder.emit({
              kind: 'relax',
              description: `${iId} → ${kId} → ${jId} is cheaper: D[${iId}][${jId}] drops from ${distLabel(current)} to ${distLabel(through)}.`,
              highlight: { nodes: [iId, kId, jId] },
              data: { operation: 'improve', i: iId, j: jId, k: kId, distance: through },
              pseudocodeLine: 6,
              codeLine: 15,
              weight: 1.05,
              bump: ['writes'],
            });
          }
        }
      }
    }

    activeRow = -1;
    activeCol = -1;
    painter.clear();
    const negative = nodes.findIndex((_, i) => (dist[i]?.[i] ?? 0) < 0);
    for (const id of nodes) painter.setNode(id, 'visited');

    const pairs = view.start !== view.end ? `${view.start} → ${view.end} = ${distLabel(dist[indexOf.get(view.start) ?? 0]?.[indexOf.get(view.end) ?? 0] ?? INF)}` : 'all pairs resolved';
    caption = negative >= 0 ? `negative cycle through ${nodes[negative] as string}` : `All-pairs distances final: ${pairs}`;

    builder.emit({
      kind: 'complete',
      description: caption,
      highlight: { nodes: [view.start, view.end] },
      data: { operation: 'done', distance: dist[indexOf.get(view.start) ?? 0]?.[indexOf.get(view.end) ?? 0] },
      pseudocodeLine: 8,
      codeLine: 16,
      weight: 2.4,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: negative >= 0 ? 'Negative cycle detected' : `${n}×${n} distance matrix complete`,
        detail: pairs,
        output: { matrix: dist.map((row) => row.map((value) => (Number.isFinite(value) ? value : null))) },
      },
      expectedState: () => dist.every((row) => row.length === n),
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, FloydWarshallData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
