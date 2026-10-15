import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { VisualRole } from '@/types';
import { Badge } from '@/components/primitives/Badge';
import { cn } from '@/utils/cn';

/**
 * Shared chrome for every visualiser: caption, badges, legend and the empty
 * state. Keeping it here means a new renderer inherits the app's look, and the
 * legend vocabulary stays identical across categories (a lime node always means
 * "confirmed", whichever structure you are looking at).
 */

export const ROLE_LABEL: Record<VisualRole, string> = {
  idle: 'idle',
  active: 'active',
  compare: 'comparing',
  swap: 'swap',
  pivot: 'pivot',
  sorted: 'placed',
  visited: 'visited',
  frontier: 'frontier',
  path: 'path',
  success: 'success',
  danger: 'danger',
  ghost: 'removed',
  muted: 'eliminated',
};

/** Literal swatches — Canvas and the legend both need raw colour. */
const ROLE_SWATCH: Record<VisualRole, string> = {
  idle: 'rgb(var(--c-ink-faint) / 0.5)',
  active: 'rgb(var(--c-cyan))',
  compare: 'rgb(var(--c-amber))',
  swap: 'rgb(var(--c-pink))',
  pivot: 'rgb(var(--c-violet))',
  sorted: 'rgb(var(--c-lime))',
  visited: 'rgb(var(--c-violet))',
  frontier: 'rgb(var(--c-amber))',
  path: 'rgb(var(--c-lime))',
  success: 'rgb(var(--c-lime))',
  danger: 'rgb(var(--c-red))',
  ghost: 'rgb(var(--c-ink-faint) / 0.35)',
  muted: 'rgb(var(--c-line))',
};

export function RoleSwatch({ role, className }: { role: VisualRole; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-2 w-2 rounded-[3px]', className)}
      style={{ background: ROLE_SWATCH[role] }}
    />
  );
}

export function Legend({ roles, className }: { roles: readonly VisualRole[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {roles.map((role) => (
        <li key={role} className="flex items-center gap-1.5 text-2xs text-ink-faint">
          <RoleSwatch role={role} />
          {ROLE_LABEL[role]}
        </li>
      ))}
    </ul>
  );
}

export function BadgeRow({
  badges,
  className,
}: {
  badges?: Readonly<Record<string, string | number>> | undefined;
  className?: string;
}) {
  if (!badges) return null;
  const entries = Object.entries(badges);
  if (entries.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {entries.map(([key, value]) => (
        <Badge key={key} tone="neutral" mono>
          <span className="text-ink-faint">{key}</span>
          <span className="text-ink">{value}</span>
        </Badge>
      ))}
    </div>
  );
}

export function Caption({ text, className }: { text?: string | undefined; className?: string }) {
  if (!text) return null;
  return (
    <p className={cn('font-mono text-2xs text-ink-dim', className)}>
      <span className="text-accent-cyan">›</span> {text}
    </p>
  );
}

/** Rendered when a trace has nothing to draw (degenerate input, guard). */
export function EmptyStage({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <p className="max-w-sm text-center text-xs text-ink-faint">{message}</p>
    </div>
  );
}

/** Ambient glow behind any stage, tinted by the current role. */
export function StageGlow({ role }: { role: VisualRole }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      animate={{ opacity: [0.5, 0.85, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        background: `radial-gradient(60% 60% at 50% 40%, ${ROLE_SWATCH[role]}22, transparent 70%)`,
      }}
    />
  );
}

export interface VisualizerShellProps {
  readonly children: ReactNode;
  readonly caption?: string | undefined;
  readonly badges?: Readonly<Record<string, string | number>> | undefined;
  readonly roles?: readonly VisualRole[];
  readonly className?: string;
  /** Dims/locks interaction for the Compare Mode's inactive lane. */
  readonly dimmed?: boolean;
}

/** Standard stage frame: badges, caption, legend, content. */
export function VisualizerShell({
  children,
  caption,
  badges,
  roles,
  className,
  dimmed = false,
}: VisualizerShellProps) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden',
        dimmed && 'opacity-60',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <Caption text={caption} className="min-w-0 flex-1" />
        <BadgeRow badges={badges} />
      </div>

      <div className="relative min-h-0 flex-1">{children}</div>

      {roles && roles.length > 0 ? (
        <Legend roles={roles} className="border-t border-line/50 px-4 py-2" />
      ) : null}
    </div>
  );
}
