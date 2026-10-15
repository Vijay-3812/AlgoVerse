import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, UNWEIGHTED_INPUT } from './specs';
import { GraphModel, RolePainter, markTerminals } from './kit';

export interface DfsData {
  readonly operation: 'descend' | 'backtrack' | 'inspect' | 'skip' | 'visit' | 'return';
  readonly node?: string;
  readonly from?: string;
  readonly depth?: number;
}

/**
 * Depth-First Search.
 *
 * Where BFS spreads outwards, DFS commits: it follows one edge as far as it
 * goes, then rewinds to the last node with an unexplored neighbour. The
 * recursion (or the explicit stack) *is* the path from the start node to the
 * current one, which is why DFS is the traversal that yields entry/exit times,
 * cycle detection, topological order and strongly connected components.
 */
const spec: AlgorithmSpec<GraphSnapshot, DfsData> = {
  id: 'dfs',
  complexity: COMPLEXITY.dfs!,
  pseudocode: pseudo(`
#dfs(graph, node, seen)
#   seen ← seen ∪ {node}
#   visit(node)
#   for each neighbour of node
#     if neighbour ∈ seen: skip        ▸ already on or off the current path
#     dfs(graph, neighbour, seen)      ▸ go deeper before looking sideways
#   return                             ▸ dead end: rewind one frame
#
#search(graph, start)
#   reset the path, then dfs(graph, start, ∅)`),
  code: code(
    `
function dfs(adj, node, seen, order) {
  seen.add(node);
  order.push(node);

  for (const next of adj[node]) {
    if (seen.has(next)) continue;
    dfs(adj, next, seen, order);
  }
  return;
}

function search(adj, start) {
  const order = [];
  dfs(adj, start, new Set(), order);
  return order;
}`,
    `
def dfs(adj, node, seen, order):
    seen.add(node)
    order.append(node)

    for nxt in adj[node]:
        if nxt in seen:
            continue
        dfs(adj, nxt, seen, order)
    return


def search(adj, start):
    order = []
    dfs(adj, start, set(), order)
    return order`,
    `
void dfs(const map<string, vector<string>>& adj, const string& node,
         set<string>& seen, vector<string>& order) {
  seen.insert(node);
  order.push_back(node);

  for (const string& next : adj.at(node)) {
    if (seen.count(next)) continue;
    dfs(adj, next, seen, order);
  }
  return;
}

vector<string> search(const map<string, vector<string>>& adj, const string& start) {
  vector<string> order;
  set<string> seen;
  dfs(adj, start, seen, order);
  return order;
}`,
    `
static void dfs(Map<String, List<String>> adj, String node,
                Set<String> seen, List<String> order) {
  seen.add(node);
  order.add(node);

  for (String next : adj.get(node)) {
    if (seen.contains(next)) continue;
    dfs(adj, next, seen, order);
  }
  return;
}

static List<String> search(Map<String, List<String>> adj, String start) {
  List<String> order = new ArrayList<>();
  dfs(adj, start, new HashSet<>(), order);
  return order;
}`,
  ),
  explanation: [
    'Each call frame remembers exactly one position: “the next neighbour I have not tried yet”. Rewinding is popping that frame.',
    'The stack of active frames is precisely one path from the start node to the current node — which is why DFS walks look like a snake through the graph.',
    'Entry and exit times are the real payload: a back edge to an active frame means a cycle, and reverse exit order is a topological order.',
  ],
  learn: {
    useCases: [
      'Cycle detection and topological sorting in build/dependency graphs',
      'Maze and puzzle solving where any path will do (with backtracking)',
      'Connected components, bridges and articulation points',
    ],
    quiz: [
      {
        question: 'When DFS skips a neighbour because it is already “seen”, what has actually happened?',
        options: ['Nothing useful', 'Either the neighbour is on the current path (a cycle) or already finished (a cross/forward edge)', 'The graph is disconnected', 'The stack overflowed'],
        answer: 1,
        why: 'That single test is the germ of cycle detection and of Tarjan’s low-link computation.',
      },
    ],
    practice: [
      { title: 'Number of Islands', url: 'https://leetcode.com/problems/number-of-islands/', difficulty: 'medium' },
      { title: 'Course Schedule', url: 'https://leetcode.com/problems/course-schedule/', difficulty: 'medium' },
    ],
  },
  defaultInput: UNWEIGHTED_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const start = view.start;

    const seen = new Set<string>();
    const order: string[] = [];
    /** The live call stack — one entry per active frame. */
    const stack: string[] = [];
    let caption = `DFS from ${start}: follow one edge to its end, then rewind`;

    const builder = new TraceBuilder<GraphSnapshot, DfsData>(() => {
      painter.apply(model);
      return model.snapshot({
        caption,
        badges: {
          nodes: model.size,
          visited: order.length,
          depth: stack.length,
          ...(stack.length > 0 ? { top: stack[stack.length - 1] as string } : {}),
        },
      });
    });

    markTerminals(model, view.start, view.end);

    /** Recursive descent, recorded as emit()s on the way down and on the way up. */
    const walk = (node: string, depth: number, from: string | null): void => {
      seen.add(node);
      order.push(node);
      stack.push(node);
      model.setNodeBadge(node, `t${order.length}`);
      painter.setNode(node, 'active');
      painter.setNode(from ?? node, depth === 0 ? 'active' : 'frontier');
      builder.setDepth(depth + 1);

      builder.emit({
        kind: depth === 0 ? 'init' : 'recurse',
        description:
          from === null
            ? `Enter ${node}: mark it seen and push a frame — the stack now *is* the path ${node}.`
            : `Descend from ${from} into ${node} at depth ${depth} — a new frame, marked seen immediately.`,
        highlight: { nodes: from === null ? [node] : [from, node], ...(from ? { edges: [`${from}->${node}`] } : {}) },
        data: { operation: 'descend', node, ...(from === null ? {} : { from }), depth },
        pseudocodeLine: from === null ? 1 : 5,
        codeLine: from === null ? 1 : 6,
        weight: 1.2,
        bump: ['calls', 'writes'],
      });

      for (const neighbour of model.neighbours(node)) {
        painter.setEdge(node, neighbour.id, 'compare');
        if (seen.has(neighbour.id)) {
          painter.setEdge(node, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${neighbour.id} is already seen — skip. A second route to it adds nothing to a spanning walk.`,
            highlight: { nodes: [node, neighbour.id], edges: [`${node}->${neighbour.id}`] },
            data: { operation: 'skip', node: neighbour.id, from: node, depth },
            pseudocodeLine: 4,
            codeLine: 4,
            weight: 0.8,
            bump: ['comparisons', 'reads'],
          });
          continue;
        }

        painter.setNode(neighbour.id, 'frontier');
        walk(neighbour.id, depth + 1, node);
        // Back on this frame: the child is done, this node is current again.
        painter.setNode(node, 'active');
      }

      stack.pop();
      builder.setDepth(depth);
      painter.setNode(node, 'visited');
      const done = stack[stack.length - 1];

      builder.emit({
        kind: 'return',
        description:
          done === undefined
            ? `Every neighbour of ${node} is used: the last frame returns and DFS ends after ${order.length} visits.`
            : `Dead end at ${node}: all neighbours seen, so rewind to ${done} and try its next edge.`,
        highlight: { nodes: [node] },
        data: { operation: 'return', node, depth },
        pseudocodeLine: 6,
        codeLine: 9,
        weight: 1,
        bump: ['reads'],
      });
    };

    walk(start, 0, null);

    caption = `DFS complete: ${order.length} of ${model.size} nodes visited in a single chain of frames`;
    builder.emit({
      kind: 'complete',
      description: caption,
      highlight: { nodes: order },
      data: { operation: 'visit' },
      pseudocodeLine: 9,
      codeLine: 13,
      weight: 2.1,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `DFS visited ${order.length} nodes`,
        detail: `Entry order: ${order.join(' → ')}`,
        output: { order },
      },
      expectedState: () => order.length >= 1,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, DfsData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
