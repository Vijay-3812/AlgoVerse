import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { AnyStep } from '@/types';
import { Badge } from '@/components/primitives/Badge';
import { Icon } from '@/components/primitives/Icon';
import { cn } from '@/utils/cn';

export interface ExplanationPanelProps {
  /** Static prose shipped with the algorithm (Learn Mode intro lands in Phase 8). */
  readonly intro: readonly string[];
  /** The full step list; the panel renders a window around the cursor. */
  readonly steps: readonly AnyStep[];
  readonly cursor: number;
  readonly onJumpToStep: (index: number) => void;
}

const KIND_LABEL: Record<string, string> = {
  init: 'setup',
  info: 'note',
  read: 'read',
  write: 'write',
  compare: 'compare',
  swap: 'swap',
  sorted: 'done',
  complete: 'finished',
  pivot: 'pivot',
  partition: 'partition',
  merge: 'merge',
  found: 'found',
  visit: 'visit',
  explore: 'explore',
  relax: 'relax',
  path: 'path',
  collision: 'collision',
  probe: 'probe',
  recurse: 'recurse',
  return: 'return',
  place: 'place',
  conflict: 'conflict',
  backtrack: 'undo',
};

/** How many narration lines to keep in the scrolling transcript. */
const WINDOW = 14;

/**
 * Narration panel: the algorithm in plain English, step by step.
 *
 * A window of the transcript is rendered around the cursor rather than the
 * whole trace (a 10 000-step merge sort would otherwise mount 10 000 DOM
 * nodes); lines before the cursor fade out, lines after are dim, so scrubbing
 * still reads like a story. Clicking any line jumps the playhead there.
 */
export function ExplanationPanel({ intro, steps, cursor, onJumpToStep }: ExplanationPanelProps) {
  const transcript = useMemo(() => {
    if (steps.length === 0) {
      return [{ index: 0, description: 'Press Play, or step forward with → to begin.', kind: 'info' }];
    }
    const start = Math.max(0, cursor - Math.floor(WINDOW * 0.7));
    const end = Math.min(steps.length, start + WINDOW);
    return steps.slice(start, end).map((step) => ({
      index: step.index,
      description: step.description,
      kind: step.kind as string,
    }));
  }, [steps, cursor]);

  return (
    <div className="scroll-y h-full p-4">
      <section className="space-y-2">
        <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-faint">What’s happening</h3>
        <div className="space-y-1">
          {transcript.map((entry) => {
            const isCurrent = entry.index === cursor;
            const isPast = entry.index < cursor;
            return (
              <motion.button
                key={entry.index}
                type="button"
                layout="position"
                initial={false}
                animate={{ opacity: isCurrent ? 1 : isPast ? 0.34 : 0.62 }}
                transition={{ duration: 0.22 }}
                onClick={() => onJumpToStep(entry.index)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors',
                  isCurrent
                    ? 'border-accent-cyan/40 bg-accent-cyan/10'
                    : 'border-transparent hover:border-line/60 hover:bg-surface/50',
                )}
              >
                <span aria-hidden className="mt-1 shrink-0">
                  {isCurrent ? (
                    <Icon name="chevronRight" size={13} className="text-accent-cyan" />
                  ) : (
                    <span className="block h-1.5 w-1.5 rounded-full bg-ink-faint/50" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-2xs text-ink-faint">#{entry.index}</span>
                    <Badge tone={isCurrent ? 'cyan' : 'ghost'}>{KIND_LABEL[entry.kind] ?? entry.kind}</Badge>
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block text-xs leading-relaxed',
                      isCurrent ? 'text-ink' : 'text-ink-dim',
                    )}
                  >
                    {entry.description}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {intro.length ? (
        <section className="mt-6 space-y-2 border-t border-line/60 pt-5">
          <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
            About this algorithm
          </h3>
          {intro.map((paragraph) => (
            <p key={paragraph} className="text-xs leading-relaxed text-ink-dim">
              {paragraph}
            </p>
          ))}
        </section>
      ) : null}

      <p className="mt-5 text-2xs text-ink-faint">
        Step {cursor + 1} of {steps.length}
      </p>
    </div>
  );
}
