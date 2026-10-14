import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { SESSION_DEFAULTS, decodeSharedSession, shareUrl, type SharedSession } from '@/utils/urlState';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore, type ArrayView } from '@/store/uiStore';
import { useThemeStore } from '@/store/themeStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { toast } from '@/store/toastStore';
import { PRESET_BY_ID } from '@/utils/graphPresets';

/**
 * Two-way binding between the address bar and the session.
 *
 * In: the query string is read **once** per algorithm (hydration). Reading it
 * continuously would fight the user — every preset click would be reverted by
 * the stale URL it produced.
 *
 * Out: session changes rewrite the URL with `replaceState`, never `pushState`,
 * so the back button still means "leave the page" rather than "undo my last
 * slider drag".
 *
 * `step` is deliberately *not* part of the live binding: rewriting the URL 60
 * times a second during playback is pointless work and would flood the session
 * history of anyone who does copy it. The share button adds the current step to
 * the URL it hands over instead.
 */
export interface SessionUrlControls {
  /** Absolute URL for the current session, optionally pinned to the playhead. */
  readonly linkFor: (step?: number) => string;
  /** Copies that URL and toasts the result. */
  readonly copyLink: (step?: number) => Promise<void>;
}

export function useSessionUrl(algorithmId: string): SessionUrlControls {
  const hydrated = useRef<string | null>(null);
  const pendingStep = useRef<number | null>(null);
  // The router owns the query string in-app, and it is the only source that
  // also works under a memory router in tests.
  const search = useLocation().search;

  const datasetKind = useSessionStore((s) => s.datasetKind);
  const size = useSessionStore((s) => s.size);
  const seed = useSessionStore((s) => s.seed);
  const customValues = useSessionStore((s) => s.customValues);
  const target = useSessionStore((s) => s.target);
  const graphPreset = useSessionStore((s) => s.graphPreset);
  const theme = useThemeStore((s) => s.theme);
  const tab = useUiStore((s) => s.rightPanelTab);
  const lang = useUiStore((s) => s.codeLanguage);
  const view = useUiStore((s) => s.arrayView);
  const speed = usePlaybackStore((s) => s.playback.speed);
  const traceLength = usePlaybackStore((s) => s.playback.length);

  /* ── hydrate ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (hydrated.current === algorithmId) return;
    hydrated.current = algorithmId;

    const shared = decodeSharedSession(search);
    if (Object.keys(shared).length === 0) return;

    const session = useSessionStore.getState();
    if (shared.datasetKind) session.setDatasetKind(shared.datasetKind);
    if (shared.size !== undefined) session.setSize(shared.size);
    // Seed first, then values: `setCustomValues` is what decides whether the
    // seed matters at all for the next dataset build.
    if (shared.seed !== undefined) useSessionStore.setState({ seed: shared.seed });
    if (shared.values) session.setCustomValues([...shared.values]);
    if (shared.target !== undefined && shared.target !== null) session.setTarget(shared.target);
    if (shared.graphPreset && PRESET_BY_ID.has(shared.graphPreset)) {
      // Overwrites the generated graph with the shared preset's graph.
      session.setGraphPreset(shared.graphPreset);
    }
    if (shared.theme) useThemeStore.getState().setTheme(shared.theme, { silent: true });
    if (shared.tab) useUiStore.getState().setRightPanelTab(shared.tab);
    if (shared.lang) useUiStore.getState().setCodeLanguage(shared.lang);
    if (shared.view) useUiStore.getState().setArrayView(shared.view as ArrayView);
    if (shared.speed !== undefined) usePlaybackStore.getState().setSpeed(shared.speed);
    pendingStep.current = shared.step ?? null;
    toast.info('Opened a shared session', 'Algorithm, input and settings restored from the link.');
  }, [algorithmId, search]);

  /* ── apply a shared playhead once the trace exists ───────────────────── */
  useEffect(() => {
    if (pendingStep.current === null || traceLength === 0) return;
    const requested = pendingStep.current;
    pendingStep.current = null;
    usePlaybackStore.getState().seek(Math.min(requested, traceLength - 1));
  }, [traceLength]);

  /* ── serialise back out ──────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined' || hydrated.current !== algorithmId) return;
    const next = shareUrl(
      window.location.href,
      {
        datasetKind,
        size,
        seed,
        ...(customValues ? { values: customValues } : {}),
        target,
        graphPreset,
        speed,
        theme,
        tab,
        lang,
        view,
      },
      SESSION_DEFAULTS,
    );
    if (next !== window.location.href) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [algorithmId, customValues, datasetKind, graphPreset, lang, seed, size, speed, tab, target, theme, view]);

  const linkFor = useCallback(
    (step?: number): string => {
      if (typeof window === 'undefined') return '';
      const session: SharedSession = {
        datasetKind,
        size,
        seed,
        ...(customValues ? { values: customValues } : {}),
        target,
        graphPreset,
        speed,
        theme,
        tab,
        lang,
        view,
        ...(step === undefined ? {} : { step }),
      };
      return shareUrl(window.location.href, session);
    },
    [customValues, datasetKind, graphPreset, lang, seed, size, speed, tab, target, theme, view],
  );

  const copyLink = useCallback(
    async (step?: number): Promise<void> => {
      const url = linkFor(step);
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied', step === undefined ? 'Shares the input and settings.' : `Opens at step ${step + 1}.`);
      } catch {
        toast.warning('Could not copy automatically', url);
      }
    },
    [linkFor],
  );

  return { linkFor, copyLink };
}
