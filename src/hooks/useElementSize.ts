import { useEffect, useRef, useState } from 'react';

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * ResizeObserver-backed element size, with an rAF throttle so a resizing
 * window never floods React with renders. Canvas visualisers need this to size
 * their backing store to `devicePixelRatio`.
 */
export function useElementSize<T extends HTMLElement = HTMLDivElement>(): {
  ref: React.RefObject<T>;
  size: Size;
} {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setSize((prev) =>
          Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
            ? prev
            : { width, height },
        );
      });
    });

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return { ref, size };
}
