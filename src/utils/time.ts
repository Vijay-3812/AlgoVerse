/**
 * High-resolution clock that also works in Node (Vitest) and any environment
 * where `performance` is unavailable.
 */
export function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/** Stable, human-readable id for a trace run (used by shareable URLs later). */
export function makeRunId(parts: readonly (string | number)[]): string {
  return parts.join('-').replace(/[^a-zA-Z0-9\-_.]/g, '').slice(0, 96);
}
