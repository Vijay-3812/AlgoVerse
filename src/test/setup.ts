import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * jsdom shims (DOM suites only).
 *
 * jsdom implements neither matchMedia nor the observer APIs that Framer Motion
 * and the layout hooks rely on, so we provide inert versions. They are
 * deliberately minimal: tests assert on behaviour (state, text, ARIA), never on
 * pixel-level motion.
 *
 * The setup file is shared with the pure-logic suites, which run in the `node`
 * environment and have no `window` at all — hence the guard.
 */

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }),
    });
  }

  // jsdom logs "Not implemented" for these; both are no-ops under test.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}

class InertObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', { writable: true, value: InertObserver });
}
if (!('IntersectionObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'IntersectionObserver', { writable: true, value: InertObserver });
}

if (typeof globalThis.HTMLCanvasElement !== 'undefined') {
  // Canvas is not implemented in jsdom; components must degrade gracefully.
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
}

if (typeof globalThis.Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}
