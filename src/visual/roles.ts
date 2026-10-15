import type { StepKind, VisualRole } from '@/types';

/**
 * Single source of truth for "what colour is this element right now".
 *
 * Visualisers ask for a role per element; the theme maps roles to tokens. That
 * indirection is why Cyberpunk mode, colour-blind palettes and the GIF export
 * all work without touching a single renderer.
 */

/** Static fallback: role implied by the step's kind when index is not listed. */
const KIND_ROLE: Partial<Record<StepKind, VisualRole>> = {
  compare: 'compare',
  swap: 'swap',
  pivot: 'pivot',
  sorted: 'sorted',
  found: 'success',
  'not-found': 'danger',
  visit: 'visited',
  explore: 'visited',
  frontier: 'frontier',
  relax: 'compare',
  path: 'path',
  union: 'active',
  find: 'active',
  hash: 'active',
  collision: 'danger',
  probe: 'frontier',
  conflict: 'danger',
  place: 'active',
  unmark: 'ghost',
  memo: 'active',
  fill: 'active',
  choose: 'success',
  backtrack: 'ghost',
  match: 'success',
  mismatch: 'danger',
  write: 'active',
  read: 'active',
  insert: 'active',
  delete: 'danger',
  push: 'active',
  pop: 'danger',
  enqueue: 'active',
  dequeue: 'danger',
  peek: 'active',
  rotate: 'active',
  shift: 'active',
  merge: 'active',
  split: 'muted',
  heapify: 'active',
  'sift-up': 'active',
  'sift-down': 'active',
  balance: 'pivot',
  recurse: 'active',
  return: 'ghost',
  mark: 'active',
  window: 'frontier',
  search: 'active',
  complete: 'success',
  info: 'muted',
  init: 'idle',
  resize: 'active',
  rehash: 'pivot',
};

export function defaultRoleForKind(kind: StepKind): VisualRole {
  return KIND_ROLE[kind] ?? 'idle';
}

export interface HighlightIndex {
  readonly primary: ReadonlySet<number>;
  readonly secondary: ReadonlySet<number>;
  readonly tertiary: ReadonlySet<number>;
  readonly success: ReadonlySet<number>;
  readonly danger: ReadonlySet<number>;
  readonly muted: ReadonlySet<number>;
  readonly nodes: ReadonlySet<string>;
  readonly edges: ReadonlySet<string>;
  readonly deps: ReadonlySet<string>;
}

const EMPTY_SET: ReadonlySet<never> = new Set<never>();

export const EMPTY_HIGHLIGHT_INDEX: HighlightIndex = Object.freeze({
  primary: EMPTY_SET,
  secondary: EMPTY_SET,
  tertiary: EMPTY_SET,
  success: EMPTY_SET,
  danger: EMPTY_SET,
  muted: EMPTY_SET,
  nodes: EMPTY_SET,
  edges: EMPTY_SET,
  deps: EMPTY_SET,
});

/**
 * Converts a step's highlight arrays into Sets once per step.
 * Renderers call this from `useMemo` so a 512-bar frame does 512 O(1) lookups
 * instead of 512 × `Array.includes` scans.
 */
export function buildHighlightIndex(highlight: {
  primary?: readonly number[];
  secondary?: readonly number[];
  tertiary?: readonly number[];
  success?: readonly number[];
  danger?: readonly number[];
  muted?: readonly number[];
  nodes?: readonly string[];
  edges?: readonly string[];
  deps?: readonly string[];
} | null | undefined): HighlightIndex {
  if (!highlight) return EMPTY_HIGHLIGHT_INDEX;
  const num = (list?: readonly number[]): ReadonlySet<number> => (list && list.length ? new Set(list) : EMPTY_SET);
  const str = (list?: readonly string[]): ReadonlySet<string> => (list && list.length ? new Set(list) : EMPTY_SET);
  return {
    primary: num(highlight.primary),
    secondary: num(highlight.secondary),
    tertiary: num(highlight.tertiary),
    success: num(highlight.success),
    danger: num(highlight.danger),
    muted: num(highlight.muted),
    nodes: str(highlight.nodes),
    edges: str(highlight.edges),
    deps: str(highlight.deps),
  };
}

/** Role for a plain index (arrays, DP rows, sorted stacks). */
export function roleForIndex(index: number, step: { kind: StepKind }, h: HighlightIndex): VisualRole {
  if (h.danger.has(index)) return 'danger';
  if (h.success.has(index)) return 'success';
  if (h.primary.has(index)) {
    const kind = step.kind;
    if (kind === 'pivot' || kind === 'partition') return 'pivot';
    if (kind === 'swap') return 'swap';
    if (kind === 'compare') return 'compare';
    return 'active';
  }
  if (h.secondary.has(index)) return 'compare';
  if (h.tertiary.has(index)) return 'pivot';
  if (h.muted.has(index)) return 'muted';
  return 'idle';
}

/** Role for a node id (graphs, trees, tries). */
export function roleForNode(id: string, step: { kind: StepKind }, h: HighlightIndex): VisualRole {
  if (h.danger.has(0) && h.nodes.has(id)) return 'danger';
  if (h.primary.has(0) || h.nodes.has(id)) {
    const kind = step.kind;
    if (kind === 'path' || kind === 'sorted') return 'path';
    if (kind === 'compare' || kind === 'relax') return 'compare';
    if (kind === 'complete' || kind === 'found') return 'success';
    if (kind === 'visit' || kind === 'explore') return 'visited';
    if (kind === 'frontier') return 'frontier';
    return 'active';
  }
  return 'idle';
}

/**
 * Resolves a human-facing role for the whole step — used by the timeline dots,
 * the narration bar and the aurora background.
 */
export function dominantRole(step: { kind: StepKind; highlight: { primary?: readonly number[] } }): VisualRole {
  const primary = step.highlight.primary;
  if (primary && primary.length > 0) return defaultRoleForKind(step.kind);
  return defaultRoleForKind(step.kind);
}

/** Tailwind class fragments per role, used by SVG/canvas legends and chips. */
export const ROLE_TEXT_CLASS: Record<VisualRole, string> = {
  idle: 'text-ink-dim',
  active: 'text-accent-cyan',
  compare: 'text-accent-amber',
  swap: 'text-accent-pink',
  pivot: 'text-accent-violet',
  sorted: 'text-accent-lime',
  visited: 'text-accent-violet',
  frontier: 'text-accent-amber',
  path: 'text-accent-lime',
  success: 'text-accent-lime',
  danger: 'text-accent-red',
  ghost: 'text-ink-faint',
  muted: 'text-ink-faint',
};

/**
 * Literal CSS colours per role for Canvas and Framer Motion.
 *
 * These are the *only* place role colours are hard-coded, because Canvas
 * (unlike SVG) cannot read Tailwind classes. They intentionally mirror
 * `tokens.css`; keep both in sync when adding a role.
 */
export const ROLE_COLOR: Record<VisualRole, string> = {
  idle: '#3b4a63',
  active: '#00F5FF',
  compare: '#FFB020',
  swap: '#FF2E97',
  pivot: '#8B5CF6',
  sorted: '#A3FF12',
  visited: '#8B5CF6',
  frontier: '#FFB020',
  path: '#A3FF12',
  success: '#A3FF12',
  danger: '#FF4D6D',
  ghost: '#5b6780',
  muted: '#2b3550',
};
