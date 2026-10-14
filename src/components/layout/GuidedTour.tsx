import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/primitives/Button';
import { Icon, type IconName } from '@/components/primitives/Icon';
import { cn } from '@/utils/cn';

const STORAGE_KEY = 'algoverse.tour';

export interface TourStep {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly icon: IconName;
  /**
   * `document.querySelector` target to cut out of the dim layer. `null` centres
   * the card — used for steps that describe the app as a whole.
   */
  readonly target: string | null;
  /** Where the card sits relative to the cut-out. */
  readonly place?: 'right' | 'bottom' | 'top' | 'left' | 'center';
}

/**
 * The tour script. Deliberately five steps: a six-minute onboarding is a
 * product decision, not a feature, and every extra step halves the completion
 * rate.
 */
const STEPS: readonly TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AlgoVerse',
    body: 'Every animation you are about to see is a recording, not a re-enactment: the algorithm produced a list of steps, and the UI only replays them. Five things are worth knowing.',
    icon: 'rocket',
    target: null,
  },
  {
    id: 'sidebar',
    title: 'Pick anything, 90+ algorithms',
    body: 'The tree on the left holds every category. Anything marked with a phase badge still lands in a later release — everything else is fully playable right now.',
    icon: 'grid',
    target: '[data-tour="sidebar"]',
    place: 'right',
  },
  {
    id: 'stage',
    title: 'This is a single step',
    body: 'The stage draws one snapshot of the algorithm. Hover a bar, node or cell to inspect it, then move the playhead to see the same structure at a different moment.',
    icon: 'layers',
    target: '[data-tour="stage"]',
    place: 'bottom',
  },
  {
    id: 'transport',
    title: 'Drive it from the keyboard',
    body: 'Space plays and pauses, ← and → step, R resets, + and − change speed, End jumps to the finish. The scrubber underneath is the whole trace — every tick is a recorded step.',
    icon: 'play',
    target: '[data-tour="transport"]',
    place: 'top',
  },
  {
    id: 'inspector',
    title: 'Pseudocode, code, complexity, Learn',
    body: 'The inspector follows the playhead line by line across four languages, and the Learn tab turns the algorithm into use cases, a quiz and practice problems.',
    icon: 'book',
    target: '[data-tour="inspector"]',
    place: 'left',
  },
];

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function measure(target: string | null): Rect | null {
  if (!target || typeof document === 'undefined') return null;
  const node = document.querySelector(target);
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/**
 * First-run walkthrough: a spotlight over the real workspace, not screenshots.
 *
 * The cut-out is measured from the live DOM (and re-measured on resize and on
 * every step), so the tour cannot drift out of sync with the layout — which is
 * exactly what breaks every hard-coded onboarding overlay.
 */
export function GuidedTour() {
  const location = useLocation();
  const open = useUiStore((s) => s.tourOpen);
  const setOpen = useUiStore((s) => s.setTourOpen);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const steps = useMemo(() => STEPS, []);
  const step = steps[Math.min(index, steps.length - 1)] as TourStep;

  // The tour is about the workspace; leaving the page ends it rather than
  // pointing a spotlight at nothing.
  useEffect(() => {
    if (open && !/^\/algorithms\/[^/]+\/[^/?#]+/.test(location.pathname)) setOpen(false);
  }, [location.pathname, open, setOpen]);

  useEffect(() => {
    if (!open) return undefined;
    const update = (): void => setRect(measure(step.target));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    // The stage and inspector mount asynchronously (lazy chunks), so one
    // measurement is not enough.
    const timers = [120, 400, 900].map((ms) => window.setTimeout(update, ms));
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      timers.forEach(window.clearTimeout);
    };
  }, [open, step]);

  const finish = useCallback(
    (completed: boolean): void => {
      setOpen(false);
      setIndex(0);
      try {
        window.localStorage.setItem(STORAGE_KEY, completed ? 'done' : 'skipped');
      } catch {
        /* private mode — the tour simply reappears next visit */
      }
    },
    [setOpen],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') finish(false);
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish, open, steps.length]);

  const padding = 8;
  const hole = rect
    ? {
        x: rect.x - padding,
        y: rect.y - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }
    : null;

  const cardStyle = cardPosition(hole, step.place ?? 'right');

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Guided tour"
        >
          {/* Dim layer with a cut-out: four rectangles rather than a mask, so
              the hole has no border-radius rounding artefacts in Safari. */}
          {hole ? (
            <>
              <Backdrop style={{ left: 0, top: 0, right: 0, height: Math.max(0, hole.y) }} />
              <Backdrop style={{ left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.height }} />
              <Backdrop
                style={{
                  left: hole.x + hole.width,
                  top: hole.y,
                  right: 0,
                  height: hole.height,
                }}
              />
              <Backdrop style={{ left: 0, top: hole.y + hole.height, right: 0, bottom: 0 }} />
              <motion.div
                layout
                className="pointer-events-none absolute rounded-2xl ring-2 ring-accent-cyan/70"
                style={{ left: hole.x, top: hole.y, width: hole.width, height: hole.height }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, boxShadow: '0 0 40px -6px rgb(var(--c-cyan) / 0.55)' }}
                transition={{ duration: 0.25 }}
              />
            </>
          ) : (
            <Backdrop style={{ inset: 0 }} />
          )}

          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={cardStyle}
            className="glass-strong absolute w-[min(92vw,380px)] rounded-2xl border-line/70 p-4"
          >
            <header className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan">
                <Icon name={step.icon} size={14} />
              </span>
              <h2 className="font-display text-sm font-semibold tracking-tight text-ink">{step.title}</h2>
              <button
                type="button"
                onClick={() => finish(false)}
                aria-label="Close the tour"
                className="ml-auto rounded-md p-1 text-ink-faint transition-colors hover:bg-surface/60 hover:text-ink"
              >
                <Icon name="close" size={14} />
              </button>
            </header>

            <p className="text-xs leading-relaxed text-ink-dim">{step.body}</p>

            <footer className="mt-3 flex items-center gap-2">
              <span className="flex items-center gap-1" aria-hidden>
                {steps.map((entry, dotIndex) => (
                  <span
                    key={entry.id}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      dotIndex === index ? 'w-5 bg-accent-cyan' : 'w-1.5 bg-line',
                    )}
                  />
                ))}
              </span>
              <span className="font-mono text-2xs text-ink-faint">
                {index + 1}/{steps.length}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                {index > 0 ? (
                  <Button size="sm" variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                    Back
                  </Button>
                ) : null}
                {index < steps.length - 1 ? (
                  <Button size="sm" variant="primary" onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}>
                    Next
                  </Button>
                ) : (
                  <Button size="sm" variant="primary" onClick={() => finish(true)}>
                    Start exploring
                  </Button>
                )}
              </div>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Backdrop({ style }: { style: React.CSSProperties }) {
  return <div aria-hidden className="absolute bg-bg/70 backdrop-blur-[2px]" style={style} />;
}

/** Places the card next to the cut-out, clamped inside the viewport. */
function cardPosition(hole: Rect | null, place: TourStep['place']): React.CSSProperties {
  const width = 380;
  const margin = 20;
  if (!hole) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  switch (place) {
    case 'left':
      return { left: Math.max(margin, hole.x - width - margin), top: clampY(hole.y + 24) };
    case 'bottom':
      return { left: clampX(hole.x + hole.width / 2 - width / 2, maxX), top: clampY(hole.y + hole.height + margin) };
    case 'top':
      return { left: clampX(hole.x + hole.width / 2 - width / 2, maxX), bottom: Math.max(margin, window.innerHeight - hole.y + margin) };
    case 'right':
    default:
      return { left: clampX(hole.x + hole.width + margin, maxX), top: clampY(hole.y + 24) };
  }
}

function clampX(value: number, max: number): number {
  return Math.min(Math.max(value, 20), max);
}

function clampY(value: number): number {
  return Math.min(Math.max(value, 20), Math.max(20, window.innerHeight - 220));
}

/** True when the tour has never been seen (or was explicitly skipped). */
export function shouldAutoStartTour(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

/** Forgets the dismissal, so "Show the tour" always works. */
export function resetTour(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
