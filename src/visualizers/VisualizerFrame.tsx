import { motion } from 'framer-motion';
import type { AlgorithmInput, DataSetKind } from '@/types';
import { useTraceSession } from '@/hooks/useTraceSession';
import { usePlaybackStore } from '@/store/playbackStore';
import { celebrate as fireCelebration } from '@/store/fxStore';
import { TraceStage } from './TraceStage';
import { VisualizerSkeleton } from '@/components/primitives/Skeleton';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { cn } from '@/utils/cn';

export interface VisualizerFrameProps {
  readonly algorithmId: string;
  /** `null` ⇒ use the generator's own `defaultInput()`. */
  readonly input: AlgorithmInput | null;
  readonly dataSet?: DataSetKind;
  readonly seed?: number;
  readonly className?: string;
}

/**
 * The workspace's window onto a trace.
 *
 * Responsibilities: resolve the module chunk, generate the trace, hand the
 * playback store a cursor, and render exactly one `TraceStep` (which is
 * `TraceStage`'s job, shared with Compare Mode). Algorithm logic never lives
 * below this line, and rendering logic never lives above it.
 */
export function VisualizerFrame({ algorithmId, input, dataSet, seed, className }: VisualizerFrameProps) {
  const { module, trace, status, error, rerun } = useTraceSession(algorithmId, input, {
    ...(dataSet === undefined ? {} : { dataSet }),
    ...(seed === undefined ? {} : { seed }),
  });

  const cursor = usePlaybackStore((s) => s.playback.cursor);
  const speed = usePlaybackStore((s) => s.playback.speed);

  if (status === 'loading') {
    return (
      <div className={cn('flex h-full w-full items-center justify-center', className)}>
        <VisualizerSkeleton />
      </div>
    );
  }

  if (error || !module || !trace || trace.steps.length === 0) {
    return (
      <div className={cn('flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center', className)}>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-red/40 bg-accent-red/10 text-accent-red">
          <Icon name="warning" size={18} />
        </span>
        <p className="text-sm font-medium text-ink">This trace could not be built</p>
        <p className="max-w-sm text-2xs leading-relaxed text-ink-faint">
          {error ?? 'The generator returned an empty trace. This is a bug — the input may be degenerate.'}
        </p>
        <Button size="sm" icon="reset" onClick={rerun}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      key={`${algorithmId}`}
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative h-full w-full', className)}
    >
      <TraceStage
        module={module}
        trace={trace}
        index={cursor}
        speed={speed}
        celebrate={() => fireCelebration()}
      />
    </motion.div>
  );
}
