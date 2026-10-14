import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { ASTAR_INPUT, COMPLEXITY } from './specs';
import { GraphModel, RolePainter, columnTable, distLabel, markTerminals } from './kit';

export interface AStarData {
  readonly operation: 'expand' | 'score' | 'improve' | 'skip' | 'done';
  readonly node?: string;
  readonly from?: string;
  readonly g?: number;
  readonly h?: number;
  readonly f?: number;
}

/**
 * A* Search.
 *
 * Dijkstra spends its budget expanding in every direction. A* adds one number —
 * `f = g + h`, where `h` estimates the remaining cost to the goal — and the
 * search leans towards the target. The heuristic never over-estimates on this
 * graph, so the first time the goal is expanded, the path found is optimal; the
 * trace prints `g`, `h` and `f` for every candidate so the ordering is never
 * a mystery.
 */
const spec: AlgorithmSpec<GraphSnapshot, AStarData> = {
  id: 'a-star',
  complexity: COMPLEXITY['a-star']!,
  pseudocode: pseudo(`
#aStar(graph, start, goal)
#   g[start] ← 0, g[others] ← ∞
#   h(n) ← straight-line estimate from n to goal       ▸ never over-estimates
#   open ← {start} with f = g + h
#   while open is not empty
#     node ← open.popMin(f)                            ▸ smallest g + h wins
#     if node = goal: return the path                  ▸ optimal, given h
#     for each edge (node, v, w)
#       tentative ← g[node] + w
#       if tentative < g[v]                            ▸ relaxation, as always
#         g[v] ← tentative, parent[v] ← node
#         f[v] ← g[v] + h(v)                           ▸ re-rank in the open set
#   return no route`),
  code: code(
    `
function aStar(adj, start, goal, h) {
  const g = new Map([[start, 0]]);
  const parent = new Map();
  const open = new Set([start]);

  while (open.size > 0) {
    let node = pickLowestF(open, g, h);
    if (node === goal) return rebuild(parent, start, goal);

    open.delete(node);
    for (const { to, weight } of adj[node]) {
      const tentative = g.get(node) + weight;
      if (tentative < (g.get(to) ?? Infinity)) {
        g.set(to, tentative);
        parent.set(to, node);
        open.add(to);
      }
    }
  }

  return null;
}`,
    `
def a_star(adj, start, goal, h):
    g = {start: 0}
    parent = {}
    open_set = {start}

    while open_set:
        node = min(open_set, key=lambda n: g[n] + h(n))
        if node == goal:
            return rebuild(parent, start, goal)

        open_set.remove(node)
        for to, weight in adj[node]:
            tentative = g[node] + weight
            if tentative < g.get(to, float('inf')):
                g[to] = tentative
                parent[to] = node
                open_set.add(to)

    return None`,
    `
vector<string> aStar(const Graph& graph, const string& start, const string& goal) {
  map<string, int> g;
  map<string, string> parent;
  set<string> open{start};
  g[start] = 0;

  while (!open.empty()) {
    string node;
    int best = INT_MAX;
    for (const string& candidate : open) {
      int f = g[candidate] + heuristic(candidate, goal);
      if (f < best) { best = f; node = candidate; }
    }
    if (node == goal) return rebuild(parent, start, goal);

    open.erase(node);
    for (const auto& [to, weight] : graph.at(node)) {
      int tentative = g[node] + weight;
      if (tentative < value_or(g, to, INT_MAX)) {
        g[to] = tentative;
        parent[to] = node;
        open.insert(to);
      }
    }
  }

  return {};
}`,
    `
static List<String> aStar(Map<String, List<int[]>> adj, String start, String goal) {
  Map<String, Integer> g = new HashMap<>();
  Map<String, String> parent = new HashMap<>();
  Set<String> open = new HashSet<>();
  g.put(start, 0);
  open.add(start);

  while (!open.isEmpty()) {
    String node = null;
    for (String candidate : open) {
      if (node == null || g.get(candidate) + h(candidate, goal) < g.get(node) + h(node, goal)) {
        node = candidate;
      }
    }
    if (node.equals(goal)) return rebuild(parent, start, goal);

    open.remove(node);
    for (int[] edge : adj.get(node)) {
      String to = NAMES[edge[0]];
      int tentative = g.get(node) + edge[1];
      if (tentative < g.getOrDefault(to, Integer.MAX_VALUE)) {
        g.put(to, tentative);
        parent.put(to, node);
        open.add(to);
      }
    }
  }

  return null;
}`,
  ),
  explanation: [
    'The priority is f = g + h: cost already paid plus the estimate still owed. Dijkstra is the special case h ≡ 0, which is why A* is “Dijkstra with a sense of direction”.',
    'An admissible heuristic never over-estimates the remaining cost, so the goal can never be popped with a cost that a cheaper route could still beat.',
    'On this lattice the heuristic is a scaled-down Manhattan distance between the authored coordinates — the same trick a map app uses with straight-line kilometres.',
  ],
  learn: {
    useCases: [
      'Game pathfinding on a grid (the classic use) and robot motion planning',
      'Route planners where a landmark or straight-line bound speeds up the query',
      'Puzzle solvers like the 15-puzzle, with “number of misplaced tiles” as h',
    ],
    quiz: [
      {
        question: 'What happens if the heuristic over-estimates?',
        options: ['The search slows down', 'The search speeds up and may return a non-optimal path', 'Nothing', 'The search finds no path'],
        answer: 1,
        why: 'Over-estimating makes A* impatient: it may settle the goal before a genuinely cheaper route is explored. Speed is bought with optimality.',
      },
      {
        question: 'Where can A* still expand nodes that Dijkstra would not?',
        options: ['Nowhere', 'When h is a weak estimate (h ≡ 0), in which case it degenerates to Dijkstra exactly', 'Only with negative weights', 'Only on trees'],
        answer: 1,
        why: 'The ordering is identical to Dijkstra when h is constant, so the whole benefit comes from the quality of the estimate.',
      },
    ],
    practice: [
      { title: 'Shortest Path in a Grid with Obstacles Elimination', url: 'https://leetcode.com/problems/shortest-path-in-a-grid-with-obstacles-elimination/', difficulty: 'hard' },
    ],
  },
  defaultInput: ASTAR_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const start = view.start;
    const goal = view.end;

    /** Straight-line estimate in the same units as the weights, scaled down. */
    const SCALE = 9;
    const heuristic = (id: string): number => {
      const a = model.node(id);
      const b = model.node(goal);
      if (!a || !b) return 0;
      return Math.round((Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) * SCALE);
    };

    const g = new Map<string, number>(model.order.map((id) => [id, Number.POSITIVE_INFINITY]));
    const parent = new Map<string, string>();
    const open = new Set<string>();
    const closed = new Set<string>();
    g.set(start, 0);
    open.add(start);

    const rowOf = (id: string): number => model.order.indexOf(id);
    let highlightRow: number | undefined = rowOf(start);

    const tableFor = () =>
      columnTable(
        ['node', 'g', 'h', 'f'],
        model.order.map((id) => {
          const cost = g.get(id) ?? Number.POSITIVE_INFINITY;
          const h = heuristic(id);
          return [
            id,
            distLabel(cost),
            h,
            Number.isFinite(cost) ? cost + h : distLabel(Number.POSITIVE_INFINITY),
          ];
        }),
        highlightRow === undefined ? undefined : { row: highlightRow },
      );

    let caption = `A* from ${start} to ${goal}: rank the open set by f = g + h`;

    const builder = new TraceBuilder<GraphSnapshot, AStarData>(() => {
      painter.apply(model);
      for (const id of model.order) {
        const cost = g.get(id) ?? Number.POSITIVE_INFINITY;
        model.setNodeBadge(id, Number.isFinite(cost) ? `${cost}+${heuristic(id)}` : distLabel(cost));
      }
      return model.snapshot({
        caption,
        table: tableFor(),
        badges: { nodes: model.size, open: open.size, closed: closed.size, goal },
      });
    });

    markTerminals(model, view.start, view.end);
    painter.setNode(start, 'active');

    builder.emit({
      kind: 'init',
      description: `g[${start}] = 0 and h(${goal}) = 0 by definition; every other node is unreached until an edge reaches it.`,
      highlight: { nodes: [start] },
      pseudocodeLine: 3,
      codeLine: 4,
      weight: 1.5,
      bump: ['writes'],
    });

    let reached: string[] = [];
    while (open.size > 0) {
      let node: string | undefined;
      let bestF = Number.POSITIVE_INFINITY;
      for (const id of model.order) {
        if (!open.has(id)) continue;
        const f = (g.get(id) ?? Number.POSITIVE_INFINITY) + heuristic(id);
        if (f < bestF) {
          bestF = f;
          node = id;
        }
      }
      if (node === undefined) break;

      const cost = g.get(node) as number;
      const h = heuristic(node);
      highlightRow = rowOf(node);
      open.delete(node);
      painter.setNode(node, 'active');
      caption = `expand ${node}: g=${cost}, h=${h}, f=${bestF}`;

      builder.emit({
        kind: 'frontier',
        description: `Expand ${node} — the smallest f = g + h = ${cost} + ${h} = ${bestF} in the open set.`,
        highlight: { nodes: [node] },
        data: { operation: 'expand', node, g: cost, h, f: bestF },
        pseudocodeLine: 5,
        codeLine: 8,
        weight: 1.5,
        bump: ['comparisons', 'reads'],
      });

      if (node === goal) {
        closed.add(node);
        painter.setNode(node, 'success');
        break;
      }

      closed.add(node);
      painter.setNode(node, 'visited');

      for (const neighbour of model.neighbours(node)) {
        if (closed.has(neighbour.id)) {
          painter.setEdge(node, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${neighbour.id} is already closed — with a consistent heuristic it can never need a second look.`,
            highlight: { nodes: [node, neighbour.id], edges: [`${node}->${neighbour.id}`] },
            data: { operation: 'skip', node: neighbour.id, from: node },
            pseudocodeLine: 7,
            codeLine: 12,
            weight: 0.7,
            bump: ['comparisons', 'reads'],
          });
          continue;
        }

        const tentative = cost + neighbour.weight;
        const known = g.get(neighbour.id) ?? Number.POSITIVE_INFINITY;
        const hNeighbour = heuristic(neighbour.id);
        highlightRow = rowOf(neighbour.id);
        painter.setEdge(node, neighbour.id, tentative < known ? 'compare' : 'muted');
        painter.setNode(neighbour.id, 'frontier');

        builder.emit({
          kind: 'compare',
          description: `Score ${neighbour.id}: g would be ${tentative} (vs ${distLabel(known)}), h = ${hNeighbour}, so f = ${tentative + hNeighbour}.`,
          highlight: { nodes: [node, neighbour.id], edges: [`${node}->${neighbour.id}`] },
          data: { operation: 'score', node: neighbour.id, from: node, g: tentative, h: hNeighbour, f: tentative + hNeighbour },
          pseudocodeLine: 8,
          codeLine: 14,
          weight: 0.85,
          bump: ['comparisons', 'reads'],
        });

        if (tentative < known) {
          g.set(neighbour.id, tentative);
          parent.set(neighbour.id, node);
          open.add(neighbour.id);
          painter.setEdge(node, neighbour.id, 'path');
          builder.bump('writes', 2);

          builder.emit({
            kind: 'relax',
            description: `Open ${neighbour.id} with g = ${tentative}: f = ${tentative + hNeighbour} puts it in the queue ahead of anything more expensive.`,
            highlight: { nodes: [neighbour.id], edges: [`${node}->${neighbour.id}`] },
            data: { operation: 'improve', node: neighbour.id, from: node, g: tentative, h: hNeighbour, f: tentative + hNeighbour },
            pseudocodeLine: 10,
            codeLine: 15,
            weight: 1.1,
            bump: ['writes'],
          });
        }
      }
    }

    const path: string[] = [];
    for (let cursor: string | undefined = goal; cursor !== undefined; cursor = parent.get(cursor)) {
      path.unshift(cursor);
      if (cursor === start) break;
    }
    const drawable = path[0] === start;
    reached = model.order.filter((id) => Number.isFinite(g.get(id) ?? Number.POSITIVE_INFINITY));

    painter.clear();
    for (const id of model.order) painter.setNode(id, 'muted');
    if (drawable) {
      path.forEach((id, i) => {
        painter.setNode(id, 'path');
        const next = path[i + 1];
        if (next) painter.setEdge(id, next, 'path');
      });
      painter.setNode(start, 'path');
      painter.setNode(goal, 'success');
    }
    highlightRow = undefined;

    const total = g.get(goal) ?? Number.POSITIVE_INFINITY;
    caption = drawable
      ? `Goal ${goal} reached with cost ${total} after expanding ${closed.size} nodes`
      : `No route from ${start} to ${goal}`;

    builder.emit({
      kind: 'complete',
      description: caption,
      highlight: { nodes: drawable ? path : [] },
      data: { operation: 'done', node: goal, g: Number.isFinite(total) ? total : undefined },
      pseudocodeLine: 6,
      codeLine: 9,
      weight: 2.4,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: drawable ? `A* found ${start} → ${goal} at cost ${total}` : 'No route found',
        detail: drawable ? `${path.join(' → ')} — expanded ${closed.size} of ${model.size} nodes` : `Reached ${reached.length} nodes`,
        output: { path: drawable ? path : [], cost: Number.isFinite(total) ? total : null, expanded: [...closed] },
      },
      expectedState: () => open.size >= 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, AStarData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
