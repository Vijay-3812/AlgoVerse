import { create } from 'zustand';
import type { AlgorithmInput, DataSetKind } from '@/types';
import { buildArrayDataset } from '@/utils/dataset';
import { PRESET_BY_ID, randomGraph, type GraphPresetId } from '@/utils/graphPresets';
import { parseArrayInput } from '@/utils/format';

const CUSTOM_KEY = 'algoverse.inputs';

export interface SavedInput {
  readonly id: string;
  readonly name: string;
  readonly values: readonly number[];
  readonly savedAt: number;
}

export interface SessionStore {
  /** Generation preset for the input bar. */
  readonly datasetKind: DataSetKind;
  readonly size: number;
  readonly seed: number;
  /** User-authored values; wins over the generated dataset when present. */
  readonly customValues: readonly number[] | null;
  /** Search target for the searching category. */
  readonly target: number | null;
  /**
   * Which graph the user picked for the graphs category.
   *
   * `null` means "let the algorithm choose" — each graph generator ships the
   * input that best demonstrates *it* (a lattice for Dijkstra, a DAG for the
   * topological sorts, a negative edge for Bellman-Ford), which is a far better
   * default than one shared graph would be.
   */
  readonly graphInput: AlgorithmInput | null;
  /** Which preset produced `graphInput` (`'auto'` ⇒ the algorithm's own). */
  readonly graphPreset: GraphPresetId;
  readonly saved: readonly SavedInput[];

  setDatasetKind: (kind: DataSetKind) => void;
  setSize: (size: number) => void;
  /** Re-rolls with a fresh seed — the "Randomise" button. */
  randomise: () => void;
  setCustomValues: (values: readonly number[] | null) => void;
  applyCustomText: (text: string) => boolean;
  setTarget: (target: number | null) => void;
  setGraphInput: (input: AlgorithmInput | null) => void;
  /** Applies a named preset; `'auto'` hands control back to the algorithm. */
  setGraphPreset: (id: GraphPresetId, options?: { seed?: number }) => void;
  saveCurrent: (name: string) => void;
  removeSaved: (id: string) => void;
  loadSaved: (id: string) => void;
}

export const MIN_SIZE = 4;
export const MAX_SIZE = 256;

function readSaved(): SavedInput[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SavedInput =>
        typeof entry === 'object' &&
        entry !== null &&
        Array.isArray((entry as SavedInput).values) &&
        typeof (entry as SavedInput).name === 'string',
    );
  } catch {
    return [];
  }
}

function writeSaved(list: readonly SavedInput[]): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list.slice(-12)));
  } catch {
    /* ignore quota / private mode */
  }
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  datasetKind: 'random',
  size: 18,
  seed: 1337,
  customValues: null,
  target: null,
  saved: typeof window === 'undefined' ? [] : readSaved(),

  setDatasetKind: (kind) => set({ datasetKind: kind, customValues: null }),
  setSize: (size) => set({ size: Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.trunc(size))) }),
  randomise: () => {
    const { graphPreset, graphInput } = get();
    const seed = Math.floor(Math.random() * 1e9);
    // When a graph is on screen, "randomise" should hand back a *different
    // graph* — a fresh array seed would be invisible on the graph stages.
    if (graphInput || graphPreset !== 'auto') {
      set({ seed, customValues: null, graphInput: randomGraph(seed), graphPreset: 'lattice' });
      return;
    }
    set({ seed, customValues: null });
  },

  setCustomValues: (values) => set({ customValues: values && values.length ? values : null }),

  applyCustomText: (text) => {
    const values = parseArrayInput(text);
    if (!values || values.length < 2) return false;
    set({ customValues: values, size: values.length, datasetKind: 'custom' });
    return true;
  },

  setTarget: (target) => set({ target }),

  graphInput: null,
  graphPreset: 'auto',

  setGraphInput: (graphInput) => set({ graphInput }),

  setGraphPreset: (id, options) => {
    const preset = PRESET_BY_ID.get(id);
    if (!preset) return;
    if (!preset.build) {
      set({ graphPreset: 'auto', graphInput: null });
      return;
    }
    set({ graphPreset: id, graphInput: preset.build() });
    if (options?.seed !== undefined) {
      /* The seed only matters for generated presets; kept for API symmetry. */
    }
  },

  saveCurrent: (name) => {
    const { customValues, datasetKind, size, seed } = get();
    const values =
      customValues ??
      buildArrayDataset({ kind: datasetKind === 'custom' ? 'random' : datasetKind, size, seed });
    const entry: SavedInput = {
      id: `input-${Date.now().toString(36)}`,
      name: name.trim().slice(0, 40) || 'Untitled input',
      values: [...values],
      savedAt: Date.now(),
    };
    const next = [...get().saved, entry];
    writeSaved(next);
    set({ saved: next });
  },

  removeSaved: (id) => {
    const next = get().saved.filter((entry) => entry.id !== id);
    writeSaved(next);
    set({ saved: next });
  },

  loadSaved: (id) => {
    const entry = get().saved.find((s) => s.id === id);
    if (!entry) return;
    set({ customValues: [...entry.values], size: entry.values.length, datasetKind: 'custom' });
  },
}));

/** The effective dataset for the current run, honouring custom values first. */
export function currentArrayValues(state: SessionStore): number[] {
  if (state.customValues && state.customValues.length >= 2) return [...state.customValues];
  return buildArrayDataset({
    kind: state.datasetKind === 'custom' || state.datasetKind === 'imported' ? 'random' : state.datasetKind,
    size: state.size,
    seed: state.seed,
  });
}
