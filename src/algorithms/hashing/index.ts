import type { AlgorithmInput, Complexity } from '@/types';
import { code, pseudo } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { HashVisualizer } from '@/visualizers/HashVisualizer';
import { defineHashing, type HashOperation } from './kit';

/**
 * HASHING FAMILY — complexity table and the shared demo script.
 *
 * The word list is fixed and short so the trace is stable across runs (a hash
 * table is a *structure*, and a learner comparing two strategies needs the same
 * keys in both). The load-factor limit is per strategy: chaining tolerates α > 1
 * happily, which is exactly the contrast worth showing.
 */
export const COMPLEXITY: Record<string, Complexity> = {
  chaining: {
    time: { best: 'O(1)', average: 'O(1 + α)', worst: 'O(n)' },
    space: 'O(n + m)',
    kind: 'separate chaining',
    notes: [
      'Average lookup is 1 + α, where α = n / m is the load factor — the reason tables are sized to keep α near 1.',
      'Worst case is a single chain holding every key, which happens only with a pathological hash.',
      'Deletion is trivial: no tombstones, just unlink.',
    ],
  },
  linear: {
    time: { best: 'O(1)', average: 'O(1/(1−α))', worst: 'O(n)' },
    space: 'O(m)',
    kind: 'open addressing',
    notes: [
      'Primary clustering: occupied slots merge into long runs, so probe counts grow faster than α suggests.',
      'Cache-friendly — probes walk contiguous memory, which is why it beats chaining in practice.',
      'Deletion needs tombstones, otherwise a probe sequence breaks.',
    ],
  },
  quadratic: {
    time: { best: 'O(1)', average: 'O(1/(1−α))', worst: 'O(n)' },
    space: 'O(m)',
    kind: 'open addressing',
    notes: [
      'Probing i² breaks up primary clusters, at the cost of secondary clustering (same home bucket ⇒ same sequence).',
      'Only guaranteed to find a free slot when m is prime and α < 0.5.',
    ],
  },
  double: {
    time: { best: 'O(1)', average: 'O(1/(1−α))', worst: 'O(n)' },
    space: 'O(m)',
    kind: 'open addressing',
    notes: [
      'A second hash chooses the stride, so two keys with the same home bucket still take different paths.',
      'The stride must be coprime with the table size — usually by making m prime.',
    ],
  },
  rehashing: {
    time: { best: 'O(1)', average: 'O(1) amortised', worst: 'O(n)' },
    space: 'O(m)',
    kind: 'growth · amortised',
    notes: [
      'Doubling means the total work of n inserts is O(n) amortised, even though one insert can cost O(n).',
      'Every entry is re-hashed: the modulus changed, so nothing keeps its slot.',
    ],
  },
};

/** Keys chosen to collide under the demo hash — collisions are the whole point. */
export const KEYS = ['kite', 'kiwi', 'mango', 'lime', 'mint'] as const;

/** The demo script every strategy runs, so the visualisations are comparable. */
function script(extra: readonly HashOperation[] = []): HashOperation[] {
  return [
    { op: 'insert', key: KEYS[0], value: '9' },
    { op: 'insert', key: KEYS[1], value: '4' },
    { op: 'insert', key: KEYS[2], value: '7' },
    { op: 'insert', key: KEYS[3], value: '2' },
    { op: 'lookup', key: KEYS[1] },
    { op: 'lookup', key: 'melon' },
    ...extra,
  ];
}

const CHAIN_EXPLANATION = [
  'Chaining resolves a collision by keeping a list per bucket: the bucket index is the hash, and everything that lands there sits in its chain in insertion order.',
  'Lookup cost is the hash plus the scan of one chain, so the average is 1 + α. Because α can exceed 1 without anything breaking, chaining tolerates a full table.',
  'The trade is memory and cache locality: every entry needs its own link, and following a chain is pointer chasing rather than a linear scan.',
];

const OPEN_EXPLANATION = [
  'Open addressing stores every entry inside the table itself — there are no chains, only empty slots. A collision walks a probe sequence until it finds a free slot.',
  'Lookup replays the same sequence and stops at the first empty slot, which is why deletion needs a tombstone rather than an empty cell.',
  'The probe function is the whole design: linear clusters, quadratic scatters but repeats, double hashing uses a second hash for the stride.',
];

export const chaining = defineModule({
  definition: defineHashing({
    id: 'hash-chaining',
    complexity: COMPLEXITY.chaining!,
    pseudocode: pseudo(`
#insert(key, value)
# buckets: one chain per slot
# i ← hash(key) mod m
# append (key, value) to buckets[i]
# if a key already matches: update its value
#find(key)
# scan the chain at buckets[hash(key)]
# return the matching value, or not-found
# if count / m > threshold
#   grow the table and re-insert every entry`),
    code: code(
      `
const buckets = Array.from({ length: m }, () => []);
function insert(key, value) {
  const i = hash(key) % m;
  buckets[i].push([key, value]);
}
function find(key) {
  const i = hash(key) % m;
  for (const [k, v] of buckets[i]) if (k === key) return v;
  return null;
}`,
      `
buckets = [[] for _ in range(m)]
def insert(key, value):
    i = hash(key) % m
    buckets[i].append((key, value))
def find(key):
    for k, v in buckets[hash(key) % m]:
        if k == key:
            return v
    return None
# chains stay short while the load factor does`,
      `
vector<vector<pair<string,int>>> buckets(m);
void insert(const string& key, int value) {
  buckets[hashKey(key) % m].emplace_back(key, value);
}
int find(const string& key) {
  for (auto& [k, v] : buckets[hashKey(key) % m])
    if (k == key) return v;
  return -1;
}`,
      `
List<List<int[]>> buckets = new ArrayList<>();
void insert(String key, int value) {
  int i = hash(key) % buckets.size();
  buckets.get(i).add(new int[] { key.hashCode(), value });
}
int find(String key) {
  for (int[] entry : buckets.get(hash(key) % buckets.size()))
    if (entry[0] == key.hashCode()) return entry[1];
  return -1;
}`,
    ),
    explanation: CHAIN_EXPLANATION,
    headline: 'Table built with chaining',
    defaultInput: (): AlgorithmInput => ({ kind: 'number', value: 7 }),
    script: () => ({
      options: { buckets: 7, probe: 'chaining', loadFactorLimit: 3 },
      operations: script(),
    }),
  }),
  Visualizer: HashVisualizer,
});

export const linearProbing = defineModule({
  definition: defineHashing({
    id: 'hash-linear-probing',
    complexity: COMPLEXITY.linear!,
    pseudocode: pseudo(`
#insert(key, value)
# i ← hash(key) mod m
# while slot i holds another key
#   i ← (i + 1) mod m   # linear: constant stride
# if slot i holds the same key: update it
# otherwise store (key, value) at i
#find(key)
# replay the probe sequence from hash(key)
# stop at the first empty slot (not found)
# if count / m > threshold
#   grow the table and re-insert every entry`),
    code: code(
      `
function insert(key, value) {
  let i = hash(key) % m;
  while (table[i] !== undefined) {
    if (table[i].key === key) return (table[i].value = value);
    i = (i + 1) % m;
  }
  table[i] = { key, value };
}`,
      `
def insert(key, value):
    i = hash(key) % m
    while table[i] is not None:
        if table[i][0] == key:
            table[i] = (key, value)
            return
        i = (i + 1) % m
    table[i] = (key, value)`,
      `
void insert(const string& key, int value) {
  size_t i = hashKey(key) % m;
  while (occupied[i]) {
    if (keys[i] == key) { values[i] = value; return; }
    i = (i + 1) % m;
  }
  keys[i] = key; values[i] = value; occupied[i] = true;
}`,
      `
void insert(String key, int value) {
  int i = hash(key) % m;
  while (table[i] != null) {
    if (table[i].key.equals(key)) { table[i].value = value; return; }
    i = (i + 1) % m;
  }
  table[i] = new Entry(key, value);
}`,
    ),
    explanation: OPEN_EXPLANATION,
    headline: 'Table built with linear probing',
    defaultInput: (): AlgorithmInput => ({ kind: 'number', value: 11 }),
    script: () => ({
      options: { buckets: 11, probe: 'linear', loadFactorLimit: 0.7 },
      operations: script(),
    }),
  }),
  Visualizer: HashVisualizer,
});

export const quadraticProbing = defineModule({
  definition: defineHashing({
    id: 'hash-quadratic-probing',
    complexity: COMPLEXITY.quadratic!,
    pseudocode: pseudo(`
#insert(key, value)
# i ← hash(key) mod m
# for step ← 0, 1, 2, …
#   slot ← (i + step²) mod m
#   if slot is free: store (key, value), done
#find(key)
# replay the quadratic sequence from hash(key)
# stop at the first empty slot (not found)
# if count / m > threshold
#   grow the table and re-insert every entry`),
    code: code(
      `
function insert(key, value) {
  const start = hash(key) % m;
  for (let step = 0; step < m; step++) {
    const i = (start + step * step) % m;
    if (table[i] === undefined) {
      table[i] = { key, value };
      return;
    }
  }
  throw new Error('table full');
}`,
      `
def insert(key, value):
    start = hash(key) % m
    for step in range(m):
        i = (start + step * step) % m
        if table[i] is None:
            table[i] = (key, value)
            return
    raise OverflowError("table full")`,
      `
void insert(const string& key, int value) {
  size_t start = hashKey(key) % m;
  for (size_t step = 0; step < m; ++step) {
    size_t i = (start + step * step) % m;
    if (!occupied[i]) {
      keys[i] = key; values[i] = value; occupied[i] = true;
      return;
    }
  }
  throw runtime_error("table full");
}`,
      `
void insert(String key, int value) {
  int start = hash(key) % m;
  for (int step = 0; step < m; step++) {
    int i = (start + step * step) % m;
    if (table[i] == null) {
      table[i] = new Entry(key, value);
      return;
    }
  }
  throw new IllegalStateException("table full");
}`,
    ),
    explanation: OPEN_EXPLANATION,
    headline: 'Table built with quadratic probing',
    defaultInput: (): AlgorithmInput => ({ kind: 'number', value: 11 }),
    script: () => ({
      options: { buckets: 11, probe: 'quadratic', loadFactorLimit: 0.6 },
      operations: script(),
    }),
  }),
  Visualizer: HashVisualizer,
});

export const doubleHashing = defineModule({
  definition: defineHashing({
    id: 'hash-double-hashing',
    complexity: COMPLEXITY.double!,
    pseudocode: pseudo(`
#insert(key, value)
# i ← hash1(key) mod m
# stride ← 1 + hash2(key) mod (m − 1)
# while slot i is occupied
#   i ← (i + stride) mod m   # a second hash decides the step
# store (key, value) at i
#find(key)
# replay the same stride from hash1(key)
# stop at the first empty slot (not found)
# if count / m > threshold
#   grow the table and re-insert every entry`),
    code: code(
      `
function insert(key, value) {
  const stride = 1 + (hash2(key) % (m - 1));
  let i = hash1(key) % m;
  while (table[i] !== undefined) i = (i + stride) % m;
  table[i] = { key, value };
}`,
      `
def insert(key, value):
    stride = 1 + hash2(key) % (m - 1)
    i = hash1(key) % m
    while table[i] is not None:
        i = (i + stride) % m
    table[i] = (key, value)`,
      `
void insert(const string& key, int value) {
  size_t stride = 1 + hashKey2(key) % (m - 1);
  size_t i = hashKey(key) % m;
  while (occupied[i]) i = (i + stride) % m;
  keys[i] = key; values[i] = value; occupied[i] = true;
}`,
      `
void insert(String key, int value) {
  int stride = 1 + hash2(key) % (m - 1);
  int i = hash1(key) % m;
  while (table[i] != null) i = (i + stride) % m;
  table[i] = new Entry(key, value);
}`,
    ),
    explanation: OPEN_EXPLANATION,
    headline: 'Table built with double hashing',
    defaultInput: (): AlgorithmInput => ({ kind: 'number', value: 13 }),
    script: () => ({
      options: { buckets: 13, probe: 'double', loadFactorLimit: 0.7 },
      operations: script(),
    }),
  }),
  Visualizer: HashVisualizer,
});

export const rehashing = defineModule({
  definition: defineHashing({
    id: 'hash-rehashing',
    complexity: COMPLEXITY.rehashing!,
    pseudocode: pseudo(`
#insert(key, value)
# i ← hash(key) mod m
# while slot i is occupied
#   i ← (i + 1) mod m
# store (key, value) at i
#find(key)
# replay the probe sequence and stop at an empty slot
# if count / m > 0.75: rehash
#   m ← m × 2
#   for each entry: re-insert under the new modulus
#   (every slot changes — the modulus changed)`),
    code: code(
      `
function grow() {
  const old = table;
  m *= 2;
  table = new Array(m);
  for (const entry of old) {
    if (entry) insert(entry.key, entry.value);
  }
}`,
      `
def grow():
    global table, m
    old = table
    m *= 2
    table = [None] * m
    for entry in old:
        if entry is not None:
            insert(*entry)`,
      `
void grow() {
  auto old = std::move(table);
  m *= 2;
  table.assign(m, Entry{});
  for (auto& entry : old)
    if (entry.used) insert(entry.key, entry.value);
}`,
      `
void grow() {
  Entry[] old = table;
  m *= 2;
  table = new Entry[m];
  for (Entry entry : old)
    if (entry != null) insert(entry.key, entry.value);
}`,
    ),
    explanation: [
      'A hash table has a fixed number of buckets, and every insertion makes the load factor worse — so at some threshold the table doubles and every entry is re-hashed.',
      'Re-hashing is not a copy: the modulus changed, so `hash(key) mod m` is a different slot for essentially every key. The whole table moves.',
      'Doubling is what keeps the cost amortised: the expensive rebuilds become rarer geometrically, so n insertions still cost O(n) in total.',
    ],
    headline: 'Table grown by rehashing',
    defaultInput: (): AlgorithmInput => ({ kind: 'number', value: 5 }),
    script: () => ({
      // Five keys into five buckets crosses 0.75 quickly, so the shockwave lands
      // inside the demo rather than being a footnote.
      options: { buckets: 5, probe: 'linear', loadFactorLimit: 0.6 },
      operations: [
        ...script(),
        { op: 'insert', key: 'melon', value: '5' },
        { op: 'insert', key: 'olive', value: '3' },
      ],
    }),
  }),
  Visualizer: HashVisualizer,
});

/** Loader table consumed by `registerReal()`. */
export const HASHING_LOADERS = {
  'hash-chaining': () => Promise.resolve(chaining),
  'hash-linear-probing': () => Promise.resolve(linearProbing),
  'hash-quadratic-probing': () => Promise.resolve(quadraticProbing),
  'hash-double-hashing': () => Promise.resolve(doubleHashing),
  'hash-rehashing': () => Promise.resolve(rehashing),
};
