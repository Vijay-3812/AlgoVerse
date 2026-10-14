import type { AlgorithmDefinition, GraphSnapshot } from '@/types';
import { code, defineAlgorithm, finish, graphOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { GraphVisualizer } from '@/visualizers/GraphVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY, SCC_INPUT } from './specs';
import { GraphModel, RolePainter, markTerminals } from './kit';

export interface TarjanSccData {
  readonly operation: 'descend' | 'skip' | 'update' | 'root' | 'done';
  readonly node?: string;
  readonly from?: string;
  readonly index?: number;
  readonly lowlink?: number;
  readonly component?: number;
}

/**
 * Tarjan's strongly connected components.
 *
 * One DFS. Each vertex gets a discovery `index` and a `lowlink` — the smallest
 * index reachable from it without leaving the current stack. When a vertex
 * finishes with `lowlink === index`, nothing below it can climb higher, so the
 * slice of the stack from that vertex upward is exactly one strongly connected
 * component. No reversed graph, no second pass.
 *
 * Components are painted in rotating hues so the “which nodes can reach which”
 * question is answered by colour alone.
 */
const spec: AlgorithmSpec<GraphSnapshot, TarjanSccData> = {
  id: 'tarjan-scc',
  complexity: COMPLEXITY['tarjan-scc']!,
  pseudocode: pseudo(`
#tarjan(graph)
#   index ← 0, stack ← [], discovery ← {}
#   visit(u):
#     discovery[u] ← index[u] ← lowlink[u] ← index++
#     stack.push(u), onStack[u] ← true         ▸ u can still be part of a cycle
#     for each edge (u → v)
#       if v unvisited: visit(v)
#                       lowlink[u] ← min(lowlink[u], lowlink[v])
#       else if v on the stack
#                       lowlink[u] ← min(lowlink[u], index[v])   ▸ back edge
#     if lowlink[u] = index[u]                 ▸ u is the root of an SCC
#       pop the stack down to (and including) u — that slice is one component
#   for each unvisited v: visit(v)`),
  code: code(
    `
function tarjan(adj, nodes) {
  const index = new Map();
  const lowlink = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  function visit(u) {
    index.set(u, counter);
    lowlink.set(u, counter);
    counter += 1;
    stack.push(u);
    onStack.add(u);

    for (const { to } of adj[u]) {
      if (!index.has(to)) {
        visit(to);
        lowlink.set(u, Math.min(lowlink.get(u), lowlink.get(to)));
      } else if (onStack.has(to)) {
        lowlink.set(u, Math.min(lowlink.get(u), index.get(to)));
      }
    }

    if (lowlink.get(u) === index.get(u)) {
      const component = [];
      let popped;
      do {
        popped = stack.pop();
        onStack.delete(popped);
        component.push(popped);
      } while (popped !== u);
      components.push(component);
    }
  }

  for (const node of nodes) if (!index.has(node)) visit(node);
  return components;
}`,
    `
def tarjan(adj, nodes):
    index, lowlink, on_stack, stack, components = {}, {}, set(), [], []
    counter = [0]

    def visit(u):
        index[u] = lowlink[u] = counter[0]
        counter[0] += 1
        stack.append(u)
        on_stack.add(u)

        for to, _ in adj[u]:
            if to not in index:
                visit(to)
                lowlink[u] = min(lowlink[u], lowlink[to])
            elif to in on_stack:
                lowlink[u] = min(lowlink[u], index[to])

        if lowlink[u] == index[u]:
            component = []
            while True:
                popped = stack.pop()
                on_stack.discard(popped)
                component.append(popped)
                if popped == u:
                    break
            components.append(component)

    for node in nodes:
        if node not in index:
            visit(node)
    return components`,
    `
vector<vector<string>> tarjan(const map<string, vector<string>>& adj,
                              const vector<string>& nodes) {
  map<string, int> index, lowlink;
  set<string> onStack;
  vector<string> stack;
  vector<vector<string>> components;
  int counter = 0;

  function<void(const string&)> visit = [&](const string& u) {
    index[u] = lowlink[u] = counter++;
    stack.push_back(u);
    onStack.insert(u);

    for (const string& to : adj.at(u)) {
      if (!index.count(to)) {
        visit(to);
        lowlink[u] = min(lowlink[u], lowlink[to]);
      } else if (onStack.count(to)) {
        lowlink[u] = min(lowlink[u], index[to]);
      }
    }

    if (lowlink[u] == index[u]) {
      vector<string> component;
      string popped;
      do {
        popped = stack.back();
        stack.pop_back();
        onStack.erase(popped);
        component.push_back(popped);
      } while (popped != u);
      components.push_back(component);
    }
  };

  for (const string& node : nodes) if (!index.count(node)) visit(node);
  return components;
}`,
    `
static List<List<String>> tarjan(Map<String, List<String>> adj, List<String> nodes) {
  Map<String, Integer> index = new HashMap<>();
  Map<String, Integer> lowlink = new HashMap<>();
  Set<String> onStack = new HashSet<>();
  Deque<String> stack = new ArrayDeque<>();
  List<List<String>> components = new ArrayList<>();
  int[] counter = {0};

  for (String node : nodes) {
    if (!index.containsKey(node)) visit(adj, node, index, lowlink, onStack, stack, components, counter);
  }

  return components;
}

static void visit(Map<String, List<String>> adj, String u, Map<String, Integer> index,
                  Map<String, Integer> lowlink, Set<String> onStack, Deque<String> stack,
                  List<List<String>> components, int[] counter) {
  index.put(u, counter[0]);
  lowlink.put(u, counter[0]);
  counter[0] += 1;
  stack.push(u);
  onStack.add(u);

  for (String to : adj.get(u)) {
    if (!index.containsKey(to)) {
      visit(adj, to, index, lowlink, onStack, stack, components, counter);
      lowlink.put(u, Math.min(lowlink.get(u), lowlink.get(to)));
    } else if (onStack.contains(to)) {
      lowlink.put(u, Math.min(lowlink.get(u), index.get(to)));
    }
  }

  if (lowlink.get(u).equals(index.get(u))) {
    List<String> component = new ArrayList<>();
    String popped;
    do {
      popped = stack.pop();
      onStack.remove(popped);
      component.add(popped);
    } while (!popped.equals(u));
    components.add(component);
  }
}`,
  ),
  explanation: [
    '`lowlink[u]` answers: “if I am on the stack, how far back up the DFS can I climb?”. A cycle means a neighbour can climb back to an ancestor, which drags the ancestor’s lowlink down to mine.',
    'The weak inequality is asymmetric on purpose: an unvisited child contributes its *lowlink*, a vertex already on the stack contributes its *index* — it cannot climb higher than where it entered.',
    'When a vertex finishes with lowlink equal to its own index, it is unreachable from below: it is the root of its SCC, and the stack above it is exactly that component.',
  ],
  learn: {
    useCases: [
      'Finding cycles and cycle clusters in dependency graphs (circular imports, deadlocked services)',
      'Condensing a graph into its DAG of components, which is how 2-SAT is solved',
      'Social and web analysis: tightly-knit communities that all reach each other',
    ],
    quiz: [
      {
        question: 'Why is a single DFS enough, when Kosaraju needs two passes over the reversed graph?',
        options: ['It is not — Tarjan is approximate', 'Because low-link values computed on the way up already encode reachability back into the stack, which the reversed second pass would otherwise supply', 'Because Tarjan only works on small graphs', 'Randomness'],
        answer: 1,
        why: 'The stack is the missing information: it records which vertices are still “in play”, and lowlink measures how far back into it a subtree can reach.',
      },
      {
        question: 'How many SCCs does the default graph have, and which vertices are in the largest?',
        options: ['2 components; {A,B,C} and {D,E,F}', '4 components; the first is {A,B,C}', '1 component; the whole graph', '3 components; the largest has 4 vertices'],
        answer: 1,
        why: 'The input has two 3-cycles that are connected one-way to each other, plus G and H: four SCCs in total, with {A,B,C} popped first.',
      },
    ],
    practice: [{ title: 'Critical Connections in a Network', url: 'https://leetcode.com/problems/critical-connections-in-a-network/', difficulty: 'hard' }],
  },
  defaultInput: SCC_INPUT,
  generate: (input, run) => {
    const view = graphOf(input);
    const model = new GraphModel(view);
    const painter = new RolePainter();
    const nodes = model.order;

    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const components: string[][] = [];
    let counter = 0;

    /** Rotating palette: each SCC gets a colour so reachability reads at a glance. */
    const COMPONENT_ROLES = ['path', 'pivot', 'active', 'compare', 'visited'] as const;

    const badgeFor = (id: string): string | number => {
      if (!index.has(id)) return '·';
      const low = lowlink.get(id) ?? 0;
      const idx = index.get(id) ?? 0;
      return low === idx ? `${idx}*` : `${idx}/${low}`;
    };

    let caption = 'index/lowlink per vertex; the * marks an SCC root';

    const builder = new TraceBuilder<GraphSnapshot, TarjanSccData>(() => {
      painter.apply(model);
      for (const id of nodes) model.setNodeBadge(id, badgeFor(id));
      return model.snapshot({
        caption,
        badges: { nodes: model.size, stack: stack.length, components: components.length, time: counter },
      });
    });

    markTerminals(model, view.start, view.end);

    const paintComponents = (): void => {
      painter.clear();
      components.forEach((component, i) => {
        const role = COMPONENT_ROLES[i % COMPONENT_ROLES.length] as (typeof COMPONENT_ROLES)[number];
        for (const id of component) {
          painter.setNode(id, role);
          model.setNodeSub(id, `SCC ${i + 1}`);
        }
      });
      for (const id of nodes) if (!components.some((c) => c.includes(id))) painter.setNode(id, 'idle');
    };

    const visit = (u: string, depth: number, from: string | null): void => {
      index.set(u, counter);
      lowlink.set(u, counter);
      counter += 1;
      stack.push(u);
      onStack.add(u);
      builder.setDepth(depth + 1);
      painter.setNode(u, 'frontier');
      if (from) painter.setEdge(from, u, 'compare');

      builder.emit({
        kind: from === null ? 'init' : 'recurse',
        description:
          from === null
            ? `Enter ${u}: it is the only vertex of its SCC found so far (index = lowlink = 0).`
            : `Descend ${from} → ${u}: index = lowlink = ${counter - 1}, and it joins the stack.`,
        highlight: { nodes: from === null ? [u] : [from, u] },
        data: { operation: 'descend', node: u, ...(from === null ? {} : { from }), index: counter - 1, lowlink: counter - 1 },
        pseudocodeLine: from === null ? 2 : 5,
        codeLine: from === null ? 8 : 13,
        weight: 1.1,
        bump: ['calls', 'writes'],
      });

      for (const neighbour of model.neighbours(u)) {
        const targetIndex = index.get(neighbour.id);
        if (targetIndex === undefined) {
          painter.setEdge(u, neighbour.id, 'compare');
          visit(neighbour.id, depth + 1, u);
          const merged = Math.min(lowlink.get(u) ?? 0, lowlink.get(neighbour.id) ?? 0);
          lowlink.set(u, merged);
          painter.setNode(u, 'frontier');

          builder.emit({
            kind: 'update',
            description: `Back from ${neighbour.id}: lowlink[${u}] = min(${lowlink.get(u) ?? 0}, lowlink[${neighbour.id}] = ${lowlink.get(neighbour.id)}) = ${merged}.`,
            highlight: { nodes: [u, neighbour.id] },
            data: { operation: 'update', node: u, from: neighbour.id, index: index.get(u) ?? 0, lowlink: merged },
            pseudocodeLine: 6,
            codeLine: 15,
            weight: 0.9,
            bump: ['writes', 'comparisons'],
          });
          continue;
        }

        if (onStack.has(neighbour.id)) {
          const merged = Math.min(lowlink.get(u) ?? 0, targetIndex);
          lowlink.set(u, merged);
          painter.setEdge(u, neighbour.id, 'path');
          builder.emit({
            kind: 'compare',
            description: `${u} → ${neighbour.id} points at a vertex still on the stack: a back edge, so lowlink[${u}] drops to ${merged}.`,
            highlight: { nodes: [u, neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'update', node: u, from: neighbour.id, index: index.get(u) ?? 0, lowlink: merged },
            pseudocodeLine: 8,
            codeLine: 17,
            weight: 1.05,
            bump: ['comparisons', 'writes'],
          });
        } else {
          painter.setEdge(u, neighbour.id, 'muted');
          builder.emit({
            kind: 'compare',
            description: `${neighbour.id} is finished and off the stack — its component is settled, so the edge cannot lift ${u} any higher.`,
            highlight: { nodes: [neighbour.id], edges: [`${u}->${neighbour.id}`] },
            data: { operation: 'skip', node: neighbour.id, from: u },
            pseudocodeLine: 8,
            codeLine: 18,
            weight: 0.7,
            bump: ['comparisons'],
          });
        }
      }

      if ((lowlink.get(u) ?? 0) === (index.get(u) ?? 0)) {
        const component: string[] = [];
        let popped: string | undefined;
        do {
          popped = stack.pop();
          if (popped === undefined) break;
          onStack.delete(popped);
          component.unshift(popped);
        } while (popped !== u);
        components.push(component);
        paintComponents();
        model.setNodeSub(u, `root ${index.get(u)}`);

        builder.emit({
          kind: 'found',
          description: `lowlink[${u}] = index[${u}] = ${index.get(u)}: nothing below can climb back, so {${component.join(', ')}} is strongly connected component #${components.length}.`,
          highlight: { nodes: component },
          data: { operation: 'root', node: u, index: index.get(u) ?? 0, lowlink: lowlink.get(u) ?? 0, component: components.length },
          pseudocodeLine: 10,
          codeLine: 21,
          weight: 2,
          bump: ['reads'],
        });
      }

      // A vertex that is not an SCC root stays on the stack: an ancestor's
      // low-link may still need to see it. Only the root's pop removes it.
      builder.setDepth(depth);
    };

    for (const id of nodes) if (!index.has(id)) visit(id, 0, null);

    paintComponents();
    caption = `${components.length} strongly connected components: ${components.map((c) => `{${c.join(',')}}`).join(' ')}`;

    builder.emit({
      kind: 'complete',
      description: caption,
      highlight: { nodes: nodes },
      data: { operation: 'done' },
      pseudocodeLine: 11,
      codeLine: 34,
      weight: 2.3,
      bump: ['reads'],
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: `${components.length} strongly connected components`,
        detail: components.map((c, i) => `SCC ${i + 1}: ${c.join(', ')}`).join(' · '),
        output: { components },
      },
      expectedState: () => components.length > 0,
    });
  },
};

export const definition: AlgorithmDefinition<GraphSnapshot, TarjanSccData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: GraphVisualizer });
