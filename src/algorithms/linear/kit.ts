import type {
  SequenceCursorSnapshot,
  SequenceItemSnapshot,
  SequenceLinkSnapshot,
  SequenceSnapshot,
  VisualRole,
} from '@/types';

/**
 * ---------------------------------------------------------------------------
 *  SEQUENCE MODEL
 * ---------------------------------------------------------------------------
 *  A mutable list of labelled items plus an immutable `snapshot()` — the same
 *  contract as `BarModel`, but for the sequences that have no heights: stacks,
 *  queues, deques, linked rings, heap arrays.
 *
 *  Every generator in this family mutates the model and then emits, so the
 *  trace always shows the structure as it was *at that beat*, including which
 *  slot was vacated (`ghost`) and which cursors pointed where.
 */

export interface SeqItemInput {
  readonly id: string;
  readonly label: string;
  readonly sub?: string;
  readonly role?: VisualRole;
  readonly ghost?: boolean;
}

export class SeqModel {
  items: SeqItemInput[] = [];

  private counter = 0;

  constructor(
    values: readonly number[] = [],
    readonly kind: SequenceSnapshot['kind'] = 'list',
  ) {
    values.forEach((v) => this.push(v));
  }

  get size(): number {
    return this.items.length;
  }

  /** Fresh stable id — ids drive the FLIP animation, so never reuse one. */
  nextId(prefix = 'n'): string {
    this.counter += 1;
    return `${prefix}${this.counter}`;
  }

  push(value: number | string, sub?: string): SeqItemInput {
    const item: SeqItemInput = {
      id: this.nextId(),
      label: String(value),
      ...(sub === undefined ? {} : { sub }),
    };
    this.items.push(item);
    return item;
  }

  unshift(value: number | string, sub?: string): SeqItemInput {
    const item: SeqItemInput = {
      id: this.nextId(),
      label: String(value),
      ...(sub === undefined ? {} : { sub }),
    };
    this.items.unshift(item);
    return item;
  }

  insertAt(index: number, value: number | string, sub?: string): SeqItemInput {
    const item: SeqItemInput = {
      id: this.nextId(),
      label: String(value),
      ...(sub === undefined ? {} : { sub }),
    };
    this.items.splice(index, 0, item);
    return item;
  }

  /** Replaces the label of an existing slot (array writes). */
  set(index: number, label: string): void {
    const item = this.items[index];
    if (item) this.items[index] = { ...item, label };
  }

  removeAt(index: number): SeqItemInput | undefined {
    return this.items.splice(index, 1)[0];
  }

  at(index: number): SeqItemInput | undefined {
    return this.items[index];
  }

  labels(): string[] {
    return this.items.map((i) => i.label);
  }

  values(): number[] {
    return this.items.map((i) => Number(i.label));
  }

  indexOfLabel(label: string): number {
    return this.items.findIndex((i) => i.label === label);
  }

  /** Swaps two items in place (heap sift operations keep ids intact). */
  swap(i: number, j: number): void {
    const a = this.items[i];
    const b = this.items[j];
    if (!a || !b) return;
    this.items[i] = b;
    this.items[j] = a;
  }

  /** Clears every role, then paints the given indices. */
  paint(indices: readonly number[], role: VisualRole, options: { clear?: boolean } = {}): void {
    if (options.clear !== false) {
      this.items = this.items.map(({ role: _drop, ghost: _ghost, ...rest }) => rest);
    }
    const set = new Set(indices);
    this.items = this.items.map((item, i) => (set.has(i) ? { ...item, role } : item));
  }

  /** Paints by item id — used when the item moved since it was painted. */
  paintId(id: string, role: VisualRole): void {
    this.items = this.items.map((item) => (item.id === id ? { ...item, role } : item));
  }

  /** Marks a slot as "was here, now gone" without collapsing the layout. */
  ghost(item: SeqItemInput, label?: string): SeqItemInput {
    return { ...item, ghost: true, ...(label === undefined ? {} : { label }) };
  }

  cursor(name: string, index: number, role: VisualRole = 'active'): SequenceCursorSnapshot {
    return { name, index, role };
  }

  /** Chains consecutive items: `next` left→right, `prev` right→left. */
  links(kinds: readonly ('next' | 'prev')[] = ['next']): SequenceLinkSnapshot[] {
    const out: SequenceLinkSnapshot[] = [];
    for (let i = 0; i + 1 < this.items.length; i += 1) {
      const from = this.items[i] as SeqItemInput;
      const to = this.items[i + 1] as SeqItemInput;
      for (const kind of kinds) out.push({ from: from.id, to: to.id, kind });
    }
    return out;
  }

  /** Closes the ring: last item links back to the first. */
  ringLinks(kinds: readonly ('next' | 'prev')[] = ['next']): SequenceLinkSnapshot[] {
    const out = this.links(kinds);
    const first = this.items[0];
    const last = this.items[this.items.length - 1];
    if (first && last && first !== last) {
      for (const kind of kinds) out.push({ from: last.id, to: first.id, kind });
    }
    return out;
  }

  snapshot(
    decor: {
      readonly cursors?: readonly SequenceCursorSnapshot[];
      readonly links?: readonly SequenceLinkSnapshot[];
      readonly caption?: string;
      readonly badges?: Readonly<Record<string, string | number>>;
    } = {},
  ): SequenceSnapshot {
    const items: SequenceItemSnapshot[] = this.items.map((i) => ({ ...i }));
    return {
      kind: this.kind,
      items,
      ...(decor.cursors?.length ? { cursors: decor.cursors } : {}),
      ...(decor.links?.length ? { links: decor.links } : {}),
      ...(decor.caption === undefined ? {} : { caption: decor.caption }),
      ...(decor.badges === undefined ? {} : { badges: decor.badges }),
    };
  }
}

/** Sensible default population for the linear-structure family. */
export const SERIES = Object.freeze([42, 17, 93, 8, 64, 31, 77, 25]);
