/**
 * The SVG builder is pure, but proving its output is well-formed needs a real
 * XML parser — hence jsdom for this file only.
 *
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import type { AnyStep, GraphSnapshot, ArraySnapshot, TreeSnapshot, TableSnapshot, HashSnapshot, IntervalSnapshot, BoardSnapshot, SequenceSnapshot, CallSnapshot } from '@/types';
import { ZERO_METRICS } from '@/types';
import { paletteFor, roleColor, stageToSvg } from './exportSvg';

function stepWith(state: unknown, description = 'a step'): AnyStep {
  return {
    index: 4,
    kind: 'compare',
    description,
    state,
    highlight: {},
    pseudocodeLine: 2,
    codeLine: 3,
    metrics: ZERO_METRICS,
    depth: 0,
    weight: 1,
  } as AnyStep;
}

function options(theme: 'dark' | 'light' = 'dark') {
  return { theme, title: 'Bubble Sort', step: { index: 4, total: 12 } };
}

const arraySnapshot: ArraySnapshot = {
  values: [5, 3, 8, 1],
  labels: ['5', '3', '8', '1'],
  sorted: [0],
  window: [0, 3],
  pointers: [{ name: 'i', index: 1, role: 'active' }],
  aux: [{ label: 'count', values: [1, 0, 1], style: 'cells' }],
  badges: { pass: 2 },
  caption: 'comparing 3 and 8',
};

const graphSnapshot: GraphSnapshot = {
  directed: true,
  weighted: true,
  nodes: [
    { id: 'A', label: 'A', x: 0.1, y: 0.2, role: 'visited', badge: 0 },
    { id: 'B', label: 'B', x: 0.7, y: 0.6, role: 'frontier', badge: 7, sub: 'via A' },
  ],
  edges: [{ from: 'A', to: 'B', weight: 4, role: 'path', directed: true }],
  table: { headers: ['node', 'dist'], rows: [['A', 0]], highlightRow: 0 },
  badges: { settled: 1 },
};

const treeSnapshot: TreeSnapshot = {
  kind: 'binary',
  roots: ['n1'],
  nodes: [
    { id: 'n1', label: '8', children: ['n2', 'n3'], role: 'active', meta: { height: 2, balance: 0 } },
    { id: 'n2', label: '3', children: [null, null], meta: { color: 'red' } },
    { id: 'n3', label: '12', children: [null, null], keys: ['12', '13'] },
  ],
};

const tableSnapshot: TableSnapshot = {
  rows: [{ label: '0' }, { label: '1' }],
  cols: [{ label: '0' }, { label: '1' }],
  cells: [
    [0, 0],
    [0, 5],
  ],
  active: [1, 1],
  deps: [[0, 1]],
  path: [[1, 1]],
  roles: [
    [null, 'visited'],
    [null, 'active'],
  ],
};

const hashSnapshot: HashSnapshot = {
  buckets: [
    { index: 0, entries: [{ key: 'kiwi', value: '3', probe: 0 }] },
    { index: 1, entries: [] },
    { index: 2, entries: [{ key: 'apple', value: '7', role: 'active', probe: 2 }] },
  ],
  probeKind: 'linear',
  probePath: [0, 1, 2],
  loadFactor: 0.66,
};

const intervalSnapshot: IntervalSnapshot = {
  items: [
    { id: 'a', label: 'A', start: 1, end: 4, role: 'sorted' },
    { id: 'b', label: 'B', start: 3, end: 7, role: 'danger', ratio: 0.75 },
  ],
  span: [0, 10],
};

const boardSnapshot: BoardSnapshot = {
  rows: 2,
  cols: 3,
  cells: [
    ['Q', null, null],
    [null, null, 'Q'],
  ],
  roles: [
    ['success', null, null],
    [null, null, 'active'],
  ],
  overlays: [{ row: 1, col: 0, text: 'trying', role: 'compare' }],
};

const sequenceSnapshot: SequenceSnapshot = {
  kind: 'stack',
  items: [
    { id: 's1', label: '3', role: 'sorted' },
    { id: 's2', label: '7', role: 'active', sub: 'top' },
  ],
  cursors: [{ name: 'top', itemId: 's2', role: 'active' }],
};

const callSnapshot: CallSnapshot = {
  frames: [
    { id: 'f1', label: 'fib(4)', detail: 'n = 4', role: 'visited' },
    { id: 'f2', label: 'fib(3)', detail: 'n = 3', role: 'active', ret: '2' },
  ],
  locals: [{ name: 'n', value: '4' }],
};

describe('exportSvg', () => {
  it('exposes a palette per theme and colours per role', () => {
    const dark = paletteFor('dark');
    const light = paletteFor('light');
    expect(dark.bg).not.toBe(light.bg);
    // Cyberpunk shares the dark palette; both are dark themes.
    expect(paletteFor('cyberpunk').bg).toBe(dark.bg);
    expect(roleColor(dark, 'active')).toBe(dark.cyan);
    expect(roleColor(dark, 'danger')).toBe(dark.red);
    expect(roleColor(dark, undefined)).toBe(dark.dim);
  });

  it.each([
    ['array', arraySnapshot],
    ['graph', graphSnapshot],
    ['tree', treeSnapshot],
    ['table', tableSnapshot],
    ['hash', hashSnapshot],
    ['interval', intervalSnapshot],
    ['board', boardSnapshot],
    ['sequence', sequenceSnapshot],
    ['call', callSnapshot],
  ])('renders a %s snapshot as well-formed SVG', (name, snapshot) => {
    const svg = stageToSvg(stepWith(snapshot), options());
    expect(svg, `${name} should render`).toBeTruthy();
    if (!svg) return;

    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
    const root = parsed.documentElement;
    expect(root.tagName).toBe('svg');
    expect(root.getAttribute('viewBox')).toBe('0 0 1200 675');
    expect(root.getAttribute('aria-label')).toContain('Bubble Sort');
    expect(svg).toContain('step 5 / 12');
    expect(svg).toContain('AlgoVerse');
  });

  it('draws the specific content each shape owns', () => {
    const arraySvg = stageToSvg(stepWith(arraySnapshot), options()) ?? '';
    expect(arraySvg).toContain('pass 2'); // badge
    expect(arraySvg).toContain('i'); // pointer label
    expect(arraySvg).toContain('count'); // aux row label

    const graphSvg = stageToSvg(stepWith(graphSnapshot), options()) ?? '';
    expect(graphSvg).toContain('>A<');
    expect(graphSvg).toContain('via A'); // node sub-label
    expect(graphSvg).toContain('<polygon'); // directed arrowhead
    expect(graphSvg).toContain('settled 1');

    const treeSvg = stageToSvg(stepWith(treeSnapshot), options()) ?? '';
    expect(treeSvg).toContain('h2');
    expect(treeSvg).toContain('bf0');
    expect(treeSvg).toContain('13'); // multi-key node

    const hashSvg = stageToSvg(stepWith(hashSnapshot), options()) ?? '';
    expect(hashSvg).toContain('kiwi');
    expect(hashSvg).toContain('p2'); // probe index
    expect(hashSvg).toContain('load factor 0.66');

    const callSvg = stageToSvg(stepWith(callSnapshot), options()) ?? '';
    expect(callSvg).toContain('fib(4)');
    expect(callSvg).toContain('locals');
  });

  it('uses the requested theme for the background', () => {
    const dark = stageToSvg(stepWith(arraySnapshot), options('dark')) ?? '';
    const light = stageToSvg(stepWith(arraySnapshot), options('light')) ?? '';
    expect(dark).toContain(paletteFor('dark').bg);
    expect(light).toContain(paletteFor('light').bg);
    expect(dark).not.toBe(light);
  });

  it('escapes text so a caption can never break the document', () => {
    const svg = stageToSvg(stepWith(arraySnapshot, 'compare a < b & "c"'), options()) ?? '';
    expect(svg).toContain('&lt;');
    expect(svg).not.toContain('a < b &');
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('returns null for a snapshot it cannot draw', () => {
    expect(stageToSvg(stepWith({ mystery: true }), options())).toBeNull();
    expect(stageToSvg(stepWith(null), options())).toBeNull();
  });

  it('survives an empty structure without throwing', () => {
    const empty: ArraySnapshot = { values: [] };
    const svg = stageToSvg(stepWith(empty), options());
    expect(svg).toContain('empty array');
  });
});
