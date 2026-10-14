import type { DataSetKind, Language } from '@/types';

/** Compact count formatting for tables of 10 000 cells and timelines of 4 000 steps. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '–';
  if (Math.abs(value) < 1000) return String(value);
  if (Math.abs(value) < 1_000_000) {
    const k = value / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function formatMs(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export const LANGUAGE_LABEL: Record<Language, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  cpp: 'C++',
  java: 'Java',
};

export const DATA_SET_LABEL: Record<DataSetKind, string> = {
  random: 'Random',
  sorted: 'Sorted',
  reversed: 'Reversed',
  'nearly-sorted': 'Nearly sorted',
  custom: 'Custom',
  imported: 'Imported',
};

/** `[5, 3, 1]` → `"5, 3, 1"`. */
export function stringifyArray(values: readonly number[]): string {
  return values.join(', ');
}

/**
 * Parses a comma/space/newline separated list of integers.
 * Returns `null` when the text is not (yet) valid, so inputs can stay lenient.
 */
export function parseArrayInput(text: string, maxItems = 512): number[] | null {
  const tokens = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  const values: number[] = [];
  for (const token of tokens.slice(0, maxItems)) {
    const n = Number(token);
    if (!Number.isFinite(n)) return null;
    values.push(Math.trunc(n));
  }
  return values;
}
