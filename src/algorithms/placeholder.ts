import type { AlgorithmModule, AlgorithmMeta, TraceStep, VisualizerProps } from '@/types';
import { TraceBuilder } from '@/utils/traceBuilder';
import { PlaceholderVisualizer } from '@/visualizers/PlaceholderVisualizer';

/**
 * Roadmap placeholder module.
 *
 * Every algorithm in the catalogue is runnable from day one — it just replays a
 * short "here's what's coming" trace until its real generator lands in a later
 * phase. That keeps navigation, playback, the timeline, metrics, pseudocode
 * sync and the shareable URL honest end-to-end instead of shipping dead links,
 * and it gives Phase 1 a real trace to exercise the engine with.
 *
 * Deleting this file is the last step of Phase 9.
 */
export interface PlaceholderState {
  readonly headline: string;
  readonly phase: number;
  readonly bullets: readonly string[];
  /** Index of the bullet being described by the current step. */
  readonly active: number;
}

export interface PlaceholderData {
  readonly phase: number;
}

const PSEUDOCODE = [
  'function explore(algorithm):',
  '  roadmap ← catalogue.load(algorithm)',
  '  if roadmap.status == READY:',
  '    return replay(roadmap.trace)',
  '  phase ← roadmap.shipsIn',
  '  announce("Arriving in Phase " + phase)',
  '  return placeholder',
] as const;

const CODE = {
  javascript: [
    '// AlgoVerse — trace-first algorithm modules',
    'export const definition = defineAlgorithm({',
    '  meta: { id: "bubble-sort", category: "sorting" },',
    '  complexity: { time: {...}, space: "O(1)" },',
    '  pseudocode, code, explanation,',
    '  generate(input, run) {',
    '    const t = new TraceBuilder<SortState>(snapshot(input));',
    '    t.emit({ kind: "init", description: "..." });',
    '    return t.build({ headline: "Sorted" });',
    '  },',
    '});',
  ],
  python: [
    '# AlgoVerse — algorithms are pure trace generators',
    'def generate(input, run):',
    '    t = TraceBuilder(snapshot(input))',
    '    t.emit(kind="init", description="...")',
    '    return t.build(headline="Sorted")',
  ],
  cpp: [
    '// AlgoVerse — algorithms record, they do not render',
    'Trace generate(const Input& in, const RunInfo& run) {',
    '  TraceBuilder t(snapshot(in));',
    '  t.emit({.kind = StepKind::Init, .description = "..."});',
    '  return t.build({.headline = "Sorted"});',
    '}',
  ],
  java: [
    '// AlgoVerse — algorithms record, they do not render',
    'Trace generate(Input in, RunInfo run) {',
    '  TraceBuilder t = new TraceBuilder(snapshot(in));',
    '  t.emit(Step.init("..."));',
    '  return t.build(Result.of("Sorted"));',
    '}',
  ],
} as const;

function phaseBullets(meta: AlgorithmMeta): string[] {
  switch (meta.category) {
    case 'sorting':
      return ['FLIP swaps with spring physics', 'Pivot, compare and sorted colour states', 'A celebratory sorted wave'];
    case 'searching':
      return ['Space-collapse animation per probe', 'Live low/high/mid brackets', 'Found / not-found bursts'];
    case 'linear':
      return ['Elastic push and pop', 'Curved pointer arrows', 'Index labels that glide'];
    case 'hashing':
      return ['Probe chains drawn as arcs', 'Load-factor meter', 'A rehash shockwave on resize'];
    case 'trees':
      return ['Spring-in nodes, stroke-dashoffset edges', 'Rotations animated along arcs', 'Traversal ripples'];
    case 'graphs':
      return ['Energy particles flowing along relaxed edges', 'Draggable nodes', 'Shortest path traced in neon'];
    case 'recursion':
      return ['A live call stack that pushes and pops', 'A recursion tree drawn in sync', 'Conflict shake and undo rewind'];
    case 'dp':
      return ['Ripple cell fills', 'Dependency arrows from source cells', 'Backtracked optimal path'];
    case 'greedy':
      return ['Sorted-by-ratio sweeps', 'Huffman merges and tree growth', 'Capacity bars that fill'];
    case 'strings':
      return ['Rolling window highlights', 'Failure-link arcs', 'Skip visualisation'];
    default:
      return ['Union-Find rank forests', 'Sliding window traces', 'Monotonic stack shadows'];
  }
}

/** Pure generator — deterministic, no I/O, ~6 steps of roadmap narration. */
export function createPlaceholderModule(meta: AlgorithmMeta): AlgorithmModule<PlaceholderState, PlaceholderData> {
  const bullets = phaseBullets(meta);

  return {
    definition: {
      meta: { ...meta, status: 'soon' },
      complexity: {
        time: { best: '—', average: '—', worst: '—' },
        space: '—',
        notes: [`Trace generator and visualiser land in Phase ${meta.phase}.`],
      },
      pseudocode: PSEUDOCODE,
      code: CODE,
      explanation: [
        `${meta.name} is part of the AlgoVerse catalogue and becomes fully playable in Phase ${meta.phase}.`,
        meta.blurb,
        'Everything you can see here — transport controls, timeline scrubbing, metrics and synced code — is the real engine. Only the trace is a placeholder.',
      ],
      defaultInput: () => ({ kind: 'array', values: [7, 3, 9, 1, 5, 8, 2, 6, 4], target: 5 }),
      generate: (input, run) => {
        const t = new TraceBuilder<PlaceholderState, PlaceholderData>({
          headline: meta.name,
          phase: meta.phase,
          bullets,
          active: -1,
        });

        t.emit({
          kind: 'init',
          description: `${meta.name} — ${meta.difficulty} · Phase ${meta.phase}`,
          pseudocodeLine: 0,
          codeLine: 1,
          data: { phase: meta.phase },
        });

        t.bump('reads');
        t.emit({
          kind: 'read',
          description: `Registry lookup for “${meta.id}” (run ${run.runId.slice(0, 12)}…)`,
          pseudocodeLine: 1,
          codeLine: 2,
          weight: 0.8,
        });

        t.bump('comparisons');
        t.emit({
          kind: 'compare',
          description: 'Catalogue says: not shipped yet, so we replay the roadmap instead.',
          pseudocodeLine: 2,
          codeLine: 3,
          weight: 1.1,
        });

        bullets.forEach((bullet, i) => {
          t.update((s) => ({ ...s, active: i }));
          t.bump('writes');
          t.emit({
            kind: 'info',
            description: bullet,
            highlight: { primary: [i] },
            pseudocodeLine: 4,
            codeLine: 4,
            weight: 1.2,
            data: { phase: meta.phase },
          });
        });

        t.update((s) => ({ ...s, active: bullets.length }));
        t.bump('writes', 2);
        t.emit({
          kind: 'complete',
          description: `Phase ${meta.phase} unlocks the full ${meta.name} replay.`,
          pseudocodeLine: 6,
          codeLine: 6,
          weight: 2.4,
        });

        return t.build({
          id: `${meta.id}:${run.runId}`,
          algorithmId: meta.id,
          name: meta.name,
          category: meta.category,
          input,
          complexity: {
            time: { best: '—', average: '—', worst: '—' },
            space: '—',
            notes: [`Arriving in Phase ${meta.phase}.`],
          },
          pseudocode: PSEUDOCODE,
          code: CODE,
          result: {
            headline: `${meta.name} arrives in Phase ${meta.phase}`,
            detail: `Input accepted (${JSON.stringify(input).slice(0, 60)}…)`,
            output: { placeholder: true, phase: meta.phase },
          },
        });
      },
    },
    Visualizer: PlaceholderVisualizer,
  };
}

export type { TraceStep, VisualizerProps };
