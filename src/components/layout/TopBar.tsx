import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { AlgoVerseLogo, Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Tooltip } from '@/components/primitives/Tooltip';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useUiStore } from '@/store/uiStore';
import { resetTour } from './GuidedTour';
import { usePlaybackStore } from '@/store/playbackStore';
import { ALGORITHM_BY_ID, CATEGORY_BY_ID } from '@/engine/catalogue';
import type { CategoryId } from '@/types';

/**
 * Top bar: identity, breadcrumb, search trigger and theme control.
 *
 * Height is fixed (--topbar-h) so the workspace grid below can claim the rest
 * of the viewport without a single JS measurement.
 */
export function TopBar() {
  const location = useLocation();
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setTourOpen = useUiStore((s) => s.setTourOpen);
  const status = usePlaybackStore((s) => s.playback.status);

  const crumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const items: Array<{ label: string; to: string }> = [];
    if (segments[0] === 'algorithms' && segments[1]) {
      const category = CATEGORY_BY_ID[segments[1] as CategoryId];
      if (category) items.push({ label: category.name, to: `/algorithms/${category.id}` });
      if (segments[2]) {
        const algorithm = ALGORITHM_BY_ID.get(segments[2]);
        items.push({ label: algorithm?.name ?? segments[2], to: location.pathname });
      }
    }
    return items;
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 h-[var(--topbar-h)] shrink-0 border-b border-line/50 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1800px] items-center gap-3 px-3 sm:px-4">
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-xl pr-2 transition-opacity hover:opacity-90"
          aria-label="AlgoVerse home"
        >
          <motion.span
            whileHover={{ rotate: -6, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="block"
          >
            <AlgoVerseLogo size={30} />
          </motion.span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-sm font-semibold tracking-tight text-ink">AlgoVerse</span>
            <span className="text-2xs text-ink-faint">trace-driven visualiser</span>
          </span>
        </Link>

        {crumbs.length ? (
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-xs text-ink-dim md:flex">
            <Icon name="chevronRight" size={13} className="text-ink-faint/60" />
            {crumbs.map((crumb, index) => (
              <span key={crumb.to} className="flex min-w-0 items-center gap-1.5">
                {index > 0 ? <span className="text-ink-faint/50">/</span> : null}
                <Link
                  to={crumb.to}
                  className="truncate rounded-md px-1 py-0.5 transition-colors hover:bg-surface/60 hover:text-ink"
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <motion.span
            animate={{ opacity: status === 'playing' ? 1 : 0.35 }}
            className="hidden items-center gap-1.5 rounded-full border border-line/60 bg-surface/50 px-2.5 py-1 text-2xs text-ink-dim sm:flex"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-lime opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-lime" />
            </span>
            engine live
          </motion.span>

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden h-8 items-center gap-2 rounded-lg border border-line/70 bg-surface/50 px-2.5 text-2xs text-ink-faint transition-colors hover:border-accent-cyan/40 hover:text-ink-dim sm:flex"
            aria-label="Search algorithms"
          >
            <Icon name="search" size={13} />
            <span>Search</span>
            <kbd className="kbd">⌘K</kbd>
          </button>

          <Tooltip label="Command palette" shortcut="⌘K" side="bottom">
            <Button
              size="icon-sm"
              variant="ghost"
              className="sm:hidden"
              aria-label="Open command palette"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Icon name="search" size={15} />
            </Button>
          </Tooltip>

          <Tooltip label="Guided tour" shortcut="?" side="bottom">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Start the guided tour"
              onClick={() => {
                // Clearing the dismissal means the button always works, even
                // for someone who skipped the tour months ago.
                resetTour();
                setTourOpen(true);
                setCommandPaletteOpen(false);
              }}
            >
              <Icon name="compass" size={15} />
            </Button>
          </Tooltip>

          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
