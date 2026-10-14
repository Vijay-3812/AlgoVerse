import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/primitives/Button';
import { Icon, type IconName } from '@/components/primitives/Icon';
import { Tooltip } from '@/components/primitives/Tooltip';
// Imported lazily: the SVG scene builder and the GIF encoder are ~40 kB that
// nobody needs until they actually press export.
const exportStage = () => import('@/utils/exportStage');
import { cn } from '@/utils/cn';

export interface ExportMenuProps {
  /** Human name of the algorithm — used for the filename and the image title. */
  readonly title: string;
  /** Copies a link to the current session (owned by the page's URL hook). */
  readonly onCopyLink: (step?: number) => void;
  readonly className?: string;
}

/**
 * Export and share, in one popover.
 *
 * Everything here is derived from the trace, so an export always matches the
 * frame on screen — including the theme, the playhead and the caption. The GIF
 * button samples the whole run, which is what makes it useful in a README.
 */
export function ExportMenu({ title, onCopyLink, className }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trace = usePlaybackStore((s) => s.trace);
  const cursor = usePlaybackStore((s) => s.playback.cursor);
  const length = usePlaybackStore((s) => s.playback.length);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const disabled = !trace || trace.steps.length === 0;

  const run = async (action: () => Promise<void> | void): Promise<void> => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const currentStep = trace?.steps[cursor] ?? null;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Tooltip label="Export / share" shortcut="⇧E" side="top">
        <Button
          size="icon-sm"
          variant="secondary"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Export and share"
          disabled={disabled || busy}
          loading={busy}
        >
          <Icon name="download" size={15} />
        </Button>
      </Tooltip>

      <AnimatePresence>
        {open && currentStep ? (
          <motion.div
            role="menu"
            aria-label="Export and share"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong absolute right-0 top-full z-40 mt-2 w-64 rounded-xl p-1.5"
          >
            <MenuItem
              icon="image"
              label="PNG — this frame"
              hint="2400 × 1350"
              onSelect={() =>
                run(async () => {
                  const { exportStepPng } = await exportStage();
                  await exportStepPng(
                    currentStep,
                    { theme, title, step: { index: cursor, total: length } },
                    `${title}-step-${cursor + 1}`,
                  );
                })
              }
            />
            <MenuItem
              icon="code"
              label="SVG — this frame"
              hint="vector, editable"
              onSelect={() =>
                run(async () => {
                  const { exportStepSvg } = await exportStage();
                  exportStepSvg(
                    currentStep,
                    { theme, title, step: { index: cursor, total: length } },
                    `${title}-step-${cursor + 1}`,
                  );
                })
              }
            />
            <MenuItem
              icon="play"
              label="GIF — whole run"
              hint={`${Math.min(length, 40)} frames`}
              onSelect={() =>
                run(async () => {
                  if (!trace) return;
                  const { exportTraceGif } = await exportStage();
                  await exportTraceGif(trace, {
                    theme,
                    title,
                    filename: `${title}-run`,
                    maxFrames: 40,
                    delayMs: 110,
                  });
                })
              }
            />
            <div className="my-1 h-px bg-line/60" />
            <MenuItem icon="link" label="Copy share link" hint="opens at this step" onSelect={() => onCopyLink(cursor)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onSelect,
}: {
  icon: IconName;
  label: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-cyan"
    >
      <Icon name={icon} size={14} className="text-ink-faint" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-2xs text-ink">{label}</span>
        <span className="block truncate font-mono text-2xs text-ink-faint">{hint}</span>
      </span>
    </button>
  );
}
