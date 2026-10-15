import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { AlgorithmMeta, Complexity, LearnContent, PracticeLink, QuizQuestion } from '@/types';
import { ALGORITHMS, CATEGORY_BY_ID } from '@/engine/catalogue';
import { mergeLearn, resolveLearn } from '@/utils/learnQuiz';
import { authoredLearn } from '@/data/learn';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { celebrate } from '@/store/fxStore';
import { cn } from '@/utils/cn';

export interface LearnPanelProps {
  readonly meta: AlgorithmMeta;
  readonly complexity: Complexity | null;
  readonly explanation: readonly string[];
  /** Content authored on the definition itself, if any. */
  readonly authored?: LearnContent | undefined;
  /** Jumps the playhead back to step 0 and starts playing. */
  readonly onWatchAgain?: (() => void) | undefined;
}

/**
 * Learn Mode: why this algorithm exists, where it is used, a quiz you can
 * actually fail, and somewhere to go next.
 *
 * The panel is deliberately *generated-first*: prose here is optional and the
 * quiz is assembled from real complexity data, so a brand-new algorithm gets a
 * complete Learn tab the moment its trace generator is registered.
 */
export function LearnPanel({ meta, complexity, explanation, authored, onWatchAgain }: LearnPanelProps) {
  const resolved = useMemo(
    () =>
      resolveLearn({
        meta,
        complexity,
        explanation,
        // Hand-written prose first, then whatever the generator itself ships.
        authored: mergeLearn(authoredLearn(meta.id), authored),
        catalogue: ALGORITHMS,
        category: CATEGORY_BY_ID[meta.category],
      }),
    [authored, complexity, explanation, meta],
  );

  const quizzes = resolved.quiz;
  const [answers, setAnswers] = useState<Readonly<Record<number, number>>>({});
  const answered = Object.keys(answers).length;
  const correct = quizzes.reduce(
    (total, question, index) => (answers[index] === question.answer ? total + 1 : total),
    0,
  );

  const answer = (index: number, option: number): void => {
    setAnswers((prev) => {
      if (prev[index] !== undefined) return prev;
      const next = { ...prev, [index]: option };
      // Only celebrate a *perfect* run — and only once the last question lands.
      if (Object.keys(next).length === quizzes.length) {
        const allRight = quizzes.every((question, i) => next[i] === question.answer);
        if (allRight) celebrate(0.5, 0.42);
      }
      return next;
    });
  };

  const reset = (): void => setAnswers({});

  return (
    <div className="h-full overflow-y-auto px-3.5 py-3">
      <Section icon="book" title={resolved.authored ? 'About' : 'How it works'}>
        {resolved.intro.map((paragraph) => (
          <p key={paragraph} className="text-xs leading-relaxed text-ink-dim">
            {paragraph}
          </p>
        ))}
      </Section>

      <Section icon="zap" title="Where it earns its keep">
        <ul className="flex flex-col gap-1.5">
          {resolved.useCases.map((useCase) => (
            <li key={useCase} className="flex gap-2 text-xs leading-relaxed text-ink-dim">
              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-cyan" />
              {useCase}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        icon="compass"
        title="Quick check"
        trailing={
          <div className="flex items-center gap-1.5">
            <Badge tone={answered === 0 ? 'neutral' : correct === answered ? 'lime' : 'amber'} mono>
              {correct}/{quizzes.length}
            </Badge>
            {answered > 0 ? (
              <button
                type="button"
                onClick={reset}
                className="rounded-md px-1.5 py-0.5 font-mono text-2xs text-ink-faint transition-colors hover:bg-surface/70 hover:text-ink-dim"
              >
                reset
              </button>
            ) : null}
          </div>
        }
      >
        <ol className="flex flex-col gap-3">
          {quizzes.map((question, index) => (
            <QuizCard
              key={question.question}
              index={index}
              question={question}
              picked={answers[index]}
              onPick={(option) => answer(index, option)}
            />
          ))}
        </ol>
        {answered === quizzes.length ? (
          <p
            aria-live="polite"
            className={cn(
              'mt-1 rounded-lg border px-2.5 py-2 text-2xs',
              correct === quizzes.length
                ? 'border-accent-lime/40 bg-accent-lime/10 text-accent-lime'
                : 'border-line/60 bg-surface/40 text-ink-dim',
            )}
          >
            {correct === quizzes.length
              ? 'Perfect score — you could explain this one at a whiteboard.'
              : `${correct} of ${quizzes.length}. The explanations above are worth a second read.`}
          </p>
        ) : null}
      </Section>

      <Section icon="rocket" title="Keep going">
        <ul className="flex flex-col gap-1.5">
          {resolved.practice.map((link) => (
            <li key={link.url}>
              <PracticeRow link={link} />
            </li>
          ))}
        </ul>
        {onWatchAgain ? (
          <Button size="sm" variant="secondary" icon="reset" className="mt-1" onClick={onWatchAgain}>
            Watch the trace again
          </Button>
        ) : null}
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  trailing,
  children,
}: {
  icon: 'book' | 'zap' | 'compass' | 'rocket';
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <header className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md border border-line/70 bg-surface/50 text-accent-cyan">
          <Icon name={icon} size={11} />
        </span>
        <h2 className="font-display text-2xs font-semibold uppercase tracking-[0.14em] text-ink">{title}</h2>
        <div className="ml-auto">{trailing}</div>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function QuizCard({
  index,
  question,
  picked,
  onPick,
}: {
  index: number;
  question: QuizQuestion;
  picked: number | undefined;
  onPick: (option: number) => void;
}) {
  const settled = picked !== undefined;
  const isRight = settled && picked === question.answer;

  return (
    <li className="rounded-xl border border-line/60 bg-surface/30 p-2.5">
      <p className="mb-2 text-xs font-medium leading-relaxed text-ink">
        <span className="mr-1.5 font-mono text-2xs text-ink-faint">Q{index + 1}</span>
        {question.question}
      </p>
      <div className="flex flex-col gap-1" role="group" aria-label={question.question}>
        {question.options.map((option, optionIndex) => {
          const chosen = picked === optionIndex;
          const reveal = settled && optionIndex === question.answer;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onPick(optionIndex)}
              disabled={settled}
              aria-pressed={chosen}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left font-mono text-2xs transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-cyan',
                reveal
                  ? 'border-accent-lime/50 bg-accent-lime/10 text-accent-lime'
                  : chosen
                    ? 'border-accent-red/50 bg-accent-red/10 text-accent-red'
                    : settled
                      ? 'border-line/50 text-ink-faint'
                      : 'border-line/70 text-ink-dim hover:border-accent-cyan/40 hover:bg-surface/60 hover:text-ink',
              )}
            >
              <span className="flex-1">{option}</span>
              {reveal ? <Icon name="check" size={12} /> : chosen ? <Icon name="close" size={12} /> : null}
            </button>
          );
        })}
      </div>
      <AnimatePresence initial={false}>
        {settled ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn('overflow-hidden pt-1.5 text-2xs leading-relaxed', isRight ? 'text-accent-lime' : 'text-ink-faint')}
          >
            {question.why}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

function PracticeRow({ link }: { link: PracticeLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex items-center gap-2 rounded-lg border border-line/60 bg-surface/30 px-2.5 py-1.5 text-2xs text-ink-dim transition-colors hover:border-accent-cyan/40 hover:text-ink"
    >
      <Icon name="link" size={12} className="text-ink-faint group-hover:text-accent-cyan" />
      <span className="min-w-0 flex-1 truncate">{link.title}</span>
      {link.difficulty ? <Badge tone={link.difficulty === 'easy' ? 'lime' : link.difficulty === 'medium' ? 'amber' : 'pink'} mono>{link.difficulty}</Badge> : null}
      <Icon name="external" size={11} className="text-ink-faint" />
    </a>
  );
}
