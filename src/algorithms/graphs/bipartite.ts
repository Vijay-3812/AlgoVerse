import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, UNWEIGHTED_INPUT } from './specs';
import { GraphModel, RolePainter, markTerminals } from './kit';

export interface BipartiteData {
  readonly operation: 'colour' | 'agree' | 'clash' | 'spread' | 'done';
  readonly node?: string;
  readonly from?: string;
  readonly colour?: 'A' | 'B';
}

/**
 * Bipartite check by two-colouring.
 *
 * A graph is bipartite exactly when it can be split into two independent sets —
 * equivalently, when it contains **no odd cycle**. So the test is a single BFS:
 * paint the source A, paint every neighbour B, and so on. The moment an edge
 * finds both ends the same colour, an odd cycle exists and the answer is no.
 */
const spec: AlgorithmSpec<GraphSnapshot, BipartiteData> = {
  id: 'bipartite-check',
  complexity: COMPLEXITY['bipartite-check']!,
  pseudocode: pseudo(`
#isBipartite(graph)
#   side ← empty for every vertex
#   for each unvisited vertex r          ▸ a disconnected graph needs a loop
#     side[r] ← A, queue ← [r]
#     while queue is not empty
#       u ← queue.dequeue()
#       for each edge (u → v)
#         if side[v] is empty              ▸ v is free: the other side
#           side[v] ← opposite(side[u])
#           queue.enqueue(v)
#         else if side[v] = side[u]
#           return false                   ▸ an edge inside one side ⇒ odd cycle
#   return true`),
  code: code(
    `
function isBipartite(adj, nodes) {
  const side = new Map();

  for (const start of nodes) {
    if (side.has(start)) continue;
    side.set(start, 'A');
    const queue = [start];

    while (queue.length > 0) {
      const u = queue.shift();
      for (const { to } of adj[u]) {
        if (!side.has(to)) {
          side.set(to, side.get(u) === 'A' ? 'B' : 'A');
          queue.push(to);
        } else if (side.get(to) === side.get(u)) {
          return false;
        }
      }
    }
  }

  return true;
}`,
    `
from collections import deque


def is_bipartite(adj, nodes):
    side = {}

    for start in nodes:
        if start in side:
            continue
        side[start] = 'A'
        queue = deque([start])

        while queue:
            u = queue.popleft()
            for to, _ in adj[u]:
                if to not in side:
                    side[to] = 'B' if side[u] == 'A' else 'A'
                    queue.append(to)
                elif side[to] == side[u]:
                    return False

    return True`,
    `
bool isBipartite(const map<string, vector<string>>& adj, const vector<string>& nodes) {
  map<string, char> side;

  for (const string& start : nodes) {
    if (side.count(start)) continue;
    side[start] = 'A';
    queue<string> q;
    q.push(start);

    while (!q.empty()) {
      string u = q.front();
      q.pop();
      for (const string& to : adj.at(u)) {
        if (!side.count(to)) {
          side[to] = side[u] == 'A' ? 'B' : 'A';
          q.push(to);
        } else if (side[to] == side[u]) {
          return false;
        }
      }
    }
  }

  return true;
}`,
    `
static boolean isBipartite(Map<String, List<String>> adj, List<String> nodes) {
  Map<String, Character> side = new HashMap<>();

  for (String start : nodes) {
    if (side.containsKey(start)) continue;
    side.put(start, 'A');
    Deque<String> queue = new ArrayDeque<>();
    queue.add(start);

    while (!queue.isEmpty()) {
      String u = queue.poll();
      for (String to : adj.get(u)) {
        if (!side.containsKey(to)) {
          side.put(to, side.get(u) == 'A' ? 'B' : 'A');
          queue.add(to);
        } else if (side.get(to).equals(side.get(u))) {
          return false;
        }
      }
    }
  }

  return true;
}`,
  ),
  explanation: [
    'Two-colouring *is* the definition: an edge always has to cross between the sets, so a neighbour is forced onto the opposite side.',
    'A clash means an edge with both ends in one set, which is exactly the signature of an odd cycle — a triangle, a 5-cycle, anything odd.',
    'The outer loop matters: real graphs are often disconnected, and every component needs its own starting colour.',
  ],
  learn: {
    useCases: [
      'Conflict-free assignment: two shifts, two interviewers, two channels',
      'Matching problems (job ↔ candidate) which reduce to maximum matching on bipartite graphs',
      'Odd-cycle detection as a prerequisite for bipartite-specific algorithms like Hopcroft–Karp',
    ],
    quiz: [
      {
        question: 'Which graphs are never bipartite?',
        options: ['Trees', 'Any graph containing an odd cycle — a triangle is the smallest example', 'Disconnected graphs', 'Weighted graphs'],
        answer: 1,
        why: 'Every tree and every even cycle is bipartite; the first failure appears at a triangle (or any odd cycle).',
      },
      {
        question: 'Why does the lattice in the default input pass?',
        options: ['By luck', 'Because it is a grid: colour by (row + column) parity, and every edge flips parity — odd cycles cannot exist', 'Because it has no cycles', 'Because it is weighted'],
        answer: 1,
        why: 'Grids are the textbook bipartite graph; parity colouring is the proof.',
      },
    ],
    practice: [{ title: 'Is Graph Bipartite?', url: 'https://leetcode.com/problems/is-graph-bipartite/', difficulty: 'medium' }],
  },
  defaultInput: UNWEIGHTED_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const nodes = model.order;

    const side = new Map<string, 'A' | 'B'>();
    let clash: string | undefined;

    const paintSides = (): void => {
      painter.clear();
      for (const id of nodes) {
        const value = side.get(id);
        if (value === 'A') painter.setNode(id, 'active');
        else if (value === 'B') painter.setNode(id, 'pivot');
        else painter.setNode(id, 'idle');
      }
    };

    const tableRows = () =>
      nodes.map((id) => [id, side.get(id) ?? '—']);

    let caption = 'Colour the source A, every neighbour B, and check the parity';

    const builder = new TraceBuilder<GraphSnapshot, BipartiteData>(() => {
      painter.apply(model);
      for (const id of nodes) model.setNodeBadge(id, side.get(id) ?? '·');
      return model.snapshot({
        caption,
        table: { headers: ['vertex', 'side'], rows: tableRows(), ...(clash ? {} : {}) },
        badges: {
          nodes: model.size,
          edges: model.edges.length,
          sideA: [...side.values()].filter((v) => v === 'A').length,
          sideB: [...side.values()].filter((v) => v === 'B').length,
        },
      });
    });

    markTerminals(model, view.start, view.end);

    const start = view.start;

    for (const root of nodes) {
      // A coloured vertex belongs to a component that has already been checked;
      // re-walking it would compare a vertex against itself and invent a clash.
      if (side.has(root)) continue;

      const first = side.size === 0;
      side.set(root, 'A');
      paintSides();
      painter.setNode(root, first ? 'success' : 'active');
      builder.emit({
        kind: 'init',
        description: first
          ? `${root} is painted A — the choice is arbitrary, because flipping every colour gives the same split mirrored.`
          : `${root} had no colour — a new component starts here, painted A.`,
        highlight: { nodes: [root] },
        data: { operation: 'colour', node: root, colour: 'A' },
        pseudocodeLine: first ? 3 : 2,
        codeLine: first ? 7 : 5,
        weight: first ? 1.4 : 1.1,
        bump: ['writes'],
      });

      const queue: string[] = [root];
      while (queue.length > 0) {
        const u = queue.shift() as string;
        const sideU = side.get(u) as 'A' | 'B';
        paintSides();
        painter.setNode(u, 'active');

        for (const neighbour of model.neighbours(u)) {
          const other = sideU === 'A' ? 'B' : 'A';
          const known = side.get(neighbour.id);
          painter.setEdge(u, neighbour.id, 'compare');

          if (known === undefined) {
            side.set(neighbour.id, other);
            queue.push(neighbour.id);
            paintSides();
            painter.setNode(u, 'active');
            painter.setEdge(u, neighbour.id, 'path');

            builder.emit({
              kind: 'frontier',
              description: `${neighbour.id} is uncoloured: an edge must cross sides, so it becomes ${other} and joins the queue.`,
              highlight: { nodes: [neighbour.id], edges: [`${u}->${neighbour.id}`] },
              data: { operation: 'spread', node: neighbour.id, from: u, colour: other },
              pseudocodeLine: 6,
              codeLine: 11,
              weight: 1.05,
              bump: ['writes'],
            });
            continue;
          }

          if (known === sideU) {
            clash = `${u}–${neighbour.id}`;
            painter.setEdge(u, neighbour.id, 'danger');
            painter.setNode(u, 'danger');
            painter.setNode(neighbour.id, 'danger');
            caption = `clash on ${u}–${neighbour.id}: both are ${known}`;

            builder.emit({
              kind: 'conflict',
              description: `${u} and ${neighbour.id} are both ${known}, but an edge must cross between the sides — so the graph has an odd cycle and is not bipartite.`,
              highlight: { nodes: [u, neighbour.id], edges: [`${u}->${neighbour.id}`] },
              data: { operation: 'clash', node: neighbour.id, from: u },
              pseudocodeLine: 9,
              codeLine: 13,
              weight: 2.1,
              bump: ['comparisons'],
            });
            break;
          }

          painter.setEdge(u, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${neighbour.id} is already ${known}, the opposite side of ${u} — the edge fits, no clash.`,
            highlight: { nodes: [u, neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'agree', node: neighbour.id, from: u },
            pseudocodeLine: 8,
            codeLine: 12,
            weight: 0.8,
            bump: ['comparisons', 'reads'],
          });
        }
        if (clash) break;
      }
      if (clash) break;
    }

    const bipartite = clash === undefined;
    paintSides();
    if (bipartite) {
      for (const id of nodes) painter.setNode(id, side.get(id) === 'A' ? 'active' : 'pivot');
      painter.setNode(start, 'success');
    }

    const groupA = nodes.filter((id) => side.get(id) === 'A');
    const groupB = nodes.filter((id) => side.get(id) === 'B');
    caption = bipartite
      ? `Bipartite: A = {${groupA.join(', ')}} and B = {${groupB.join(', ')}}`
      : `Not bipartite: the edge ${clash ?? ''} has both ends on the same side`;

    builder.emit({
      kind: bipartite ? 'complete' : 'not-found',
      description: caption,
      highlight: { nodes: bipartite ? nodes : (clash ? clash.split('–') : []) },
      data: { operation: 'done' },
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
        headline: bipartite ? `Bipartite: ${groupA.length} vs ${groupB.length}` : 'Not bipartite (odd cycle)',
        detail: bipartite ? `A = {${groupA.join(', ')}} · B = {${groupB.join(', ')}}` : `Clash on edge ${clash ?? ''}`,
        output: { bipartite, side: Object.fromEntries(side), groups: [groupA, groupB] },
      },
      expectedState: () => side.size > 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, BipartiteData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
