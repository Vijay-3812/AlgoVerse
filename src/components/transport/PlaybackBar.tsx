import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Segmented } from '@/components/primitives/Segmented';
import { Slider } from '@/components/primitives/Slider';
import { Tooltip } from '@/components/primitives/Tooltip';
import { MAX_SPEED, MIN_SPEED, SPEED_STOPS } from '@/engine/playback';
import { cn } from '@/utils/cn';

export interface PlaybackBarProps {
  readonly className?: string;
  /** Extra controls (dataset presets, randomise, custom input…). */
  readonly children?: ReactNode;
  /** Compare Mode renders two bars; only the lead one shows the speed control. */
  readonly showSpeed?: boolean;
  readonly showLoop?: boolean;
}

const SPEED_MARKS = SPEED_STOPS.map((stop) => (stop - MIN_SPEED) / (MAX_SPEED - MIN_SPEED));

/**
 * The floating glass transport.
 *
 * Every control is a real button with an accessible name and a shortcut hint,
 * driven by the same store the keyboard uses — so clicking and pressing Space
 * can never disagree.
 */
export function PlaybackBar({ className, children, showSpeed = true, showLoop = true }: PlaybackBarProps) {
  const status = usePlaybackStore((s) => s.playback.status);
  const speed = usePlaybackStore((s) => s.playback.speed);
  const loop = usePlaybackStore((s) => s.playback.loop);
  const cursor = usePlaybackStore((s) => s.playback.cursor);
  const length = usePlaybackStore((s) => s.playback.length);

  const { toggle, stepBy, reset, jumpTo, setSpeed, setLoop } = usePlaybackStore.getState();
  const atStart = cursor <= 0;
  const atEnd = length > 0 && cursor >= length - 1;

  return (
    <div
      className={cn(
        'glass-strong flex flex-wrap items-center gap-2 rounded-2xl px-2.5 py-2',
        'shadow-[0_20px_60px_-24px_rgb(0_0_0/0.9)]',
        className,
      )}
      role="toolbar"
      aria-label="Playback controls"
    >
      <div className="flex items-center gap-1">
        <Tooltip label="Jump to start" shortcut="Home">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => jumpTo('start')}
            disabled={atStart}
            aria-label="Jump to first step"
          >
            <Icon name="jump-start" size={15} />
          </Button>
        </Tooltip>

        <Tooltip label="Step back" shortcut="←">
          <Button size="icon-sm" variant="ghost" onClick={() => stepBy(-1)} disabled={atStart} aria-label="Step back">
            <Icon name="step-back" size={15} />
          </Button>
        </Tooltip>

        <Tooltip label={status === 'playing' ? 'Pause' : 'Play'} shortcut="Space">
          <Button
            size="icon"
            variant="primary"
            magnetic
            onClick={toggle}
            aria-label={status === 'playing' ? 'Pause' : 'Play'}
            className="mx-0.5"
          >
            <motion.span
              key={status === 'playing' ? 'pause' : 'play'}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 30 }}
              className="flex items-center justify-center"
            >
              <Icon name={status === 'playing' ? 'pause' : 'play'} size={16} filled={status !== 'playing'} />
            </motion.span>
          </Button>
        </Tooltip>

        <Tooltip label="Step forward" shortcut="→">
          <Button size="icon-sm" variant="ghost" onClick={() => stepBy(1)} disabled={atEnd} aria-label="Step forward">
            <Icon name="step-forward" size={15} />
          </Button>
        </Tooltip>

        <Tooltip label="Jump to end" shortcut="End">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => jumpTo('end')}
            disabled={atEnd}
            aria-label="Jump to last step"
          >
            <Icon name="jump-end" size={15} />
          </Button>
        </Tooltip>

        <Tooltip label="Reset" shortcut="R">
          <Button size="icon-sm" variant="ghost" onClick={reset} aria-label="Reset playback">
            <Icon name="reset" size={15} />
          </Button>
        </Tooltip>
      </div>

      <span aria-hidden className="mx-0.5 h-6 w-px bg-line/70" />

      {showSpeed ? (
        <div className="flex min-w-[9.5rem] flex-1 items-center gap-2 sm:max-w-[13rem]">
          <Tooltip label="Playback speed" shortcut="+ / −">
            <Icon name="speed" size={15} className="text-ink-faint" />
          </Tooltip>
          <Slider
            ariaLabel="Playback speed"
            min={MIN_SPEED}
            max={MAX_SPEED}
            step={0.25}
            value={speed}
            onChange={setSpeed}
            marks={SPEED_MARKS}
            className="flex-1"
          />
          <span className="w-10 shrink-0 font-mono text-2xs tabular-nums text-ink-dim">{speed}×</span>
        </div>
      ) : null}

      {showLoop ? (
        <Tooltip label={loop ? 'Looping on' : 'Loop playback'} shortcut="L">
          <Button
            size="icon-sm"
            variant={loop ? 'outline' : 'ghost'}
            onClick={() => setLoop(!loop)}
            aria-label="Toggle loop"
            aria-pressed={loop}
            className={cn(loop && 'border-accent-cyan/60 text-accent-cyan')}
          >
            <Icon name="loop" size={15} />
          </Button>
        </Tooltip>
      ) : null}

      {children ? (
        <>
          <span aria-hidden className="mx-0.5 h-6 w-px bg-line/70" />
          {children}
        </>
      ) : null}

      <Segmented
        className="hidden lg:inline-flex"
        ariaLabel="Playback speed presets"
        options={[
          { value: 'slow', label: '0.5×' },
          { value: 'normal', label: '1×' },
          { value: 'fast', label: '4×' },
          { value: 'turbo', label: '8×' },
        ]}
        value={
          speed <= 0.5 ? 'slow' : speed <= 1 ? 'normal' : speed <= 4 ? 'fast' : 'turbo'
        }
        onChange={(preset) => {
          const map = { slow: 0.5, normal: 1, fast: 4, turbo: 8 } as const;
          setSpeed(map[preset as keyof typeof map] ?? 1);
        }}
      />
    </div>
  );
}
