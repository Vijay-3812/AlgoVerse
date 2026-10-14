import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, DAG_INPUT } from './specs';
import { GraphModel, RolePainter, markTerminals } from './kit';

export interface TopoDfsData {
  readonly operation: 'descend' | 'skip' | 'finish' | 'cycle' | 'done';
  readonly node?: string;
  readonly from?: string;
  readonly finishTime?: number;
}

/**
 * Topological sort by reverse finish order.
 *
 * A vertex finishes only after every vertex reachable from it has finished. So
 * if you append vertices to the front as their DFS returns, you get an order in
 * which every edge points forwards — same answer as Kahn's peeling, derived
 * from the other end. Two colours do triple duty here: white/grey/black
 * classifies every edge as tree, back, forward or cross.
 */
const spec: AlgorithmSpec<GraphSnapshot, TopoDfsData> = {
  id: 'topological-sort-dfs',
  complexity: COMPLEXITY['topological-sort-dfs']!,
  pseudocode: pseudo(`
#topoDfs(graph)
#   colour ← white for every vertex
#   order ← []
#   visit(u):                                 ▸ recursive helper
#     colour[u] ← grey                        ▸ on the current path
#     for each edge (u → v)
#       if colour[v] = grey: report a cycle   ▸ a back edge
#       if colour[v] = white: visit(v)        ▸ depth first
#     colour[u] ← black
#     order.prepend(u)                        ▸ finished ⇒ everything after it is placed
#   for each white vertex v: visit(v)
#   return order                              ▸ reversed finish times`),
  code: code(
    `
function topoDfs(adj, nodes) {
  const colour = new Map(nodes.map((n) => [n, 'white']));
  const order = [];

  function visit(u) {
    colour.set(u, 'grey');
    for (const { to } of adj[u]) {
      if (colour.get(to) === 'grey') throw new Error('cycle');
      if (colour.get(to) === 'white') visit(to);
    }
    colour.set(u, 'black');
    order.unshift(u);
  }

  for (const node of nodes) if (colour.get(node) === 'white') visit(node);
  return order;
}`,
    `
def topo_dfs(adj, nodes):
    colour = {node: 'white' for node in nodes}
    order = []

    def visit(u):
        colour[u] = 'grey'
        for to, _ in adj[u]:
            if colour[to] == 'grey':
                raise ValueError('cycle')
            if colour[to] == 'white':
                visit(to)
        colour[u] = 'black'
        order.insert(0, u)

    for node in nodes:
        if colour[node] == 'white':
            visit(node)
    return order`,
    `
vector<string> order;

void visit(const map<string, vector<string>>& adj, map<string, string>& colour,
           const string& u) {
  colour[u] = "grey";
  for (const string& to : adj.at(u)) {
    if (colour[to] == "grey") throw runtime_error("cycle");
    if (colour[to] == "white") visit(adj, colour, to);
  }
  colour[u] = "black";
  order.insert(order.begin(), u);
}

vector<string> topoDfs(const map<string, vector<string>>& adj, const vector<string>& nodes) {
  map<string, string> colour;
  for (const string& node : nodes) colour[node] = "white";
  for (const string& node : nodes) if (colour[node] == "white") visit(adj, colour, node);
  return order;
}`,
    `
static List<String> order = new ArrayList<>();

static void visit(Map<String, List<String>> adj, Map<String, String> colour, String u) {
  colour.put(u, "grey");
  for (String to : adj.get(u)) {
    if (colour.get(to).equals("grey")) throw new IllegalStateException("cycle");
    if (colour.get(to).equals("white")) visit(adj, colour, to);
  }
  colour.put(u, "black");
  order.add(0, u);
}

static List<String> topoDfs(Map<String, List<String>> adj, List<String> nodes) {
  Map<String, String> colour = new HashMap<>();
  for (String node : nodes) colour.put(node, "white");
  for (String node : nodes) if (colour.get(node).equals("white")) visit(adj, colour, node);
  return order;
}`,
  ),
  explanation: [
    'Finish time is the key: it is a post-order stamp. Putting vertices at the *front* as they finish is exactly the reverse of finishing order — and every edge must point that way.',
    'Grey means “on the current DFS path”. Meeting a grey neighbour is a back edge, and a back edge in a directed graph is a cycle.',
    'Where Kahn’s version streams the answer out of a queue, this one recurses and can also classify every edge as tree, back, forward or cross while it is there.',
  ],
  learn: {
    useCases: [
      'Dependency ordering when you already need DFS for something else',
      'Detecting cycles in directed graphs during the same pass',
      'Computing the DP order for DAG shortest paths or counting paths',
    ],
    quiz: [
      {
        question: 'Why is the answer the *reverse* of finish order?',
        options: ['A convention', 'A vertex finishes only after everything reachable from it — so it must come earlier in the order, and we prepend it', 'Because DFS visits in reverse', 'To match Kahn'],
        answer: 1,
        why: 'Prepending as you finish is the same statement as “later finish time = earlier position”, which is what makes every edge point forwards.',
      },
    ],
    practice: [{ title: 'Course Schedule II', url: 'https://leetcode.com/problems/course-schedule-ii/', difficulty: 'medium' }],
  },
  defaultInput: DAG_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const nodes = model.order;

    const colour = new Map<string, 'white' | 'grey' | 'black'>(nodes.map((id) => [id, 'white']));
    const order: string[] = [];
    let finishTime = 0;
    let cycleAt: string | undefined;
    const stack: string[] = [];

    let caption = 'White = unvisited, grey = on the current path, black = finished';

    const builder = new TraceBuilder<GraphSnapshot, TopoDfsData>(() => {
      painter.apply(model);
      for (const id of nodes) {
        model.setNodeBadge(id, colour.get(id) === 'black' ? `f${order.indexOf(id) + 1}` : colour.get(id) === 'grey' ? 'grey' : 'white');
      }
      return model.snapshot({
        caption,
        badges: { nodes: model.size, finished: order.length, depth: stack.length, elapsed: finishTime },
      });
    });

    markTerminals(model, view.start, view.end);
    for (const id of nodes) painter.setNode(id, 'idle');

    builder.emit({
      kind: 'init',
      description: `Every vertex starts white. The DFS runs to completion, and each vertex is prepended to the order as it turns black.`,
      highlight: { nodes: [view.start] },
      data: { operation: 'descend', node: view.start },
      pseudocodeLine: 1,
      codeLine: 2,
      weight: 1.4,
      bump: ['writes'],
    });

    const visit = (u: string, depth: number, from: string | null): void => {
      colour.set(u, 'grey');
      stack.push(u);
      builder.setDepth(depth + 1);
      painter.setNode(u, 'active');
      if (from) painter.setEdge(from, u, 'compare');

      builder.emit({
        kind: from === null ? 'info' : 'recurse',
        description:
          from === null
            ? `Start a fresh DFS root at ${u} — it is still white, so nothing has claimed it yet.`
            : `Descend ${from} → ${u}: it turns grey, meaning “on the current path”.`,
        highlight: { nodes: from === null ? [u] : [from, u] },
        data: { operation: 'descend', node: u, ...(from === null ? {} : { from }) },
        pseudocodeLine: from === null ? 8 : 5,
        codeLine: from === null ? 15 : 8,
        weight: 1.1,
        bump: ['calls', 'writes'],
      });

      for (const neighbour of model.neighbours(u)) {
        const state = colour.get(neighbour.id);
        if (state === 'grey') {
          cycleAt = neighbour.id;
          painter.setEdge(u, neighbour.id, 'danger');
          painter.setNode(neighbour.id, 'danger');
          builder.emit({
            kind: 'conflict',
            description: `${u} → ${neighbour.id} points at a *grey* vertex: a back edge, so the graph has a cycle and no topological order exists.`,
            highlight: { nodes: [u, neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'cycle', node: neighbour.id, from: u },
            pseudocodeLine: 4,
            codeLine: 7,
            weight: 2,
            bump: ['comparisons'],
          });
          continue;
        }
        if (state === 'black') {
          painter.setEdge(u, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${neighbour.id} is already black — a cross or forward edge; it is placed later in time but earlier in the order.`,
            highlight: { nodes: [neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'skip', node: neighbour.id, from: u },
            pseudocodeLine: 5,
            codeLine: 8,
            weight: 0.75,
            bump: ['comparisons', 'reads'],
          });
          continue;
        }

        visit(neighbour.id, depth + 1, u);
        painter.setNode(u, 'active');
      }

      colour.set(u, 'black');
      order.unshift(u);
      stack.pop();
      finishTime += 1;
      builder.setDepth(depth);
      painter.setNode(u, 'sorted');
      if (from) painter.setEdge(from, u, 'path');
      model.setNodeSub(u, `f${finishTime}`);

      builder.emit({
        kind: 'topo',
        description: `${u} turns black and is prepended (finish #${finishTime}): everything reachable from it is already placed after it.`,
        highlight: { nodes: [u] },
        data: { operation: 'finish', node: u, finishTime },
        pseudocodeLine: 7,
        codeLine: 10,
        weight: 1.25,
        bump: ['writes'],
      });
    };

    for (const id of nodes) if (colour.get(id) === 'white') visit(id, 0, null);

    for (const id of nodes) {
      colour.set(id, 'black');
      painter.setNode(id, 'sorted');
    }
    caption = cycleAt === undefined
      ? `Reverse finish order: ${order.join(' → ')}`
      : `Cycle through ${cycleAt} — no topological order exists`;

    builder.emit({
      kind: cycleAt === undefined ? 'complete' : 'conflict',
      description: caption,
      highlight: { nodes: cycleAt === undefined ? order : [cycleAt] },
      data: { operation: cycleAt === undefined ? 'done' : 'cycle', ...(cycleAt === undefined ? {} : { node: cycleAt }) },
      pseudocodeLine: 9,
      codeLine: 16,
      weight: 2.3,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: cycleAt === undefined ? `Topological order: ${order.join(' → ')}` : `Cycle through ${cycleAt}`,
        detail: `${order.length} of ${nodes.length} vertices placed by reverse finish time`,
        output: { order, cyclic: cycleAt !== undefined },
      },
      expectedState: () => order.length > 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, TopoDfsData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
