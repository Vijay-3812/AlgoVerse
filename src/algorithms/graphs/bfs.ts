import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, UNWEIGHTED_INPUT } from './specs';
import { GraphModel, RolePainter, markTerminals } from './kit';

export interface BfsData {
  readonly operation: 'discover' | 'enqueue' | 'dequeue' | 'inspect' | 'skip' | 'visit';
  readonly node?: string;
  readonly from?: string;
}

/**
 * Breadth-First Search.
 *
 * The queue is the algorithm. Every node enters it exactly once, in order of
 * distance in *edges* from the start, so the first time a node leaves the queue
 * it is already at its shortest hop count — the property that makes BFS the
 * backbone of unweighted shortest paths, level-order traversal and flood fill.
 * The trace paints the frontier ring by ring so that invariant is visible
 * rather than asserted.
 */
const spec: AlgorithmSpec<GraphSnapshot, BfsData> = {
  id: 'bfs',
  complexity: COMPLEXITY.bfs!,
  pseudocode: pseudo(`
#bfs(graph, start)
#   queue ← [start], seen ← {start}
#   while queue is not empty
#     node ← queue.dequeue()            ▸ FIFO: oldest discovery first
#     visit(node)
#     for each neighbour of node
#       if neighbour ∈ seen: skip       ▸ already reached by a shorter path
#       seen ← seen ∪ {neighbour}
#       queue.enqueue(neighbour)        ▸ one level deeper
#   return the visit order`),
  code: code(
    `
function bfs(adj, start) {
  const queue = [start];
  const seen = new Set([start]);
  const order = [];

  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);

    for (const next of adj[node]) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  return order;
}`,
    `
from collections import deque


def bfs(adj, start):
    queue = deque([start])
    seen = {start}
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)

        for nxt in adj[node]:
            if nxt in seen:
                continue
            seen.add(nxt)
            queue.append(nxt)

    return order`,
    `
vector<string> bfs(const map<string, vector<string>>& adj, const string& start) {
  queue<string> q;
  set<string> seen{start};
  vector<string> order;
  q.push(start);

  while (!q.empty()) {
    string node = q.front();
    q.pop();
    order.push_back(node);

    for (const string& next : adj.at(node)) {
      if (seen.count(next)) continue;
      seen.insert(next);
      q.push(next);
    }
  }

  return order;
}`,
    `
static List<String> bfs(Map<String, List<String>> adj, String start) {
  Deque<String> queue = new ArrayDeque<>();
  Set<String> seen = new HashSet<>();
  List<String> order = new ArrayList<>();
  queue.add(start);
  seen.add(start);

  while (!queue.isEmpty()) {
    String node = queue.poll();
    order.add(node);

    for (String next : adj.get(node)) {
      if (seen.contains(next)) continue;
      seen.add(next);
      queue.add(next);
    }
  }

  return order;
}`,
  ),
  explanation: [
    'BFS expands in rings: everything at distance 1 is dequeued before anything at distance 2, because the queue is FIFO.',
    'A node is marked the moment it is *enqueued*, not when it is dequeued — that is what stops two parents queueing it twice.',
    'Unweighted graphs get shortest paths for free; add weights and the same skeleton becomes Dijkstra with a priority queue instead.',
  ],
  learn: {
    useCases: [
      'Shortest path in unweighted graphs (mazes, word ladders, social “degrees of separation”)',
      'Flood fill and connected-component labelling',
      'Web crawling frontier and peer-to-peer broadcast (the “hello, I am here” wave)',
    ],
    quiz: [
      {
        question: 'Why does BFS need a queue rather than a stack?',
        options: ['To save memory', 'So nodes are processed in discovery order, giving level-by-level expansion', 'Because recursion is impossible in graphs', 'So cycles are impossible'],
        answer: 1,
        why: 'FIFO order is exactly what guarantees “all distance-k nodes before any distance-(k+1) node”. Swap in a stack and you get DFS.',
      },
      {
        question: 'On the default 12-node lattice, how many edges does BFS inspect?',
        options: ['11 (a spanning tree)', '12', 'Up to 2·|E| = 36', 'Always |E|'],
        answer: 2,
        why: 'Each undirected edge is seen from both endpoints, so the loop body runs up to twice per edge — O(V + E) total.',
      },
    ],
    practice: [
      { title: 'Word Ladder', url: 'https://leetcode.com/problems/word-ladder/', difficulty: 'hard' },
      { title: 'Rotting Oranges', url: 'https://leetcode.com/problems/rotting-oranges/', difficulty: 'medium' },
    ],
  },
  defaultInput: UNWEIGHTED_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const start = view.start;

    const queue: string[] = [];
    const seen = new Set<string>();
    const levels = new Map<string, number>();
    const order: string[] = [];

    let caption = `BFS from ${start}: the queue is the frontier`;

    const builder = new TraceBuilder<GraphSnapshot, BfsData>(() => {
      painter.apply(model);
      return model.snapshot({
        caption,
        badges: {
          nodes: model.size,
          queued: queue.length,
          visited: order.length,
          ...(queue.length > 0 ? { head: queue[0] as string } : {}),
        },
      });
    });

    markTerminals(model, view.start, view.end);
    painter.setNode(start, 'active');
    seen.add(start);
    levels.set(start, 0);
    queue.push(start);

    builder.emit({
      kind: 'init',
      description: `Start at ${start}: it is the only node at level 0, so it enters the queue marked as seen.`,
      highlight: { nodes: [start] },
      pseudocodeLine: 1,
      codeLine: 1,
      weight: 1.4,
      bump: 'writes',
    });

    builder.emit({
      kind: 'enqueue',
      description: `Enqueue ${start} — mark on enqueue, not on dequeue, so a second parent cannot queue it again.`,
      highlight: { nodes: [start] },
      data: { operation: 'enqueue', node: start },
      pseudocodeLine: 1,
      codeLine: 2,
      weight: 1,
      bump: ['writes', 'reads'],
    });

    while (queue.length > 0) {
      const node = queue.shift() as string;
      const level = levels.get(node) ?? 0;
      painter.setNode(node, 'active');
      model.setNodeBadge(node, `#${order.length + 1}`);

      caption = `dequeue ${node} (level ${level})`;
      builder.emit({
        kind: 'dequeue',
        description: `Dequeue ${node} — at level ${level}, the shallowest node still waiting.`,
        highlight: { nodes: [node] },
        data: { operation: 'dequeue', node },
        pseudocodeLine: 3,
        codeLine: 5,
        weight: 1.2,
        bump: ['reads'],
      });

      order.push(node);
      painter.setNode(node, 'visited');
      model.setNodeSub(node, `L${level}`);

      builder.emit({
        kind: 'visit',
        description: `Visit ${node}: the first visit is a shortest path, ${level} edge${level === 1 ? '' : 's'} from ${start}.`,
        highlight: { nodes: [node] },
        data: { operation: 'visit', node },
        pseudocodeLine: 4,
        codeLine: 6,
        weight: 1.3,
        bump: ['reads'],
      });

      for (const neighbour of model.neighbours(node)) {
        painter.setEdge(node, neighbour.id, 'compare');

        if (seen.has(neighbour.id)) {
          painter.setEdge(node, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${neighbour.id} is already discovered — skip it; its queue slot is already at least as close.`,
            highlight: { nodes: [node, neighbour.id], edges: [`${node}->${neighbour.id}`] },
            data: { operation: 'skip', node: neighbour.id, from: node },
            pseudocodeLine: 6,
            codeLine: 9,
            weight: 0.8,
            bump: ['comparisons', 'reads'],
          });
          continue;
        }

        seen.add(neighbour.id);
        levels.set(neighbour.id, level + 1);
        queue.push(neighbour.id);
        painter.setNode(neighbour.id, 'frontier');
        painter.setEdge(node, neighbour.id, 'path');
        model.setNodeSub(neighbour.id, `L${level + 1}`);

        builder.emit({
          kind: 'frontier',
          description: `Discover ${neighbour.id} from ${node}: level ${level + 1}, enqueued behind everything at level ${level}.`,
          highlight: { nodes: [neighbour.id], edges: [`${node}->${neighbour.id}`] },
          data: { operation: 'discover', node: neighbour.id, from: node },
          pseudocodeLine: 8,
          codeLine: 12,
          weight: 1.1,
          bump: ['writes'],
        });
      }

      // Reset the tree-edge colours to the path role so the BFS tree stays drawn.
      for (const neighbour of model.neighbours(node)) {
        if (levels.get(neighbour.id) === level + 1 && seen.has(neighbour.id)) {
          painter.setEdge(node, neighbour.id, 'path');
        }
      }
      painter.setNode(node, 'visited');
    }

    caption = `BFS complete: ${order.length} of ${model.size} nodes reached in ${Math.max(...[...levels.values()])} levels`;
    builder.emit({
      kind: 'complete',
      description: caption,
      highlight: { nodes: order },
      data: { operation: 'discover' },
      pseudocodeLine: 9,
      codeLine: 16,
      weight: 2.2,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `BFS visited ${order.length} nodes`,
        detail: `Order: ${order.join(' → ')}`,
        output: { order, levels: Object.fromEntries(levels) },
      },
      expectedState: () => order.length > 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, BfsData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
