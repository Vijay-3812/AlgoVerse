import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuroraBackground } from '@/components/fx/AuroraBackground';
import { ConfettiCanvas } from '@/components/fx/ConfettiCanvas';
import { Toaster } from '@/components/primitives/Toaster';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { GuidedTour, shouldAutoStartTour } from './GuidedTour';
import { usePlaybackClock } from '@/hooks/usePlaybackClock';
import { usePlaybackStore } from '@/store/playbackStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useFxStore } from '@/store/fxStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Application chrome: ambient background, top bar, overlays and the routed
 * page. Mounts the two global side-effects exactly once — the rAF playback
 * clock and the transport keyboard shortcuts — so pages stay pure renderers.
 */
export function AppShell() {
  const location = useLocation();
  const reduced = usePrefersReducedMotion();
  const setReducedMotion = useFxStore((s) => s.setReducedMotion);

  const setTourOpen = useUiStore((s) => s.setTourOpen);
  const noteTraceLoaded = useUiStore((s) => s.noteTraceLoaded);
  const trace = usePlaybackStore((s) => s.trace);

  usePlaybackClock();
  useKeyboardShortcuts();
  useEffect(() => setReducedMotion(reduced), [reduced, setReducedMotion]);
  useEffect(() => noteTraceLoaded(), [noteTraceLoaded, trace]);

  useEffect(() => {
    const onStart = (): void => setTourOpen(true);
    window.addEventListener('algoverse:start-tour', onStart);
    return () => window.removeEventListener('algoverse:start-tour', onStart);
  }, [setTourOpen]);

  /**
   * The tour waits for a trace to exist: pointing a spotlight at an empty
   * skeleton teaches nothing. It fires once, on the first real workspace.
   */
  useEffect(() => {
    if (!trace || !shouldAutoStartTour()) return;
    if (!/^\/algorithms\/[^/]+\/[^/?#]+/.test(location.pathname)) return;
    const id = window.setTimeout(() => setTourOpen(true), 900);
    return () => window.clearTimeout(id);
  }, [location.pathname, setTourOpen, trace]);

  // Route changes start at the top: no half-scrolled visualiser on entry.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-elevated focus:px-3 focus:py-2 focus:text-xs"
      >
        Skip to workspace
      </a>

      <AuroraBackground />
      <TopBar />

      <main id="workspace" className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      <CommandPalette />
      <GuidedTour />
      <Toaster />
      <ConfettiCanvas />
    </div>
  );
}
