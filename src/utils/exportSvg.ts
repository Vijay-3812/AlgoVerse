import type {
  AnySnapshot,
  AnyStep,
  ArraySnapshot,
  BoardSnapshot,
  CallSnapshot,
  GraphSnapshot,
  HashSnapshot,
  IntervalSnapshot,
  SequenceSnapshot,
  TableSnapshot,
  Theme,
  TreeSnapshot,
  VisualRole,
} from '@/types';

/**
 * ---------------------------------------------------------------------------
 *  SNAPSHOT → SVG
 * ---------------------------------------------------------------------------
 *  Exports are built from the *trace*, not from the DOM. Screenshotting the
 *  live stage would drag in CSS, backdrop filters and canvas layers; drawing a
 *  snapshot means the result is deterministic, theme-aware, and identical
 *  whether it is rendered on a phone or in the GIF encoder.
 *
 *  So this module is pure string building: a `TraceStep` in, a standalone SVG
 *  out. No DOM, no canvas, no fonts to fetch — every export renders anywhere,
 *  which is exactly what a README screenshot needs.
 */

export interface ExportPalette {
  readonly bg: string;
  readonly bgAlt: string;
  readonly panel: string;
  readonly line: string;
  readonly ink: string;
  readonly dim: string;
  readonly faint: string;
  readonly cyan: string;
  readonly violet: string;
  readonly pink: string;
  readonly lime: string;
  readonly amber: string;
  readonly red: string;
}

const DARK: ExportPalette = {
  bg: '#0A0B12',
  bgAlt: '#131523',
  panel: '#1A1D2E',
  line: '#2C3042',
  ink: '#F2F4FF',
  dim: '#A8AEC9',
  faint: '#6E748F',
  cyan: '#00F5FF',
  violet: '#8B5CF6',
  pink: '#FF2E97',
  lime: '#A3FF12',
  amber: '#FFB020',
  red: '#FF4D6D',
};

const LIGHT: ExportPalette = {
  bg: '#F7F8FC',
  bgAlt: '#FFFFFF',
  panel: '#FFFFFF',
  line: '#D8DCEA',
  ink: '#141726',
  dim: '#4A5068',
  faint: '#8A90A8',
  cyan: '#0891B2',
  violet: '#6D28D9',
  pink: '#DB2777',
  lime: '#4D7C0F',
  amber: '#B45309',
  red: '#DC2626',
};

export function paletteFor(theme: Theme): ExportPalette {
  return theme === 'light' ? LIGHT : DARK;
}

/** Role → colour, mirroring the legend so an export reads like the app. */
export function roleColor(palette: ExportPalette, role: VisualRole | undefined): string {
  switch (role) {
    case 'active':
      return palette.cyan;
    case 'compare':
    case 'frontier':
      return palette.amber;
    case 'swap':
      return palette.pink;
    case 'pivot':
    case 'visited':
      return palette.violet;
    case 'sorted':
    case 'path':
    case 'success':
      return palette.lime;
    case 'danger':
      return palette.red;
    case 'ghost':
      return palette.faint;
    case 'muted':
      return palette.line;
    default:
      return palette.dim;
  }
}

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                 */
/* -------------------------------------------------------------------------- */

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const SANS = 'Inter, system-ui, -apple-system, Segoe UI, sans-serif';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function num(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '0';
}

interface RectOptions {
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly rx?: number;
  readonly opacity?: number;
}

function rect(x: number, y: number, w: number, h: number, options: RectOptions = {}): string {
  const parts = [
    `x="${num(x)}"`,
    `y="${num(y)}"`,
    `width="${num(Math.max(0, w))}"`,
    `height="${num(Math.max(0, h))}"`,
    `fill="${options.fill ?? 'none'}"`,
  ];
  if (options.stroke) parts.push(`stroke="${options.stroke}"`, `stroke-width="${num(options.strokeWidth ?? 1.5)}"`);
  if (options.rx !== undefined) parts.push(`rx="${num(options.rx)}"`);
  if (options.opacity !== undefined) parts.push(`opacity="${num(options.opacity)}"`);
  return `<rect ${parts.join(' ')} />`;
}

interface TextOptions {
  readonly size?: number;
  readonly fill?: string;
  readonly anchor?: 'start' | 'middle' | 'end';
  readonly weight?: number | 'bold';
  readonly mono?: boolean;
  readonly opacity?: number;
}

function text(x: number, y: number, content: string, options: TextOptions = {}): string {
  const parts = [
    `x="${num(x)}"`,
    `y="${num(y)}"`,
    `font-family="${options.mono === false ? SANS : MONO}"`,
    `font-size="${num(options.size ?? 13)}"`,
    `fill="${options.fill ?? '#000'}"`,
    `text-anchor="${options.anchor ?? 'start'}"`,
  ];
  if (options.weight !== undefined) parts.push(`font-weight="${options.weight}"`);
  if (options.opacity !== undefined) parts.push(`opacity="${num(options.opacity)}"`);
  return `<text ${parts.join(' ')}>${esc(content)}</text>`;
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1.5, dash?: string): string {
  const parts = [
    `x1="${num(x1)}"`,
    `y1="${num(y1)}"`,
    `x2="${num(x2)}"`,
    `y2="${num(y2)}"`,
    `stroke="${stroke}"`,
    `stroke-width="${num(width)}"`,
    'stroke-linecap="round"',
  ];
  if (dash) parts.push(`stroke-dasharray="${dash}"`);
  return `<line ${parts.join(' ')} />`;
}

function circle(cx: number, cy: number, r: number, options: RectOptions = {}): string {
  const parts = [`cx="${num(cx)}"`, `cy="${num(cy)}"`, `r="${num(r)}"`, `fill="${options.fill ?? 'none'}"`];
  if (options.stroke) parts.push(`stroke="${options.stroke}"`, `stroke-width="${num(options.strokeWidth ?? 1.5)}"`);
  if (options.opacity !== undefined) parts.push(`opacity="${num(options.opacity)}"`);
  return `<circle ${parts.join(' ')} />`;
}

/** Truncates a label to fit a cell rather than letting it bleed into the next. */
function fit(label: string, maxChars: number): string {
  return label.length > maxChars ? `${label.slice(0, Math.max(1, maxChars - 1))}…` : label;
}

/* -------------------------------------------------------------------------- */
/*  Shape guards                                                              */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isGraphSnapshot(value: unknown): value is GraphSnapshot {
  return isRecord(value) && Array.isArray(value.nodes) && Array.isArray(value.edges) && 'directed' in value;
}
export function isTreeSnapshot(value: unknown): value is TreeSnapshot {
  return isRecord(value) && Array.isArray(value.nodes) && Array.isArray(value.roots) && !('edges' in value);
}
export function isTableSnapshot(value: unknown): value is TableSnapshot {
  return isRecord(value) && Array.isArray(value.rows) && Array.isArray(value.cols) && Array.isArray(value.cells);
}
export function isBoardSnapshot(value: unknown): value is BoardSnapshot {
  return isRecord(value) && typeof value.rows === 'number' && Array.isArray(value.cells);
}
export function isHashSnapshot(value: unknown): value is HashSnapshot {
  return isRecord(value) && Array.isArray(value.buckets);
}
export function isCallSnapshot(value: unknown): value is CallSnapshot {
  return isRecord(value) && Array.isArray(value.frames);
}
export function isIntervalSnapshot(value: unknown): value is IntervalSnapshot {
  return isRecord(value) && Array.isArray(value.items) && 'span' in value;
}
export function isSequenceSnapshot(value: unknown): value is SequenceSnapshot {
  return isRecord(value) && Array.isArray(value.items) && typeof value.kind === 'string' && !('span' in value);
}
export function isArraySnapshot(value: unknown): value is ArraySnapshot {
  return isRecord(value) && Array.isArray(value.values);
}

/* -------------------------------------------------------------------------- */
/*  Frame                                                                      */
/* -------------------------------------------------------------------------- */

export interface StageSvgOptions {
  readonly theme: Theme;
  readonly title: string;
  readonly step?: { readonly index: number; readonly total: number };
  readonly width?: number;
  readonly height?: number;
  /** Branding strip along the bottom. */
  readonly footnote?: string;
}

/**
 * Renders one trace step as a complete, standalone SVG document.
 *
 * Returns `null` for a snapshot this module does not understand — callers fall
 * back to a text card rather than exporting a blank rectangle.
 */
export function stageToSvg(step: AnyStep, options: StageSvgOptions): string | null {
  const width = options.width ?? 1200;
  const height = options.height ?? 675;
  const palette = paletteFor(options.theme);
  const body = renderSnapshot(step.state as AnySnapshot, palette, width, height);

  if (!body) return null;

  const caption = typeof step.description === 'string' ? step.description : '';
  const footer = options.footnote ?? 'AlgoVerse · trace-driven algorithm visualiser';
  const stepLabel = options.step ? `step ${options.step.index + 1} / ${options.step.total}` : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(`${options.title} — ${caption}`)}">`,
    '<defs>',
    `<linearGradient id="av-bg" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="${palette.bg}" />`,
    `<stop offset="100%" stop-color="${palette.bgAlt}" />`,
    '</linearGradient>',
    '</defs>',
    rect(0, 0, width, height, { fill: 'url(#av-bg)' }),
    // Title block
    text(40, 52, options.title, { size: 26, fill: palette.ink, weight: 'bold', mono: false }),
    text(40, 76, fit(caption, 96), { size: 14, fill: palette.dim }),
    stepLabel ? text(width - 40, 52, stepLabel, { size: 13, fill: palette.faint, anchor: 'end' }) : '',
    line(40, 96, width - 40, 96, palette.line, 1),
    body,
    line(40, height - 46, width - 40, height - 46, palette.line, 1),
    text(40, height - 22, footer, { size: 12, fill: palette.faint }),
    footer ? text(width - 40, height - 22, caption, { size: 12, fill: palette.faint, anchor: 'end' }) : '',
    '</svg>',
  ]
    .filter(Boolean)
    .join('\n');
}

function renderSnapshot(snapshot: AnySnapshot, palette: ExportPalette, width: number, height: number): string | null {
  const box = { x: 40, y: 118, width: width - 80, height: height - 118 - 62 };
  if (isGraphSnapshot(snapshot)) return renderGraph(snapshot, palette, box);
  if (isTreeSnapshot(snapshot)) return renderTree(snapshot, palette, box);
  if (isTableSnapshot(snapshot)) return renderTable(snapshot, palette, box);
  if (isBoardSnapshot(snapshot)) return renderBoard(snapshot, palette, box);
  if (isHashSnapshot(snapshot)) return renderHash(snapshot, palette, box);
  if (isCallSnapshot(snapshot)) return renderCall(snapshot, palette, box);
  if (isIntervalSnapshot(snapshot)) return renderIntervals(snapshot, palette, box);
  if (isSequenceSnapshot(snapshot)) return renderSequence(snapshot, palette, box);
  if (isArraySnapshot(snapshot)) return renderArray(snapshot, palette, box);
  return null;
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/* -------------------------------------------------------------------------- */
/*  1. Arrays                                                                  */
/* -------------------------------------------------------------------------- */

function renderArray(snapshot: ArraySnapshot, palette: ExportPalette, box: Box): string {
  const values = snapshot.values;
  const n = values.length;
  if (n === 0) return text(box.x, box.y + 40, 'empty array', { size: 14, fill: palette.faint });

  const auxCount = snapshot.aux?.length ?? 0;
  const auxHeight = auxCount * 46;
  const labelRoom = n <= 48 ? 42 : 12;
  const plotHeight = box.height - auxHeight - labelRoom;
  const max = Math.max(...values.map((value) => Math.abs(value)), 1);
  const slot = box.width / n;
  const barWidth = Math.max(2, slot * 0.62);
  const zero = box.y + plotHeight;
  const sorted = new Set(snapshot.sorted ?? []);
  const window = snapshot.window ?? null;

  const parts: string[] = [];

  // Baseline
  parts.push(line(box.x, zero, box.x + box.width, zero, palette.line, 1));

  values.forEach((value, index) => {
    const centre = box.x + slot * index + slot / 2;
    const barHeight = (Math.abs(value) / max) * (plotHeight - 12);
    const inWindow = window ? index >= window[0] && index <= window[1] : true;
    const isSorted = sorted.has(index);
    const fill = isSorted ? palette.lime : inWindow ? palette.cyan : palette.faint;
    const opacity = inWindow ? 0.9 : 0.32;
    parts.push(
      rect(centre - barWidth / 2, zero - barHeight, barWidth, barHeight, {
        fill,
        rx: Math.min(4, barWidth / 3),
        opacity,
      }),
    );
    if (n <= 48) {
      parts.push(
        text(centre, zero + 18, snapshot.labels?.[index] ?? String(value), {
          size: 11,
          fill: palette.dim,
          anchor: 'middle',
        }),
      );
    }
  });

  if (window && n <= 96) {
    const left = box.x + slot * window[0];
    const right = box.x + slot * (window[1] + 1);
    parts.push(
      rect(left, box.y, right - left, plotHeight + 6, {
        stroke: palette.violet,
        strokeWidth: 1.5,
        rx: 6,
        opacity: 0.7,
      }),
    );
  }

  for (const pointer of snapshot.pointers ?? []) {
    if (pointer.index < 0 || pointer.index >= n) continue;
    const centre = box.x + slot * pointer.index + slot / 2;
    const value = values[pointer.index] ?? 0;
    const top = zero - (Math.abs(value) / max) * (plotHeight - 12) - 10;
    parts.push(
      line(centre, top + 4, centre, zero, roleColor(palette, pointer.role), 1, '3 3'),
      text(centre, Math.max(box.y + 12, top), pointer.name, {
        size: 12,
        fill: roleColor(palette, pointer.role),
        anchor: 'middle',
      }),
    );
  }

  let auxY = zero + labelRoom;
  for (const row of snapshot.aux ?? []) {
    parts.push(text(box.x, auxY + 14, fit(row.label, 18), { size: 11, fill: palette.faint }));
    const rowWidth = row.values.length;
    const cellSlot = Math.min(34, (box.width - 110) / Math.max(1, rowWidth));
    row.values.forEach((value, index) => {
      const x = box.x + 110 + cellSlot * index + (row.offset ?? 0) * cellSlot;
      const role = row.roles?.[index] ?? null;
      parts.push(
        rect(x, auxY, Math.max(12, cellSlot - 4), 28, {
          fill: palette.panel,
          stroke: role ? roleColor(palette, role) : palette.line,
          strokeWidth: 1.2,
          rx: 5,
        }),
        text(x + Math.max(6, (cellSlot - 4) / 2), auxY + 19, String(value ?? '·'), {
          size: 10,
          fill: palette.dim,
          anchor: 'middle',
        }),
      );
    });
    auxY += 46;
  }

  parts.push(...badgeRow(snapshot.badges, palette, box, box.y));
  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/*  2. Sequences (stack, queue, list, heap…)                                   */
/* -------------------------------------------------------------------------- */

function renderSequence(snapshot: SequenceSnapshot, palette: ExportPalette, box: Box): string {
  const items = snapshot.items;
  if (items.length === 0) return text(box.x, box.y + 40, 'empty structure', { size: 14, fill: palette.faint });

  const cellWidth = Math.min(150, Math.max(56, box.width / Math.max(items.length, 1) - 8));
  const cellHeight = Math.min(78, box.height * 0.34);
  const totalWidth = items.length * (cellWidth + 8);
  const startX = box.x + Math.max(0, (box.width - totalWidth) / 2);
  const y = box.y + box.height * 0.3;

  const parts: string[] = [];
  const centreOf = (index: number): number => startX + index * (cellWidth + 8) + cellWidth / 2;

  items.forEach((item, index) => {
    const x = startX + index * (cellWidth + 8);
    const colour = roleColor(palette, item.role);
    parts.push(
      rect(x, y, cellWidth, cellHeight, {
        fill: palette.panel,
        stroke: colour,
        strokeWidth: item.role && item.role !== 'idle' ? 2 : 1.2,
        rx: 10,
        opacity: item.ghost ? 0.35 : 1,
      }),
      text(x + cellWidth / 2, y + cellHeight / 2 + (item.sub ? -2 : 6), fit(item.label, 10), {
        size: 15,
        fill: palette.ink,
        anchor: 'middle',
        weight: 'bold',
      }),
    );
    if (item.sub) {
      parts.push(
        text(x + cellWidth / 2, y + cellHeight / 2 + 18, fit(item.sub, 12), {
          size: 10,
          fill: palette.dim,
          anchor: 'middle',
        }),
      );
    }
    if (index < items.length - 1) {
      parts.push(line(x + cellWidth + 1, y + cellHeight / 2, x + cellWidth + 7, y + cellHeight / 2, palette.line, 1.5));
    }
  });

  for (const cursor of snapshot.cursors ?? []) {
    const index = cursor.index ?? items.findIndex((item) => item.id === cursor.itemId);
    if (index < 0 || index >= items.length) continue;
    const centre = centreOf(index);
    parts.push(
      text(centre, y - 12, cursor.name, {
        size: 12,
        fill: roleColor(palette, cursor.role),
        anchor: 'middle',
      }),
      line(centre, y - 8, centre, y - 2, roleColor(palette, cursor.role), 1.5),
    );
  }

  parts.push(
    text(box.x, box.y + box.height, snapshot.kind.toUpperCase(), { size: 12, fill: palette.faint }),
  );
  parts.push(...badgeRow(snapshot.badges, palette, box, box.y));
  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/*  3. Trees                                                                   */
/* -------------------------------------------------------------------------- */

interface Placed {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

function layoutTree(snapshot: TreeSnapshot, box: Box): Map<string, Placed> {
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const depths = new Map<string, number>();
  const order: Record<string, number> = {};
  let leafCursor = 0;
  const maxDepth = { value: 0 };

  const visit = (id: string, depth: number): void => {
    const node = byId.get(id);
    if (!node) return;
    depths.set(id, depth);
    maxDepth.value = Math.max(maxDepth.value, depth);
    const children = node.children.filter((child): child is string => child !== null && byId.has(child));
    if (children.length === 0) {
      order[id] = leafCursor;
      leafCursor += 1;
      return;
    }
    for (const child of children) visit(child, depth + 1);
    const positions = children.map((child) => order[child] ?? 0);
    order[id] = positions.reduce((sum, value) => sum + value, 0) / positions.length;
  };

  for (const root of snapshot.roots) visit(root, 0);

  const columns = Math.max(1, leafCursor);
  // In-order columns (depth-first leaves) keep left children left; explicit
  // `positions` from the generator override the computed x when it knows better.
  const placed = new Map<string, Placed>();
  for (const node of snapshot.nodes) {
    const column = snapshot.positions?.[node.id] ?? order[node.id] ?? columns / 2;
    const x = box.x + (columns === 1 ? box.width / 2 : (column / Math.max(1, columns - 1)) * (box.width - 120) + 60);
    const depth = depths.get(node.id) ?? 0;
    const y = box.y + 40 + (maxDepth.value === 0 ? 0 : (depth / Math.max(1, maxDepth.value)) * (box.height - 110));
    placed.set(node.id, { id: node.id, x: Number.isFinite(x) ? x : box.x + box.width / 2, y, depth });
  }
  return placed;
}

function renderTree(snapshot: TreeSnapshot, palette: ExportPalette, box: Box): string {
  if (snapshot.nodes.length === 0) return text(box.x, box.y + 40, 'empty tree', { size: 14, fill: palette.faint });

  const placed = layoutTree(snapshot, box);
  const parts: string[] = [];

  for (const node of snapshot.nodes) {
    const from = placed.get(node.id);
    if (!from) continue;
    for (const childId of node.children) {
      if (!childId) continue;
      const to = placed.get(childId);
      if (!to) continue;
      parts.push(line(from.x, from.y + 16, to.x, to.y - 16, palette.line, 1.5));
    }
  }

  for (const node of snapshot.nodes) {
    const at = placed.get(node.id);
    if (!at) continue;
    const colour = roleColor(palette, node.role);
    const keys = node.keys && node.keys.length > 0 ? node.keys : [node.label];
    const width = Math.max(46, keys.length * 34 + 12);
    const height = 34;

    // Red-black trees encode colour in the node itself; every other tree uses
    // the visual role, so both end up with a meaningful ring.
    const meta = node.meta;
    const fill =
      meta?.color === 'black' ? palette.bgAlt : meta?.color === 'red' ? palette.red : palette.panel;
    const stroke = meta?.color ? palette.ink : colour;

    parts.push(
      rect(at.x - width / 2, at.y - height / 2, width, height, {
        fill,
        stroke,
        strokeWidth: node.role && node.role !== 'idle' ? 2.2 : 1.3,
        rx: 9,
      }),
    );

    keys.forEach((key, index) => {
      const keyX = at.x - width / 2 + 17 + index * 34;
      parts.push(text(keyX, at.y + 5, fit(key, 4), { size: 14, fill: palette.ink, anchor: 'middle', weight: 'bold' }));
      if (index < keys.length - 1) {
        parts.push(line(keyX + 17, at.y - height / 2, keyX + 17, at.y + height / 2, palette.line, 1));
      }
    });

    const meta2 = node.meta;
    const annotations: string[] = [];
    if (typeof meta2?.height === 'number') annotations.push(`h${meta2.height}`);
    if (typeof meta2?.balance === 'number') annotations.push(`bf${meta2.balance > 0 ? '+' : ''}${meta2.balance}`);
    if (typeof meta2?.count === 'number') annotations.push(`n${meta2.count}`);
    const annotation = node.sub ?? annotations.join(' ');
    if (annotation) {
      parts.push(text(at.x, at.y + height / 2 + 14, annotation, { size: 10, fill: palette.faint, anchor: 'middle' }));
    }
  }

  parts.push(...badgeRow(snapshot.badges, palette, box, box.y));
  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/*  4. Graphs                                                                  */
/* -------------------------------------------------------------------------- */

function renderGraph(snapshot: GraphSnapshot, palette: ExportPalette, box: Box): string {
  if (snapshot.nodes.length === 0) return text(box.x, box.y + 40, 'empty graph', { size: 14, fill: palette.faint });

  const pad = 54;
  const radius = Math.max(15, Math.min(24, box.width / (snapshot.nodes.length * 2.4)));
  const place = (x: number, y: number): { x: number; y: number } => ({
    x: box.x + pad + x * (box.width - pad * 2),
    y: box.y + pad + y * (box.height - pad * 2),
  });
  const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const parts: string[] = [];

  for (const edge of snapshot.edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) continue;
    const a = place(from.x, from.y);
    const b = place(to.x, to.y);
    const colour = roleColor(palette, edge.role);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const start = { x: a.x + ux * (radius + 2), y: a.y + uy * (radius + 2) };
    const end = { x: b.x - ux * (radius + 4), y: b.y - uy * (radius + 4) };

    parts.push(line(start.x, start.y, end.x, end.y, colour, edge.role && edge.role !== 'idle' ? 3 : 1.4));

    if (edge.directed) {
      const size = 9;
      const px = -uy;
      const py = ux;
      parts.push(
        `<polygon points="${num(end.x)},${num(end.y)} ${num(end.x - ux * size + px * size * 0.5)},${num(end.y - uy * size + py * size * 0.5)} ${num(end.x - ux * size - px * size * 0.5)},${num(end.y - uy * size - py * size * 0.5)}" fill="${colour}" />`,
      );
    }

    if (edge.weight !== undefined) {
      const midX = (a.x + b.x) / 2 + -uy * 12;
      const midY = (a.y + b.y) / 2 + ux * 12;
      parts.push(
        rect(midX - 14, midY - 11, 28, 20, { fill: palette.bgAlt, stroke: palette.line, rx: 6, strokeWidth: 1 }),
        text(midX, midY + 3, String(edge.weight), { size: 11, fill: palette.dim, anchor: 'middle' }),
      );
    }
  }

  for (const node of snapshot.nodes) {
    const at = place(node.x, node.y);
    const colour = roleColor(palette, node.role);
    const highlight = node.role && node.role !== 'idle';
    parts.push(
      circle(at.x, at.y, radius, { fill: palette.panel, stroke: colour, strokeWidth: highlight ? 3 : 1.4 }),
      text(at.x, at.y + 5, fit(node.label, 4), { size: 14, fill: palette.ink, anchor: 'middle', weight: 'bold' }),
    );
    if (node.badge !== undefined) {
      parts.push(
        circle(at.x + radius * 0.85, at.y - radius * 0.85, 12, { fill: palette.bgAlt, stroke: colour, strokeWidth: 1.4 }),
        text(at.x + radius * 0.85, at.y - radius * 0.85 + 4, String(node.badge), {
          size: 10,
          fill: colour,
          anchor: 'middle',
        }),
      );
    }
    if (node.sub) {
      parts.push(text(at.x, at.y + radius + 14, node.sub, { size: 10, fill: palette.dim, anchor: 'middle' }));
    }
  }

  parts.push(...badgeRow(snapshot.badges, palette, box, box.y));

  if (snapshot.table) {
    parts.push(...renderMiniTable(snapshot.table, palette, box));
  }
  return parts.join('\n');
}

function renderMiniTable(
  table: NonNullable<GraphSnapshot['table']>,
  palette: ExportPalette,
  box: Box,
): string[] {
  const cellWidth = 44;
  const cellHeight = 19;
  const columns = table.headers.length;
  const width = columns * cellWidth;
  const height = (table.rows.length + 1) * cellHeight;
  const x = box.x + box.width - width;
  const y = box.y + 30;

  const parts: string[] = [
    rect(x, y, width, height, { fill: palette.bgAlt, stroke: palette.line, rx: 8, opacity: 0.94 }),
  ];

  table.headers.forEach((header, index) => {
    parts.push(
      text(x + index * cellWidth + cellWidth / 2, y + 14, fit(header, 6), {
        size: 10,
        fill: palette.cyan,
        anchor: 'middle',
      }),
    );
  });

  table.rows.forEach((row, rowIndex) => {
    const rowY = y + (rowIndex + 1) * cellHeight;
    if (table.highlightRow === rowIndex) {
      parts.push(rect(x, rowY, width, cellHeight, { fill: palette.violet, opacity: 0.14 }));
    }
    row.forEach((cell, colIndex) => {
      if (table.highlightCol === colIndex) {
        parts.push(rect(x + colIndex * cellWidth, rowY, cellWidth, cellHeight, { fill: palette.amber, opacity: 0.12 }));
      }
      parts.push(
        text(x + colIndex * cellWidth + cellWidth / 2, rowY + 14, fit(String(cell), 6), {
          size: 10,
          fill: palette.dim,
          anchor: 'middle',
        }),
      );
    });
  });

  return parts;
}

/* -------------------------------------------------------------------------- */
/*  5. Tables (DP, Floyd–Warshall)                                             */
/* -------------------------------------------------------------------------- */

function renderTable(snapshot: TableSnapshot, palette: ExportPalette, box: Box): string {
  const rows = snapshot.rows.length;
  const cols = snapshot.cols.length;
  if (rows === 0 || cols === 0) return text(box.x, box.y + 40, 'empty table', { size: 14, fill: palette.faint });

  const axisWidth = 74;
  const axisHeight = 34;
  const cellWidth = Math.min(96, (box.width - axisWidth) / cols);
  const cellHeight = Math.min(56, (box.height - axisHeight) / rows);
  const originX = box.x + axisWidth;
  const originY = box.y + axisHeight;
  const parts: string[] = [];
  const centreOf = (row: number, col: number): { x: number; y: number } => ({
    x: originX + col * cellWidth + cellWidth / 2,
    y: originY + row * cellHeight + cellHeight / 2,
  });

  snapshot.cols.forEach((col, index) => {
    parts.push(
      text(originX + index * cellWidth + cellWidth / 2, originY - 10, fit(col.label, 8), {
        size: 11,
        fill: palette.dim,
        anchor: 'middle',
      }),
    );
  });

  snapshot.rows.forEach((row, rowIndex) => {
    parts.push(
      text(originX - 12, originY + rowIndex * cellHeight + cellHeight / 2 + 4, fit(row.label, 8), {
        size: 11,
        fill: palette.dim,
        anchor: 'end',
      }),
    );
    for (let col = 0; col < cols; col += 1) {
      const value = snapshot.cells[rowIndex]?.[col] ?? null;
      const role = snapshot.roles?.[rowIndex]?.[col] ?? null;
      const active = snapshot.active && snapshot.active[0] === rowIndex && snapshot.active[1] === col;
      const onPath = snapshot.path?.some(([r, c]) => r === rowIndex && c === col) ?? false;
      parts.push(
        rect(originX + col * cellWidth, originY + rowIndex * cellHeight, cellWidth - 3, cellHeight - 3, {
          fill: role ? roleColor(palette, role) : palette.panel,
          opacity: role ? 0.22 : 1,
          stroke: active ? palette.cyan : onPath ? palette.lime : palette.line,
          strokeWidth: active ? 2.4 : 1.1,
          rx: 6,
        }),
        text(originX + col * cellWidth + cellWidth / 2, originY + rowIndex * cellHeight + cellHeight / 2 + 5, String(value ?? '·'), {
          size: 13,
          fill: palette.ink,
          anchor: 'middle',
        }),
      );
    }
  });

  for (const [row, col] of snapshot.deps ?? []) {
    if (!snapshot.active) continue;
    const from = centreOf(row, col);
    const to = centreOf(snapshot.active[0], snapshot.active[1]);
    parts.push(line(from.x, from.y, to.x, to.y, palette.pink, 1.6, '4 4'));
  }

  parts.push(...badgeRow(snapshot.badges, palette, box, box.y + 2));
  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/*  6. Call stacks                                                             */
/* -------------------------------------------------------------------------- */

function renderCall(snapshot: CallSnapshot, palette: ExportPalette, box: Box): string {
  const frames = snapshot.frames;
  const rowHeight = Math.min(58, box.height / Math.max(1, frames.length + 1));
  const width = Math.min(560, box.width * 0.62);
  const x = box.x;
  const parts: string[] = [];

  parts.push(text(x, box.y + 4, 'call stack', { size: 12, fill: palette.faint }));

  frames.forEach((frame, index) => {
    // Bottom-up, like a real stack growing toward the top of the panel.
    const y = box.y + box.height - (index + 1) * rowHeight;
    const colour = roleColor(palette, frame.role);
    parts.push(
      rect(x, y, width, rowHeight - 6, { fill: palette.panel, stroke: colour, strokeWidth: 1.6, rx: 9 }),
      rect(x, y, 4, rowHeight - 6, { fill: colour, rx: 2 }),
      text(x + 14, y + 22, fit(frame.label, 26), { size: 13, fill: palette.ink, weight: 'bold' }),
    );
    if (frame.detail) {
      parts.push(text(x + 14, y + 38, fit(frame.detail, 40), { size: 11, fill: palette.dim }));
    }
    if (frame.ret) {
      parts.push(
        text(x + width - 12, y + 22, `→ ${fit(frame.ret, 12)}`, {
          size: 11,
          fill: palette.lime,
          anchor: 'end',
        }),
      );
    }
  });

  if (snapshot.locals && snapshot.locals.length > 0) {
    const localsX = x + width + 28;
    parts.push(text(localsX, box.y + 4, 'locals', { size: 12, fill: palette.faint }));
    snapshot.locals.forEach((local, index) => {
      const y = box.y + 18 + index * 28;
      parts.push(
        rect(localsX, y, Math.min(240, box.width - width - 40), 24, {
          fill: palette.bgAlt,
          stroke: palette.line,
          rx: 6,
        }),
        text(localsX + 8, y + 16, `${local.name} = ${fit(local.value, 16)}`, { size: 11, fill: palette.dim }),
      );
    });
  }

  parts.push(...badgeRow(snapshot.badges, palette, box, box.y));
  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/*  7. Boards                                                                  */
/* -------------------------------------------------------------------------- */

function renderBoard(snapshot: BoardSnapshot, palette: ExportPalette, box: Box): string {
  const { rows, cols } = snapshot;
  const cell = Math.min((box.width - 40) / cols, (box.height - 20) / rows, 72);
  const originX = box.x + (box.width - cell * cols) / 2;
  const originY = box.y + 10;
  const parts: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const value = snapshot.cells[row]?.[col] ?? null;
      const role = snapshot.roles?.[row]?.[col] ?? null;
      parts.push(
        rect(originX + col * cell, originY + row * cell, cell - 4, cell - 4, {
          fill: role ? roleColor(palette, role) : palette.panel,
          opacity: role ? 0.24 : 1,
          stroke: role ? roleColor(palette, role) : palette.line,
          strokeWidth: 1.3,
          rx: 8,
        }),
        text(originX + col * cell + (cell - 4) / 2, originY + row * cell + cell / 2 + 6, String(value ?? ''), {
          size: Math.min(24, cell * 0.44),
          fill: palette.ink,
          anchor: 'middle',
          weight: 'bold',
        }),
      );
    }
  }

  for (const overlay of snapshot.overlays ?? []) {
    parts.push(
      text(originX + overlay.col * cell + (cell - 4) / 2, originY + overlay.row * cell - 6, overlay.text, {
        size: 12,
        fill: roleColor(palette, overlay.role),
        anchor: 'middle',
      }),
    );
  }

  parts.push(...badgeRow(snapshot.badges, palette, box, box.y + 2));
  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/*  8. Hash tables                                                             */
/* -------------------------------------------------------------------------- */

function renderHash(snapshot: HashSnapshot, palette: ExportPalette, box: Box): string {
  const buckets = snapshot.buckets;
  const probePath = new Set(snapshot.probePath ?? []);
  const rowHeight = Math.min(52, box.height / Math.max(1, buckets.length));
  const parts: string[] = [];

  buckets.forEach((bucket, index) => {
    const y = box.y + index * rowHeight;
    const inPath = probePath.has(bucket.index);
    parts.push(
      rect(box.x, y, 64, rowHeight - 6, {
        fill: inPath ? palette.cyan : palette.panel,
        opacity: inPath ? 0.2 : 1,
        stroke: inPath ? palette.cyan : palette.line,
        rx: 8,
      }),
      text(box.x + 32, y + rowHeight / 2 + 4, String(bucket.index), {
        size: 12,
        fill: inPath ? palette.cyan : palette.dim,
        anchor: 'middle',
      }),
    );

    bucket.entries.forEach((entry, entryIndex) => {
      const x = box.x + 76 + entryIndex * 132;
      if (x + 128 > box.x + box.width) return;
      const colour = roleColor(palette, entry.role);
      parts.push(
        rect(x, y, 126, rowHeight - 6, {
          fill: palette.panel,
          stroke: colour,
          strokeWidth: entry.role && entry.role !== 'idle' ? 2 : 1.2,
          rx: 8,
        }),
        text(x + 12, y + rowHeight / 2 + 2, `${fit(entry.key, 8)}${entry.value ? `: ${fit(entry.value, 6)}` : ''}`, {
          size: 12,
          fill: palette.ink,
        }),
      );
      if (entry.probe !== undefined) {
        parts.push(
          text(x + 118, y + rowHeight / 2 + 2, `p${entry.probe}`, { size: 10, fill: palette.faint, anchor: 'end' }),
        );
      }
      if (entryIndex < bucket.entries.length - 1) {
        parts.push(line(x + 126, y + rowHeight / 2 - 3, x + 132, y + rowHeight / 2 - 3, palette.line, 2));
      }
    });
  });

  parts.push(
    text(box.x, box.y + box.height + 4, `load factor ${snapshot.loadFactor.toFixed(2)} · ${snapshot.probeKind}`, {
      size: 12,
      fill: palette.faint,
    }),
  );
  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/*  9. Intervals                                                               */
/* -------------------------------------------------------------------------- */

function renderIntervals(snapshot: IntervalSnapshot, palette: ExportPalette, box: Box): string {
  const items = snapshot.items;
  const [from, to] = snapshot.span;
  const labelsWidth = 96;
  const width = box.width - labelsWidth;
  const rowHeight = Math.min(46, box.height / Math.max(1, items.length + 1));
  const scale = (value: number): number => ((value - from) / Math.max(1e-6, to - from)) * width;
  const parts: string[] = [];

  for (let tick = Math.ceil(from); tick <= to; tick += Math.max(1, Math.round((to - from) / 12))) {
    const x = box.x + labelsWidth + scale(tick);
    parts.push(line(x, box.y, x, box.y + items.length * rowHeight, palette.line, 1, '2 6'));
    parts.push(text(x, box.y + items.length * rowHeight + 18, String(tick), { size: 10, fill: palette.faint, anchor: 'middle' }));
  }

  items.forEach((item, index) => {
    const y = box.y + index * rowHeight + 6;
    const colour = roleColor(palette, item.role);
    const x = box.x + labelsWidth + scale(item.start);
    const w = Math.max(6, scale(item.end) - scale(item.start));
    parts.push(
      text(box.x + labelsWidth - 12, y + rowHeight / 2, fit(item.label, 12), { size: 12, fill: palette.dim, anchor: 'end' }),
      rect(x, y, w, rowHeight - 14, { fill: colour, opacity: 0.32, stroke: colour, strokeWidth: 1.4, rx: 7 }),
    );
    const annotation = item.weight !== undefined ? `w${item.weight}` : item.ratio !== undefined ? item.ratio.toFixed(2) : '';
    if (annotation) {
      parts.push(text(x + w / 2, y + rowHeight / 2, annotation, { size: 11, fill: palette.ink, anchor: 'middle' }));
    }
  });

  parts.push(...badgeRow(snapshot.badges, palette, box, box.y + 2));
  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/*  Badges                                                                     */
/* -------------------------------------------------------------------------- */

function badgeRow(
  badges: Readonly<Record<string, string | number>> | undefined,
  palette: ExportPalette,
  box: Box,
  y: number,
): string[] {
  if (!badges) return [];
  const entries = Object.entries(badges).slice(0, 6);
  const labels = entries.map(([key, value]) => `${key} ${value}`);
  const widths = labels.map((label) => label.length * 7 + 18);
  const total = widths.reduce((sum, width) => sum + width + 8, 0);

  // Right-aligned, and never allowed to run into the title block on the left.
  let x = Math.max(box.x, box.x + box.width - total);
  const out: string[] = [];

  labels.forEach((label, index) => {
    const width = widths[index] as number;
    out.push(rect(x, y, width, 20, { fill: palette.panel, stroke: palette.line, rx: 7, strokeWidth: 1 }));
    out.push(text(x + width / 2, y + 14, label, { size: 11, fill: palette.dim, anchor: 'middle' }));
    x += width + 8;
  });

  return out;
}
