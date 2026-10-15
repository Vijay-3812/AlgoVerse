import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, lazy, useMemo } from 'react';
import type { AlgorithmMeta, AnyTrace, Complexity, LearnContent, MetricsSnapshot, RightPanelTab } from '@/types';
import { useUiStore } from '@/store/uiStore';
import { CodeBlock } from './CodeBlock';
import { ComplexityPanel } from './ComplexityPanel';
import { ExplanationPanel } from './ExplanationPanel';

// Learn Mode carries ~40 kB of hand-written prose and quiz data. It is a
// separate chunk so opening an algorithm stays cheap until the tab is opened.
const LearnPanel = lazy(() => import('./LearnPanel').then((m) => ({ default: m.LearnPanel })));
import { Icon, type IconName } from '@/components/primitives/Icon';
import { Segmented } from '@/components/primitives/Segmented';
import { resolveCodeLine } from '@/utils/codeAlign';
import { LANGUAGE_LABEL } from '@/utils/format';
import { cn } from '@/utils/cn';

export interface RightPanelProps {
  readonly trace: AnyTrace | null;
  readonly cursor: number;
  readonly onJumpToStep: (index: number) => void;
  readonly complexity: Complexity | null;
  readonly metrics: MetricsSnapshot;
  /** Catalogue entry for the algorithm on screen — Learn Mode needs it. */
  readonly meta: AlgorithmMeta;
  /** Prose shipped with the generator, shown in Explain and reused by Learn. */
  readonly explanation: readonly string[];
  /** Content authored on the definition, if any. */
  readonly learn?: LearnContent | undefined;
  /** Restarts playback from step 0 — the Learn tab's "watch it again". */
  readonly onWatchAgain?: (() => void) | undefined;
  readonly className?: string;
}

interface TabDef {
  readonly id: RightPanelTab;
  readonly label: string;
  readonly icon: IconName;
}

const TABS: readonly TabDef[] = [
  { id: 'pseudocode', label: 'Pseudo', icon: 'code' },
  { id: 'code', label: 'Code', icon: 'layers' },
  { id: 'explain', label: 'Explain', icon: 'book' },
  { id: 'complexity', label: 'Complexity', icon: 'compass' },
  { id: 'learn', label: 'Learn', icon: 'spark' },
];

const PANEL_MOTION = {
  initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -6, filter: 'blur(4px)' },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

/**
 * The inspector: pseudocode, code (4 languages), narration and complexity.
 *
 * All four tabs read the *same* trace, which is why the active line in the
 * pseudocode and the active line in the JavaScript code panel always agree —
 * they are two views of one `TraceStep`, not two independent trackers.
 */
export function RightPanel({
  trace,
  cursor,
  onJumpToStep,
  complexity,
  metrics,
  meta,
  explanation,
  learn,
  onWatchAgain,
  className,
}: RightPanelProps) {
  const activeTab = useUiStore((s) => s.rightPanelTab);
  const setActiveTab = useUiStore((s) => s.setRightPanelTab);
  const language = useUiStore((s) => s.codeLanguage);
  const setLanguage = useUiStore((s) => s.setCodeLanguage);

  const step = trace?.steps[cursor] ?? null;
  const codeLines = useMemo(() => trace?.code[language] ?? [], [trace, language]);
  const hasCode = codeLines.length > 0;

  return (
    <section
      aria-label="Algorithm inspector"
      className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}
    >
      <header className="flex items-center justify-between gap-2 border-b border-line/60 px-3 py-2">
        <Segmented
          ariaLabel="Inspector sections"
          options={TABS.map((tab) => ({
            value: tab.id,
            label: tab.label,
            icon: <Icon name={tab.icon} size={12} />,
          }))}
          value={activeTab}
          onChange={setActiveTab}
        />
        {activeTab === 'code' ? (
          <div className="flex items-center gap-1">
            {(Object.keys(LANGUAGE_LABEL) as Array<keyof typeof LANGUAGE_LABEL>).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setLanguage(key)}
                aria-pressed={language === key}
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-mono text-2xs transition-colors',
                  language === key
                    ? 'bg-accent-cyan/15 text-accent-cyan'
                    : 'text-ink-faint hover:bg-surface/60 hover:text-ink-dim',
                )}
              >
                {key === 'javascript' ? 'js' : key === 'python' ? 'py' : key === 'cpp' ? 'c++' : 'java'}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={activeTab} className="absolute inset-0" {...PANEL_MOTION}>
            {activeTab === 'pseudocode' ? (
              <CodeBlock
                ariaLabel="Pseudocode"
                lines={trace?.pseudocode ?? []}
                language="javascript"
                activeLine={step?.pseudocodeLine ?? null}
                plain
                className="bg-transparent/0"
              />
            ) : null}

            {activeTab === 'code' ? (
              hasCode ? (
                <CodeBlock
                  ariaLabel="Source code"
                  lines={codeLines}
                  language={language}
                  activeLine={resolveCodeLine(trace?.codeMap, language, step?.codeLine ?? null)}
                />
              ) : (
                <EmptyState
                  icon="code"
                  title="No source for this language yet"
                  body="Pick another language, or read the pseudocode tab."
                />
              )
            ) : null}

            {activeTab === 'explain' ? (
              <ExplanationPanel
                intro={explanation}
                steps={trace?.steps ?? []}
                cursor={cursor}
                onJumpToStep={onJumpToStep}
              />
            ) : null}

            {activeTab === 'learn' ? (
              <Suspense fallback={<PanelSkeleton label="Loading Learn Mode" />}>
                <LearnPanel
                  meta={meta}
                  complexity={complexity}
                  explanation={explanation}
                  authored={learn}
                  onWatchAgain={onWatchAgain}
                />
              </Suspense>
            ) : null}

            {activeTab === 'complexity' ? (
              complexity ? (
                <ComplexityPanel
                  complexity={complexity}
                  metrics={metrics}
                  steps={trace?.steps.length ?? 0}
                  generationMs={trace?.generatedInMs ?? 0}
                />
              ) : (
                <EmptyState icon="compass" title="No complexity data" body="Load an algorithm to see its bounds." />
              )
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-label={label}>
      <span className="flex gap-1">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-ink-faint"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1, repeat: Infinity, delay: index * 0.15 }}
          />
        ))}
      </span>
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line/70 bg-surface/50 text-ink-faint">
        <Icon name={icon} size={18} />
      </span>
      <p className="text-xs font-medium text-ink">{title}</p>
      <p className="text-2xs leading-relaxed text-ink-faint">{body}</p>
    </div>
  );
}
