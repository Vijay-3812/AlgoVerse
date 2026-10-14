import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, GRAPH_DEFAULT_INPUT } from './specs';
import { GraphModel, RolePainter, columnTable, distLabel, markTerminals } from './kit';

export interface PrimData {
  readonly operation: 'key' | 'pick' | 'improve' | 'skip' | 'done';
  readonly node?: string;
  readonly from?: string;
  readonly weight?: number;
}

/**
 * Prim's minimum spanning tree.
 *
 * Grow **one** tree. At every step, look at every edge that leaves that tree
 * and take the cheapest: the cut property guarantees such an edge is safe, so
 * the greedy choice can never be regretted. Best for dense graphs, where a
 * simple linear scan of the key array beats sorting the whole edge list.
 */
const spec: AlgorithmSpec<GraphSnapshot, PrimData> = {
  id: 'prim',
  complexity: COMPLEXITY.prim!,
  pseudocode: pseudo(`
#prim(graph, start)
#   key[start] ← 0, key[others] ← ∞      ▸ key[v] = cheapest edge into the tree
#   tree ← ∅
#   while an unvisited node remains
#     u ← unvisited node with the smallest key      ▸ cheapest way to grow
#     tree ← tree ∪ {u}, total ← total + key[u]
#     for each edge (u, v, w)
#       if v ∉ tree and w < key[v]                  ▸ a cheaper door into v
#         key[v] ← w, parent[v] ← u
#       else: keep key[v]                           ▸ v already has a cheaper
#   return the tree edges`),
  code: code(
    `
function prim(adj, nodes, start) {
  const key = new Map(nodes.map((n) => [n, Infinity]));
  const parent = new Map();
  const inTree = new Set();
  key.set(start, 0);

  while (inTree.size < nodes.length) {
    const u = pickMinUnvisited(key, inTree);
    if (u === undefined) break;
    inTree.add(u);

    for (const { to, weight } of adj[u]) {
      if (!inTree.has(to) && weight < key.get(to)) {
        key.set(to, weight);
        parent.set(to, u);
      }
    }
  }

  return { parent, key };
}`,
    `
def prim(adj, nodes, start):
    key = {node: float('inf') for node in nodes}
    parent = {}
    in_tree = set()
    key[start] = 0

    while len(in_tree) < len(nodes):
        u = min((n for n in nodes if n not in in_tree), key=lambda n: key[n], default=None)
        if u is None:
            break
        in_tree.add(u)

        for to, weight in adj[u]:
            if to not in in_tree and weight < key[to]:
                key[to] = weight
                parent[to] = u

    return parent, key`,
    `
map<string, string> prim(const map<string, vector<pair<string, int>>>& adj,
                        const vector<string>& nodes, const string& start) {
  map<string, int> key;
  map<string, string> parent;
  set<string> inTree;
  for (const string& node : nodes) key[node] = INT_MAX;
  key[start] = 0;

  while (inTree.size() < nodes.size()) {
    string u;
    int best = INT_MAX;
    for (const string& node : nodes) {
      if (!inTree.count(node) && key[node] < best) { best = key[node]; u = node; }
    }
    if (u.empty()) break;
    inTree.insert(u);

    for (const auto& [to, weight] : adj.at(u)) {
      if (!inTree.count(to) && weight < key[to]) {
        key[to] = weight;
        parent[to] = u;
      }
    }
  }

  return parent;
}`,
    `
static int[] prim(int[][] weightMatrix, int n, int start) {
  int[] key = new int[n];
  int[] parent = new int[n];
  boolean[] inTree = new boolean[n];
  Arrays.fill(key, Integer.MAX_VALUE);
  Arrays.fill(parent, -1);
  key[start] = 0;

  for (int step = 0; step < n; step++) {
    int u = -1;
    for (int i = 0; i < n; i++) {
      if (!inTree[i] && (u < 0 || key[i] < key[u])) u = i;
    }
    if (u < 0 || key[u] == Integer.MAX_VALUE) break;
    inTree[u] = true;

    for (int v = 0; v < n; v++) {
      if (!inTree[v] && weightMatrix[u][v] < key[v]) {
        key[v] = weightMatrix[u][v];
        parent[v] = u;
      }
    }
  }

  return parent;
}`,
  ),
  explanation: [
    'The cut property: for any split of the vertices into two sets, the cheapest edge crossing the split belongs to some minimum spanning tree. Prim keeps one side of that cut growing.',
    '`key[v]` is a promise — “this is the cheapest edge I know of that would pull v into the tree” — and it only ever decreases.',
    'Everything hinges on weights, not distances: the tree minimises the total edge weight, which is what makes it a spanning *tree* of minimum cost, not a set of shortest paths.',
  ],
  learn: {
    useCases: [
      'Laying cable, fibre or pipe for the cheapest connected network',
      'Cluster analysis: cutting the heaviest MST edges splits data into natural groups',
      'Approximate travelling-salesman tours (a 2-approximation, in fact)',
    ],
    quiz: [
      {
        question: 'How does Prim differ from Dijkstra on the same weighted graph?',
        options: ['It is the same algorithm', 'Dijkstra minimises the distance from the source to each node; Prim minimises the weight of the edge used to attach each node', 'Prim only works on trees', 'Prim requires sorted edges'],
        answer: 1,
        why: 'Both grow a tree from one root with a greedy “cheapest” pick, but they compare different quantities — cumulative path cost vs single edge weight.',
      },
    ],
    practice: [
      { title: 'Min Cost to Connect All Points', url: 'https://leetcode.com/problems/min-cost-to-connect-all-points/', difficulty: 'medium' },
    ],
  },
  defaultInput: GRAPH_DEFAULT_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const start = view.start;
    const nodes = model.order;

    const key = new Map<string, number>(nodes.map((id) => [id, Number.POSITIVE_INFINITY]));
    const parent = new Map<string, string>();
    const inTree = new Set<string>();
    key.set(start, 0);

    const rowOf = (id: string): number => nodes.indexOf(id);
    let highlightRow: number | undefined = rowOf(start);
    let total = 0;

    const tableFor = () =>
      columnTable(
        ['node', 'key', 'parent', 'in tree'],
        nodes.map((id) => [
          id,
          distLabel(key.get(id) ?? Number.POSITIVE_INFINITY),
          parent.get(id) ?? '—',
          inTree.has(id) ? 'yes' : '—',
        ]),
        highlightRow === undefined ? undefined : { row: highlightRow },
      );

    let caption = `Prim from ${start}: always take the cheapest edge leaving the tree`;

    const builder = new TraceBuilder<GraphSnapshot, PrimData>(() => {
      painter.apply(model);
      for (const id of nodes) {
        const value = key.get(id) ?? Number.POSITIVE_INFINITY;
        model.setNodeBadge(id, Number.isFinite(value) ? distLabel(value) : distLabel(value));
      }
      return model.snapshot({
        caption,
        table: tableFor(),
        badges: { nodes: model.size, inTree: inTree.size, total, edges: Math.max(0, inTree.size - 1) },
      });
    });

    markTerminals(model, view.start, view.end);
    painter.setNode(start, 'active');

    builder.emit({
      kind: 'init',
      description: `key[${start}] = 0 makes it the first pick; every other node waits at ∞ until an edge reaches it.`,
      highlight: { nodes: [start] },
      pseudocodeLine: 1,
      codeLine: 4,
      weight: 1.4,
      bump: ['writes'],
    });

    while (inTree.size < nodes.length) {
      let u: string | undefined;
      for (const id of nodes) {
        if (inTree.has(id)) continue;
        if (u === undefined || (key.get(id) ?? Number.POSITIVE_INFINITY) < (key.get(u) ?? Number.POSITIVE_INFINITY)) u = id;
      }
      if (u === undefined || !Number.isFinite(key.get(u) ?? Number.POSITIVE_INFINITY)) break;

      const edgeWeight = key.get(u) as number;
      const from = parent.get(u);
      highlightRow = rowOf(u);
      painter.setNode(u, 'active');
      caption = `add ${u} to the tree via ${edgeWeight}${from ? ` from ${from}` : ''}`;

      builder.emit({
        kind: 'frontier',
        description:
          from === undefined
            ? `${u} is the root of the tree — nothing to pay.`
            : `Cheapest edge on the whole cut is ${from} → ${u} (weight ${edgeWeight}); the cut property says it is safe.`,
        highlight: { nodes: [u], ...(from ? { edges: [`${from}->${u}`] } : {}) },
        data: { operation: 'pick', node: u, ...(from === undefined ? {} : { from }), weight: edgeWeight },
        pseudocodeLine: 4,
        codeLine: 9,
        weight: 1.5,
        bump: ['comparisons', 'reads'],
      });

      inTree.add(u);
      painter.setNode(u, 'path');
      if (from) {
        painter.setEdge(from, u, 'path');
        total += edgeWeight;
      }

      builder.emit({
        kind: 'write',
        description: `${u} joins the tree — ${inTree.size} of ${nodes.length} vertices, running total ${total}.`,
        highlight: { nodes: [u], ...(from ? { edges: [`${from}->${u}`] } : {}) },
        data: { operation: 'pick', node: u, weight: total },
        pseudocodeLine: 5,
        codeLine: 10,
        weight: 1.3,
        bump: ['writes'],
      });

      for (const neighbour of model.neighbours(u)) {
        if (inTree.has(neighbour.id)) {
          painter.setEdge(u, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${neighbour.id} is already in the tree — joining it twice would create a cycle, so the edge is dropped.`,
            highlight: { nodes: [u, neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'skip', node: neighbour.id, from: u },
            pseudocodeLine: 6,
            codeLine: 13,
            weight: 0.7,
            bump: ['comparisons', 'reads'],
          });
          continue;
        }

        const known = key.get(neighbour.id) ?? Number.POSITIVE_INFINITY;
        highlightRow = rowOf(neighbour.id);
        if (neighbour.weight < known) {
          key.set(neighbour.id, neighbour.weight);
          parent.set(neighbour.id, u);
          painter.setEdge(u, neighbour.id, 'compare');
          painter.setNode(neighbour.id, 'frontier');
          builder.bump('writes', 2);

          builder.emit({
            kind: 'relax',
            description: `key[${neighbour.id}] drops from ${distLabel(known)} to ${neighbour.weight} — a cheaper door into it, via ${u}.`,
            highlight: { nodes: [neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'improve', node: neighbour.id, from: u, weight: neighbour.weight },
            pseudocodeLine: 7,
            codeLine: 14,
            weight: 1.05,
            bump: ['writes'],
          });
        } else {
          painter.setEdge(u, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${u} → ${neighbour.id} costs ${neighbour.weight}, not better than the ${distLabel(known)} already promised by another edge.`,
            highlight: { nodes: [neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'skip', node: neighbour.id, from: u, weight: neighbour.weight },
            pseudocodeLine: 8,
            codeLine: 13,
            weight: 0.7,
            bump: ['comparisons'],
          });
        }
      }
      for (const edge of model.edgeList()) painter.setEdge(edge.from, edge.to, undefined);
      for (const [child, owner] of parent) {
        if (inTree.has(child)) painter.setEdge(owner, child, 'path');
      }
      painter.setNode(u, 'sorted');
    }

    highlightRow = undefined;
    painter.clear();
    for (const [child, owner] of parent) {
      painter.setEdge(owner, child, 'path');
      painter.setNode(child, 'sorted');
    }
    painter.setNode(start, 'success');
    caption = `Minimum spanning tree built: ${inTree.size - 1} edges, total weight ${total}`;

    builder.emit({
      kind: 'complete',
      description: caption,
      highlight: { nodes: [...inTree] },
      data: { operation: 'done', weight: total },
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
        headline: `MST total weight ${total}`,
        detail: `${inTree.size - 1} edges span ${inTree.size} of ${nodes.length} vertices`,
        output: { total, parent: Object.fromEntries(parent), inTree: [...inTree] },
      },
      expectedState: () => inTree.size > 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, PrimData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
