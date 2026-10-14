import { memo } from 'react';
import { cn } from '@/utils/cn';

export interface AuroraBackgroundProps {
  /** Extra class for the fixed wrapper (pages can add their own tint). */
  readonly className?: string;
  /** Dims the whole layer (used behind dense visualisers). */
  readonly intensity?: number;
}

/**
 * The ambient layer every page sits on: three drifting radial "blobs", a fine
 * grid, a vignette and a touch of grain.
 *
 * All of it is CSS — no canvas, no rAF, no React re-renders. The blobs read
 * `--algo-a/b/c`, which the visualiser rewrites per step, so the room subtly
 * changes colour with the algorithm (cyan while comparing, lime on success).
 */
export const AuroraBackground = memo(function AuroraBackground({
  className,
  intensity = 1,
}: AuroraBackgroundProps) {
  return (
    <div aria-hidden className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}>
      {/* base wash */}
      <div className="absolute inset-0 bg-bg" />

      {/* drifting blobs */}
      <div
        className="absolute -left-[18%] -top-[22%] h-[70vmax] w-[70vmax] animate-aurora rounded-full opacity-[var(--aurora-opacity)] blur-[80px]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgb(var(--c-cyan) / 0.34), rgb(var(--c-violet) / 0.18) 45%, transparent 70%)',
          animationDuration: '34s',
          opacity: `calc(var(--aurora-opacity) * ${intensity})`,
        }}
      />
      <div
        className="absolute -right-[20%] top-[6%] h-[62vmax] w-[62vmax] animate-aurora rounded-full blur-[90px]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgb(var(--c-pink) / 0.28), rgb(var(--c-violet) / 0.16) 48%, transparent 72%)',
          animationDuration: '46s',
          animationDirection: 'reverse',
          opacity: `calc(var(--aurora-opacity) * ${intensity})`,
        }}
      />
      <div
        className="absolute bottom-[-26%] left-[24%] h-[58vmax] w-[58vmax] animate-aurora rounded-full blur-[100px]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgb(var(--c-violet) / 0.26), rgb(var(--c-cyan) / 0.12) 50%, transparent 74%)',
          animationDuration: '58s',
          opacity: `calc(var(--aurora-opacity) * ${intensity} * 0.85)`,
        }}
      />

      {/* reactive accent — driven by the current algorithm step */}
      <div
        className="absolute left-1/2 top-1/2 h-[46vmax] w-[46vmax] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px] transition-[background] duration-700 ease-swift"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, var(--algo-a), transparent 65%)',
          opacity: `calc(0.12 * ${intensity})`,
        }}
      />

      {/* grid + vignette + grain */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 120% 90% at 50% 0%, black 30%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 120% 90% at 50% 0%, black 30%, transparent 78%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% -10%, transparent 40%, rgb(var(--c-bg) / 0.75) 100%)',
        }}
      />
      <div className="grain absolute inset-0" />
    </div>
  );
});
