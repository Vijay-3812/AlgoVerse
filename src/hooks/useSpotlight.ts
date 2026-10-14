import { useCallback, useEffect, useRef } from 'react';

/**
 * Cursor-following spotlight for cards and buttons.
 *
 * Writes `--spot-x/--spot-y` CSS variables straight onto the node inside a
 * rAF-coalesced handler: no React state, no re-render, no layout thrash. The
 * glow itself is painted by a pseudo-element in CSS.
 */
export function useSpotlight<T extends HTMLElement = HTMLDivElement>(intensity = 420): {
  ref: React.RefObject<T>;
  onPointerMove: (event: React.PointerEvent<T>) => void;
  onPointerLeave: () => void;
} {
  const ref = useRef<T>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);

  const flush = useCallback((): void => {
    const node = ref.current;
    const point = pending.current;
    frame.current = null;
    if (!node || !point) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--spot-x', `${point.x - rect.left}px`);
    node.style.setProperty('--spot-y', `${point.y - rect.top}px`);
    node.style.setProperty('--spot-r', `${intensity}px`);
  }, [intensity]);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<T>): void => {
      pending.current = { x: event.clientX, y: event.clientY };
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  const onPointerLeave = useCallback((): void => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    pending.current = null;
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return { ref, onPointerMove, onPointerLeave };
}
