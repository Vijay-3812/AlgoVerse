import type { LearnContent } from '@/types';

/**
 * Hand-written Learn Mode content, keyed by algorithm id.
 *
 * Learn Mode has two halves. This file is the *authored* half: the parts a
 * generator cannot know — where an algorithm earns its keep in real systems,
 * and the traps that only make sense once you have watched the trace. The
 * *derived* half (`src/utils/learnQuiz.ts`) fills the gaps from real complexity
 * and catalogue data, so every algorithm ships a quiz and practice links even
 * when nobody wrote prose for it.
 *
 * Nothing here is required: `LEARN_CONTENT[id]` missing simply means the panel
 * runs on derived content alone. The `learn` field on an `AlgorithmDefinition`
 * wins over this map, which is how an algorithm module can own its story.
 */
export const LEARN_CONTENT: Readonly<Record<string, LearnContent>> = {
  /* ── Sorting ──────────────────────────────────────────────────────────── */
  'bubble-sort': {
    intro: [
      'Bubble sort compares neighbours and swaps them when they are out of order. After pass k, the k largest values have bubbled to the tail — which is why the unsorted region shrinks from the right.',
      'It is slow and it never wins on real data, but it is the clearest possible demonstration of an invariant: everything past the boundary is final.',
    ],
    useCases: [
      'Teaching invariants: the sorted tail is visible in every frame.',
      'Detecting an already-sorted array in one pass — the best case is O(n) with the swapped flag.',
      'Tiny fixed-size arrays where the branch predictor beats the asymptotics.',
    ],
    quiz: [
      {
        question: 'How many comparisons does bubble sort make on an already-sorted array of n elements (with the early-exit flag)?',
        options: ['n − 1', 'n² / 2', 'n log n', '0'],
        answer: 0,
        why: 'One clean pass with no swaps proves the array is sorted, so it stops after n − 1 comparisons.',
      },
    ],
    practice: [{ title: 'Sort an Array', url: 'https://leetcode.com/problems/sort-an-array/', difficulty: 'medium' }],
  },

  'insertion-sort': {
    intro: [
      'Insertion sort takes the next card, walks it left past every larger card, and drops it into place. The prefix behind the pointer is always sorted.',
      'That is exactly how people sort a hand of cards, which makes this the fastest algorithm on small or nearly-sorted input — and the reason production sorts switch to it under ~32 elements.',
    ],
    useCases: [
      'The base case inside quicksort and Timsort — real libraries use it for small runs.',
      'Online data: you can insert a new element without re-sorting everything.',
      'Nearly-sorted input (log files, incremental edits), where it is close to O(n).',
    ],
    quiz: [
      {
        question: 'Why is insertion sort faster than merge sort on an array that is already nearly sorted?',
        options: [
          'It performs fewer memory allocations',
          'Each element moves only a short distance, so it approaches O(n)',
          'It uses a smaller stack',
          'It is parallelised',
        ],
        answer: 1,
        why: 'Cost is one shift per inversion. A nearly-sorted array has few inversions, so the inner loop barely runs.',
      },
    ],
    practice: [{ title: 'Sort an Array', url: 'https://leetcode.com/problems/sort-an-array/', difficulty: 'medium' }],
  },

  'merge-sort': {
    intro: [
      'Merge sort splits the array in half until pieces are trivially sorted, then merges two sorted rivers into one by repeatedly taking the smaller head.',
      'The split is trivial; the merge is the algorithm. And because the merge only ever compares the two current heads, equal elements keep their original order — that is stability.',
    ],
    useCases: [
      'Sorting linked lists, where splicing beats random access.',
      'External sorting: merging sorted chunks that do not fit in memory.',
      'Counting inversions — merge sort counts them for free while it merges.',
    ],
    quiz: [
      {
        question: 'Merge sort is stable. Which line of the merge loop guarantees that?',
        options: [
          'Taking from the left run when the two heads are equal',
          'Splitting strictly in half',
          'Recursing on the right half last',
          'Using a temporary array',
        ],
        answer: 0,
        why: 'Ties must be broken in favour of the left run, or an element from the right would jump ahead of an equal element that came earlier.',
      },
    ],
    practice: [{ title: 'Sort an Array', url: 'https://leetcode.com/problems/sort-an-array/', difficulty: 'medium' }],
  },

  'quick-sort': {
    intro: [
      'Quicksort picks a pivot, partitions everything smaller to its left and larger to its right, and recurses on both sides. After partitioning, the pivot is in its final position — permanently.',
      'No merge step, no extra array: the work happens in place. That cache friendliness is why it beats merge sort in practice despite the same average bound.',
    ],
    useCases: [
      'Default general-purpose sort in most standard libraries (introsort).',
      'Selection: quickselect finds the k-th smallest in expected O(n) without sorting.',
      'In-place work on huge arrays where allocation is the bottleneck.',
    ],
    quiz: [
      {
        question: 'What input makes plain quicksort with a first-element pivot degrade to O(n²)?',
        options: ['All values equal', 'Already sorted ascending or descending', 'Random order', 'A power-of-two length'],
        answer: 1,
        why: 'A sorted array gives a maximally unbalanced split every time — one side empty, the other n − 1. Random or median-of-three pivots fix this.',
      },
    ],
    practice: [{ title: 'Sort an Array', url: 'https://leetcode.com/problems/sort-an-array/', difficulty: 'medium' }],
  },

  'heap-sort': {
    intro: [
      'Heap sort builds a max-heap in the array itself, then repeatedly swaps the root to the end and shrinks the heap by one.',
      'The heap is not a tree of pointers — it is the same array you are sorting, where index i has children 2i + 1 and 2i + 2. That is the whole trick.',
    ],
    useCases: [
      'Hard real-time systems: O(n log n) worst case with O(1) extra space, guaranteed.',
      'Selection under memory pressure — no allocation, no recursion.',
      'The heap itself powers priority queues, top-k and scheduling.',
    ],
    quiz: [
      {
        question: 'Why does heapify start at the last internal node (⌊n/2⌋ − 1) instead of the root?',
        options: [
          'To save stack space',
          'So children are already heaps when a parent sifts down',
          'Because leaves must be skipped',
          'To make the sort stable',
        ],
        answer: 1,
        why: 'Sifting bottom-up means every subtree is a valid heap before its parent is processed, so one pass suffices.',
      },
    ],
    practice: [{ title: 'Kth Largest Element in an Array', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/', difficulty: 'medium' }],
  },

  'counting-sort': {
    intro: [
      'Counting sort never compares two values. It counts how many times each key appears, then uses a prefix sum over those counts to place each element directly at its final index.',
      'Because placement walks the input backwards, equal keys keep their order — a non-comparison sort that is also stable.',
    ],
    useCases: [
      'Sorting bytes, ages, grades, or any small bounded integer domain.',
      'The digit pass inside radix sort.',
      'Histogram-style aggregation where counts are the answer anyway.',
    ],
    quiz: [
      {
        question: 'When does counting sort become a bad idea?',
        options: [
          'When n is large',
          'When the key range k is much larger than n — memory becomes O(k)',
          'When keys repeat',
          'When the input is sorted',
        ],
        answer: 1,
        why: 'Time is O(n + k) and space O(k). A sparse key range means allocating mostly empty counters.',
      },
    ],
    practice: [{ title: 'Sort Colors', url: 'https://leetcode.com/problems/sort-colors/', difficulty: 'medium' }],
  },

  /* ── Searching ────────────────────────────────────────────────────────── */
  'binary-search': {
    intro: [
      'Binary search halves a sorted range with one comparison: look at the middle, then throw away the half that cannot contain the target.',
      'The idea is simple; the off-by-ones are not. Whether the bound is exclusive, and whether the loop stops at lo < hi or lo <= hi, is where bugs live.',
    ],
    useCases: [
      'Index lookups in sorted data and database page searches.',
      'Binary search on the answer: minimise a monotone predicate (speed, capacity, days).',
      'Finding a rotational break point, peak, or the first occurrence in a sorted array.',
    ],
    quiz: [
      {
        question: 'On 1 000 000 sorted items, about how many comparisons does binary search need?',
        options: ['20', '1000', '500 000', '7'],
        answer: 0,
        why: 'log₂(10⁶) ≈ 20. Doubling the data costs one extra comparison.',
      },
    ],
    practice: [
      { title: 'Binary Search', url: 'https://leetcode.com/problems/binary-search/', difficulty: 'easy' },
      { title: 'Search in Rotated Sorted Array', url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/', difficulty: 'medium' },
    ],
  },

  'linear-search': {
    intro: [
      'Linear search checks every element until it finds the target or runs out of data. It makes no assumptions about order, which is precisely why it always works.',
      'Its real lesson is baseline thinking: any clever search has to beat n/2 expected probes, and on tiny or unsorted data nothing does.',
    ],
    useCases: [
      'Unsorted collections and one-off scans.',
      'Small arrays where a simpler loop beats the setup cost of anything smarter.',
      'Being the fallback branch of `Array.prototype.includes`.',
    ],
    quiz: [
      {
        question: 'What is the expected number of comparisons for a successful search when the target is equally likely to be anywhere?',
        options: ['n / 2', 'log n', 'n', '1'],
        answer: 0,
        why: 'The target is at position i with probability 1/n, costing i + 1 probes; the average is (n + 1)/2.',
      },
    ],
  },

  /* ── Linear structures ────────────────────────────────────────────────── */
  stack: {
    intro: [
      'A stack is last-in-first-out: the only reachable element is the one most recently pushed.',
      'Every operation touches the top, which is why push and pop are O(1) and why the structure maps onto call frames, undo history and parsing so naturally.',
    ],
    useCases: [
      'Function call frames and the recursion you are watching in this app.',
      'Undo/redo, browser history, and expression evaluation (shunting-yard).',
      'Iterative DFS and backtracking — replacing recursion with an explicit stack.',
    ],
    quiz: [
      {
        question: 'You push 1, 2, 3 and then pop twice. What is on top?',
        options: ['3', '2', '1', 'empty'],
        answer: 2,
        why: 'Pops remove 3 then 2, so 1 is left on top.',
      },
    ],
    practice: [{ title: 'Valid Parentheses', url: 'https://leetcode.com/problems/valid-parentheses/', difficulty: 'easy' }],
  },

  queue: {
    intro: [
      'A queue is first-in-first-out: elements leave in exactly the order they arrived.',
      'It is the fairness structure of computing — every scheduler, buffer and breadth-first traversal is a queue underneath.',
    ],
    useCases: [
      'BFS — the queue is what makes a traversal explore level by level.',
      'Task and print queues, message brokers, request buffering.',
      'Rate limiting and producer–consumer pipelines.',
    ],
    quiz: [
      {
        question: 'Why does a naive array queue have O(n) dequeue?',
        options: [
          'Because searching takes time',
          'Because removing the front shifts every remaining element left',
          'Because arrays are fixed size',
          'It does not — enqueue is the slow one',
        ],
        answer: 1,
        why: 'Everything must shuffle down one slot. A head pointer or a circular buffer removes that cost.',
      },
    ],
    practice: [{ title: 'Implement Queue using Stacks', url: 'https://leetcode.com/problems/implement-queue-using-stacks/', difficulty: 'easy' }],
  },

  'singly-linked-list': {
    intro: [
      'A singly linked list is a chain of nodes, each holding a value and a pointer to the next. There is no index arithmetic: reaching node k costs k hops.',
      'In exchange, inserting or removing a node you already hold is O(1) — no shifting, no reallocation.',
    ],
    useCases: [
      'Free lists, LRU-cache chains and adjacency lists with cheap splices.',
      'Streaming data where you only ever walk forward.',
      'Interview-adjacent pointer practice: reversal, cycle detection, merging.',
    ],
    quiz: [
      {
        question: 'Which operation is *slower* in a linked list than in an array?',
        options: ['Insert at the head', 'Remove a known node', 'Access the k-th element', 'Append with a tail pointer'],
        answer: 2,
        why: 'Indexing requires walking k pointers, while an array multiplies. Random access is the array’s one structural advantage.',
      },
    ],
    practice: [{ title: 'Reverse Linked List', url: 'https://leetcode.com/problems/reverse-linked-list/', difficulty: 'easy' }],
  },

  'priority-queue': {
    intro: [
      'A priority queue always hands you the most urgent element, regardless of arrival order. Implemented as a binary heap, both insert and extract-min are O(log n).',
      'It is the engine behind greedy algorithms: every time you read "repeatedly take the cheapest", the cheapest is coming out of a heap.',
    ],
    useCases: [
      'Dijkstra and A* — the frontier is a min-heap keyed by distance.',
      'OS scheduling, event simulation and load balancing.',
      'Top-k problems and streaming medians (two heaps back to back).',
    ],
    quiz: [
      {
        question: 'Heap operations are O(log n). What makes building a heap from n items O(n) instead of O(n log n)?',
        options: [
          'Inserting in sorted order',
          'Sifting down from the middle: most nodes are near the bottom and barely move',
          'Using a balanced BST',
          'Nothing — it is O(n log n)',
        ],
        answer: 1,
        why: 'Half the nodes are leaves needing no work, a quarter move one level, and so on — the series sums to O(n).',
      },
    ],
    practice: [{ title: 'Kth Largest Element in a Stream', url: 'https://leetcode.com/problems/kth-largest-element-in-a-stream/', difficulty: 'easy' }],
  },

  /* ── Hashing ──────────────────────────────────────────────────────────── */
  'hash-chaining': {
    intro: [
      'Chaining keeps a small list per bucket: a hash collision is not a failure, it is just a second entry in the same list.',
      'Lookup cost is the average chain length, which is the load factor α = n / m. Keep α near 1 and the chains stay short.',
    ],
    useCases: [
      'The dictionary/map in nearly every language runtime.',
      'De-duplication and set membership over large streams.',
      'Caching layers keyed by a request fingerprint.',
    ],
    quiz: [
      {
        question: 'With chaining, what is the expected lookup cost as a function of the load factor α?',
        options: ['O(log α)', 'O(1 + α)', 'O(α²)', 'O(n) always'],
        answer: 1,
        why: 'You hash (O(1)) then scan an average of α entries — hence the drive to keep α bounded.',
      },
    ],
    practice: [{ title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/', difficulty: 'easy' }],
  },

  'hash-linear-probing': {
    intro: [
      'Open addressing stores every entry in the table itself. When a slot is taken, linear probing walks right one slot at a time until it finds a gap.',
      'The catch is clustering: occupied runs merge into long blocks, so probe counts grow faster than the load factor suggests.',
    ],
    useCases: [
      'Cache-friendly hash maps — contiguous probing beats pointer chasing.',
      'High-throughput lookups where allocations are unacceptable.',
      'Bloom filters and other array-only probabilistic structures.',
    ],
    quiz: [
      {
        question: 'Why is deletion in a probing table tricky?',
        options: [
          'It shifts every entry',
          'Emptying a slot breaks probe chains, so you need a tombstone marker',
          'It requires rehashing',
          'It is not tricky',
        ],
        answer: 1,
        why: 'A later lookup probing past the slot would stop early and miss entries that were inserted beyond it.',
      },
    ],
  },

  /* ── Trees ────────────────────────────────────────────────────────────── */
  'bt-traversals': {
    intro: [
      'In-order, pre-order, post-order and level-order visit the same nodes in four different rhythms. In a BST, in-order is the sorted order — that is the traversal earning its keep.',
      'Pre-order rebuilds a tree from its serialisation; post-order frees children before parents; level-order is BFS on a tree.',
    ],
    useCases: [
      'Serialising and restoring trees (pre-order + markers).',
      'Expression trees: post-order evaluates, in-order prints infix.',
      'Level-order for BFS-style questions — level averages, right-side view, width.',
    ],
    quiz: [
      {
        question: 'Which traversal of a binary search tree yields the keys in ascending order?',
        options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'],
        answer: 1,
        why: 'In-order visits left subtree → node → right subtree, and every left key is smaller than the node.',
      },
    ],
    practice: [{ title: 'Binary Tree Inorder Traversal', url: 'https://leetcode.com/problems/binary-tree-inorder-traversal/', difficulty: 'easy' }],
  },

  bst: {
    intro: [
      'A binary search tree keeps the invariant left < node < right at every node, so each comparison discards an entire subtree.',
      'Search, insert and delete all follow one root-to-leaf path — but only if the tree stays balanced, which a plain BST does not promise.',
    ],
    useCases: [
      'Ordered maps: sorted iteration plus O(log n) lookup in one structure.',
      'Range queries and nearest-neighbour (`floor`, `ceil`) lookups.',
      'Databases and filesystems, where the idea survives as the B-tree.',
    ],
    quiz: [
      {
        question: 'What is the worst-case height of a BST built by inserting already-sorted keys?',
        options: ['log n', 'n / 2', 'n − 1', '√n'],
        answer: 2,
        why: 'Every new key becomes the right child of the previous one, degenerating the tree into a linked list.',
      },
    ],
    practice: [{ title: 'Validate Binary Search Tree', url: 'https://leetcode.com/problems/validate-binary-search-tree/', difficulty: 'medium' }],
  },

  avl: {
    intro: [
      'An AVL tree is a BST that refuses to get lopsided: the heights of any node’s two subtrees may differ by at most one, and rotations restore that promise after every insert.',
      'Four cases — LL, RR, LR, RL — cover every imbalance, and each rotation is O(1) pointer surgery.',
    ],
    useCases: [
      'Lookup-heavy in-memory indexes where the worst case must be bounded.',
      'Any place you would use a balanced tree but read far more than you write.',
      'Teaching rotations: the balance factor printed on every node is the whole story.',
    ],
    quiz: [
      {
        question: 'A node’s left subtree has height 4 and its right subtree height 2. Which rotation family applies?',
        options: ['LL', 'RR', 'LR', 'None — it is balanced'],
        answer: 2,
        why: 'Balance factor +2 means left-heavy; if the left child is itself right-heavy the case is LR (rotate left then right).',
      },
    ],
    practice: [{ title: 'Balance a Binary Search Tree', url: 'https://leetcode.com/problems/balance-a-binary-search-tree/', difficulty: 'medium' }],
  },

  'red-black-tree': {
    intro: [
      'A red-black tree balances with colour, not height arithmetic: no red node has a red child, and every root-to-leaf path has the same number of black nodes.',
      'Those two rules guarantee the longest path is at most twice the shortest — O(log n) without storing a single balance factor.',
    ],
    useCases: [
      'Standard-library ordered maps and sets (C++ `std::map`, Java `TreeMap`).',
      'Kernel and allocator structures needing predictable worst case.',
      'Interval and order-statistic trees built on top of rotations.',
    ],
    quiz: [
      {
        question: 'Why does a red-black tree stay balanced using only colours?',
        options: [
          'Colours are cheaper memory than heights',
          'Equal black-height plus no red-red edges bounds the longest path at twice the shortest',
          'Red nodes are deleted immediately',
          'It rebalances randomly',
        ],
        answer: 1,
        why: 'That bound is enough to guarantee height ≤ 2 log₂(n + 1), which is all the complexity proof needs.',
      },
    ],
  },

  heap: {
    intro: [
      'A binary heap is a complete tree stored flat in an array, with one rule: every parent beats its children. There is no ordering between siblings.',
      'Completeness is what keeps it in an array with no pointers, and the single parent/child rule is what makes sift-up and sift-down cheap.',
    ],
    useCases: [
      'Priority queues, schedulers and event loops.',
      'Heapsort — O(n log n) worst case, zero extra memory.',
      'Streaming top-k, running medians and bandwidth-limited merging.',
    ],
    quiz: [
      {
        question: 'In a 0-indexed binary heap array, which indices are the children of node i?',
        options: ['2i and 2i + 1', '2i + 1 and 2i + 2', 'i/2 and i/2 + 1', 'i + 1 and i + 2'],
        answer: 1,
        why: 'The 1-indexed rule (2i, 2i+1) shifts by one when the array starts at zero; the parent of i is ⌊(i − 1) / 2⌋.',
      },
    ],
    practice: [{ title: 'Last Stone Weight', url: 'https://leetcode.com/problems/last-stone-weight/', difficulty: 'easy' }],
  },

  trie: {
    intro: [
      'A trie stores strings as paths: each edge consumes one character, so a shared prefix is stored exactly once.',
      'Lookup cost depends on the length of the word, not on how many words you stored — that independence is the point.',
    ],
    useCases: [
      'Autocomplete, search suggestions and spell checkers.',
      'IP routing tables (binary tries over address bits).',
      'Word games and dictionary filtering — Boggle solvers prune whole subtrees.',
    ],
    quiz: [
      {
        question: 'What is the cost of searching for a word of length L in a trie holding n words?',
        options: ['O(log n)', 'O(L)', 'O(L log n)', 'O(n)'],
        answer: 1,
        why: 'You follow one edge per character, regardless of the dictionary size.',
      },
    ],
    practice: [{ title: 'Implement Trie (Prefix Tree)', url: 'https://leetcode.com/problems/implement-trie-prefix-tree/', difficulty: 'medium' }],
  },

  'segment-tree': {
    intro: [
      'A segment tree stores every interval of an array in a binary tree: each node owns a range and its aggregate (sum, min, max).',
      'A query decomposes into O(log n) disjoint nodes; an update walks one root-to-leaf path and rebuilds it, also O(log n).',
    ],
    useCases: [
      'Range queries with updates — sums, minima, maximum subarray.',
      'Time-series analytics and stock-range questions.',
      'Competitive programming workhorses: lazy propagation, range assignment, beats.',
    ],
    quiz: [
      {
        question: 'Why does one range query touch only O(log n) nodes?',
        options: [
          'Because the tree has log n levels and only boundary nodes need recursion',
          'Because each level stores one total',
          'Because queries are cached',
          'Because the array is sorted',
        ],
        answer: 0,
        why: 'A fully covered node is answered immediately; only the two boundary paths keep splitting.',
      },
    ],
    practice: [{ title: 'Range Sum Query — Mutable', url: 'https://leetcode.com/problems/range-sum-query-mutable/', difficulty: 'medium' }],
  },

  'fenwick-tree': {
    intro: [
      'A Fenwick tree (binary indexed tree) answers prefix sums with a single array, using the lowest set bit of an index to hop between partial sums.',
      'The update path is index += index & −index; the query path is index −= index & −index. Six lines of code, O(log n) both ways.',
    ],
    useCases: [
      'Counts of values seen so far — inversions, rank queries, order statistics.',
      'Streaming frequency tables that need prefix sums.',
      'Sweeping-line problems where points arrive and queries interleave.',
    ],
    quiz: [
      {
        question: 'What does `index & −index` extract?',
        options: ['The highest set bit', 'The lowest set bit', 'The bit count', 'A random bit'],
        answer: 1,
        why: 'That value is the size of the range the node at `index` is responsible for — the mechanism behind every hop.',
      },
    ],
    practice: [{ title: 'Count of Smaller Numbers After Self', url: 'https://leetcode.com/problems/count-of-smaller-numbers-after-self/', difficulty: 'hard' }],
  },

  /* ── Graphs ───────────────────────────────────────────────────────────── */
  bfs: {
    intro: [
      'Breadth-first search expands in rings: everything one hop from the source, then two hops, and so on, because it uses a queue.',
      'The first time it reaches a node is therefore along a shortest path in edges — no weights, no relaxation, just order of discovery.',
    ],
    useCases: [
      'Shortest path in unweighted graphs — words, moves, hops.',
      'Level-by-level processing: social distance, web crawling, flooding.',
      'Finding connected components, bipartiteness and cycle detection.',
    ],
    quiz: [
      {
        question: 'Which structure makes BFS explore level by level?',
        options: ['Stack', 'Queue', 'Priority queue', 'Heap'],
        answer: 1,
        why: 'FIFO order means all distance-k nodes are processed before any distance-(k+1) node.',
      },
    ],
    practice: [{ title: 'Word Ladder', url: 'https://leetcode.com/problems/word-ladder/', difficulty: 'hard' }],
  },

  dfs: {
    intro: [
      'Depth-first search commits to one path and follows it to the end, then rewinds and tries the next branch. A stack (or recursion) is the whole machine.',
      'Its structure — enter, recurse, exit — is what makes DFS the natural tool for everything topological: components, cycles, bridges, orderings.',
    ],
    useCases: [
      'Cycle detection and topological structure.',
      'Maze solving, flood fill and connected components.',
      'Finding bridges, articulation points and strongly connected components.',
    ],
    quiz: [
      {
        question: 'What is the DFS time complexity for a graph with V vertices and E edges stored as adjacency lists?',
        options: ['O(V²)', 'O(V + E)', 'O(E log V)', 'O(V · E)'],
        answer: 1,
        why: 'Each vertex is entered once and each of its edges is scanned once across the whole traversal.',
      },
    ],
    practice: [{ title: 'Number of Islands', url: 'https://leetcode.com/problems/number-of-islands/', difficulty: 'medium' }],
  },

  dijkstra: {
    intro: [
      'Dijkstra grows a region of settled nodes around the source, always settling the closest unsettled node, then relaxing its outgoing edges.',
      'Greediness works because edge weights are non-negative: once a node is the closest in the frontier, no future detour can beat the distance you already have.',
    ],
    useCases: [
      'Road networks and map routing (contracted hierarchies build on it).',
      'Network routing protocols — OSPF is Dijkstra in the real world.',
      'Any shortest-path problem with non-negative weights, including cost graphs.',
    ],
    quiz: [
      {
        question: 'Why does Dijkstra break on negative edge weights?',
        options: [
          'It loops forever',
          'Settling a node assumes no later path can be cheaper, which a negative edge can falsify',
          'Heaps cannot store negative numbers',
          'It overflows the distance array',
        ],
        answer: 1,
        why: 'A negative edge can reopen a settled node — use Bellman–Ford or Johnson’s reweighting instead.',
      },
    ],
    practice: [{ title: 'Network Delay Time', url: 'https://leetcode.com/problems/network-delay-time/', difficulty: 'medium' }],
  },

  'bellman-ford': {
    intro: [
      'Bellman–Ford relaxes every edge V − 1 times. That brute force tolerates negative weights, because information simply propagates one hop per round.',
      'Run one extra round and any edge that still improves is proof of a negative cycle reachable from the source.',
    ],
    useCases: [
      'Graphs with negative weights where Dijkstra is invalid.',
      'Currency-arbitrage detection — a profitable cycle is a negative cycle.',
      'Distance-vector routing (RIP) and as a distributed relaxation.',
    ],
    quiz: [
      {
        question: 'Why exactly V − 1 rounds?',
        options: [
          'Arbitrary convention',
          'A shortest path visits at most V vertices, so it has at most V − 1 edges',
          'To match the heap size',
          'Because edge lists are sorted',
        ],
        answer: 1,
        why: 'Each round finalises at least one more edge of the path; after V − 1 rounds every path length is accounted for.',
      },
    ],
    practice: [{ title: 'Cheapest Flights Within K Stops', url: 'https://leetcode.com/problems/cheapest-flights-within-k-stops/', difficulty: 'medium' }],
  },

  'floyd-warshall': {
    intro: [
      'Floyd–Warshall fills an all-pairs distance matrix by asking, for every intermediate vertex k, whether going through k is cheaper.',
      'Three nested loops, five lines of code, and every pair of shortest paths at once — including detection of negative cycles on the diagonal.',
    ],
    useCases: [
      'Small dense graphs where all-pairs distances are wanted.',
      'Transitive closure: reachability reduces to the same triple loop with booleans.',
      'Comparing hub distances, or any n ≤ ~500 dense matrix problem.',
    ],
    quiz: [
      {
        question: 'What does a negative value on the diagonal after Floyd–Warshall mean?',
        options: ['A bug', 'An unreachable pair', 'A negative cycle exists', 'Weights were zero'],
        answer: 2,
        why: 'dist[v][v] < 0 means a cycle through v reduces the cost of returning to v.',
      },
    ],
    practice: [{ title: 'Find the City With the Smallest Number of Neighbors', url: 'https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/', difficulty: 'medium' }],
  },

  'a-star': {
    intro: [
      'A* is Dijkstra plus a guess: it orders the frontier by f = g + h, the cost so far plus an estimate of the cost remaining.',
      'If h never overestimates, A* is guaranteed optimal — and the better the estimate, the fewer nodes get expanded.',
    ],
    useCases: [
      'Game pathfinding on grids and navigation meshes.',
      'Robot motion planning and puzzle solving (15-puzzle, Rubik’s cube).',
      'Any search where a cheap heuristic exists — Manhattan, Euclidean, pattern databases.',
    ],
    quiz: [
      {
        question: 'What must be true of the heuristic h for A* to remain optimal?',
        options: [
          'It must be exact',
          'It must never overestimate the true remaining cost',
          'It must be zero',
          'It must be computed in O(1)',
        ],
        answer: 1,
        why: 'Admissibility — h(n) ≤ true cost. Overestimating can make A* settle a suboptimal path first.',
      },
    ],
    practice: [{ title: 'Sliding Puzzle', url: 'https://leetcode.com/problems/sliding-puzzle/', difficulty: 'hard' }],
  },

  prim: {
    intro: [
      'Prim’s algorithm grows one tree from a seed vertex, repeatedly adding the cheapest edge that connects a new vertex to the tree.',
      'The cut property guarantees that choice is safe: the cheapest edge crossing any cut belongs to some minimum spanning tree.',
    ],
    useCases: [
      'Network design — laying cable, pipelines and power lines at minimum cost.',
      'Clustering: drop the k − 1 most expensive MST edges to get k clusters.',
      'Approximate TSP tours (a pre-order walk of an MST is within 2× optimal).',
    ],
    quiz: [
      {
        question: 'What data structure makes Prim’s O(E log V)?',
        options: ['Queue', 'Stack', 'Min-heap of frontier keys', 'Union-Find'],
        answer: 2,
        why: 'Each edge update is a heap decrease-key; a Union-Find belongs to Kruskal’s edge-sorted variant.',
      },
    ],
    practice: [{ title: 'Min Cost to Connect All Points', url: 'https://leetcode.com/problems/min-cost-to-connect-all-points/', difficulty: 'medium' }],
  },

  kruskal: {
    intro: [
      'Kruskal’s algorithm sorts every edge by weight and adds it unless it would form a cycle — a question answered in near-constant time by Union-Find.',
      'It is Prim’s algorithm standing outside the graph, which makes it the natural choice on sparse or edge-list-only input.',
    ],
    useCases: [
      'Sparse graphs and edge-list inputs where sorting is cheap.',
      'Single-linkage clustering and image segmentation.',
      'Any MST problem where the graph is given as edges, not adjacency.',
    ],
    quiz: [
      {
        question: 'How does Kruskal know whether an edge closes a cycle?',
        options: [
          'By running DFS each time',
          'By checking whether both endpoints already share a component in the DSU',
          'By comparing edge weights',
          'By counting edges',
        ],
        answer: 1,
        why: 'If `find(u) == find(v)` the edge would join two vertices already connected, so it must be skipped.',
      },
    ],
    practice: [{ title: 'Connecting Cities With Minimum Cost', url: 'https://leetcode.com/problems/connecting-cities-with-minimum-cost/', difficulty: 'medium' }],
  },

  'topological-sort-kahn': {
    intro: [
      'Kahn’s algorithm repeatedly removes a vertex with in-degree zero and decrements its neighbours. What leaves the queue is a valid dependency order.',
      'The strength of the method is its failure mode: if the queue empties before every vertex is output, the graph has a cycle — and you can name it.',
    ],
    useCases: [
      'Build systems, package managers and task schedulers.',
      'Course-prerequisite ordering and spreadsheet recalculation.',
      'Cycle detection in dependency graphs — the in-degree never reaches zero.',
    ],
    quiz: [
      {
        question: 'What does a non-empty graph with an empty queue at the end prove?',
        options: ['Disconnected graph', 'A cycle', 'Negative weights', 'Multiple components'],
        answer: 1,
        why: 'In a DAG at least one vertex always has in-degree zero; if none does, the remaining vertices form a cycle.',
      },
    ],
    practice: [{ title: 'Course Schedule II', url: 'https://leetcode.com/problems/course-schedule-ii/', difficulty: 'medium' }],
  },

  'tarjan-scc': {
    intro: [
      'Tarjan finds strongly connected components in one DFS pass, tagging each vertex with a discovery index and a low-link value that says how far back its subtree can reach.',
      'Whenever low-link equals the index, the stack above that vertex forms an entire SCC.',
    ],
    useCases: [
      'Condensing graphs — collapse SCCs to get a DAG and then topologically sort it.',
      '2-SAT solving and implication-graph analysis.',
      'Deadlock and circular-dependency detection in systems.',
    ],
    quiz: [
      {
        question: 'What does the low-link value of a vertex represent?',
        options: [
          'Its depth in the DFS tree',
          'The smallest discovery index reachable from its subtree',
          'Its out-degree',
          'The number of back edges',
        ],
        answer: 1,
        why: '`low[v] == index[v]` means nothing in v’s subtree can escape upward, so v roots an SCC.',
      },
    ],
    practice: [{ title: 'Critical Connections in a Network', url: 'https://leetcode.com/problems/critical-connections-in-a-network/', difficulty: 'hard' }],
  },

  'bipartite-check': {
    intro: [
      'A graph is bipartite when its vertices split into two sides with every edge crossing between them — equivalently, when it is 2-colourable.',
      'Two-colour it by BFS: neighbours must differ from their parent. The first conflicting edge you find is an odd cycle, and that is the proof of failure.',
    ],
    useCases: [
      'Scheduling and conflict graphs — exams, registers, frequencies.',
      'Matching problems: bipartite matching, assignment, Hopcroft–Karp.',
      'Detecting odd cycles, which is what makes a graph non-bipartite.',
    ],
    quiz: [
      {
        question: 'Which of these graphs is definitely not bipartite?',
        options: ['A path of 5 nodes', 'A triangle', 'A star', 'A tree'],
        answer: 1,
        why: 'An odd cycle cannot be 2-coloured: the third vertex would have to share a colour with one of its neighbours.',
      },
    ],
    practice: [{ title: 'Is Graph Bipartite?', url: 'https://leetcode.com/problems/is-graph-bipartite/', difficulty: 'medium' }],
  },

  'cycle-detection': {
    intro: [
      'Detecting a cycle needs different bookkeeping per traversal: three colours (white, grey, black) for directed graphs, and a parent check for undirected ones.',
      'Grey is the magic state — reaching a grey vertex means you just walked into a node on the current recursion path.',
    ],
    useCases: [
      'Dependency validation in build tools and ORMs.',
      'Deadlock detection in resource-allocation graphs.',
      'Guard rails before topological sorting or DP on a DAG.',
    ],
    quiz: [
      {
        question: 'In undirected DFS, why must you ignore the edge back to the parent?',
        options: [
          'It is slower to visit twice',
          'Every tree edge would otherwise look like a cycle',
          'The parent has no colour',
          'It corrupts the stack',
        ],
        answer: 1,
        why: 'The edge you arrived on is not a cycle, so the check is "visited and not my parent".',
      },
    ],
    practice: [{ title: 'Course Schedule', url: 'https://leetcode.com/problems/course-schedule/', difficulty: 'medium' }],
  },

  /* ── Recursion & backtracking ─────────────────────────────────────────── */
  'tower-of-hanoi': {
    intro: [
      'Hanoi solves itself recursively: move n − 1 disks aside, move the largest, then move the n − 1 back on top.',
      'The recursion tree is why the count doubles minus one each time — 2ⁿ − 1 moves, the smallest exponential you will ever meet.',
    ],
    useCases: [
      'Teaching recursion and the cost of exponential growth.',
      'The classic 64-disk legend — 585 billion years at one move per second.',
      'Backup and rotation schemes that reuse the same move discipline.',
    ],
    quiz: [
      {
        question: 'How many moves does the optimal solution to n disks take?',
        options: ['n²', '2ⁿ − 1', 'n!', '3ⁿ'],
        answer: 1,
        why: 'T(n) = 2·T(n − 1) + 1 with T(1) = 1 solves to 2ⁿ − 1.',
      },
    ],
  },

  'n-queens': {
    intro: [
      'N-Queens places one queen per row and backtracks the moment a column or diagonal is attacked.',
      'Watching the undo is the point: most of the search tree is rejection, and pruning is what turns 4ⁿ into something that actually finishes.',
    ],
    useCases: [
      'Constraint satisfaction — the pattern behind Sudoku solvers and schedulers.',
      'Pruning as an algorithmic idea: reject early, undo cheaply.',
      'Classic AI teaching example for search trees.',
    ],
    quiz: [
      {
        question: 'How many solutions does 4-queens have?',
        options: ['1', '2', '4', '0'],
        answer: 1,
        why: 'Two mirror-image placements exist; for n = 8 the count is 92.',
      },
    ],
    practice: [{ title: 'N-Queens', url: 'https://leetcode.com/problems/n-queens/', difficulty: 'hard' }],
  },

  'sudoku-solver': {
    intro: [
      'The Sudoku solver finds the first empty cell, tries 1–9, and recurses; a contradiction sends it back to try the next digit.',
      'Its real-world speed comes from constraint bookkeeping — tracking used digits per row, column and box turns a scan into a lookup.',
    ],
    useCases: [
      'Exact cover and constraint propagation solvers.',
      'Real puzzle engines, which add heuristics like most-constrained-cell-first.',
      'The canonical backtracking demonstration.',
    ],
    quiz: [
      {
        question: 'Why is choosing the most-constrained empty cell first a good heuristic?',
        options: [
          'It uses less memory',
          'It fails fast, pruning large parts of the search tree',
          'It keeps the grid tidy',
          'It makes the puzzle unique',
        ],
        answer: 1,
        why: 'Cells with few candidates explode immediately if they are wrong, before time is spent on hopeless subtrees.',
      },
    ],
    practice: [{ title: 'Sudoku Solver', url: 'https://leetcode.com/problems/sudoku-solver/', difficulty: 'hard' }],
  },

  subsets: {
    intro: [
      'The power set has 2ⁿ subsets, and the recursion mirrors that exactly: for each element, branch into "take it" and "skip it".',
      'The recursion tree *is* the answer — each leaf is one subset, which is why the count doubles with every new element.',
    ],
    useCases: [
      'Subset-sum and partition problems.',
      'Feature-selection search spaces in machine learning.',
      'Meet-in-the-middle techniques that split the exponent in half.',
    ],
    quiz: [
      {
        question: 'How many subsets does a set of 5 elements have?',
        options: ['10', '25', '32', '120'],
        answer: 2,
        why: '2⁵ = 32 — every element is independently in or out.',
      },
    ],
    practice: [{ title: 'Subsets', url: 'https://leetcode.com/problems/subsets/', difficulty: 'medium' }],
  },

  /* ── Dynamic programming ──────────────────────────────────────────────── */
  'dp-fibonacci': {
    intro: [
      'Tabulated Fibonacci fills a table left to right, each cell from the two before it. Every subproblem is solved exactly once.',
      'Compare it with the recursion-tree version of the same function: identical answers, and the memo table deletes an exponential amount of repeated work.',
    ],
    useCases: [
      'The gateway DP: overlapping subproblems plus optimal substructure.',
      'Counting paths, stairs and ways problems everywhere.',
      'Rolling-array optimisation — only two values are ever needed.',
    ],
    quiz: [
      {
        question: 'What turns the naive recursive Fibonacci from O(2ⁿ) into O(n)?',
        options: ['Iteration', 'Caching each subproblem’s result', 'Big integers', 'Tail calls'],
        answer: 1,
        why: 'Without memoisation fib(30) recomputes fib(28) twice, fib(27) three times… — the tree is the exponential.',
      },
    ],
    practice: [{ title: 'Climbing Stairs', url: 'https://leetcode.com/problems/climbing-stairs/', difficulty: 'easy' }],
  },

  'knapsack-01': {
    intro: [
      '0/1 Knapsack asks, for each item, whether adding it improves the best value achievable at that capacity. The table cell is the best of "take" and "skip".',
      'The answer lives in the last cell; the chosen set comes from walking the table backwards and watching where the value changed.',
    ],
    useCases: [
      'Resource allocation under a hard budget.',
      'Portfolio and packing problems with indivisible items.',
      'Approximation foundations — FPTAS for knapsack is DP plus scaling.',
    ],
    quiz: [
      {
        question: 'Why must the capacity loop run downwards when the DP is compressed to one dimension?',
        options: [
          'To save memory',
          'So each item is used at most once — upwards would reuse it in the same pass',
          'To sort the items',
          'It does not matter',
        ],
        answer: 1,
        why: 'Descending order guarantees the cell you read was written before the current item was considered, keeping it 0/1 rather than unbounded.',
      },
    ],
    practice: [{ title: 'Partition Equal Subset Sum', url: 'https://leetcode.com/problems/partition-equal-subset-sum/', difficulty: 'medium' }],
  },

  lcs: {
    intro: [
      'Longest Common Subsequence fills a grid where a match extends the diagonal and a mismatch takes the better of the two neighbours.',
      'The filled grid is a map of similarity: the final cell is the length, and walking the diagonal arrows recovers the actual subsequence.',
    ],
    useCases: [
      'Diff tools (`git diff` is an LCS variant).',
      'DNA and protein sequence alignment.',
      'Fuzzy search, plagiarism detection and speech recognition.',
    ],
    quiz: [
      {
        question: 'The LCS of "ABCBDAB" and "BDCABA" has length…',
        options: ['3', '4', '5', '2'],
        answer: 1,
        why: 'One optimal subsequence is BCBA — length 4.',
      },
    ],
    practice: [{ title: 'Longest Common Subsequence', url: 'https://leetcode.com/problems/longest-common-subsequence/', difficulty: 'medium' }],
  },

  lis: {
    intro: [
      'Longest Increasing Subsequence can be done in O(n²) with a table, or O(n log n) by keeping the smallest possible tail for every length seen so far.',
      'The tails array is not the answer — it is the *shape* of the answer, and that subtlety is worth watching twice.',
    ],
    useCases: [
      'Patience sorting and card-game modelling.',
      'Stock and trend analysis over time series.',
      'Reduction target for many 2D problems (sort one axis, LIS the other).',
    ],
    quiz: [
      {
        question: 'Why does binary search work on the tails array?',
        options: [
          'It is sorted ascending by construction',
          'It is a heap',
          'It stores indices',
          'It is rebuilt each step',
        ],
        answer: 0,
        why: 'The array of minimal tails is always strictly increasing, which is exactly the precondition binary search needs.',
      },
    ],
    practice: [{ title: 'Longest Increasing Subsequence', url: 'https://leetcode.com/problems/longest-increasing-subsequence/', difficulty: 'medium' }],
  },

  'coin-change': {
    intro: [
      'Coin Change builds the minimum number of coins for every amount up to the target, bottom-up: dp[a] = 1 + min(dp[a − coin]).',
      'Greedy fails on real coin systems — this table is the honest answer, and the backtrack walk shows which coins paid.',
    ],
    useCases: [
      'Cash dispensing, vending machines and payment splitting.',
      'Unbounded knapsack variants in resource problems.',
      'Teaching why greedy is a proof obligation, not an instinct.',
    ],
    quiz: [
      {
        question: 'For coins {1, 3, 4} and amount 6, what does greedy produce and what is optimal?',
        options: ['2 (3+3) and 2', '3 (4+1+1) and 2 (3+3)', '4 and 4', '3 and 3'],
        answer: 1,
        why: 'Greedy grabs 4, then needs 1+1 — three coins where two suffice. This is the textbook counterexample.',
      },
    ],
    practice: [{ title: 'Coin Change', url: 'https://leetcode.com/problems/coin-change/', difficulty: 'medium' }],
  },

  'edit-distance': {
    intro: [
      'Edit distance fills a grid of three moves: substitute (diagonal), delete (up) and insert (left), each cell taking the cheapest plus one.',
      'The final cell is the number; the backtrack path is the edit script a spell checker or diff would apply.',
    ],
    useCases: [
      'Spell correction and fuzzy matching.',
      'DNA alignment with custom substitution costs.',
      'Git-style diffing and OCR post-processing.',
    ],
    quiz: [
      {
        question: 'What do the three neighbours of a cell represent?',
        options: [
          'Three different words',
          'Replace, delete and insert',
          'Match, mismatch and gap',
          'Three recursion depths',
        ],
        answer: 1,
        why: 'Diagonal = substitute (or free match), up = delete from the first string, left = insert into it.',
      },
    ],
    practice: [{ title: 'Edit Distance', url: 'https://leetcode.com/problems/edit-distance/', difficulty: 'hard' }],
  },

  'matrix-chain-multiplication': {
    intro: [
      'Matrix chain multiplication is not about computing the product but about the *order* of it: the cost depends entirely on how you parenthesise.',
      'The DP fills by increasing chain length, asking for each split point which one minimises work — then the backtrack prints the schedule.',
    ],
    useCases: [
      'Query planners in databases deciding join order.',
      'Compiler and tensor-graph optimisation for arbitrary-precision arithmetic.',
      'Teaching interval DP — the pattern behind burst balloons and polygon triangulation.',
    ],
    quiz: [
      {
        question: 'How many ways are there to parenthesise a product of n matrices?',
        options: ['n²', 'n!', 'Catalan number C(n − 1)', '2ⁿ'],
        answer: 2,
        why: 'The count is exponential (C(4) = 14 for five matrices), which is exactly why DP is needed.',
      },
    ],
    practice: [{ title: 'Minimum Score Triangulation of Polygon', url: 'https://leetcode.com/problems/minimum-score-triangulation-of-polygon/', difficulty: 'medium' }],
  },

  /* ── Greedy ───────────────────────────────────────────────────────────── */
  'activity-selection': {
    intro: [
      'Activity selection sorts by finishing time and always takes the next activity that starts after the last one ended.',
      'Earliest finish leaves the most room for what follows — the exchange argument that makes this greedy provably optimal.',
    ],
    useCases: [
      'Meeting-room and classroom scheduling.',
      'Interval scheduling to maximise throughput of any shared resource.',
      'CPU task batching and advertisement slotting.',
    ],
    quiz: [
      {
        question: 'Why sort by finish time rather than by start time or duration?',
        options: [
          'It is faster to sort',
          'Finishing earliest leaves the maximum remaining time for other activities',
          'Start times may tie',
          'It makes the algorithm stable',
        ],
        answer: 1,
        why: 'The exchange argument: any optimal schedule can swap its first activity for the earliest-finishing one without losing anything.',
      },
    ],
    practice: [{ title: 'Non-overlapping Intervals', url: 'https://leetcode.com/problems/non-overlapping-intervals/', difficulty: 'medium' }],
  },

  'huffman-coding': {
    intro: [
      'Huffman coding repeatedly merges the two least frequent symbols into a parent whose weight is their sum. The result is a prefix-free tree with optimal expected code length.',
      'Frequent symbols end up near the root because they survive the most merges — the greedy choice is literally "keep the rare ones out of the way".',
    ],
    useCases: [
      'File compression (the Huffman stage in DEFLATE, gzip, JPEG).',
      'Entropy coding in video and image codecs.',
      'Anywhere variable-length codes must be unambiguous — prefix-free by construction.',
    ],
    quiz: [
      {
        question: 'Why are Huffman codes unambiguous without separators?',
        options: [
          'All codes have equal length',
          'No codeword is a prefix of another',
          'They are stored sorted',
          'They include a terminator symbol',
        ],
        answer: 1,
        why: 'Decoding walks the tree until a leaf: the moment you reach a symbol, no other codeword can begin with the bits consumed.',
      },
    ],
    practice: [{ title: 'Construct String With Repeat Limit', url: 'https://leetcode.com/problems/construct-string-with-repeat-limit/', difficulty: 'medium' }],
  },

  'fractional-knapsack': {
    intro: [
      'Fractional knapsack sorts by value-to-weight ratio and takes as much of the best ratio as still fits — including part of an item.',
      'Because items are divisible, greedy is provably optimal here, while the 0/1 version needs dynamic programming. That contrast is the lesson.',
    ],
    useCases: [
      'Bulk commodity and cargo loading where goods are divisible.',
      'Budget allocation with continuously scalable spend.',
      'The counterexample that motivates DP for discrete packing.',
    ],
    quiz: [
      {
        question: 'What changes between fractional and 0/1 knapsack?',
        options: [
          'The capacity',
          'Divisibility — greedy is optimal only when items can be split',
          'The value units',
          'Nothing important',
        ],
        answer: 1,
        why: 'Splitting removes the awkward "take it or leave it" discontinuity that greedy cannot reason about.',
      },
    ],
    practice: [{ title: 'Maximum Units on a Truck', url: 'https://leetcode.com/problems/maximum-units-on-a-truck/', difficulty: 'easy' }],
  },

  /* ── Strings ──────────────────────────────────────────────────────────── */
  kmp: {
    intro: [
      'KMP precomputes, for every prefix of the pattern, the length of the longest proper prefix that is also a suffix — the failure function.',
      'That table is what stops the text pointer from ever going backwards: a mismatch skips ahead instead of restarting.',
    ],
    useCases: [
      'Substring search in editors, `grep` and `strstr` implementations.',
      'Streaming pattern detection where backtracking is impossible.',
      'String periodicity and border analysis (also used in cycle detection).',
    ],
    quiz: [
      {
        question: 'What is the failure function value at index i?',
        options: [
          'The number of comparisons so far',
          'The longest proper prefix of pattern[0..i] that is also its suffix',
          'The pattern length',
          'The index of the last mismatch',
        ],
        answer: 1,
        why: 'On a mismatch it tells you how much of the pattern is still a valid match, so nothing is re-examined.',
      },
    ],
    practice: [{ title: 'Find the Index of the First Occurrence', url: 'https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/', difficulty: 'easy' }],
  },

  'rabin-karp': {
    intro: [
      'Rabin–Karp compares hashes instead of characters: slide a window over the text and update its rolling hash in O(1) per shift.',
      'Equal hashes are only a candidate — verify character by character to rule out collisions, which is why it stays O(n + m) expected.',
    ],
    useCases: [
      'Plagiarism and duplicate detection across many documents.',
      'Detecting repeated substrings — counts, longest duplicates.',
      'Digital fingerprinting where windows slide at high speed.',
    ],
    quiz: [
      {
        question: 'Why can Rabin–Karp be O(nm) in the worst case?',
        options: [
          'Hash collisions force verification at every position',
          'The rolling hash is expensive',
          'Modular arithmetic is slow',
          'It sorts the text',
        ],
        answer: 0,
        why: 'A bad modulus or adversarial input can make every window match by hash, so every one must be checked.',
      },
    ],
    practice: [{ title: 'Repeated DNA Sequences', url: 'https://leetcode.com/problems/repeated-dna-sequences/', difficulty: 'medium' }],
  },

  /* ── Divide & conquer + patterns ──────────────────────────────────────── */
  'union-find': {
    intro: [
      'Union-Find tracks disjoint sets with two arrays and two tricks: path compression flattens the tree on every find, and union by size keeps trees shallow.',
      'Together they give near-constant amortised time — the inverse Ackermann α(n), which is below 4 for any input you will ever meet.',
    ],
    useCases: [
      'Kruskal’s MST: cycle checks in near-constant time.',
      'Connectivity queries that arrive online — social networks, networks, grids.',
      'Image segmentation, percolation and equivalence-class grouping.',
    ],
    quiz: [
      {
        question: 'What does path compression do?',
        options: [
          'Sorts the parents',
          'Repoints every node on the find path directly at the root',
          'Merges two trees by size',
          'Removes duplicates',
        ],
        answer: 1,
        why: 'Future finds on that path become a single hop — the amortised cost collapses to α(n).',
      },
    ],
    practice: [{ title: 'Number of Provinces', url: 'https://leetcode.com/problems/number-of-provinces/', difficulty: 'medium' }],
  },

  'sliding-window': {
    intro: [
      'A sliding window keeps a running summary of a contiguous range and moves only its two edges, so each element enters and leaves once.',
      'That is what turns an O(n²) scan over all subarrays into O(n) — the constraint "at most k distinct" or "sum ≥ target" is the signal to reach for it.',
    ],
    useCases: [
      'Longest substring without repeats, at most k distinct characters.',
      'Rate limiting and rolling averages over streams.',
      'Network congestion control and monitoring windows.',
    ],
    quiz: [
      {
        question: 'When is a shrinking window valid?',
        options: [
          'Only for sorted arrays',
          'When the property being tracked is monotone as the window grows',
          'When all values are positive integers',
          'Always',
        ],
        answer: 1,
        why: 'The window needs the guarantee that growing it never fixes a violated constraint — which is why negative numbers break sum-window problems.',
      },
    ],
    practice: [{ title: 'Longest Substring Without Repeating Characters', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', difficulty: 'medium' }],
  },

  'two-pointers': {
    intro: [
      'Two pointers move from opposite ends or in the same direction, each step eliminating candidates in bulk.',
      'In a sorted array, comparing the sum against the target tells you which pointer can safely move — one pointer, one discarded class of pairs.',
    ],
    useCases: [
      'Pair and triple sums on sorted data.',
      'Reversing, partitioning and merging in place.',
      'Container-with-most-water style optimisation problems.',
    ],
    quiz: [
      {
        question: 'In two-sum on a sorted array, if arr[lo] + arr[hi] is too small, what do you do?',
        options: ['Move hi left', 'Move lo right', 'Restart', 'Return false'],
        answer: 1,
        why: 'The largest pairable partner is already too small, so arr[lo] cannot be part of any valid pair — discard it.',
      },
    ],
    practice: [{ title: 'Two Sum II — Input Array Is Sorted', url: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/', difficulty: 'medium' }],
  },

  'prefix-sum': {
    intro: [
      'A prefix sum array stores the running total, so any range sum is one subtraction instead of one loop.',
      'Build once in O(n), answer unlimited queries in O(1) — the classic time/space trade that shows up again in 2D and in Fenwick trees.',
    ],
    useCases: [
      'Range sum queries and moving averages.',
      'Subarray-with-sum-k counting via hash map plus prefix sums.',
      'Image integral images for constant-time box filters.',
    ],
    quiz: [
      {
        question: 'With prefix[i] = sum of the first i elements, what is the sum of arr[l..r]?',
        options: ['prefix[r] − prefix[l]', 'prefix[r + 1] − prefix[l]', 'prefix[r] − prefix[l − 1]', 'prefix[r + 1] + prefix[l]'],
        answer: 1,
        why: 'The extra sentinel slot at index 0 removes the l == 0 special case entirely.',
      },
    ],
    practice: [{ title: 'Range Sum Query — Immutable', url: 'https://leetcode.com/problems/range-sum-query-immutable/', difficulty: 'easy' }],
  },

  'monotonic-stack': {
    intro: [
      'A monotonic stack keeps its contents sorted by pushing elements only after popping everything that violates the order.',
      'Each element is pushed and popped once, so the whole scan is O(n) — and the element that pops you is, by construction, your next greater element.',
    ],
    useCases: [
      'Next greater / smaller element and daily temperatures.',
      'Largest rectangle in a histogram and trapping rain water.',
      'Stock span, sliding-window maximum and skyline problems.',
    ],
    quiz: [
      {
        question: 'What does the stack contain while scanning for next-greater elements?',
        options: [
          'All visited elements',
          'Indices whose next greater element is still unknown, in decreasing value order',
          'The maximum seen so far',
          'Sorted values',
        ],
        answer: 1,
        why: 'Popping happens exactly when a greater element arrives, which resolves those indices.',
      },
    ],
    practice: [{ title: 'Daily Temperatures', url: 'https://leetcode.com/problems/daily-temperatures/', difficulty: 'medium' }],
  },

  'binary-exponentiation': {
    intro: [
      'Fast exponentiation squares the base and halves the exponent: x¹³ = x⁸ · x⁴ · x¹, using the binary digits of the exponent.',
      'That turns n multiplications into log n, and the same trick gives modular exponentiation, the backbone of RSA.',
    ],
    useCases: [
      'Modular arithmetic in cryptography (RSA, Diffie–Hellman).',
      'Matrix exponentiation for linear recurrences in O(log n) steps.',
      'Anywhere a huge power must not be computed naively.',
    ],
    quiz: [
      {
        question: 'How many multiplications does x¹⁰⁰⁰ need with binary exponentiation?',
        options: ['1000', 'about 20', 'about 100', '500'],
        answer: 1,
        why: 'Roughly log₂(1000) ≈ 10 squarings plus a handful of multiplies for the set bits.',
      },
    ],
    practice: [{ title: 'Pow(x, n)', url: 'https://leetcode.com/problems/powx-n/', difficulty: 'medium' }],
  },

  'sieve-of-eratosthenes': {
    intro: [
      'The sieve marks multiples of each prime in turn, so every composite is crossed off by its smallest prime factor.',
      'Stopping at √n is enough: any composite ≤ n has a factor ≤ √n, so the larger multiples are already marked.',
    ],
    useCases: [
      'Precomputing primes for number-theory problems and SPF tables.',
      'Cryptographic key generation sanity checks.',
      'Counting primes, factorials and divisor sums in bulk.',
    ],
    quiz: [
      {
        question: 'Why can sieving stop at √n?',
        options: [
          'Larger numbers are prime',
          'Every composite ≤ n has a prime factor ≤ √n',
          'It halves the memory',
          'To keep the loop symmetric',
        ],
        answer: 1,
        why: 'If n = a·b with both > √n then a·b > n, a contradiction — so one factor is always small.',
      },
    ],
    practice: [{ title: 'Count Primes', url: 'https://leetcode.com/problems/count-primes/', difficulty: 'medium' }],
  },

  'euclidean-gcd': {
    intro: [
      'Euclid’s algorithm replaces (a, b) with (b, a mod b) until the remainder is zero; the last non-zero value is the GCD.',
      'It terminates fast because remainders shrink at least geometrically — Fibonacci pairs are the worst case, which links it to the golden ratio.',
    ],
    useCases: [
      'Simplifying fractions and rational arithmetic.',
      'Modular inverses via the extended algorithm (RSA private keys).',
      'LCM computation, rhythm alignment and gear-ratio problems.',
    ],
    quiz: [
      {
        question: 'What is the time complexity of Euclid’s algorithm?',
        options: ['O(n)', 'O(log min(a, b))', 'O(√n)', 'O(min(a, b))'],
        answer: 1,
        why: 'Each step at least halves the pair in the worst case, so the number of iterations is logarithmic.',
      },
    ],
    practice: [{ title: 'Find Greatest Common Divisor of Array', url: 'https://leetcode.com/problems/find-greatest-common-divisor-of-array/', difficulty: 'easy' }],
  },
};

/** Authored content for an algorithm, or `undefined` if nobody wrote any. */
export function authoredLearn(algorithmId: string): LearnContent | undefined {
  return LEARN_CONTENT[algorithmId];
}
