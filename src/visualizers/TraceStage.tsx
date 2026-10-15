import { type ComponentType } from 'react';
import type { AnyAlgorithmModule, AnyTrace, VisualizerProps } from '@/types';
import { cn } from '@/utils/cn';

export interface TraceStageProps {
  readonly module: AnyAlgorithmModule;
  readonly trace: AnyTrace;
  /** Step index. Out-of-range values clamp — lanes in Compare Mode differ in length. */
  readonly index: number;
  readonly speed?: number;
  /** Called when the trace reaches a celebratory beat (a sorted array, a win). */
  readonly celebrate?: () => void;
  readonly className?: string;
}

/**
 * Renders one step of one trace with the module's own visualiser.
 *
 * This is the entire "trace meets DOM" surface of the app, extracted so that
 * the single-algorithm workspace and Compare Mode draw the *same* pixels from
 * the same code path — a second renderer that drifted would make a race
 * meaningless.
 *
 * The generic erasure performed by `defineModule` is undone here: a module's
 * `Visualizer` only ever receives traces its own `generate` produced, so
 * re-attaching the type parameters is sound.
 */
export function TraceStage({ module, trace, index, speed = 1, celebrate, className }: TraceStageProps) {
  const clamped = Math.max(0, Math.min(index, trace.steps.length - 1));
  const step = trace.steps[clamped] ?? trace.steps[0];
  const Visualizer = module.Visualizer as unknown as ComponentType<VisualizerProps<unknown, unknown>>;

  if (!step) {
    return (
      <div className={cn('flex h-full items-center justify-center text-xs text-ink-faint', className)}>
        This trace has no steps.
      </div>
    );
  }

  return (
    <div className={cn('relative h-full w-full', className)}>
      <Visualizer
        trace={trace}
        step={step}
        index={clamped}
        total={trace.steps.length}
        progress={trace.steps.length > 1 ? clamped / (trace.steps.length - 1) : 0}
        speed={speed}
        celebrate={celebrate ?? (() => {})}
      />
    </div>
  );
}
