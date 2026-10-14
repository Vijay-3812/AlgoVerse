import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly tone: ToastTone;
  readonly durationMs: number;
  readonly action?: { readonly label: string; readonly href: string };
}

export interface ToastStore {
  readonly toasts: readonly Toast[];
  push: (toast: Omit<Toast, 'id' | 'tone' | 'durationMs'> & Partial<Pick<Toast, 'tone' | 'durationMs'>>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let counter = 0;

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],

  push: (toast) => {
    counter += 1;
    const id = `toast-${counter}`;
    const next: Toast = {
      id,
      title: toast.title,
      tone: toast.tone ?? 'info',
      durationMs: toast.durationMs ?? 4200,
      ...(toast.description === undefined ? {} : { description: toast.description }),
      ...(toast.action === undefined ? {} : { action: toast.action }),
    };
    set({ toasts: [...get().toasts, next].slice(-4) });
    if (next.durationMs > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => get().dismiss(id), next.durationMs);
    }
    return id;
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  clear: () => set({ toasts: [] }),
}));

/** Imperative helper for non-React call sites (trace errors, exports, …). */
export const toast = {
  /** Dismisses a toast raised earlier — used by long-running progress toasts. */
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  info: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'info' }),
  success: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'success' }),
  warning: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'warning' }),
  error: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'error' }),
};
