import { useEffect, useRef } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';

/**
 * The app's single `requestAnimationFrame` loop.
 *
 * Ticking a store from rAF (rather than setTimeout per step) means the cursor
 * is driven by the same clock as the animation, so Framer Motion springs and
 * the transport never drift apart. It also parks itself whenever playback is
 * paused or the tab is hidden — zero CPU when idle.
 */
export function usePlaybackClock(): void {
  const status = usePlaybackStore((s) => s.playback.status);
  const frame = useRef<number | null>(null);
  const last = useRef<number>(0);

  useEffect(() => {
    if (status !== 'playing') {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      return;
    }

    const loop = (now: number): void => {
      const delta = last.current === 0 ? 16 : now - last.current;
      last.current = now;
      usePlaybackStore.getState().tick(delta);
      const stillPlaying = usePlaybackStore.getState().playback.status === 'playing';
      frame.current = stillPlaying ? requestAnimationFrame(loop) : null;
    };

    last.current = 0;
    frame.current = requestAnimationFrame(loop);

    const onVisibility = (): void => {
      // Avoid a giant delta after the tab was backgrounded.
      last.current = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [status]);
}
