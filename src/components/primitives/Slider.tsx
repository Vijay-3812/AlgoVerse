import { useCallback, useId } from 'react';
import { cn } from '@/utils/cn';

export interface SliderProps {
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly ariaLabel: string;
  readonly className?: string;
  /** Marks along the track (0..1) — used by the speed control. */
  readonly marks?: readonly number[];
  readonly disabled?: boolean;
}

/**
 * Range input styled from tokens. The filled portion is painted with a
 * gradient driven by `--fill`, updated in the same commit as the value — no
 * extra element, no extra layout.
 */
export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  ariaLabel,
  className,
  marks,
  disabled,
}: SliderProps) {
  const id = useId();
  const fill = max === min ? 0 : (value - min) / (max - min);

  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value)),
    [onChange],
  );

  return (
    <div className={cn('relative flex h-6 items-center', className)}>
      {marks?.length ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 flex items-center justify-between px-0.5">
          {marks.map((mark, i) => (
            <span
              key={`${mark}-${i}`}
              className={cn(
                'h-1 w-1 rounded-full transition-colors',
                mark <= fill + 0.001 ? 'bg-accent-cyan/70' : 'bg-ink-faint/40',
              )}
            />
          ))}
        </div>
      ) : null}

      <input
        id={id}
        type="range"
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={handleInput}
        style={{ ['--fill' as string]: `${fill * 100}%` }}
        className={cn(
          'h-6 w-full cursor-pointer appearance-none bg-transparent',
          '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full',
          '[&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,rgb(var(--c-cyan))_0%,rgb(var(--c-violet))_var(--fill),rgb(var(--c-line))_var(--fill),rgb(var(--c-line))_100%)]',
          '[&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/70 [&::-webkit-slider-thumb]:bg-white',
          '[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgb(var(--c-cyan)/0.18),0_2px_8px_rgb(0_0_0/0.4)]',
          '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150',
          'hover:[&::-webkit-slider-thumb]:scale-110',
          '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-line',
          '[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-accent-cyan',
          '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      />
    </div>
  );
}
