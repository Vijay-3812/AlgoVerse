import type { TreeNodeMeta, TreeNodeSnapshot, TreeSnapshot, VisualRole } from '@/types';

/**
 * ---------------------------------------------------------------------------
 *  TREE MODEL
 * ---------------------------------------------------------------------------
 *  A mutable node registry with an immutable `snapshot()`, mirroring `BarModel`
 *  and `SeqModel`. Rotations, colour flips, splits and borrows are all just
 *  edits to `parentId`/`children`, so one model serves every tree algorithm in
 *  the app — including the multi-key B-tree nodes.
 */

export interface TreeNodeInput {
  readonly id: string;
  label: string;
  sub?: string;
  keys?: string[];
  role?: VisualRole;
  meta?: TreeNodeMeta;
  /** null is a *left* slot; `[null, childId]` means "right child only". */
  parentId: string | null;
  children: (string | null)[];
}

export interface TreeDecor {
  readonly kind: TreeSnapshot['kind'];
  readonly caption?: string;
  readonly badges?: Readonly<Record<string, string | number>>;
  readonly positions?: Readonly<Record<string, number>>;
}

export class TreeModel {
  nodes = new Map<string, TreeNodeInput>();

  roots: string[] = [];

  private counter = 0;

  get size(): number {
    return this.nodes.size;
  }

  nextId(prefix = 'n'): string {
    this.counter += 1;
    return `${prefix}${this.counter}`;
  }

  /** Creates a detached node; returns its id. */
  create(label: number | string, options: { sub?: string; keys?: string[]; meta?: TreeNodeMeta; prefix?: string } = {}): string {
    const id = this.nextId(options.prefix);
    this.nodes.set(id, {
      id,
      label: String(label),
      ...(options.sub === undefined ? {} : { sub: options.sub }),
      ...(options.keys === undefined ? {} : { keys: options.keys }),
      ...(options.meta === undefined ? {} : { meta: options.meta }),
      parentId: null,
      children: [],
    });
    return id;
  }

  get(id: string): TreeNodeInput | undefined {
    return this.nodes.get(id);
  }

  labelOf(id: string): string {
    return this.nodes.get(id)?.label ?? '?';
  }

  valueOf(id: string): number {
    return Number(this.nodes.get(id)?.label);
  }

  /** Links `childId` under `parentId` (replacing its previous parent). */
  attach(childId: string, parentId: string | null, side?: 'left' | 'right' | number): void {
    const child = this.nodes.get(childId);
    if (!child) return;
    if (child.parentId !== null) {
      const previous = this.nodes.get(child.parentId);
      if (previous) previous.children = previous.children.map((c) => (c === childId ? null : c));
    } else {
      this.roots = this.roots.filter((r) => r !== childId);
    }

    child.parentId = parentId;
    if (parentId === null) {
      if (!this.roots.includes(childId)) this.roots.push(childId);
      return;
    }
    const parent = this.nodes.get(parentId);
    if (!parent) return;

    if (side === 'left') {
      parent.children[0] = childId;
    } else if (side === 'right') {
      if (parent.children.length < 2) parent.children = [parent.children[0] ?? null, childId];
      else parent.children[1] = childId;
    } else if (typeof side === 'number') {
      parent.children[side] = childId;
    } else if (!parent.children.includes(childId)) {
      parent.children.push(childId);
    }
  }

  /** Detaches a node and the whole subtree under it. */
  detach(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    if (node.parentId !== null) {
      const parent = this.nodes.get(node.parentId);
      if (parent) parent.children = parent.children.map((c) => (c === id ? null : c));
    } else {
      this.roots = this.roots.filter((r) => r !== id);
    }
    node.parentId = null;
    node.children = [];
    if (!this.roots.includes(id)) this.roots.push(id);
  }

  /** Removes a node entirely (used for deletes that end a subtree's life). */
  remove(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    for (const child of [...node.children]) if (child) this.remove(child);
    if (node.parentId !== null) {
      const parent = this.nodes.get(node.parentId);
      if (parent) parent.children = parent.children.map((c) => (c === id ? null : c));
    }
    this.roots = this.roots.filter((r) => r !== id);
    this.nodes.delete(id);
  }

  /** Simple in-order walk for binary trees (left, self, right). */
  inorderBinary(id: string | undefined = this.roots[0], out: string[] = []): string[] {
    if (!id) return out;
    const node = this.nodes.get(id);
    if (!node) return out;
    const [left, right] = node.children;
    if (left) this.inorderBinary(left, out);
    out.push(id);
    if (right) this.inorderBinary(right, out);
    return out;
  }

  /** Breadth-first ids, level by level. */
  levelOrder(from: readonly string[] = this.roots): string[][] {
    const levels: string[][] = [];
    let frontier = [...from];
    while (frontier.length) {
      levels.push([...frontier]);
      frontier = frontier.flatMap((id) => (this.nodes.get(id)?.children ?? []).filter((c): c is string => c !== null));
    }
    return levels;
  }

  depth(id: string): number {
    let depth = 0;
    let current = this.nodes.get(id)?.parentId ?? null;
    while (current) {
      depth += 1;
      current = this.nodes.get(current)?.parentId ?? null;
    }
    return depth;
  }

  /** Subtree ids including the root of the subtree. */
  subtree(id: string, out: string[] = []): string[] {
    const node = this.nodes.get(id);
    if (!node) return out;
    out.push(id);
    for (const child of node.children) if (child) this.subtree(child, out);
    return out;
  }

  setRole(ids: readonly (string | undefined)[], role: VisualRole, options: { clear?: boolean } = {}): void {
    if (options.clear !== false) this.clearRoles();
    for (const id of ids) {
      const node = id ? this.nodes.get(id) : undefined;
      if (node) this.nodes.set(node.id, { ...node, role });
    }
  }

  setMeta(id: string | undefined, meta: TreeNodeMeta): void {
    const node = id ? this.nodes.get(id) : undefined;
    if (node) this.nodes.set(node.id, { ...node, meta: { ...node.meta, ...meta } });
  }

  setKeys(id: string | undefined, keys: readonly string[]): void {
    const node = id ? this.nodes.get(id) : undefined;
    if (node) this.nodes.set(node.id, { ...node, keys: [...keys] });
  }

  setSub(id: string | undefined, sub: string | undefined): void {
    const node = id ? this.nodes.get(id) : undefined;
    if (!node) return;
    this.nodes.set(node.id, sub === undefined ? { ...node, sub: undefined } : { ...node, sub });
  }

  clearRoles(): void {
    for (const [id, node] of this.nodes) {
      if (node.role) {
        const { role: _drop, ...rest } = node;
        this.nodes.set(id, rest);
      }
    }
  }

  snapshot(decor: TreeDecor): TreeSnapshot {
    const nodes: TreeNodeSnapshot[] = [...this.nodes.values()].map((node) => ({
      id: node.id,
      label: node.label,
      children: [...node.children],
      parentId: node.parentId,
      ...(node.sub === undefined ? {} : { sub: node.sub }),
      ...(node.keys === undefined ? {} : { keys: [...node.keys] }),
      ...(node.role === undefined ? {} : { role: node.role }),
      ...(node.meta === undefined ? {} : { meta: { ...node.meta } }),
    }));
    return {
      kind: decor.kind,
      nodes,
      roots: [...this.roots],
      ...(decor.positions === undefined ? {} : { positions: decor.positions }),
      ...(decor.caption === undefined ? {} : { caption: decor.caption }),
      ...(decor.badges === undefined ? {} : { badges: decor.badges }),
    };
  }
}

/** A small, balanced-feeling default: 7 values inserted in median order. */
export const TREE_VALUES = Object.freeze([50, 30, 70, 20, 40, 60, 80]);
