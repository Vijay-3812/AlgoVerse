import type { DataSetKind, Language, RightPanelTab, Theme } from '@/types';
import type { GraphPresetId } from '@/utils/graphPresets';
import { MAX_SPEED, MIN_SPEED, clampSpeed } from '@/engine/playback';
import { MAX_SIZE, MIN_SIZE } from '@/store/sessionStore';
import { parseArrayInput, stringifyArray } from '@/utils/format';

/**
 * ---------------------------------------------------------------------------
 *  SHAREABLE SESSION STATE
 * ---------------------------------------------------------------------------
 *  A URL in AlgoVerse is a complete description of what you are looking at:
 *  which algorithm, which input, which theme, and where the playhead sits. Send
 *  it to a colleague and they open the exact frame you were staring at.
 *
 *  Two rules keep this honest:
 *
 *  1. **Everything is validated on the way in.** Query strings are user input;
 *     a size of `999999` or a seed of `Infinity` must never reach a generator.
 *  2. **Nothing here generates.** This module is a pure codec — encoding and
 *     decoding are tested without a DOM, which is why it lives in `utils`.
 *
 *  The path already carries the algorithm id (`/algorithms/trees/avl`), so the
 *  query string only ever holds *state*.
 */

export interface SharedSession {
  readonly datasetKind?: DataSetKind;
  readonly size?: number;
  readonly seed?: number;
  readonly values?: readonly number[];
  readonly target?: number | null;
  readonly graphPreset?: GraphPresetId;
  readonly step?: number;
  readonly speed?: number;
  readonly theme?: Theme;
  readonly tab?: RightPanelTab;
  readonly lang?: Language;
  readonly view?: string;
}

/**
 * The state a fresh session starts in.
 *
 * Used only as an encoding base: anything equal to these values is dropped from
 * the query string, so a link that changes one thing contains one thing.
 */
export const SESSION_DEFAULTS: SharedSession = Object.freeze({
  datasetKind: 'random',
  size: 18,
  speed: 1,
  theme: 'dark',
  lang: 'javascript',
  view: 'bars',
});

const DATASET_KINDS: readonly DataSetKind[] = ['random', 'sorted', 'reversed', 'nearly-sorted', 'custom', 'imported'];
const THEMES: readonly Theme[] = ['dark', 'light', 'cyberpunk'];
const TABS: readonly RightPanelTab[] = ['pseudocode', 'code', 'explain', 'complexity', 'learn'];
const LANGS: readonly Language[] = ['javascript', 'python', 'cpp', 'java'];
const VIEWS: readonly string[] = ['bars', 'dots', 'circular', 'spectrum'];

/** Ignore anything longer than this — a URL is not a data channel. */
const MAX_VALUES = 256;

function isOneOf<T extends string>(pool: readonly T[], value: string | null): value is T {
  return value !== null && (pool as readonly string[]).includes(value);
}

function readInt(params: URLSearchParams, key: string, min: number, max: number): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded < min || rounded > max ? undefined : rounded;
}

/**
 * Query string (no leading `?`) for a session. Empty/x-default fields are
 * dropped so a link that shares nothing stays short.
 */
export function encodeSharedSession(state: SharedSession, options: { base?: SharedSession } = {}): string {
  const params = new URLSearchParams();
  const base = options.base ?? {};

  /** Writes a key only when it differs from the base session. */
  const put = (key: string, value: string | number | undefined, fallback: string | number | undefined): void => {
    if (value === undefined || value === null || value === '') return;
    if (fallback !== undefined && String(value) === String(fallback)) return;
    params.set(key, String(value));
  };

  put('ds', state.datasetKind, base.datasetKind);
  put('n', state.size, base.size);
  put('seed', state.seed, base.seed);
  put('t', state.target ?? undefined, undefined);
  put('graph', state.graphPreset === 'auto' ? undefined : state.graphPreset, base.graphPreset);
  put('step', state.step !== undefined && state.step > 0 ? state.step : undefined, undefined);
  put('speed', state.speed, base.speed);
  put('theme', state.theme, base.theme);
  put('tab', state.tab, base.tab);
  put('lang', state.lang, base.lang);
  put('view', state.view && VIEWS.includes(state.view) ? state.view : undefined, base.view);

  // The element list is never "default", so it is always written when present.
  if (state.values && state.values.length > 0) params.set('vals', stringifyArray(state.values));

  return params.toString();
}

/** Validated decode. Unknown or out-of-range fields are dropped, not thrown on. */
export function decodeSharedSession(search: string): SharedSession {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const out: Record<string, unknown> = {};

  const ds = params.get('ds');
  if (isOneOf(DATASET_KINDS, ds)) out.datasetKind = ds;

  const size = readInt(params, 'n', MIN_SIZE, MAX_SIZE);
  if (size !== undefined) out.size = size;

  const seed = readInt(params, 'seed', 0, Number.MAX_SAFE_INTEGER);
  if (seed !== undefined) out.seed = seed;

  const values = params.get('vals');
  if (values) {
    const parsed = parseArrayInput(decodeURIComponent(values), MAX_VALUES);
    if (parsed) out.values = parsed;
  }

  const target = params.get('t');
  if (target !== null) {
    const value = Number(target);
    if (Number.isFinite(value)) out.target = Math.round(value);
  }

  const graph = params.get('graph');
  if (graph && graph !== 'auto') out.graphPreset = graph as GraphPresetId;

  const step = readInt(params, 'step', 0, 1_000_000);
  if (step !== undefined) out.step = step;

  const speed = Number(params.get('speed'));
  if (Number.isFinite(speed) && speed > 0) out.speed = clampSpeed(Math.min(Math.max(speed, MIN_SPEED), MAX_SPEED));

  const theme = params.get('theme');
  if (isOneOf(THEMES, theme)) out.theme = theme;

  const tab = params.get('tab');
  if (isOneOf(TABS, tab)) out.tab = tab;

  const lang = params.get('lang');
  if (isOneOf(LANGS, lang)) out.lang = lang;

  const view = params.get('view');
  if (view && VIEWS.includes(view)) out.view = view;

  return out as SharedSession;
}

/**
 * Absolute shareable URL for the current location plus a session.
 *
 * Only the query string is ever built here: the hash is preserved (the app does
 * not use one today, but a hash router would break silently if we dropped it).
 */
export function shareUrl(href: string, session: SharedSession, base?: SharedSession): string {
  const [withoutHash, hash = ''] = href.split('#');
  const [path] = (withoutHash ?? '').split('?');
  const query = encodeSharedSession(session, base ? { base } : {});
  const suffix = hash ? `#${hash}` : '';
  return query ? `${path}?${query}${suffix}` : `${path ?? ''}${suffix}`;
}
