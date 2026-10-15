import type {
  CallFrameSnapshot,
  CallSnapshot,
  CallTreeNodeSnapshot,
  VisualRole,
} from '@/types';
import { TraceBuilder } from '@/utils/traceBuilder';

/**
 * ---------------------------------------------------------------------------
 *  CALL MODEL — the stack behind a recursive trace
 * ---------------------------------------------------------------------------
 *  Recursion is the one place where the *shape* of the computation is a data
 *  structure: the stack. So every recursive generator keeps a `CallModel`,
 *  pushes a frame on entry, pops it on return, and records the value that came
 *  back — which is what makes the return animation meaningful rather than
 *  decorative.
 *
 *  The tree is built at the same time: a frame's parent is the frame that was
 *  on top when it was pushed, so the recursion tree is free.
 */

export interface CallModelOptions {
  /** Label used for the synthetic `main` frame that roots the tree. */
  readonly rootLabel?: string;
}

export class CallModel {
  readonly frames: CallFrameSnapshot[] = [];
  readonly tree: CallTreeNodeSnapshot[] = [];
  locals: { name: string; value: string }[] = [];
  private counter = 0;
  private readonly parents = new Map<string, string | null>();

  constructor(options: CallModelOptions = {}) {
    if (options.rootLabel) {
      this.enter(options.rootLabel, 'entry point');
    }
  }

  get depth(): number {
    return this.frames.length;
  }

  /** Pushes a frame; returns its id so the caller can `leave(id, value)`. */
  enter(label: string, detail?: string, role: VisualRole = 'active'): string {
    this.counter += 1;
    const id = `c${this.counter}`;
    const parentId = this.frames.length > 0 ? (this.frames[this.frames.length - 1]?.id ?? null) : null;
    this.parents.set(id, parentId);
    // Only the top frame is "active"; the ones below are merely waiting, and
    // every frame is rebuilt rather than mutated so no snapshot aliases it.
    const rebuilt = this.frames.map((frame) => {
      const { role: _role, ...rest } = frame;
      return rest as CallFrameSnapshot;
    });
    this.frames.length = 0;
    this.frames.push(...rebuilt, {
      id,
      label,
      ...(detail === undefined ? {} : { detail }),
      role,
    });
    this.tree.push({ id, parentId, label, role });
    return id;
  }

  /**
   * Pops the frame with `id`, optionally attaching the value it returned.
   *
   * The returned frame stays in the snapshot for one beat with `ret` set — the
   * value *is* the point of the step — and is removed by the next `enter`/`leave`.
   */
  leave(id: string, ret?: string): void {
    const index = this.frames.findIndex((frame) => frame.id === id);
    if (index < 0) return;
    const frame = this.frames[index] as CallFrameSnapshot;
    if (ret !== undefined) {
      this.frames[index] = { ...frame, ret, role: 'sorted' };
      const nodeIndex = this.tree.findIndex((entry) => entry.id === id);
      const node = nodeIndex >= 0 ? this.tree[nodeIndex] : undefined;
      if (node && nodeIndex >= 0) this.tree[nodeIndex] = { ...node, role: 'sorted' };
      return;
    }
    this.frames.splice(index, 1);
    if (this.frames.length > 0) {
      const top = this.frames[this.frames.length - 1] as CallFrameSnapshot;
      this.frames[this.frames.length - 1] = { ...top, role: 'active' };
    }
  }

  /** Removes every frame marked as returned — call before pushing the next one. */
  flushReturned(): void {
    for (let i = this.frames.length - 1; i >= 0; i -= 1) {
      const frame = this.frames[i] as CallFrameSnapshot;
      if (frame.ret !== undefined && i !== this.frames.length - 1) {
        this.frames.splice(i, 1);
      }
    }
  }

  /**
   * Empties the stack. Called immediately before the closing beat so the final
   * frame shows "everything has returned" rather than a frozen leftover.
   */
  reset(): void {
    this.frames.length = 0;
    this.locals = [];
  }

  setLocals(entries: { name: string; value: string }[]): void {
    this.locals = entries;
  }

  snapshot(extra: Omit<CallSnapshot, 'frames'> = {}): CallSnapshot {
    return {
      frames: this.frames.map((frame) => ({ ...frame })),
      tree: this.tree.map((node) => ({ ...node })),
      locals: this.locals.map((entry) => ({ ...entry })),
      ...extra,
    };
  }
}

/**
 * Convenience builder so each recursion file does not repeat the generics.
 *
 * Generic in the action payload: Hanoi carries the rod state, the backtracking
 * algorithms carry the board, and neither should have to cast to say so.
 */
export function callBuilder<D = { call: string }>(model: CallModel) {
  return new TraceBuilder<CallSnapshot, D>(() => model.snapshot());
}
