import type { TableAxisSnapshot, TableSnapshot, VisualRole } from '@/types';
import { ALGORITHM_BY_ID } from '@/engine/catalogue';

/**
 * ---------------------------------------------------------------------------
 *  TABLE MODEL — the working set behind every dynamic-programming trace
 * ---------------------------------------------------------------------------
 *  DP is arithmetic on a grid, so the interesting frames are: which cell is
 *  being filled, which cells it read (the dependency arrows), and — on the way
 *  out — which cells the answer was assembled from (the backtrack path).
 *
 *  All seven DP pages share this one model. A generator fills cells, records
 *  dependencies and finally walks the path back; the renderer never needs to
 *  know whether the table is a Fibonacci row, a knapsack grid or an upper
 *  triangle of matrix-chain costs.
 */

export interface TableModelOptions {
  readonly rowLabels: readonly string[];
  readonly colLabels: readonly string[];
  /** Value written into every cell before the algorithm starts (`null` = blank). */
  readonly fill?: number | string | null;
  readonly rowSub?: string;
  readonly colSub?: string;
}

export class TableModel {
  readonly rows: TableAxisSnapshot[];
  readonly cols: TableAxisSnapshot[];
  readonly cells: (number | string | null)[][];
  readonly roles: (VisualRole | null)[][];
  deps: [number, number][] = [];
  path: [number, number][] = [];
  active: [number, number] | null = null;
  caption: string | undefined;

  constructor(options: TableModelOptions) {
    this.rows = options.rowLabels.map((label) => ({
      label,
      ...(options.rowSub === undefined ? {} : { sub: options.rowSub }),
    }));
    this.cols = options.colLabels.map((label) => ({
      label,
      ...(options.colSub === undefined ? {} : { sub: options.colSub }),
    }));
    const fill = options.fill ?? null;
    this.cells = options.rowLabels.map(() => options.colLabels.map(() => fill));
    this.roles = options.rowLabels.map(() => options.colLabels.map(() => null));
  }

  /** Writes a value and gives the cell the role it plays in this beat. */
  set(row: number, col: number, value: number | string | null, role: VisualRole | null = 'active'): void {
    if (!this.cells[row]) return;
    this.cells[row]![col] = value;
    this.roles[row]![col] = role;
  }

  /** Re-role a cell without touching its value (visited, sorted, …). */
  mark(row: number, col: number, role: VisualRole | null): void {
    if (!this.roles[row]) return;
    this.roles[row]![col] = role;
  }

  value(row: number, col: number): number | string | null {
    return this.cells[row]?.[col] ?? null;
  }

  number(row: number, col: number): number {
    const value = this.value(row, col);
    return typeof value === 'number' ? value : Number(value ?? 0);
  }

  /** Declares "the active cell reads this one" — drawn as an arrow. */
  dep(row: number, col: number): void {
    if (this.deps.some(([r, c]) => r === row && c === col)) return;
    this.deps.push([row, col]);
  }

  clearDeps(): void {
    this.deps = [];
  }

  /** The backtrack: the cells the optimum was assembled from. */
  setPath(cells: readonly (readonly [number, number])[]): void {
    this.path = cells.map(([r, c]) => [r, c] as [number, number]);
    for (const [r, c] of this.path) this.mark(r, c, 'path');
  }

  /** Wipes every role back to a neutral state — used between phases. */
  clearRoles(except: readonly VisualRole[] = []): void {
    for (let r = 0; r < this.roles.length; r += 1) {
      for (let c = 0; c < (this.roles[r]?.length ?? 0); c += 1) {
        const role = this.roles[r]?.[c] ?? null;
        if (role && except.includes(role)) continue;
        this.roles[r]![c] = null;
      }
    }
  }

  snapshot(extra: Partial<TableSnapshot> = {}): TableSnapshot {
    return {
      rows: this.rows,
      cols: this.cols,
      cells: this.cells.map((row) => [...row]),
      roles: this.roles.map((row) => [...row]),
      deps: this.deps.map(([r, c]) => [r, c] as [number, number]),
      path: this.path.map(([r, c]) => [r, c] as [number, number]),
      active: this.active,
      ...(this.caption === undefined ? {} : { caption: this.caption }),
      ...extra,
    };
  }
}

/** Shared row/column label helper: `["", "a", "b", …]` with an axis stub. */
export function labelled(stub: string, values: readonly string[]): string[] {
  return [stub, ...values];
}

/** Guards a catalogue id used by a shared helper spec. */
export function displayName(id: string): string {
  return ALGORITHM_BY_ID.get(id)?.name ?? id;
}
