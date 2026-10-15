import type { VisualRole } from './trace';

/**
 * ---------------------------------------------------------------------------
 *  SNAPSHOT SHAPES — the shared vocabulary between generators and renderers
 * ---------------------------------------------------------------------------
 *  Rather than one bespoke state type per algorithm (90 types, 90 renderers),
 *  generators emit one of eight *shapes*. Each shape is rendered by exactly one
 *  visualiser, which is what makes "add an algorithm in 5 steps" true instead of
 *  aspirational: a new bubble sort, KMP or sliding-window trace all land in
 *  `BarVisualizer` and inherit its motion, pointer labels, aux rows and sound.
 *
 *  Every field except the primary payload is optional and additive, so a shape
 *  can grow (a radix bucket row, a DP dependency arrow) without touching the
 *  renderers that already use it.
 */

/* -------------------------------------------------------------------------- */
/*  1. Arrays — sorting, searching, strings, windows, pointers, patterns       */
/* -------------------------------------------------------------------------- */

export interface PointerSnapshot {
  /** Short label drawn above the element: `i`, `j`, `lo`, `mid`, `L`, `R`. */
  readonly name: string;
  readonly index: number;
  readonly role?: VisualRole;
}

/** A secondary row under the main array: counts, buckets, prefix sums, a stack. */
export interface AuxRowSnapshot {
  readonly label: string;
  readonly values: readonly (number | string | null)[];
  readonly roles?: readonly (VisualRole | null)[];
  /** Render as small cells (counts, prefix sums) or chips (stacks, buckets). */
  readonly style?: 'cells' | 'chips';
  /** Shift the row right by this many columns (bucket ranges). */
  readonly offset?: number;
}

export interface ArraySnapshot {
  /** The primary sequence. Numbers drive heights; labels drive text. */
  readonly values: readonly number[];
  /** Per-index display text (characters for strings, values for arrays). */
  readonly labels?: readonly string[];
  /**
   * Stable identity per position. This is what lets a swap animate as a FLIP
   * translation (element `e7` physically moves to the left) instead of a
   * cross-fade of two heights. Generators get it free from `BarModel`.
   */
  readonly ids?: readonly string[];
  readonly aux?: readonly AuxRowSnapshot[];
  readonly pointers?: readonly PointerSnapshot[];
  /** Indices already in their final position (sorted tail, confirmed window). */
  readonly sorted?: readonly number[];
  /** Inclusive [start, end] region in focus (binary search bracket, window). */
  readonly window?: readonly [number, number] | null;
  /** Short status line, e.g. `merging [0..3] with [4..7]`. */
  readonly caption?: string;
  /** Free-form badges shown in the corner (gap size, pass number, hash…). */
  readonly badges?: Readonly<Record<string, string | number>>;
}

/* -------------------------------------------------------------------------- */
/*  2. Sequences — stack, queue, deque, linked list, heap, monotonic stack     */
/* -------------------------------------------------------------------------- */

export interface SequenceItemSnapshot {
  readonly id: string;
  readonly label: string;
  readonly sub?: string;
  readonly role?: VisualRole;
  /** Mark a removed slot so the layout keeps its place for one beat. */
  readonly ghost?: boolean;
}

export interface SequenceCursorSnapshot {
  readonly name: string;
  /** Position in `items`, or the id of the pointed-at item. */
  readonly index?: number;
  readonly itemId?: string;
  readonly role?: VisualRole;
}

export interface SequenceLinkSnapshot {
  readonly from: string;
  readonly to: string;
  readonly kind: 'next' | 'prev';
}

export interface SequenceSnapshot {
  readonly kind: 'stack' | 'queue' | 'deque' | 'list' | 'heap' | 'array';
  readonly items: readonly SequenceItemSnapshot[];
  readonly cursors?: readonly SequenceCursorSnapshot[];
  readonly links?: readonly SequenceLinkSnapshot[];
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
}

/* -------------------------------------------------------------------------- */
/*  3. Trees — BST, AVL, Red-Black, heap, trie, segment/Fenwick, B-tree        */
/* -------------------------------------------------------------------------- */

export interface TreeNodeMeta {
  readonly height?: number;
  readonly balance?: number;
  readonly color?: 'red' | 'black';
  readonly key?: string;
  readonly count?: number;
  readonly order?: number;
}

export interface TreeNodeSnapshot {
  readonly id: string;
  readonly label: string;
  readonly sub?: string;
  /**
   * Child slots, left to right. A `null` marks an **empty slot** rather than
   * shortening the array — that is what keeps a right child on the right after
   * its left sibling is deleted in a binary tree.
   */
  readonly children: readonly (string | null)[];
  readonly parentId?: string | null;
  readonly role?: VisualRole;
  readonly meta?: TreeNodeMeta;
  /** Multi-way nodes (tries, B-trees) render keys in one wide cell. */
  readonly keys?: readonly string[];
}

export interface TreeSnapshot {
  readonly kind: 'binary' | 'nary' | 'trie' | 'forest';
  readonly nodes: readonly TreeNodeSnapshot[];
  readonly roots: readonly string[];
  /** Explicit x (0..1) when the algorithm knows better than the layout engine. */
  readonly positions?: Readonly<Record<string, number>>;
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
}

/* -------------------------------------------------------------------------- */
/*  4. Graphs                                                                  */
/* -------------------------------------------------------------------------- */

export interface GraphNodeSnapshot {
  readonly id: string;
  readonly label: string;
  /** Normalised 0..1 coordinates; the renderer scales to the viewport. */
  readonly x: number;
  readonly y: number;
  readonly role?: VisualRole;
  /** Distance / order / low-link / component number. */
  readonly badge?: string | number;
  readonly sub?: string;
}

export interface GraphEdgeSnapshot {
  readonly from: string;
  readonly to: string;
  readonly weight?: number;
  readonly role?: VisualRole;
  readonly directed?: boolean;
  /** 0..1 — animated flow used for relaxations and max-flow. */
  readonly flow?: number;
}

export interface GraphTableSnapshot {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
  readonly highlightRow?: number;
  readonly highlightCol?: number;
}

export interface GraphSnapshot {
  readonly nodes: readonly GraphNodeSnapshot[];
  readonly edges: readonly GraphEdgeSnapshot[];
  readonly directed: boolean;
  readonly weighted?: boolean;
  /** Distances / low-link / parent table shown beside the canvas. */
  readonly table?: GraphTableSnapshot;
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
}

/* -------------------------------------------------------------------------- */
/*  5. Tables — DP, Floyd–Warshall, hashing overflow, matrix chain             */
/* -------------------------------------------------------------------------- */

export interface TableAxisSnapshot {
  readonly label: string;
  readonly sub?: string;
}

export interface TableSnapshot {
  readonly rows: readonly TableAxisSnapshot[];
  readonly cols: readonly TableAxisSnapshot[];
  readonly cells: readonly (readonly (number | string | null)[])[];
  /** Per-cell role override; falls back to highlight sets / `deps`. */
  readonly roles?: readonly (readonly (VisualRole | null)[])[];
  /** Dependency arrows `[row, col] → active cell`. */
  readonly deps?: readonly (readonly [number, number])[];
  /** Final backtrack path. */
  readonly path?: readonly (readonly [number, number])[];
  readonly active?: readonly [number, number] | null;
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
}

/* -------------------------------------------------------------------------- */
/*  6. Call stacks & recursion trees                                           */
/* -------------------------------------------------------------------------- */

export interface CallFrameSnapshot {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  readonly role?: VisualRole;
  readonly ret?: string;
}

export interface CallTreeNodeSnapshot {
  readonly id: string;
  readonly parentId: string | null;
  readonly label: string;
  readonly role?: VisualRole;
}

export interface CallSnapshot {
  /** Top of stack last — rendered bottom-up like a real call stack. */
  readonly frames: readonly CallFrameSnapshot[];
  readonly tree?: readonly CallTreeNodeSnapshot[];
  readonly locals?: readonly { readonly name: string; readonly value: string }[];
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
}

/* -------------------------------------------------------------------------- */
/*  7. Boards — N-Queens, Sudoku, mazes                                        */
/* -------------------------------------------------------------------------- */

export interface BoardOverlay {
  readonly row: number;
  readonly col: number;
  readonly text: string;
  readonly role: VisualRole;
}

export interface BoardSnapshot {
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly (readonly (string | number | null)[])[];
  readonly roles?: readonly (readonly (VisualRole | null)[])[];
  readonly rowLabels?: readonly string[];
  readonly colLabels?: readonly string[];
  readonly overlays?: readonly BoardOverlay[];
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
}

/* -------------------------------------------------------------------------- */
/*  8. Hash tables                                                             */
/* -------------------------------------------------------------------------- */

export interface HashEntrySnapshot {
  readonly key: string;
  readonly value?: string;
  readonly role?: VisualRole;
  /** Probe step that placed this entry (linear/quadratic/double hashing). */
  readonly probe?: number;
}

export interface HashBucketSnapshot {
  readonly index: number;
  readonly entries: readonly HashEntrySnapshot[];
}

export interface HashSnapshot {
  readonly buckets: readonly HashBucketSnapshot[];
  readonly probeKind: 'chaining' | 'linear' | 'quadratic' | 'double';
  /** Buckets touched by the current probe sequence. */
  readonly probePath?: readonly number[];
  readonly loadFactor: number;
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
}

/* -------------------------------------------------------------------------- */
/*  9. Intervals & schedules — greedy algorithms                               */
/* -------------------------------------------------------------------------- */

export interface IntervalItemSnapshot {
  readonly id: string;
  readonly label: string;
  readonly start: number;
  readonly end: number;
  readonly role?: VisualRole;
  readonly weight?: number;
  readonly value?: number;
  readonly ratio?: number;
}

export interface IntervalSnapshot {
  readonly items: readonly IntervalItemSnapshot[];
  /** Timeline span for the axis. */
  readonly span: readonly [number, number];
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
}

/* -------------------------------------------------------------------------- */
/*  Union — lets the VisualizerFrame stay generic while visualisers stay typed  */
/* -------------------------------------------------------------------------- */

export type AnySnapshot =
  | ArraySnapshot
  | SequenceSnapshot
  | TreeSnapshot
  | GraphSnapshot
  | TableSnapshot
  | CallSnapshot
  | BoardSnapshot
  | HashSnapshot
  | IntervalSnapshot;
