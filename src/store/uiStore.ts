import { create } from 'zustand';
import type { Language, RightPanelTab } from '@/types';

const SIDEBAR_KEY = 'algoverse.sidebar';
const TAB_KEY = 'algoverse.panel';

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Array renderer modes — the "view" switch in the transport bar. */
export type ArrayView = 'bars' | 'dots' | 'circular' | 'spectrum';

export interface UiStore {
  /** Persisted across sessions. */
  readonly sidebarCollapsed: boolean;
  readonly rightPanelTab: RightPanelTab;
  readonly codeLanguage: Language;
  /** Transient. */
  readonly commandPaletteOpen: boolean;
  readonly mobilePanel: 'none' | 'sidebar' | 'inspector' | 'timeline';
  readonly soundEnabled: boolean;
  readonly showTimelineMarkers: boolean;
  readonly arrayView: ArrayView;
  readonly compareMode: boolean;
  /** First-run walkthrough overlay. */
  readonly tourOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  setCodeLanguage: (language: Language) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setMobilePanel: (panel: UiStore['mobilePanel']) => void;
  toggleSound: () => void;
  setShowTimelineMarkers: (value: boolean) => void;
  setArrayView: (view: ArrayView) => void;
  setCompareMode: (value: boolean) => void;
  setTourOpen: (value: boolean) => void;
  /** Timestamp of the last trace load, used by the "engine live" indicator. */
  readonly lastLoadedAt: number;
  noteTraceLoaded: () => void;
}

const TAB_VALUES: readonly RightPanelTab[] = ['pseudocode', 'code', 'explain', 'complexity', 'learn'];
const LANG_VALUES: readonly Language[] = ['javascript', 'python', 'cpp', 'java'];

export const useUiStore = create<UiStore>()((set, get) => {
  const storedTab = readLocal(TAB_KEY);
  const storedLang = readLocal('algoverse.lang');
  return {
    tourOpen: false,
    lastLoadedAt: Date.now(),
    sidebarCollapsed: readLocal(SIDEBAR_KEY) === '1',
    rightPanelTab: TAB_VALUES.includes(storedTab as RightPanelTab)
      ? (storedTab as RightPanelTab)
      : 'pseudocode',
    codeLanguage: LANG_VALUES.includes(storedLang as Language) ? (storedLang as Language) : 'javascript',
    commandPaletteOpen: false,
    mobilePanel: 'none',
    soundEnabled: readLocal('algoverse.sound') === '1',
    showTimelineMarkers: true,
    arrayView: (readLocal('algoverse.arrayView') as ArrayView | null) ?? 'bars',
    compareMode: false,

    toggleSidebar: () => {
      const next = !get().sidebarCollapsed;
      writeLocal(SIDEBAR_KEY, next ? '1' : '0');
      set({ sidebarCollapsed: next });
    },
    setSidebarCollapsed: (value) => {
      writeLocal(SIDEBAR_KEY, value ? '1' : '0');
      set({ sidebarCollapsed: value });
    },
    setRightPanelTab: (tab) => {
      writeLocal(TAB_KEY, tab);
      set({ rightPanelTab: tab });
    },
    setCodeLanguage: (language) => {
      writeLocal('algoverse.lang', language);
      set({ codeLanguage: language });
    },
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    setMobilePanel: (panel) => set({ mobilePanel: panel }),
    toggleSound: () => {
      const next = !get().soundEnabled;
      writeLocal('algoverse.sound', next ? '1' : '0');
      set({ soundEnabled: next });
    },
    setShowTimelineMarkers: (value) => set({ showTimelineMarkers: value }),
    setArrayView: (view) => {
      writeLocal('algoverse.arrayView', view);
      set({ arrayView: view });
    },
    setCompareMode: (value) => set({ compareMode: value }),
    setTourOpen: (value) => set({ tourOpen: value }),
    noteTraceLoaded: () => set({ lastLoadedAt: Date.now() }),
  };
});
