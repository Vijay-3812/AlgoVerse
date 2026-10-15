import type { AlgorithmMeta, CategoryId, CategoryMeta } from '@/types';

/**
 * The static catalogue: navigation, search and roadmap in one file.
 * A category whose algorithms are all `soon` still renders (with an honest
 * "Phase N" badge) so the product never looks half-built.
 */
export const CATEGORIES: readonly CategoryMeta[] = [
  {
    id: 'sorting',
    name: 'Sorting',
    icon: 'bars',
    accent: 'cyan',
    blurb: 'Comparisons, swaps and the wave that ends them all.',
    phase: 2,
  },
  {
    id: 'searching',
    name: 'Searching',
    icon: 'search',
    accent: 'violet',
    blurb: 'Divide, interpolate, jump, and watch the space collapse.',
    phase: 3,
  },
  {
    id: 'linear',
    name: 'Linear Structures',
    icon: 'stack',
    accent: 'pink',
    blurb: 'Arrays, linked lists, stacks, queues, deques, heaps.',
    phase: 3,
  },
  {
    id: 'hashing',
    name: 'Hashing',
    icon: 'hash',
    accent: 'amber',
    blurb: 'Buckets, probes, load factors and the rehash shockwave.',
    phase: 6,
  },
  {
    id: 'trees',
    name: 'Trees',
    icon: 'tree',
    accent: 'lime',
    blurb: 'Traversals, BSTs, AVL rotations, heaps, tries, B-trees.',
    phase: 4,
  },
  {
    id: 'graphs',
    name: 'Graphs',
    icon: 'graph',
    accent: 'cyan',
    blurb: 'Ripples, relaxations and energy flowing along edges.',
    phase: 5,
  },
  {
    id: 'recursion',
    name: 'Recursion & Backtracking',
    icon: 'stack',
    accent: 'violet',
    blurb: 'A live call stack, shrinking boards, elegant undos.',
    phase: 6,
  },
  {
    id: 'dp',
    name: 'Dynamic Programming',
    icon: 'table',
    accent: 'pink',
    blurb: 'Tables filling in ripples, arrows of dependency, backtracked paths.',
    phase: 7,
  },
  {
    id: 'greedy',
    name: 'Greedy',
    icon: 'spark',
    accent: 'amber',
    blurb: 'Local choices, globally optimal, beautifully simple.',
    phase: 7,
  },
  {
    id: 'strings',
    name: 'Strings',
    icon: 'text',
    accent: 'lime',
    blurb: 'KMP, Rabin–Karp, Z-algorithm, Boyer–Moore.',
    phase: 7,
  },
  {
    id: 'misc',
    name: 'Divide & Conquer + Patterns',
    icon: 'divide',
    accent: 'cyan',
    blurb: 'Union-Find, sliding window, two pointers, monotonic stack.',
    phase: 7,
  },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryMeta> = Object.freeze(
  Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryMeta>,
);

/**
 * Default input shape per category.
 *
 * A category almost always implies its input: every sorting algorithm takes an
 * array, every graph algorithm takes a graph. The few exceptions (a trie wants
 * words, Fibonacci wants a single number) pass an explicit override as the
 * last argument of `meta()`.
 */
const CATEGORY_INPUT_KIND: Record<CategoryId, AlgorithmMeta['inputKind']> = {
  sorting: 'array',
  searching: 'array',
  linear: 'array',
  hashing: 'array',
  trees: 'tree',
  graphs: 'graph',
  recursion: 'number',
  dp: 'number',
  greedy: 'array',
  strings: 'string',
  misc: 'number',
};

const meta = (
  id: string,
  name: string,
  category: CategoryId,
  difficulty: AlgorithmMeta['difficulty'],
  phase: number,
  blurb: string,
  tags: readonly string[] = [],
  aliases: readonly string[] = [],
  status: AlgorithmMeta['status'] = 'soon',
  inputKind: AlgorithmMeta['inputKind'] = CATEGORY_INPUT_KIND[category],
): AlgorithmMeta => ({ id, name, category, difficulty, phase, blurb, tags, aliases, status, inputKind });

/**
 * Every algorithm AlgoVerse will ship. `status: 'ready'` flips on as each phase
 * lands — the registry (not this file) is the source of truth for what is
 * actually runnable, and `algoverse:doctor` tests assert the two agree.
 */
export const ALGORITHMS: readonly AlgorithmMeta[] = [
  // ── Sorting ───────────────────────────────────────────────────────────────
  meta('bubble-sort', 'Bubble Sort', 'sorting', 'easy', 2, 'Adjacent swaps bubble the largest value to the end.', ['stable', 'in-place', 'quadratic'], ['exchange sort']),
  meta('selection-sort', 'Selection Sort', 'sorting', 'easy', 2, 'Repeatedly select the minimum of the unsorted tail.', ['in-place']),
  meta('insertion-sort', 'Insertion Sort', 'sorting', 'easy', 2, 'Grow a sorted prefix one card at a time.', ['stable', 'adaptive']),
  meta('merge-sort', 'Merge Sort', 'sorting', 'medium', 2, 'Divide, conquer, and merge two rivers.', ['stable', 'divide & conquer']),
  meta('quick-sort', 'Quick Sort', 'sorting', 'medium', 2, 'Partition around a pivot, recursively.', ['divide & conquer', 'in-place'], ['qsort']),
  meta('heap-sort', 'Heap Sort', 'sorting', 'medium', 2, 'Build a max-heap, then extract the crown.', ['in-place']),
  meta('counting-sort', 'Counting Sort', 'sorting', 'easy', 2, 'Count the keys, then lay them back down.', ['non-comparison', 'stable']),
  meta('radix-sort', 'Radix Sort', 'sorting', 'medium', 2, 'Sort digit by digit, least significant first.', ['non-comparison', 'stable'], ['lsd radix']),
  meta('shell-sort', 'Shell Sort', 'sorting', 'medium', 2, 'Insertion sort over shrinking gaps.', ['shell', 'gapped']),
  meta('bucket-sort', 'Bucket Sort', 'sorting', 'medium', 2, 'Scatter into buckets, sort, gather.', ['distribution']),
  meta('tim-sort', 'Tim Sort (simplified)', 'sorting', 'hard', 2, 'Runs, minrun, and merging in place.', ['hybrid', 'stable'], ['timsort']),

  // ── Searching ─────────────────────────────────────────────────────────────
  meta('linear-search', 'Linear Search', 'searching', 'easy', 3, 'Walk the line until you find it.', ['scan']),
  meta('binary-search', 'Binary Search', 'searching', 'easy', 3, 'Halve the space, ask the middle.', ['logarithmic'], ['bisect']),
  meta('jump-search', 'Jump Search', 'searching', 'medium', 3, 'Skip in √n blocks, then scan back.', ['block']),
  meta('interpolation-search', 'Interpolation Search', 'searching', 'medium', 3, 'Guess where the value should be.', ['adaptive']),
  meta('exponential-search', 'Exponential Search', 'searching', 'medium', 3, 'Double the range, then binary search.', ['galloping']),
  meta('ternary-search', 'Ternary Search', 'searching', 'medium', 3, 'Two midpoints, three-way split.', ['unimodal']),

  // ── Linear DS ─────────────────────────────────────────────────────────────
  meta('array-ops', 'Array Operations', 'linear', 'easy', 3, 'Insert, delete, rotate, reverse.', ['insert', 'delete', 'rotate']),
  meta('singly-linked-list', 'Singly Linked List', 'linear', 'easy', 3, 'Nodes, next pointers, and chases.', ['sll'], ['linked list']),
  meta('doubly-linked-list', 'Doubly Linked List', 'linear', 'medium', 3, 'Two-way pointers, O(1) deletes.', ['dll']),
  meta('circular-linked-list', 'Circular Linked List', 'linear', 'medium', 3, 'A ring with no end — watch the cycle.', ['ring']),
  meta('stack', 'Stack', 'linear', 'easy', 3, 'LIFO push and pop.', ['lifo']),
  meta('queue', 'Queue', 'linear', 'easy', 3, 'FIFO enqueue and dequeue.', ['fifo']),
  meta('circular-queue', 'Circular Queue', 'linear', 'medium', 3, 'Wrap the indices, reuse the slots.', ['ring buffer']),
  meta('deque', 'Deque', 'linear', 'medium', 3, 'Both ends, constant time.', ['double-ended queue']),
  meta('priority-queue', 'Priority Queue', 'linear', 'medium', 3, 'Heaps in disguise; the min always bubbles up.', ['heap', 'binary heap']),

  // ── Hashing ───────────────────────────────────────────────────────────────
  meta('hash-chaining', 'Hash Table — Chaining', 'hashing', 'easy', 6, 'Collisions queue up politely in linked buckets.', ['separate chaining']),
  meta('hash-linear-probing', 'Open Addressing — Linear Probing', 'hashing', 'medium', 6, 'Step one slot at a time until it fits.', ['open addressing']),
  meta('hash-quadratic-probing', 'Open Addressing — Quadratic Probing', 'hashing', 'medium', 6, 'Probe at i² to dodge clustering.', ['open addressing']),
  meta('hash-double-hashing', 'Open Addressing — Double Hashing', 'hashing', 'hard', 6, 'A second hash decides the stride.', ['open addressing']),
  meta('hash-rehashing', 'Rehashing & Load Factor', 'hashing', 'medium', 6, 'The table doubles, everyone moves.', ['growth', 'load factor']),

  // ── Trees ─────────────────────────────────────────────────────────────────
  meta('bt-traversals', 'Binary Tree Traversals', 'trees', 'easy', 4, 'In, pre, post and level order side by side.', ['dfs', 'bfs', 'inorder', 'preorder', 'postorder', 'levelorder']),
  meta('bst', 'Binary Search Tree', 'trees', 'easy', 4, 'Insert, search and delete with spliced subtrees.', ['bst']),
  meta('avl', 'AVL Tree', 'trees', 'hard', 4, 'Balance factors and four kinds of rotation.', ['rotations', 'll', 'rr', 'lr', 'rl']),
  meta('red-black-tree', 'Red-Black Tree', 'trees', 'hard', 4, 'Colour flips keep the height logarithmic.', ['rbt']),
  meta('heap', 'Binary Heap', 'trees', 'medium', 4, 'Heapify, sift up, sift down.', ['min-heap', 'max-heap']),
  meta('trie', 'Trie', 'trees', 'medium', 4, 'Prefix trees with character edges.', ['prefix tree', 'radix tree']),
  meta('segment-tree', 'Segment Tree', 'trees', 'hard', 4, 'Range queries in logarithmic time.', ['rmq', 'range query']),
  meta('fenwick-tree', 'Fenwick Tree (BIT)', 'trees', 'hard', 4, 'Binary indexed tree, low-bit hops.', ['bit']),
  meta('b-tree', 'B-Tree', 'trees', 'hard', 4, 'Multi-way nodes, splits and borrows.', ['b-tree']),

  // ── Graphs ────────────────────────────────────────────────────────────────
  meta('bfs', 'Breadth-First Search', 'graphs', 'easy', 5, 'A ripple across the graph.', ['bfs', 'queue']),
  meta('dfs', 'Depth-First Search', 'graphs', 'easy', 5, 'One path to its end, then rewind.', ['dfs', 'stack']),
  meta('dijkstra', 'Dijkstra', 'graphs', 'medium', 5, 'Greedy relaxation with a priority queue.', ['shortest path', 'weighted'], ['dijkstras']),
  meta('bellman-ford', 'Bellman-Ford', 'graphs', 'medium', 5, 'Relax every edge, V−1 times.', ['negative weights']),
  meta('floyd-warshall', 'Floyd-Warshall', 'graphs', 'hard', 5, 'All-pairs shortest paths as a matrix.', ['all pairs']),
  meta('a-star', 'A* Search', 'graphs', 'hard', 5, 'Dijkstra guided by a heuristic.', ['astar', 'heuristic'], ['astar']),
  meta('prim', 'Prim’s MST', 'graphs', 'medium', 5, 'Grow one tree from the cheapest edge out.', ['mst'], ['prims']),
  meta('kruskal', 'Kruskal’s MST', 'graphs', 'medium', 5, 'Sort edges, union the safe ones.', ['mst', 'dsu'], ['kruskals']),
  meta('topological-sort-kahn', 'Topological Sort (Kahn)', 'graphs', 'medium', 5, 'Peel off zero in-degree nodes.', ['toposort', 'dag']),
  meta('topological-sort-dfs', 'Topological Sort (DFS)', 'graphs', 'medium', 5, 'Finish times in reverse.', ['toposort', 'dag']),
  meta('tarjan-scc', 'Tarjan’s Strongly Connected Components', 'graphs', 'hard', 5, 'Low-link values reveal the clusters.', ['scc', 'lowlink'], ['tarjan']),
  meta('cycle-detection', 'Cycle Detection', 'graphs', 'medium', 5, 'Colour the nodes and catch the back edge.', ['union-find', 'dfs']),
  meta('bipartite-check', 'Bipartite Check', 'graphs', 'easy', 5, 'Two colours, zero clashes.', ['2-colouring']),

  // ── Recursion & Backtracking ──────────────────────────────────────────────
  meta('factorial', 'Factorial', 'recursion', 'easy', 6, 'The call stack, drawn.', ['recursion basics']),
  meta('fibonacci-recursive', 'Fibonacci (Recursion Tree)', 'recursion', 'easy', 6, 'Exponential branches, made visible.', ['recursion tree']),
  meta('tower-of-hanoi', 'Tower of Hanoi', 'recursion', 'medium', 6, 'Recursive discs, three pegs.', ['hanoi']),
  meta('n-queens', 'N-Queens', 'recursion', 'hard', 6, 'Place, conflict, shake, undo.', ['backtracking']),
  meta('sudoku-solver', 'Sudoku Solver', 'recursion', 'hard', 6, 'Constraint propagation, cell by cell.', ['backtracking']),
  meta('rat-in-a-maze', 'Rat in a Maze', 'recursion', 'medium', 6, 'Try a direction, backtrack out.', ['backtracking', 'maze']),
  meta('subsets', 'Subsets (Power Set)', 'recursion', 'medium', 6, 'Include, exclude, recurse.', ['powerset', 'pick-not-pick']),
  meta('permutations', 'Permutations', 'recursion', 'medium', 6, 'Swap to the front, recurse, swap back.', ['backtracking']),

  // ── DP ────────────────────────────────────────────────────────────────────
  meta('dp-fibonacci', 'Fibonacci (Tabulation)', 'dp', 'easy', 7, 'Iterate instead of branch.', ['tabulation', 'bottom-up']),
  meta('knapsack-01', '0/1 Knapsack', 'dp', 'medium', 7, 'Include or exclude, weigh the value.', ['knapsack']),
  meta('lcs', 'Longest Common Subsequence', 'dp', 'medium', 7, 'Diagonal matches, backtracked path.', ['lcs']),
  meta('lis', 'Longest Increasing Subsequence', 'dp', 'medium', 7, 'Patience and predecessors.', ['lis']),
  meta('edit-distance', 'Edit Distance', 'dp', 'hard', 7, 'Insert, delete, substitute — Levenshtein.', ['levenshtein']),
  meta('coin-change', 'Coin Change', 'dp', 'medium', 7, 'Fewest coins, unbounded supply.', ['min coins']),
  meta('matrix-chain-multiplication', 'Matrix Chain Multiplication', 'dp', 'hard', 7, 'Where to put the parentheses.', ['mcm']),

  // ── Greedy ────────────────────────────────────────────────────────────────
  meta('activity-selection', 'Activity Selection', 'greedy', 'easy', 7, 'Earliest finish wins.', ['intervals']),
  meta('huffman-coding', 'Huffman Coding', 'greedy', 'hard', 7, 'Merge the two rarest, watch the tree rise.', ['compression', 'prefix codes']),
  meta('fractional-knapsack', 'Fractional Knapsack', 'greedy', 'easy', 7, 'Sort by value density, top up.', ['knapsack']),

  // ── Strings ───────────────────────────────────────────────────────────────
  meta('kmp', 'Knuth–Morris–Pratt', 'strings', 'medium', 7, 'Failure links save the rescan.', ['pattern matching'], ['kmp']),
  meta('rabin-karp', 'Rabin–Karp', 'strings', 'medium', 7, 'Rolling hashes over windows.', ['rolling hash']),
  meta('z-algorithm', 'Z-Algorithm', 'strings', 'hard', 7, 'Z-boxes and reuse.', ['z function']),
  meta('boyer-moore', 'Boyer–Moore', 'strings', 'hard', 7, 'Bad character, good suffix, big skips.', ['pattern matching']),

  // ── Misc ──────────────────────────────────────────────────────────────────
  meta('union-find', 'Union-Find (DSU)', 'misc', 'medium', 7, 'Ranks and path compression.', ['dsu', 'disjoint set']),
  meta('sliding-window', 'Sliding Window', 'misc', 'easy', 7, 'A moving frame over the array.', ['window']),
  meta('two-pointers', 'Two Pointers', 'misc', 'easy', 7, 'Converge from both ends.', ['two-pointer']),
  meta('prefix-sum', 'Prefix Sum', 'misc', 'easy', 7, 'O(1) range sums after one pass.', ['cumulative sum']),
  meta('monotonic-stack', 'Monotonic Stack', 'misc', 'medium', 7, 'Next greater element, linearly.', ['nge']),
  meta('binary-exponentiation', 'Binary Exponentiation', 'misc', 'medium', 7, 'Square and multiply.', ['fast power']),
  meta('closest-pair', 'Closest Pair of Points', 'misc', 'hard', 7, 'Divide, conquer, strip.', ['divide & conquer']),
  meta('sieve-of-eratosthenes', 'Sieve of Eratosthenes', 'misc', 'easy', 7, 'Cross out the multiples.', ['primes']),
  meta('euclidean-gcd', 'Euclidean GCD', 'misc', 'easy', 7, 'Remainder until zero.', ['gcd', 'hcf']),
];

export const ALGORITHM_BY_ID: ReadonlyMap<string, AlgorithmMeta> = new Map(
  ALGORITHMS.map((a) => [a.id, a]),
);

export function algorithmsInCategory(category: CategoryId): readonly AlgorithmMeta[] {
  return ALGORITHMS.filter((a) => a.category === category);
}

export function countByStatus(category: CategoryId): { ready: number; total: number } {
  const list = algorithmsInCategory(category);
  return { ready: list.filter((a) => a.status === 'ready').length, total: list.length };
}

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

/**
 * Fuzzy-ish search over name, blurb, tags and aliases. Powers both the sidebar
 * filter and the ⌘K command palette.
 */
export function searchAlgorithms(query: string, limit = 40): AlgorithmMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALGORITHMS.slice(0, limit);

  const scored = ALGORITHMS.map((a) => {
    const haystacks: Array<[string, number]> = [
      [a.name.toLowerCase(), 6],
      [a.id, 5],
      ...(a.aliases ?? []).map((x): [string, number] => [x.toLowerCase(), 4]),
      ...a.tags.map((t): [string, number] => [t.toLowerCase(), 2]),
      [a.blurb.toLowerCase(), 1],
      [a.category, 1],
    ];
    let score = 0;
    for (const [text, weight] of haystacks) {
      if (text.startsWith(q)) score = Math.max(score, weight * 3);
      else if (text.includes(q)) score = Math.max(score, weight * 2);
    }
    return { a, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((x, y) => y.score - x.score || DIFFICULTY_ORDER[x.a.difficulty] - DIFFICULTY_ORDER[y.a.difficulty]);

  return scored.slice(0, limit).map((entry) => entry.a);
}
