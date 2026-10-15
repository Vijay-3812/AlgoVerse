import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, GRAPH_DEFAULT_INPUT } from './specs';
import { GraphModel, RolePainter, markTerminals } from './kit';

export interface CycleDetectionData {
  readonly operation: 'descend' | 'skip-parent' | 'skip-black' | 'cycle' | 'return' | 'done';
  readonly node?: string;
  readonly from?: string;
  readonly depth?: number;
}

/**
 * Cycle detection with DFS colouring.
 *
 * Three colours do all the work. **White** = never seen, **grey** = on the
 * current DFS path, **black** = fully explored. An edge that lands on grey is a
 * back edge, and a back edge closes a cycle. The subtlety of undirected graphs —
 * the edge you arrived on must not count — is shown explicitly as the parent
 * check, because forgetting it is the classic bug.
 */
const spec: AlgorithmSpec<GraphSnapshot, CycleDetectionData> = {
  id: 'cycle-detection',
  complexity: COMPLEXITY['cycle-detection']!,
  pseudocode: pseudo(`
#hasCycle(graph)
#   colour ← white for every vertex
#   visit(u, parent):
#     colour[u] ← grey                    ▸ on the current path
#     for each edge (u, v)
#       if v = parent: skip               ▸ the edge we arrived on is not a cycle
#       if colour[v] = grey
#         return true                     ▸ back edge ⇒ cycle
#       if colour[v] = white and visit(v, u)
#         return true
#     colour[u] ← black                   ▸ fully explored, no cycle below
#     return false
#   for each white vertex: visit(v, none)
#   return false`),
  code: code(
    `
function hasCycle(adj, nodes) {
  const colour = new Map(nodes.map((n) => [n, 'white']));

  function visit(u, parent) {
    colour.set(u, 'grey');
    for (const { to } of adj[u]) {
      if (to === parent) continue;
      if (colour.get(to) === 'grey') return true;
      if (colour.get(to) === 'white' && visit(to, u)) return true;
    }
    colour.set(u, 'black');
    return false;
  }

  for (const node of nodes) {
    if (colour.get(node) === 'white' && visit(node, null)) return true;
  }

  return false;
}`,
    `
def has_cycle(adj, nodes):
    colour = {node: 'white' for node in nodes}

    def visit(u, parent):
        colour[u] = 'grey'
        for to, _ in adj[u]:
            if to == parent:
                continue
            if colour[to] == 'grey':
                return True
            if colour[to] == 'white' and visit(to, u):
                return True
        colour[u] = 'black'
        return False

    for node in nodes:
        if colour[node] == 'white' and visit(node, None):
            return True

    return False`,
    `
bool visit(const map<string, vector<string>>& adj, map<string, string>& colour,
           const string& u, const string& parent) {
  colour[u] = "grey";
  for (const string& to : adj.at(u)) {
    if (to == parent) continue;
    if (colour[to] == "grey") return true;
    if (colour[to] == "white" && visit(adj, colour, to, u)) return true;
  }
  colour[u] = "black";
  return false;
}

bool hasCycle(const map<string, vector<string>>& adj, const vector<string>& nodes) {
  map<string, string> colour;
  for (const string& node : nodes) colour[node] = "white";
  for (const string& node : nodes) {
    if (colour[node] == "white" && visit(adj, colour, node, "")) return true;
  }
  return false;
}`,
    `
static boolean hasCycle(Map<String, List<String>> adj, List<String> nodes) {
  Map<String, String> colour = new HashMap<>();
  for (String node : nodes) colour.put(node, "white");
  for (String node : nodes) {
    if (colour.get(node).equals("white") && visit(adj, colour, node, null)) return true;
  }
  return false;
}

static boolean visit(Map<String, List<String>> adj, Map<String, String> colour,
                     String u, String parent) {
  colour.put(u, "grey");
  for (String to : adj.get(u)) {
    if (to.equals(parent)) continue;
    if (colour.get(to).equals("grey")) return true;
    if (colour.get(to).equals("white") && visit(adj, colour, to, u)) return true;
  }
  colour.put(u, "black");
  return false;
}`,
  ),
  explanation: [
    'Grey is the whole trick: an edge back into the *current* path means a loop closes there. Black neighbours are dead ends — they were explored and found nothing.',
    'Undirected edges appear in both directions, so the edge you arrived on must be excluded by the parent check; without it, every single edge looks like a cycle of length two.',
    'The same colouring powers topological sort (a cycle ⇒ no order) and Tarjan’s low-link values, which is why DFS colouring is worth learning once, properly.',
  ],
  learn: {
    useCases: [
      'Validating dependency and import graphs before a build',
      'Detecting deadlocks in resource-allocation (wait-for) graphs',
      'Rejecting invalid tournament/round-robin schedules',
    ],
    quiz: [
      {
        question: 'Why is the parent check needed only in undirected graphs?',
        options: ['It is always needed', 'Because an undirected edge is stored in both directions, so without the check the vertex you came from looks like a grey neighbour — a false cycle', 'Because directed graphs have no parents', 'It is not needed at all'],
        answer: 1,
        why: 'In a directed graph the reverse edge simply may not exist, so there is nothing to exclude.',
      },
      {
        question: 'What does a cycle look like in this colouring?',
        options: ['Two black vertices', 'An edge into a grey vertex — the loop closes on the current DFS path', 'A white vertex with two parents', 'Nothing visible'],
        answer: 1,
        why: 'Grey means “still on the path from the root to the current vertex”, so an edge to grey re-enters that path and creates a cycle.',
      },
    ],
    practice: [{ title: 'Redundant Connection', url: 'https://leetcode.com/problems/redundant-connection/', difficulty: 'medium' }],
  },
  defaultInput: GRAPH_DEFAULT_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const nodes = model.order;

    const colour = new Map<string, 'white' | 'grey' | 'black'>(nodes.map((id) => [id, 'white']));
    const stack: string[] = [];
    let cycleEdge: string | undefined;

    let caption = 'White = unvisited, grey = on the current path, black = finished with no cycle';

    const builder = new TraceBuilder<GraphSnapshot, CycleDetectionData>(() => {
      painter.apply(model);
      for (const id of nodes) {
        const state = colour.get(id);
        model.setNodeBadge(id, state === 'grey' ? 'grey' : state === 'black' ? 'black' : '·');
      }
      return model.snapshot({
        caption,
        badges: { nodes: model.size, edges: model.edges.length, depth: stack.length, grey: [...colour.values()].filter((c) => c === 'grey').length },
      });
    });

    markTerminals(model, view.start, view.end);

    const visit = (u: string, parent: string | null, depth: number): boolean => {
      colour.set(u, 'grey');
      stack.push(u);
      builder.setDepth(depth + 1);
      painter.setNode(u, 'active');
      if (parent) painter.setEdge(parent, u, 'path');

      builder.emit({
        kind: parent === null ? 'init' : 'recurse',
        description:
          parent === null
            ? `Enter ${u} as a fresh root: it turns grey and joins the current path.`
            : `Descend ${parent} → ${u}: grey means “on the path”, so a later edge back here would close a cycle.`,
        highlight: { nodes: parent === null ? [u] : [parent, u] },
        data: { operation: 'descend', node: u, ...(parent === null ? {} : { from: parent }), depth },
        pseudocodeLine: parent === null ? 1 : 6,
        codeLine: parent === null ? 1 : 10,
        weight: 1.1,
        bump: ['calls', 'writes'],
      });

      for (const neighbour of model.neighbours(u)) {
        if (neighbour.id === parent) {
          painter.setEdge(u, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${u} → ${neighbour.id} is the edge we arrived on — skip it, otherwise every edge would look like a 2-cycle.`,
            highlight: { nodes: [u, neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'skip-parent', node: neighbour.id, from: u },
            pseudocodeLine: 4,
            codeLine: 5,
            weight: 0.7,
            bump: ['comparisons', 'reads'],
          });
          continue;
        }

        const state = colour.get(neighbour.id);
        if (state === 'grey') {
          cycleEdge = `${u}->${neighbour.id}`;
          painter.setEdge(u, neighbour.id, 'danger');
          painter.setNode(neighbour.id, 'danger');
          builder.emit({
            kind: 'conflict',
            description: `${u} → ${neighbour.id} lands on a grey vertex: a back edge into the current path, so the graph contains a cycle.`,
            highlight: { nodes: [u, neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'cycle', node: neighbour.id, from: u },
            pseudocodeLine: 5,
            codeLine: 6,
            weight: 2.1,
            bump: ['comparisons'],
          });
          return true;
        }

        if (state === 'black') {
          painter.setEdge(u, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${neighbour.id} is black — already fully explored and cycle-free, so this edge is a harmless cross edge.`,
            highlight: { nodes: [neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'skip-black', node: neighbour.id, from: u },
            pseudocodeLine: 7,
            codeLine: 8,
            weight: 0.7,
            bump: ['comparisons'],
          });
          continue;
        }

        if (visit(neighbour.id, u, depth + 1)) return true;
        painter.setNode(u, 'active');
      }

      colour.set(u, 'black');
      stack.pop();
      builder.setDepth(depth);
      painter.setNode(u, 'sorted');
      if (parent) painter.setEdge(parent, u, 'path');

      builder.emit({
        kind: 'return',
        description: `${u} is finished with no cycle below it — colour it black and backtrack.`,
        highlight: { nodes: [u] },
        data: { operation: 'return', node: u, depth },
        pseudocodeLine: 8,
        codeLine: 11,
        weight: 0.95,
        bump: ['reads'],
      });
      return false;
    };

    let found = false;
    for (const id of nodes) {
      if (colour.get(id) !== 'white') continue;
      if (visit(id, null, 0)) {
        found = true;
        break;
      }
    }

    if (found) {
      for (const id of stack) painter.setNode(id, 'danger');
      caption = `Cycle found: the back edge ${cycleEdge ?? ''} re-enters the current path`;
    } else {
      for (const id of nodes) painter.setNode(id, 'sorted');
      caption = 'No cycle: the DFS finished every vertex without ever meeting a grey neighbour';
    }

    builder.emit({
      kind: found ? 'found' : 'complete',
      description: caption,
      highlight: { nodes: found ? stack : nodes },
      data: { operation: found ? 'cycle' : 'done' },
      pseudocodeLine: 10,
      codeLine: 14,
      weight: 2.3,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: found ? `Cycle detected via ${cycleEdge ?? 'a back edge'}` : 'Graph is acyclic',
        detail: found ? `The current DFS path was ${stack.join(' → ')}` : `All ${nodes.length} vertices finished black`,
        output: { hasCycle: found, backEdge: cycleEdge ?? null },
      },
      expectedState: () => colour.size === nodes.length,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, CycleDetectionData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
