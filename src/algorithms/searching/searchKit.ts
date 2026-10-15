import type { ArraySnapshot, Highlight, PointerSnapshot } from '@/types';

/**
 * Shared helpers for the searching family.
 *
 * All six algorithms emit into `BarVisualizer`, so they speak one visual
 * language: `window` draws the surviving bracket on the snapshot, `pointers`
 * label the live cursors and `highlight.muted` dims the space that has already
 * been eliminated. Keeping that vocabulary here is what stops six generators
 * from inventing six different ways to say "the target cannot be over there".
 */

/** Snapshot decoration: bracket + cursors, without the values themselves. */
export function bracketDecor(
  lo: number,
  hi: number,
  extra: readonly PointerSnapshot[] = [],
): Omit<ArraySnapshot, 'values'> {
  return {
    pointers: [
      { name: 'lo', index: lo, role: 'active' },
      { name: 'hi', index: hi, role: 'active' },
      ...extra,
    ],
    window: [lo, Math.max(lo, hi)],
  };
}

/** Highlight that dims a set of indices plus optional live subject indices. */
export function eliminated(
  muted: readonly number[],
  extra: Highlight = {},
): Highlight {
  return muted.length ? { ...extra, muted: [...muted] } : extra;
}

/** True when `values` is non-decreasing — the guard rail the search family relies on. */
export function isSorted(values: readonly number[]): boolean {
  for (let i = 1; i < values.length; i += 1) {
    if ((values[i - 1] as number) > (values[i] as number)) return false;
  }
  return true;
}
