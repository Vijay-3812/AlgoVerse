import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface WorkspaceLayoutProps {
  /** Algorithm tree (desktop column / mobile sheet content). */
  readonly sidebar: ReactNode;
  /** The visualiser stage. */
  readonly stage: ReactNode;
  /** Inspector tabs (pseudocode / code / explain / complexity). */
  readonly inspector: ReactNode;
  /** Transport + scrubber + metrics strip. */
  readonly transport: ReactNode;
  readonly className?: string;
}

/**
 * The three-column workspace.
 *
 * Layout rules (all CSS, no measurement JS):
 *   ≥1280px  sidebar │ stage │ inspector   — three columns, transport under stage+inspector
 *   1024–1280 sidebar │ stage+inspector stacked
 *   <1024px  single column; sidebar and inspector live in sheets owned by the page
 *
 * `min-h-0` on every flex child is what lets the canvas claim the remaining
 * height without the page itself scrolling.
 */
export function WorkspaceLayout({ sidebar, stage, inspector, transport, className }: WorkspaceLayoutProps) {
  return (
    <div className={cn('mx-auto flex w-full max-w-[1800px] min-h-0 flex-1 gap-3 p-3', className)}>
      {/* sidebar — desktop only; the page renders a sheet for small screens */}
      <div className="hidden shrink-0 lg:block">{sidebar}</div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-h-0 min-w-0 flex-1 gap-3">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line/60 bg-surface/30">
            {stage}
          </div>
          <div className="hidden w-[350px] shrink-0 overflow-hidden rounded-2xl border border-line/60 bg-surface/30 xl:block">
            {inspector}
          </div>
        </div>

        <div className="shrink-0">{transport}</div>
      </div>
    </div>
  );
}
