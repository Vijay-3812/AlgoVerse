import { motion } from 'framer-motion';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AlgorithmInput } from '@/types';
import { ZERO_METRICS } from '@/types';
import { ALGORITHM_BY_ID, CATEGORY_BY_ID } from '@/engine/catalogue';
import { useTraceSession } from '@/hooks/useTraceSession';
import { useSessionUrl } from '@/hooks/useSessionUrl';
import { useArrayValues } from '@/hooks/useArrayInput';
import { useSessionStore } from '@/store/sessionStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { MobileSheet } from '@/components/layout/MobileSheet';
import { VisualizerFrame } from '@/visualizers/VisualizerFrame';
import { PlaybackBar } from '@/components/transport/PlaybackBar';
import { TimelineScrubber } from '@/components/transport/TimelineScrubber';
import { MetricsStrip } from '@/components/transport/MetricsStrip';
import { RightPanel } from '@/components/panels/RightPanel';
import { InputBar } from '@/components/input/InputBar';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { DifficultyBadge, ComplexityBadge } from '@/components/primitives/Badge';
import { Tooltip } from '@/components/primitives/Tooltip';
import { ExportMenu } from '@/components/transport/ExportMenu';
import { CompareButton } from '@/components/transport/CompareButton';
import { NotFoundPage } from './NotFoundPage';

/**
 * The workspace: sidebar tree │ visualiser stage │ inspector, with the
 * transport docked underneath.
 *
 * This page owns *layout and input*; it never touches algorithm logic. Note how
 * little it needs: an id from the route, an input from the session store, and
 * the trace session hook. Everything else is composed from Phase-1 primitives.
 */
export function VisualizerPage() {
  const { algorithmId } = useParams<{ algorithmId: string }>();
  const meta = algorithmId ? ALGORITHM_BY_ID.get(algorithmId) : undefined;

  const [sidebarSheet, setSidebarSheet] = useState(false);
  const [inspectorSheet, setInspectorSheet] = useState(false);

  const datasetKind = useSessionStore((s) => s.datasetKind);
  const seed = useSessionStore((s) => s.seed);
  const values = useArrayValues();
  const target = useSessionStore((s) => s.target);
  const graphInput = useSessionStore((s) => s.graphInput);
  const randomiseSession = useSessionStore((s) => s.randomise);

  const cursor = usePlaybackStore((s) => s.playback.cursor);
  // `ZERO_METRICS` is a frozen module constant: returning a fresh object from a
  // selector would make useSyncExternalStore loop.
  const metrics = usePlaybackStore((s) => s.trace?.steps[s.playback.cursor]?.metrics ?? ZERO_METRICS);
  const step = usePlaybackStore((s) => s.trace?.steps[s.playback.cursor] ?? null);
  const status = usePlaybackStore((s) => s.playback.status);

  /**
   * The input the algorithm consumes, built from the *declared* input kind.
   *
   * `null` means "let the generator use its own `defaultInput()`" — the right
   * answer for graphs, matrices, strings and single numbers, where a shared
   * dataset would flatten every algorithm's best example into one generic one.
   * As each input editor lands (graph builder, string fields, DP knobs) it takes
   * over from the default for the algorithms it understands.
   */
  const input = useMemo<AlgorithmInput | null>(() => {
    if (!meta) return null;
    switch (meta.inputKind) {
      case 'array': {
        const base: AlgorithmInput = { kind: 'array', values };
        // Searching problems need a target: default to a value that is present,
        // so the happy path is what you see first.
        if (meta.category === 'searching') {
          return { ...base, target: target ?? values[Math.floor(values.length / 2)] ?? 0 };
        }
        return base;
      }
      case 'tree':
        return { kind: 'tree', values };
      case 'graph':
        return graphInput ?? null;
      default:
        return null;
    }
  }, [graphInput, meta, target, values]);

  if (!meta) return <NotFoundPage title="No such algorithm" />;

  const category = CATEGORY_BY_ID[meta.category];
  const session = useTraceSession(meta.id, input, { dataSet: datasetKind, seed });
  const complexity = session.trace?.complexity ?? null;
  const { copyLink } = useSessionUrl(meta.id);

  // Shift+E: the shortcut lives in the global keyboard hook, which does not
  // know about the URL hook this page owns — so it raises an event instead.
  useEffect(() => {
    const onCopy = (): void => void copyLink(usePlaybackStore.getState().playback.cursor);
    window.addEventListener('algoverse:copy-link', onCopy);
    return () => window.removeEventListener('algoverse:copy-link', onCopy);
  }, [copyLink]);

  const sidebar = (
    <div data-tour="sidebar" className="h-full">
      <Sidebar onNavigate={() => setSidebarSheet(false)} className="h-full" />
    </div>
  );
  const definition = session.module?.definition ?? null;
  const inspector = (
    <div data-tour="inspector" className="h-full">
      <RightPanel
      trace={session.trace}
      cursor={cursor}
      onJumpToStep={(index) => usePlaybackStore.getState().seek(index)}
      complexity={complexity}
      metrics={metrics}
      meta={meta}
      explanation={definition?.explanation ?? []}
      learn={definition?.learn}
      onWatchAgain={() => {
          const playback = usePlaybackStore.getState();
        playback.seek(0);
        playback.play();
      }}
    />
    </div>
  );

  const transport = (
    <div data-tour="transport" className="glass-strong flex flex-col gap-2.5 rounded-2xl px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <TimelineScrubber trace={session.trace} />
        </div>
        <div className="flex items-center gap-2 xl:hidden">
          <Button size="sm" variant="ghost" icon="book" onClick={() => setInspectorSheet(true)}>
            Inspector
          </Button>
        </div>
      </div>
      <MetricsStrip
        step={step}
        metrics={metrics}
        complexity={complexity}
        status={status}
        className="border-t border-line/50 pt-2.5"
      />
    </div>
  );

  return (
    <>
      {/* mobile / tablet toolbar */}
      <div className="flex items-center gap-2 px-3 pt-3 lg:hidden">
        <Button size="sm" variant="secondary" icon="panelLeft" onClick={() => setSidebarSheet(true)}>
          Algorithms
        </Button>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-dim">
          {category.name} · {meta.name}
        </span>
        <Button size="sm" variant="ghost" icon="book" onClick={() => setInspectorSheet(true)}>
          Inspector
        </Button>
      </div>

      <WorkspaceLayout
        sidebar={sidebar}
        stage={
          <>
            <StageHeader
              title={meta.name}
              blurb={meta.blurb}
              categoryName={category.name}
              categoryId={category.id}
              difficulty={meta.difficulty}
              phase={meta.phase}
              playable={meta.status === 'ready'}
              complexity={complexity}
              inputKind={meta.inputKind}
              actions={
                <>
                  <CompareButton meta={meta} />
                  <ExportMenu title={meta.name} onCopyLink={(step) => void copyLink(step)} />
                </>
              }
            />
            <div data-tour="stage" className="relative min-h-0 flex-1">
              <VisualizerFrame
                algorithmId={meta.id}
                input={input}
                dataSet={datasetKind}
                seed={seed}
              />
            </div>
            <div className="border-t border-line/60 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <PlaybackBar showSpeed showLoop />
                <div className="ml-auto flex items-center gap-2">
                  <InputBar inputKind={meta.inputKind} className="relative" />
                  <Tooltip label="New random dataset" shortcut="⇧R" side="top">
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      onClick={randomiseSession}
                      aria-label="Randomise dataset"
                    >
                      <Icon name="shuffle" size={15} />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </>
        }
        inspector={inspector}
        transport={transport}
      />

      <MobileSheet
        open={sidebarSheet}
        onClose={() => setSidebarSheet(false)}
        title="Algorithms"
        side="left"
      >
        <Sidebar onNavigate={() => setSidebarSheet(false)} className="h-full rounded-none border-0" width={320} />
      </MobileSheet>

      <MobileSheet
        open={inspectorSheet}
        onClose={() => setInspectorSheet(false)}
        title="Inspector"
        height="78dvh"
      >
        {inspector}
      </MobileSheet>
    </>
  );
}

interface StageHeaderProps {
  readonly title: string;
  readonly blurb: string;
  readonly categoryName: string;
  readonly categoryId: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly phase: number;
  readonly playable: boolean;
  readonly complexity: { time: { average: string; worst: string }; space: string } | null;
  readonly inputKind: string;
  readonly actions?: ReactNode;
}

/** Title bar above the stage — the information a learner needs at a glance. */
function StageHeader({
  title,
  blurb,
  categoryName,
  categoryId,
  difficulty,
  phase,
  playable,
  complexity,
  inputKind,
  actions,
}: StageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start gap-3 border-b border-line/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/algorithms/${categoryId}`}
            className="text-2xs uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-accent-cyan"
          >
            {categoryName}
          </Link>
          <span aria-hidden className="text-ink-faint/50">
            /
          </span>
          <motion.h1
            layout
            className="font-display text-sm font-semibold tracking-tight text-ink sm:text-base"
          >
            {title}
          </motion.h1>
          <DifficultyBadge difficulty={difficulty} />
          {!playable ? (
            <span className="rounded-full border border-accent-violet/35 bg-accent-violet/10 px-2 py-0.5 text-2xs text-accent-violet">
              Phase {phase} preview
            </span>
          ) : null}
          <span className="rounded-full border border-line/60 px-2 py-0.5 font-mono text-2xs text-ink-faint">
            input: {inputKind}
          </span>
        </div>
        <p className="mt-1 truncate text-2xs text-ink-dim" title={blurb}>
          {blurb}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {complexity ? (
          <>
            <ComplexityBadge label="avg" value={complexity.time.average} tone="cyan" />
            <ComplexityBadge label="worst" value={complexity.time.worst} tone="pink" />
            <ComplexityBadge label="space" value={complexity.space} tone="violet" />
          </>
        ) : null}
        {actions}
      </div>
    </header>
  );
}
