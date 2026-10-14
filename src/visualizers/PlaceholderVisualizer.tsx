import { motion } from 'framer-motion';
import type { VisualizerProps } from '@/types';
import type { PlaceholderData, PlaceholderState } from '@/algorithms/placeholder';
import { Badge } from '@/components/primitives/Badge';
import { Icon } from '@/components/primitives/Icon';

/**
 * Roadmap renderer for algorithms that land in a later phase.
 *
 * It reads the trace like every other visualiser — `state.active` steps through
 * the bullets as you scrub — which is the honest demo: the transport, timeline
 * and panels are already real, only the picture is pending.
 */
export function PlaceholderVisualizer({
  trace,
  step,
  index,
  total,
  progress,
}: VisualizerProps<PlaceholderState, PlaceholderData>) {
  const { headline, phase, bullets, active } = step.state;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-7 overflow-hidden p-6">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(circle at 50% 20%, var(--algo-a), transparent 55%), radial-gradient(circle at 80% 90%, var(--algo-b), transparent 50%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-3 text-center">
        <Badge tone="violet" mono>
          Phase {phase}
        </Badge>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          <span className="text-gradient">{headline}</span>
        </h2>
        <p className="max-w-md text-xs leading-relaxed text-ink-dim">
          The engine you are scrubbing right now is the real one. This visualiser drops in during Phase {phase}.
        </p>
      </div>

      <motion.ul layout className="relative w-full max-w-md space-y-2">
        {bullets.map((bullet, i) => {
          const revealed = active < 0 ? false : i <= active;
          const isCurrent = i === active;
          return (
            <motion.li
              key={bullet}
              layout
              animate={{
                opacity: revealed ? 1 : 0.32,
                x: isCurrent ? 6 : 0,
                scale: isCurrent ? 1.02 : 1,
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="flex items-center gap-3 rounded-xl border border-line/60 bg-surface/50 px-3.5 py-2.5 backdrop-blur"
            >
              <span
                className={
                  revealed
                    ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/15 text-accent-cyan'
                    : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink-faint/10 text-ink-faint'
                }
              >
                <Icon name={revealed ? 'check' : 'spark'} size={13} />
              </span>
              <span className="text-xs text-ink-dim">{bullet}</span>
            </motion.li>
          );
        })}
      </motion.ul>

      <div className="relative flex items-center gap-3">
        <div className="h-1 w-44 overflow-hidden rounded-full bg-line/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-violet"
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="font-mono text-2xs text-ink-faint">
          step {index + 1}/{total}
        </span>
      </div>

      <p className="relative max-w-lg text-center font-mono text-2xs text-ink-faint">
        {step.description}
      </p>

      <span className="sr-only">{trace.result.headline}</span>
    </div>
  );
}
