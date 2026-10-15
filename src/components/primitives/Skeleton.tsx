import { cn } from '@/utils/cn';

/** Shimmering placeholder — used while an algorithm chunk streams in. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        'relative overflow-hidden rounded-lg bg-surface/60',
        'after:absolute after:inset-0 after:animate-shimmer',
        'after:bg-[linear-gradient(90deg,transparent,rgb(var(--c-ink)/0.07),transparent)] after:bg-[length:200%_100%]',
        className,
      )}
    />
  );
}

const BAR_HEIGHTS = [38, 70, 52, 88, 60, 96, 44, 76, 56, 84] as const;

/** Skeleton stand-in for the visualiser stage, shaped like a bar chart. */
export function VisualizerSkeleton({ label = 'Loading visualiser…' }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 p-8" role="status" aria-live="polite">
      <div className="flex h-44 items-end gap-2">
        {BAR_HEIGHTS.map((height, index) => (
          <Skeleton key={index} className="w-5 rounded-md" style={{ height: `${height}%` }} />
        ))}
      </div>
      <p className="text-xs text-ink-faint">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  );
}
