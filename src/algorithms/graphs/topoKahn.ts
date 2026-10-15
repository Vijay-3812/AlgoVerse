import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, DAG_INPUT } from './specs';
import { GraphModel, RolePainter, columnTable, markTerminals } from './kit';

export interface TopoKahnData {
  readonly operation: 'degree' | 'enqueue' | 'emit' | 'decrement' | 'cycle' | 'done';
  readonly node?: string;
  readonly from?: string;
  readonly order?: number;
}

/**
 * Topological sort by peeling in-degrees (Kahn's algorithm).
 *
 * Repeatedly remove a vertex with no remaining prerequisites. Every edge is
 * “paid off” exactly once, so the whole run is O(V + E) — and because the queue
 * can only empty early when a cycle swallowed the rest, the same pass doubles
 * as cycle detection. The in-degree column is the star of the trace: watch it
 * fall to zero.
 */
const spec: AlgorithmSpec<GraphSnapshot, TopoKahnData> = {
  id: 'topological-sort-kahn',
  complexity: COMPLEXITY['topological-sort-kahn']!,
  pseudocode: pseudo(`
#kahn(graph)
#   indegree[v] ← number of edges arriving at v
#   queue ← every vertex with indegree 0        ▸ nothing left to wait for
#   order ← []
#   while queue is not empty
#     u ← queue.dequeue()
#     order.append(u)                           ▸ u is now safe to run
#     for each edge (u → v)
#       indegree[v] ← indegree[v] − 1           ▸ one prerequisite satisfied
#       if indegree[v] = 0: queue.enqueue(v)    ▸ v is unblocked
#   if order holds every vertex: return order
#   else: a cycle exists                      ▸ some vertices never reached 0`),
  code: code(
    `
function kahn(adj, nodes) {
  const indegree = new Map(nodes.map((n) => [n, 0]));
  for (const from of nodes) for (const { to } of adj[from]) indegree.set(to, indegree.get(to) + 1);

  const queue = nodes.filter((n) => indegree.get(n) === 0);
  const order = [];

  while (queue.length > 0) {
    const u = queue.shift();
    order.push(u);
    for (const { to } of adj[u]) {
      indegree.set(to, indegree.get(to) - 1);
      if (indegree.get(to) === 0) queue.push(to);
    }
  }

  return order.length === nodes.length ? order : null;
}`,
    `
from collections import deque


def kahn(adj, nodes):
    indegree = {node: 0 for node in nodes}
    for source in nodes:
        for to, _ in adj[source]:
            indegree[to] += 1

    queue = deque(node for node in nodes if indegree[node] == 0)
    order = []

    while queue:
        u = queue.popleft()
        order.append(u)
        for to, _ in adj[u]:
            indegree[to] -= 1
            if indegree[to] == 0:
                queue.append(to)

    return order if len(order) == len(nodes) else None`,
    `
vector<string> kahn(const map<string, vector<string>>& adj, const vector<string>& nodes) {
  map<string, int> indegree;
  for (const string& node : nodes) indegree[node] = 0;
  for (const string& from : nodes) {
    for (const string& to : adj.at(from)) indegree[to] += 1;
  }

  queue<string> ready;
  for (const string& node : nodes) if (indegree[node] == 0) ready.push(node);
  vector<string> order;

  while (!ready.empty()) {
    string u = ready.front();
    ready.pop();
    order.push_back(u);
    for (const string& to : adj.at(u)) {
      if (--indegree[to] == 0) ready.push(to);
    }
  }

  return order.size() == nodes.size() ? order : vector<string>{};
}`,
    `
static List<String> kahn(Map<String, List<String>> adj, List<String> nodes) {
  Map<String, Integer> indegree = new HashMap<>();
  for (String node : nodes) indegree.put(node, 0);
  for (String from : nodes) {
    for (String to : adj.get(from)) indegree.merge(to, 1, Integer::sum);
  }

  Deque<String> ready = new ArrayDeque<>();
  for (String node : nodes) if (indegree.get(node) == 0) ready.add(node);
  List<String> order = new ArrayList<>();

  while (!ready.isEmpty()) {
    String u = ready.poll();
    order.add(u);
    for (String to : adj.get(u)) {
      indegree.merge(to, -1, Integer::sum);
      if (indegree.get(to) == 0) ready.add(to);
    }
  }

  return order.size() == nodes.size() ? order : null;
}`,
  ),
  explanation: [
    'In-degree is a “prerequisites remaining” counter. A vertex is ready exactly when nothing is still pointing at it — which is what makes the order topological by construction.',
    'Decrementing is the payment: every outgoing edge is processed once, so the total work is O(V + E) regardless of the shape of the DAG.',
    'If the queue runs dry before all vertices are emitted, the leftovers form a cycle — Kahn detects it without a separate DFS pass.',
  ],
  learn: {
    useCases: [
      'Build systems and task runners (make, Bazel, GitHub Actions job graphs)',
      'Course-prerequisite planning, and detecting circular module dependencies',
      'Spreadsheet formula evaluation order and package install ordering',
    ],
    quiz: [
      {
        question: 'Is the topological order always unique?',
        options: ['Yes', 'No — any vertex with in-degree 0 may go next, so independent tasks can swap places', 'Only for trees', 'Only when the graph is complete'],
        answer: 1,
        why: 'Kahn emits whatever the queue offers; a tie-break rule (alphabetical, priority) is a policy you add, not part of the algorithm.',
      },
      {
        question: 'What does it mean if the queue empties early?',
        options: ['The graph is disconnected', 'Some remaining vertices are in a cycle and will never reach in-degree 0', 'The input was empty', 'Nothing — it just stops'],
        answer: 1,
        why: 'A cycle has no entry point: each of its vertices keeps at least one incoming edge from inside the cycle forever.',
      },
    ],
    practice: [
      { title: 'Course Schedule II', url: 'https://leetcode.com/problems/course-schedule-ii/', difficulty: 'medium' },
      { title: 'Alien Dictionary', url: 'https://leetcode.com/problems/alien-dictionary/', difficulty: 'hard' },
    ],
  },
  defaultInput: DAG_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const nodes = model.order;

    const indegree = new Map<string, number>(nodes.map((id) => [id, 0]));
    for (const id of nodes) for (const neighbour of model.neighbours(id)) indegree.set(neighbour.id, (indegree.get(neighbour.id) ?? 0) + 1);

    const queue: string[] = nodes.filter((id) => (indegree.get(id) ?? 0) === 0);
    const order: string[] = [];

    const tableFor = (highlight?: string) =>
      columnTable(
        ['node', 'in-degree', 'state'],
        nodes.map((id) => [
          id,
          indegree.get(id) ?? 0,
          order.includes(id) ? 'emitted' : queue.includes(id) ? 'ready' : 'waiting',
        ]),
        highlight === undefined ? undefined : { row: nodes.indexOf(highlight) },
      );

    let caption = 'In-degree 0 means “no prerequisites left”';

    const builder = new TraceBuilder<GraphSnapshot, TopoKahnData>(() => {
      painter.apply(model);
      for (const id of nodes) model.setNodeBadge(id, indegree.get(id) ?? 0);
      return model.snapshot({
        caption,
        table: tableFor(queue[0] ?? nodes[0]),
        badges: { nodes: model.size, ready: queue.length, emitted: order.length, edges: model.edges.length },
      });
    });

    markTerminals(model, view.start, view.end);
    for (const id of nodes) painter.setNode(id, indegree.get(id) === 0 ? 'frontier' : 'idle');

    builder.emit({
      kind: 'init',
      description: `Count incoming edges: ${nodes.map((id) => `${id}:${indegree.get(id) ?? 0}`).join(', ')}. ${queue.length} vertices start unblocked.`,
      highlight: { nodes: queue },
      data: { operation: 'degree' },
      pseudocodeLine: 1,
      codeLine: 3,
      weight: 1.5,
      bump: ['reads', 'writes'],
    });

    for (const id of queue) {
      painter.setNode(id, 'frontier');
      model.setNodeSub(id, 'ready');
    }

    builder.emit({
      kind: 'enqueue',
      description: `Queue the ${queue.length} vertices with in-degree 0: ${queue.join(', ')}.`,
      highlight: { nodes: queue },
      data: { operation: 'enqueue' },
      pseudocodeLine: 2,
      codeLine: 6,
      weight: 1.2,
      bump: ['writes'],
    });

    while (queue.length > 0) {
      const u = queue.shift() as string;
      order.push(u);
      painter.setNode(u, 'active');
      model.setNodeSub(u, `#${order.length}`);
      model.setNodeBadge(u, order.length);
      caption = `emit ${u} — position ${order.length} in the order`;

      builder.emit({
        kind: 'topo',
        description: `Emit ${u} as position ${order.length}: every prerequisite of ${u} has already been emitted.`,
        highlight: { nodes: [u] },
        data: { operation: 'emit', node: u, order: order.length },
        pseudocodeLine: 5,
        codeLine: 11,
        weight: 1.4,
        bump: ['reads'],
      });

      for (const neighbour of model.neighbours(u)) {
        const next = (indegree.get(neighbour.id) ?? 0) - 1;
        indegree.set(neighbour.id, next);
        painter.setEdge(u, neighbour.id, next === 0 ? 'path' : 'compare');
        painter.setNode(neighbour.id, next === 0 ? 'frontier' : 'idle');

        builder.emit({
          kind: 'frontier',
          description: `Edge ${u} → ${neighbour.id} is paid off: in-degree ${next + 1} → ${next}${next === 0 ? ', so it becomes ready' : ''}.`,
          highlight: { nodes: [neighbour.id], edges: [`${u}->${neighbour.id}`] },
          data: { operation: 'decrement', node: neighbour.id, from: u },
          pseudocodeLine: 7,
          codeLine: 13,
          weight: 0.95,
          bump: ['comparisons', 'writes'],
        });

        if (next === 0) {
          queue.push(neighbour.id);
          builder.emit({
            kind: 'enqueue',
            description: `${neighbour.id} reaches in-degree 0 — every prerequisite is satisfied, so it joins the queue.`,
            highlight: { nodes: [neighbour.id] },
            data: { operation: 'enqueue', node: neighbour.id },
            pseudocodeLine: 8,
            codeLine: 14,
            weight: 1.15,
            bump: ['writes'],
          });
        }
      }
      painter.setNode(u, 'sorted');
      model.setNodeSub(u, `#${order.length}`);
    }

    const cyclic = order.length !== nodes.length;
    const stuck = nodes.filter((id) => !order.includes(id));
    caption = cyclic
      ? `Cycle detected: ${stuck.length} vertices never reached in-degree 0`
      : `Topological order for ${order.length} vertices: ${order.join(' → ')}`;

    if (cyclic) for (const id of stuck) {
      painter.setNode(id, 'danger');
      model.setNodeSub(id, `in-degree ${indegree.get(id) ?? 0}`);
    } else for (const id of nodes) painter.setNode(id, 'sorted');

    builder.emit({
      kind: cyclic ? 'conflict' : 'complete',
      description: caption,
      highlight: { nodes: cyclic ? stuck : order },
      data: { operation: cyclic ? 'cycle' : 'done' },
      pseudocodeLine: 10,
      codeLine: 17,
      weight: 2.3,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: cyclic ? 'Cycle — no topological order exists' : `Topological order: ${order.join(' → ')}`,
        detail: cyclic ? `Vertices still waiting: ${stuck.join(', ')}` : `${order.length} of ${nodes.length} vertices emitted`,
        output: { order, cyclic },
      },
      expectedState: () => order.length > 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, TopoKahnData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
