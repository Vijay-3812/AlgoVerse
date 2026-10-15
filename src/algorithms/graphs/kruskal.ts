import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, GRAPH_DEFAULT_INPUT } from './specs';
import { GraphModel, RolePainter, columnTable, markTerminals } from './kit';

export interface KruskalData {
  readonly operation: 'sort' | 'consider' | 'accept' | 'reject' | 'find' | 'union' | 'done';
  readonly from?: string;
  readonly to?: string;
  readonly weight?: number;
  readonly root?: string;
}

/**
 * Kruskal's minimum spanning tree, with a union-find.
 *
 * Sort the edges once, then walk the list: keep an edge unless its endpoints are
 * already connected. That single test replaces “does adding this create a
 * cycle”, and the disjoint-set forest answers it in almost constant time — two
 * one-line tricks (union by size, path compression) are doing all the work. The
 * side panel shows the forest as it merges, so the components are never a
 * mystery.
 */
const spec: AlgorithmSpec<GraphSnapshot, KruskalData> = {
  id: 'kruskal',
  complexity: COMPLEXITY.kruskal!,
  pseudocode: pseudo(`
#kruskal(graph)
#   sort edges by weight ascending             ▸ cheapest candidates first
#   DSU ← every vertex in its own set
#   for each edge (u, v, w) in sorted order
#     ru ← find(u), rv ← find(v)               ▸ climb to each root
#     if ru = rv
#       skip the edge                          ▸ same set ⇒ it would close a cycle
#     else
#       union(ru, rv)                          ▸ attach the smaller tree to the larger
#       accept the edge into the MST
#   return the accepted edges`),
  code: code(
    `
function kruskal(nodes, edges) {
  const parent = new Map(nodes.map((n) => [n, n]));
  const size = new Map(nodes.map((n) => [n, 1]));
  const mst = [];

  function find(x) {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  }

  for (const edge of [...edges].sort((a, b) => a.weight - b.weight)) {
    const ru = find(edge.from), rv = find(edge.to);
    if (ru === rv) continue;
    if (size.get(ru) < size.get(rv)) { const t = ru; ru = rv; rv = t; }
    parent.set(rv, ru);
    size.set(ru, size.get(ru) + size.get(rv));
    mst.push(edge);
  }

  return mst;
}`,
    `
def kruskal(nodes, edges):
    parent = {node: node for node in nodes}
    size = {node: 1 for node in nodes}
    mst = []

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for source, to, weight in sorted(edges, key=lambda e: e[2]):
        ru, rv = find(source), find(to)
        if ru == rv:
            continue
        if size[ru] < size[rv]:
            ru, rv = rv, ru
        parent[rv] = ru
        size[ru] += size[rv]
        mst.append((source, to, weight))

    return mst`,
    `
struct DSU {
  map<string, string> parent;
  map<string, int> size;
  string find(string x) {
    while (parent[x] != x) { x = parent[x]; }
    return x;
  }
  void unite(const string& a, const string& b) {
    string ra = find(a), rb = find(b);
    if (ra == rb) return;
    if (size[ra] < size[rb]) swap(ra, rb);
    parent[rb] = ra;
    size[ra] += size[rb];
  }
};

vector<Edge> kruskal(vector<string> nodes, vector<Edge> edges) {
  DSU dsu;
  for (const string& node : nodes) { dsu.parent[node] = node; dsu.size[node] = 1; }
  sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b) { return a.weight < b.weight; });

  vector<Edge> mst;
  for (const Edge& e : edges) {
    if (dsu.find(e.from) == dsu.find(e.to)) continue;
    dsu.unite(e.from, e.to);
    mst.push_back(e);
  }

  return mst;
}`,
    `
static int kruskal(int n, int[][] edges) {
  int[] parent = new int[n];
  int[] size = new int[n];
  for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
  Arrays.sort(edges, (a, b) -> Integer.compare(a[2], b[2]));

  int total = 0;
  for (int[] e : edges) {
    int ru = find(parent, e[0]);
    int rv = find(parent, e[1]);
    if (ru == rv) continue;
    if (size[ru] < size[rv]) { int t = ru; ru = rv; rv = t; }
    parent[rv] = ru;
    size[ru] += size[rv];
    total += e[2];
  }

  return total;
}

static int find(int[] parent, int x) {
  while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
  return x;
}`,
  ),
  explanation: [
    'Sorting turns “which edge is safest?” into “the next one in the list”, and the cut property guarantees the cheapest edge that joins two different components is always safe.',
    'The union-find answers “are these two already connected?” in near-constant amortised time — that is what keeps Kruskal at O(E log E) instead of O(E·V).',
    'Union by size alone keeps trees shallow (height ≤ log n); adding path compression on every find makes the cost effectively α(n) — under 4 for any input you can store.',
  ],
  learn: {
    useCases: [
      'Network design where the edge list is sparse or already available as data',
      'Single-linkage clustering (stop Kruskal early and the components are the clusters)',
      'Kruskal is also the natural place to meet union-find, which reappears in connectivity and cycle questions',
    ],
    quiz: [
      {
        question: 'Why can Kruskal skip an edge whose endpoints share a root?',
        options: ['It is too expensive', 'Because a path already connects them, so adding it would close a cycle — and a spanning tree must be acyclic', 'Because the edge is the heaviest so far', 'It never skips edges'],
        answer: 1,
        why: 'Connectivity is exactly the cycle test on a forest: two nodes are already joined iff adding the edge creates a loop.',
      },
      {
        question: 'What does path compression change?',
        options: ['The order edges are considered', 'The shape of the forest: nodes found along the way are re-pointed straight at the root, making later finds cheaper', 'The answer', 'Nothing measurable'],
        answer: 1,
        why: 'Without it, union by size gives O(log n) finds; with it, the amortised cost collapses to α(n) ≈ 4.',
      },
    ],
    practice: [
      { title: 'Connecting Cities With Minimum Cost', url: 'https://leetcode.com/problems/connecting-cities-with-minimum-cost/', difficulty: 'medium' },
      { title: 'Redundant Connection', url: 'https://leetcode.com/problems/redundant-connection/', difficulty: 'medium' },
    ],
  },
  defaultInput: GRAPH_DEFAULT_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const nodes = model.order;

    // A disjoint-set forest over the vertices, with union by size + compression.
    const parent = new Map<string, string>(nodes.map((id) => [id, id]));
    const size = new Map<string, number>(nodes.map((id) => [id, 1]));

    const find = (x: string): string => {
      let cursor = x;
      while ((parent.get(cursor) ?? cursor) !== cursor) {
        const grand = parent.get(parent.get(cursor) ?? cursor) ?? cursor;
        parent.set(cursor, grand);
        cursor = grand;
      }
      return cursor;
    };

    const sorted = [...model.edgeList()].sort((a, b) => a.weight - b.weight || a.from.localeCompare(b.from));

    const mst: { from: string; to: string; weight: number }[] = [];
    let total = 0;
    let highlightRow: string | undefined;

    const tableFor = () =>
      columnTable(
        ['node', 'parent', 'size'],
        nodes.map((id) => [id, parent.get(id) ?? id, size.get(id) ?? 1]),
        highlightRow === undefined ? undefined : { row: nodes.indexOf(highlightRow) },
      );

    let caption = `${sorted.length} edges sorted by weight: accept the cheap ones, skip anything that closes a cycle`;

    const builder = new TraceBuilder<GraphSnapshot, KruskalData>(() => {
      painter.apply(model);
      return model.snapshot({
        caption,
        table: tableFor(),
        badges: { nodes: model.size, considered: mst.length, total, edges: sorted.length },
      });
    });

    markTerminals(model, view.start, view.end);

    for (const edge of model.edgeList()) painter.setNode(edge.from, undefined);
    painter.setNode(nodes[0] as string, 'active');

    builder.emit({
      kind: 'init',
      description: `Sort the ${sorted.length} edges: ${sorted.slice(0, 5).map((e) => `${e.from}${e.to}(${e.weight})`).join(', ')}… and put every vertex in its own set.`,
      highlight: { nodes: nodes },
      data: { operation: 'sort' },
      pseudocodeLine: 1,
      codeLine: 3,
      weight: 1.5,
      bump: ['writes', 'comparisons'],
    });

    for (const edge of sorted) {
      painter.setEdge(edge.from, edge.to, 'compare');
      painter.setNode(edge.from, 'active');
      painter.setNode(edge.to, 'frontier');
      highlightRow = edge.from;

      builder.emit({
        kind: 'compare',
        description: `Consider ${edge.from} → ${edge.to} (weight ${edge.weight}) — the cheapest edge not yet examined.`,
        highlight: { nodes: [edge.from, edge.to], edges: [`${edge.from}->${edge.to}`] },
        data: { operation: 'consider', from: edge.from, to: edge.to, weight: edge.weight },
        pseudocodeLine: 3,
        codeLine: 14,
        weight: 0.9,
        bump: ['comparisons', 'reads'],
      });

      const ru = find(edge.from);
      const rv = find(edge.to);
      highlightRow = ru;

      builder.emit({
        kind: 'find',
        description: `find(${edge.from}) = ${ru} and find(${edge.to}) = ${rv}: climbing the forest re-points the path straight at each root.`,
        highlight: { nodes: [edge.from, edge.to] },
        data: { operation: 'find', from: edge.from, to: edge.to, root: ru },
        pseudocodeLine: 4,
        codeLine: 16,
        weight: 0.95,
        bump: ['reads', 'comparisons'],
      });

      if (ru === rv) {
        painter.setEdge(edge.from, edge.to, 'danger');
        painter.setNode(edge.from, 'danger');
        painter.setNode(edge.to, 'danger');
        builder.bump('comparisons');

        builder.emit({
          kind: 'not-found',
          description: `${edge.from} and ${edge.to} already share root ${ru} — a path joins them, so this edge would close a cycle. Skipped.`,
          highlight: { nodes: [edge.from, edge.to], edges: [`${edge.from}->${edge.to}`] },
          data: { operation: 'reject', from: edge.from, to: edge.to, weight: edge.weight, root: ru },
          pseudocodeLine: 5,
          codeLine: 17,
          weight: 1.2,
          bump: ['comparisons'],
        });
        painter.setEdge(edge.from, edge.to, undefined);
        continue;
      }

      const [big, small] = (size.get(ru) ?? 1) >= (size.get(rv) ?? 1) ? [ru, rv] : [rv, ru];
      parent.set(small, big);
      size.set(big, (size.get(big) ?? 1) + (size.get(small) ?? 1));
      mst.push(edge);
      total += edge.weight;
      highlightRow = big;

      builder.emit({
        kind: 'union',
        description: `union(${ru}, ${rv}): the smaller set (${small}) is attached under ${big}, then ${edge.from} → ${edge.to} is accepted into the tree.`,
        highlight: { nodes: [edge.from, edge.to], edges: [`${edge.from}->${edge.to}`] },
        data: { operation: 'union', from: edge.from, to: edge.to, weight: edge.weight, root: big },
        pseudocodeLine: 7,
        codeLine: 19,
        weight: 1.4,
        bump: ['writes', 'swaps'],
      });

      painter.setEdge(edge.from, edge.to, 'path');
      painter.setNode(edge.from, 'sorted');
      painter.setNode(edge.to, 'sorted');
    }

    highlightRow = undefined;
    painter.clear();
    for (const edge of mst) {
      painter.setEdge(edge.from, edge.to, 'path');
      painter.setNode(edge.from, 'sorted');
      painter.setNode(edge.to, 'sorted');
    }
    caption = `Kruskal complete: ${mst.length} edges, total weight ${total}`;

    builder.emit({
      kind: 'complete',
      description: caption,
      highlight: { nodes: nodes },
      data: { operation: 'done', weight: total },
      pseudocodeLine: 8,
      codeLine: 22,
      weight: 2.4,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `MST total weight ${total}`,
        detail: mst.map((e) => `${e.from}–${e.to}(${e.weight})`).join(', '),
        output: { edges: mst, total },
      },
      expectedState: () => mst.length > 0 && total > 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, KruskalData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
