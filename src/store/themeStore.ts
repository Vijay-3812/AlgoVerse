import { create } from 'zustand';
import type { Theme } from '@/types';

const STORAGE_KEY = 'algoverse.theme';
const ORDER: readonly Theme[] = ['dark', 'light', 'cyberpunk'];

export interface ThemeStore {
  readonly theme: Theme;
  readonly accentReactive: boolean;
  setTheme: (theme: Theme, options?: { silent?: boolean }) => void;
  cycleTheme: () => void;
  setAccentReactive: (value: boolean) => void;
}

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light' || raw === 'cyberpunk') return raw;
  } catch {
    /* private mode / SSR */
  }
  return 'dark';
}

/** Applies the theme to <html> so CSS variables + Tailwind's dark: flip at once. */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme !== 'light');
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

/**
 * Theme lives outside React's render path on purpose: switching is one
 * attribute write on <html>, so no component re-renders — the cross-fade is
 * pure CSS (`transition: background-color .4s` on the tokens).
 */
export const useThemeStore = create<ThemeStore>()((set, get) => ({
  theme: typeof document === 'undefined' ? 'dark' : readStoredTheme(),
  accentReactive: true,

  setTheme: (theme, options) => {
    if (get().theme === theme) return;
    if (typeof document !== 'undefined') applyTheme(theme);
    set({ theme });
    if (!options?.silent) {
      // Let the aurora background know it should re-tint.
      window.dispatchEvent(new CustomEvent<Theme>('algoverse:theme', { detail: theme }));
    }
  },

  cycleTheme: () => {
    const current = get().theme;
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] as Theme;
    get().setTheme(next);
  },

  setAccentReactive: (value) => set({ accentReactive: value }),
}));

/** Applies the persisted theme once on boot (mirrors the inline <head> script). */
export function initTheme(): void {
  if (typeof document === 'undefined') return;
  applyTheme(readStoredTheme());
}
