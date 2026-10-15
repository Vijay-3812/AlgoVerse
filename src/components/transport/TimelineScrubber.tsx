import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { AnyTrace, StepKind } from '@/types';
import { usePlaybackStore } from '@/store/playbackStore';
import { cn } from '@/utils/cn';
import { formatCount } from '@/utils/format';

export interface TimelineScrubberProps {
  readonly trace: AnyTrace | null;
  readonly className?: string;
  /** Markers are sampled down to this many; more is noise at this width. */
  readonly maxMarkers?: number;
}

/** Marker colour per step kind — the timeline doubles as an activity heat map. */
const KIND_COLOR: Partial<Record<StepKind, string>> = {
  compare: 'rgb(var(--c-amber))',
  swap: 'rgb(var(--c-pink))',
  pivot: 'rgb(var(--c-violet))',
  sorted: 'rgb(var(--c-lime))',
  complete: 'rgb(var(--c-lime))',
  found: 'rgb(var(--c-lime))',
  conflict: 'rgb(var(--c-red))',
  probe: 'rgb(var(--c-amber))',
  visit: 'rgb(var(--c-violet))',
  path: 'rgb(var(--c-lime))',
};

interface HoverState {
  readonly index: number;
  readonly x: number;
}

/**
 * The timeline: drag to scrub, click to jump, hover to preview, and a heat-map
 * of step kinds so you can *see* the shape of an algorithm (quick sort's pivot
 * rhythm, bubble sort's long comparison tail) before playing it.
 */
export function TimelineScrubber({ trace, className, maxMarkers = 320 }: TimelineScrubberProps) {
  const cursor = usePlaybackStore((s) => s.playback.cursor);
  const length = usePlaybackStore((s) => s.playback.length);
  const status = usePlaybackStore((s) => s.playback.status);
  const seek = usePlaybackStore((s) => s.seek);
  const seekProgress = usePlaybackStore((s) => s.seekProgress);

  const trackRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const dragging = useRef(false);

  const progress = length > 1 ? cursor / (length - 1) : 0;

  const markers = useMemo(() => {
    if (!trace || trace.steps.length === 0) return [];
    const step = Math.max(1, Math.ceil(trace.steps.length / maxMarkers));
    const out: Array<{ index: number; ratio: number; color: string | null }> = [];
    for (let i = 0; i < trace.steps.length; i += step) {
      const current = trace.steps[i];
      if (!current) continue;
      out.push({
        index: i,
        ratio: trace.steps.length > 1 ? i / (trace.steps.length - 1) : 0,
        color: KIND_COLOR[current.kind] ?? null,
      });
    }
    return out;
  }, [trace, maxMarkers]);

  const progressFromEvent = useCallback((clientX: number): number => {
    const node = trackRef.current;
    if (!node) return 0;
    const rect = node.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!trace) return;
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      seekProgress(progressFromEvent(event.clientX));
    },
    [progressFromEvent, seekProgress, trace],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!trace) return;
      const ratio = progressFromEvent(event.clientX);
      setHover({ index: Math.round(ratio * (trace.steps.length - 1)), x: event.clientX });
      if (dragging.current) seekProgress(ratio);
    },
    [progressFromEvent, seekProgress, trace],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const map: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        PageUp: 10,
        PageDown: -10,
      };
      if (event.key === 'Home') {
        event.preventDefault();
        seek(0);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        seek(length - 1);
        return;
      }
      const delta = map[event.key];
      if (delta !== undefined) {
        event.preventDefault();
        seek(Math.min(length - 1, Math.max(0, cursor + delta)));
      }
    },
    [cursor, length, seek],
  );

  const hoveredStep = hover && trace ? trace.steps[hover.index] : null;
  const disabled = !trace || length === 0;

  return (
    <div className={cn('relative select-none', className)}>
      {/* preview tooltip */}
      <AnimatePresence>
        {hoveredStep && !disabled ? (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="pointer-events-none fixed z-[70] max-w-[19rem] -translate-x-1/2 rounded-lg border border-line/80 bg-elevated/95 px-2.5 py-1.5 shadow-xl backdrop-blur"
            style={{ left: hover?.x, top: (trackRef.current?.getBoundingClientRect().top ?? 0) - 48 }}
          >
            <p className="font-mono text-2xs text-accent-cyan">
              step {hoveredStep.index} · {hoveredStep.kind}
            </p>
            <p className="mt-0.5 line-clamp-2 text-2xs leading-relaxed text-ink-dim">{hoveredStep.description}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Trace timeline"
        aria-valuemin={1}
        aria-valuemax={Math.max(1, length)}
        aria-valuenow={cursor + 1}
        aria-valuetext={`Step ${cursor + 1} of ${length}: ${trace?.steps[cursor]?.description ?? ''}`}
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setHover(null)}
        onKeyDown={handleKeyDown}
        className={cn(
          'group relative h-9 cursor-pointer touch-none',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {/* rail */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full border border-line/60 bg-surface/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-cyan/70 via-accent-violet/70 to-accent-pink/70 transition-[width] duration-100 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* step markers (heat map) */}
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2">
          {markers.map((marker) => (
            <span
              key={marker.index}
              className="absolute top-1/2 h-1.5 w-[2px] -translate-y-1/2 rounded-full"
              style={{
                left: `${marker.ratio * 100}%`,
                background: marker.color ?? 'rgb(var(--c-ink-faint) / 0.35)',
                opacity: marker.index <= cursor ? 0.95 : 0.28,
              }}
            />
          ))}
        </div>

        {/* playhead */}
        <div
          aria-hidden
          className={cn(
            'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-bg',
            'shadow-[0_0_0_4px_rgb(var(--c-cyan)/0.18)] transition-transform',
            'group-hover:scale-110',
            status === 'playing' && 'animate-pulse-ring',
          )}
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between px-0.5 font-mono text-2xs tabular-nums text-ink-faint">
        <span>
          step <span className="text-ink-dim">{formatCount(cursor + 1)}</span>
        </span>
        <span>{formatCount(length)} steps</span>
      </div>
    </div>
  );
}
