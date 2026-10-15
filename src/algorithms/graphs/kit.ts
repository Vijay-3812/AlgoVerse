import type {
  GraphEdgeSnapshot,
  GraphNodeSnapshot,
  GraphSnapshot,
  GraphTableSnapshot,
  VisualRole,
} from '@/types';
import type { GraphInputView } from '@/algorithms/kit';

/**
 * ---------------------------------------------------------------------------
 *  GRAPH MODEL
 * ---------------------------------------------------------------------------
 *  Every graph algorithm in AlgoVerse shares this one mutable model: a node
 *  registry with authored coordinates, an edge list with weights and roles, and
 *  a single `snapshot()` that produces the immutable `GraphSnapshot` the canvas
 *  renders. BFS, Dijkstra, Prim, Tarjan and the rest differ only in *which*
 *  roles they paint and *what* they put in the side table — never in how the
 *  graph is represented.
 *
 *  Why a model instead of rebuilding a snapshot per step: a 60-node graph has
 *  ~120 edges; cloning both arrays on every one of ~500 steps is the difference
 *  between a smooth scrubber and a stuttering one.
 */

export interface GraphNodeRec {
  readonly id: string;
  readonly label: string;
  /** Normalised 0..1 — the renderer scales to the viewport. */
  x: number;
  y: number;
  role?: VisualRole;
  /** Distance / order / low-link / component id. */
  badge?: string | number;
  sub?: string;
}

export interface GraphEdgeRec {
  readonly from: string;
  readonly to: string;
  readonly weight?: number;
  role?: VisualRole;
  /** 0..1 animated flow, drawn as energy travelling along the edge. */
  flow?: number;
}

export interface GraphNeighbour {
  readonly id: string;
  readonly weight: number;
  readonly edge: GraphEdgeRec;
}

export interface GraphDecor {
  readonly table?: GraphTableSnapshot;
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
}

/** Canonical, direction-aware edge key used in `Highlight.edges`. */
export const edgeKey = (from: string, to: string): string => `${from}->${to}`;

/** Places `count` nodes on an ellipse when the input carries no coordinates. */
export function ringLayout(count: number, index: number): { x: number; y: number } {
  const angle = (index / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
  return { x: 0.5 + Math.cos(angle) * 0.36, y: 0.5 + Math.sin(angle) * 0.38 };
}

export class GraphModel {
  readonly nodes = new Map<string, GraphNodeRec>();

  readonly edges: GraphEdgeRec[] = [];

  /** Display order — also the tie-breaking order for equal-weight relaxation. */
  readonly order: string[] = [];

  readonly directed: boolean;

  readonly weighted: boolean;

  readonly startId: string;

  readonly endId: string;

  constructor(view: GraphInputView) {
    this.directed = view.directed;
    this.weighted = view.weighted;
    this.startId = view.start;
    this.endId = view.end;
    view.nodes.forEach((input, i) => {
      const fallback = ringLayout(view.nodes.length, i);
      this.nodes.set(input.id, {
        id: input.id,
        label: input.label ?? input.id,
        x: input.x ?? fallback.x,
        y: input.y ?? fallback.y,
      });
      this.order.push(input.id);
    });
    for (const edge of view.edges) {
      if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) continue;
      this.edges.push({
        from: edge.from,
        to: edge.to,
        ...(edge.weight === undefined ? {} : { weight: edge.weight }),
      });
    }
  }

  get size(): number {
    return this.nodes.size;
  }

  node(id: string): GraphNodeRec | undefined {
    return this.nodes.get(id);
  }

  labelOf(id: string): string {
    return this.nodes.get(id)?.label ?? id;
  }

  /** Outgoing neighbours in display order (undirected edges yield both ways). */
  neighbours(id: string): GraphNeighbour[] {
    const out: GraphNeighbour[] = [];
    for (const edge of this.edges) {
      if (edge.from === id) out.push({ id: edge.to, weight: edge.weight ?? 1, edge });
      else if (!this.directed && edge.to === id) out.push({ id: edge.from, weight: edge.weight ?? 1, edge });
    }
    return out;
  }

  /** All edges as `[from, to]` pairs with weights, in insertion order. */
  edgeList(): { readonly from: string; readonly to: string; readonly weight: number }[] {
    return this.edges.map((edge) => ({ from: edge.from, to: edge.to, weight: edge.weight ?? 1 }));
  }

  edgeBetween(a: string, b: string): GraphEdgeRec | undefined {
    return this.edges.find(
      (edge) => (edge.from === a && edge.to === b) || (!this.directed && edge.from === b && edge.to === a),
    );
  }

  /* ── painting ─────────────────────────────────────────────────────────── */

  setNodeRole(ids: readonly string[], role: VisualRole, options: { clear?: boolean } = {}): void {
    if (options.clear !== false) this.clearNodeRoles();
    for (const id of ids) {
      const node = this.nodes.get(id);
      if (node) node.role = role;
    }
  }

  setNodeBadge(id: string, badge: string | number | undefined): void {
    const node = this.nodes.get(id);
    if (!node) return;
    if (badge === undefined) delete node.badge;
    else node.badge = badge;
  }

  setNodeSub(id: string, sub: string | undefined): void {
    const node = this.nodes.get(id);
    if (!node) return;
    if (sub === undefined) delete node.sub;
    else node.sub = sub;
  }

  /** Paints an edge by its endpoints, whichever way round the input stored it. */
  setEdgeRole(a: string, b: string, role: VisualRole | undefined): void {
    const edge = this.edgeBetween(a, b);
    if (!edge) return;
    if (role === undefined) delete edge.role;
    else edge.role = role;
  }

  setEdgeFlow(a: string, b: string, flow: number | undefined): void {
    const edge = this.edgeBetween(a, b);
    if (!edge) return;
    if (flow === undefined) delete edge.flow;
    else edge.flow = flow;
  }

  clearNodeRoles(): void {
    for (const node of this.nodes.values()) delete node.role;
  }

  clearEdgeRoles(): void {
    for (const edge of this.edges) delete edge.role;
  }

  clearRoles(): void {
    this.clearNodeRoles();
    this.clearEdgeRoles();
  }

  /* ── well-known labellings ────────────────────────────────────────────── */

  /** Paints every node explicitly (order-of-discovery colouring). */
  paintGroups(assignments: ReadonlyMap<string, VisualRole>): void {
    this.clearNodeRoles();
    for (const [id, role] of assignments) {
      const node = this.nodes.get(id);
      if (node) node.role = role;
    }
  }

  /**
   * Highlights a path as a sequence of edges *and* nodes — the shape every
   * shortest-path algorithm ends with.
   */
  paintPath(path: readonly string[], role: VisualRole = 'path'): void {
    path.forEach((id, i) => {
      const node = this.nodes.get(id);
      if (node) node.role = role;
      const next = path[i + 1];
      if (next) this.setEdgeRole(id, next, role);
    });
  }

  /* ── snapshot ─────────────────────────────────────────────────────────── */

  snapshot(decor: GraphDecor = {}): GraphSnapshot {
    const nodes: GraphNodeSnapshot[] = this.order.flatMap((id) => {
      const node = this.nodes.get(id);
      if (!node) return [];
      return [
        {
          id: node.id,
          label: node.label,
          x: node.x,
          y: node.y,
          ...(node.role === undefined ? {} : { role: node.role }),
          ...(node.badge === undefined ? {} : { badge: node.badge }),
          ...(node.sub === undefined ? {} : { sub: node.sub }),
        },
      ];
    });

    const edges: GraphEdgeSnapshot[] = this.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      ...(edge.weight === undefined ? {} : { weight: edge.weight }),
      ...(edge.role === undefined ? {} : { role: edge.role }),
      ...(edge.flow === undefined ? {} : { flow: edge.flow }),
      ...(this.directed ? { directed: true } : {}),
    }));

    return {
      nodes,
      edges,
      directed: this.directed,
      ...(this.weighted ? { weighted: true } : {}),
      ...(decor.table === undefined ? {} : { table: decor.table }),
      ...(decor.caption === undefined ? {} : { caption: decor.caption }),
      ...(decor.badges === undefined ? {} : { badges: decor.badges }),
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  Table helpers — the "distances / parent" panel beside the canvas            */
/* -------------------------------------------------------------------------- */

/**
 * A one-row-per-node table (`node | dist | prev | state`) as used by Dijkstra,
 * Bellman-Ford, A* and the spanning-tree algorithms.
 */
export function columnTable(
  headers: readonly string[],
  rows: readonly (readonly (string | number)[])[],
  highlight?: { readonly row?: number; readonly col?: number },
): GraphTableSnapshot {
  return {
    headers,
    rows,
    ...(highlight?.row === undefined ? {} : { highlightRow: highlight.row }),
    ...(highlight?.col === undefined ? {} : { highlightCol: highlight.col }),
  };
}

/** `∞` reads better than `Infinity` in a cell — and keeps the table narrow. */
export const INFINITY_LABEL = '∞';

/** Formats a distance cell; unreached nodes show the infinity glyph. */
export function distLabel(value: number, options: { readonly zeroAs?: string } = {}): string {
  if (!Number.isFinite(value)) return INFINITY_LABEL;
  if (value === 0 && options.zeroAs !== undefined) return options.zeroAs;
  return String(value);
}

/* -------------------------------------------------------------------------- */
/*  Role painting — one place decides which nodes/edges carry which colour      */
/* -------------------------------------------------------------------------- */

/**
 * Algorithms describe *what* is coloured; this tiny painter keeps the two maps
 * that make it true on every snapshot. Without it each generator would repeat
 * "clear, then re-apply, then snapshot" and would inevitably forget one.
 */
export class RolePainter {
  readonly nodeRoles = new Map<string, VisualRole>();

  readonly edgeRoles = new Map<string, VisualRole>();

  setNode(id: string, role: VisualRole | undefined): void {
    if (role === undefined) this.nodeRoles.delete(id);
    else this.nodeRoles.set(id, role);
  }

  setEdge(from: string, to: string, role: VisualRole | undefined): void {
    const key = edgeKey(from, to);
    if (role === undefined) this.edgeRoles.delete(key);
    else this.edgeRoles.set(key, role);
  }

  clear(): void {
    this.nodeRoles.clear();
    this.edgeRoles.clear();
  }

  /** Re-applies both maps onto the model (used by the snapshot thunk). */
  apply(model: GraphModel): void {
    model.clearNodeRoles();
    for (const [id, role] of this.nodeRoles) model.setNodeRole([id], role, { clear: false });
    model.clearEdgeRoles();
    for (const [key, role] of this.edgeRoles) {
      const [from, to] = key.split('->');
      if (from && to) model.setEdgeRole(from, to, role);
    }
  }
}

/** Rings the two terminals so "where did it start" never needs a caption. */
export function markTerminals(model: GraphModel, startId: string, endId: string): void {
  model.setNodeSub(startId, 'start');
  if (endId !== startId) model.setNodeSub(endId, 'end');
}
