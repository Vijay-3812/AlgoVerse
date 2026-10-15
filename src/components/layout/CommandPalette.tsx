import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Theme } from '@/types';
import { ALGORITHM_BY_ID, CATEGORY_BY_ID, searchAlgorithms } from '@/engine/catalogue';
import { prefetchAlgorithm } from '@/engine/registry';
import { useUiStore } from '@/store/uiStore';
import { useThemeStore } from '@/store/themeStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { toast } from '@/store/toastStore';
import { Icon, type IconName } from '@/components/primitives/Icon';
import { DifficultyBadge } from '@/components/primitives/Badge';
import { cn } from '@/utils/cn';

/**
 * ⌘K — one box that runs things.
 *
 * The palette has two halves: **algorithms** (fuzzy search over the catalogue,
 * prefetched on hover so the chunk is warm before you commit) and **commands**
 * (theme, playback, learning, sharing). Commands are built from the current
 * location, so they are always about what is actually on screen — "Compare
 * Dijkstra" does not exist on the sorting page, and "Export this frame" only
 * appears when there is a frame to export.
 *
 * Commands are matched on their keywords as well as their label, which is what
 * lets `themes`, `neon` and `cyberpunk` all find the same row.
 */

interface Command {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly icon: IconName;
  /** Extra search terms — acronyms, synonyms, the thing people actually type. */
  readonly keywords: string;
  readonly run: () => void;
}

const THEME_COMMANDS: readonly { readonly theme: Theme; readonly label: string; readonly hint: string }[] = [
  { theme: 'dark', label: 'Theme: Dark', hint: 'the default, tuned for long sessions' },
  { theme: 'light', label: 'Theme: Light', hint: 'high contrast, daylight friendly' },
  { theme: 'cyberpunk', label: 'Theme: Cyberpunk', hint: 'neon, magenta, loud' },
];

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const toggleSound = useUiStore((s) => s.toggleSound);
  const compareMode = useUiStore((s) => s.compareMode);
  const setCompareMode = useUiStore((s) => s.setCompareMode);
  const setTheme = useThemeStore((s) => s.setTheme);
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  /** The algorithm in the URL, if any — the anchor for context commands. */
  const current = useMemo(() => {
    const match = /^\/algorithms\/[^/]+\/([^/?#]+)/.exec(location.pathname);
    return match?.[1] ? ALGORITHM_BY_ID.get(match[1]) : undefined;
  }, [location.pathname]);

  const comparePartnerFrom = /^\/compare\/([^/]+)/.exec(location.pathname)?.[1];
  const compareAnchor = current ?? (comparePartnerFrom ? ALGORITHM_BY_ID.get(comparePartnerFrom) : undefined);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];
    const playback = usePlaybackStore.getState();
    const cursor = playback.playback.cursor;

    if (compareAnchor) {
      const sibling = [...ALGORITHM_BY_ID.values()].find(
        (entry) => entry.category === compareAnchor.category && entry.status === 'ready' && entry.id !== compareAnchor.id,
      );
      if (sibling) {
        list.push({
          id: 'compare',
          label: `Compare ${compareAnchor.name} with ${sibling.name}`,
          hint: 'two lanes, one shared cursor',
          icon: 'users',
          keywords: 'race versus side by side diff benchmark compare mode',
          run: () => navigate(`/compare/${compareAnchor.id}/${sibling.id}`),
        });
      }
    }

    if (playback.trace) {
      list.push({
        id: 'export-frame',
        label: 'Export this frame as PNG',
        hint: `step ${cursor + 1} of ${playback.playback.length}`,
        icon: 'download',
        keywords: 'download image screenshot svg share picture',
        run: () => {
          const trace = usePlaybackStore.getState().trace;
          const step = trace?.steps[usePlaybackStore.getState().playback.cursor] ?? trace?.steps[0];
          if (!step) return;
          void import('@/utils/exportStage').then(({ exportStepPng }) =>
            exportStepPng(
              step,
              { theme: useThemeStore.getState().theme, title: 'AlgoVerse', step: { index: cursor, total: playback.playback.length } },
              'algoverse-frame',
            ),
          );
        },
      });
      list.push({
        id: 'copy-link',
        label: 'Copy a link to this step',
        hint: 'the URL carries the input, theme and playhead',
        icon: 'link',
        keywords: 'share url permalink clipboard',
        run: () => {
          const url = window.location.href;
          void navigator.clipboard
            ?.writeText(url)
            .then(() => toast.success('Link copied', 'It reopens on this exact step.'))
            .catch(() => toast.warning('Could not copy automatically', url));
        },
      });
      list.push({
        id: 'play',
        label: playback.playback.status === 'playing' ? 'Pause' : 'Play',
        hint: 'space',
        icon: playback.playback.status === 'playing' ? 'pause' : 'play',
        keywords: 'start stop transport run',
        run: () => usePlaybackStore.getState().toggle(),
      });
      list.push({
        id: 'restart',
        label: 'Restart the trace',
        hint: 'back to step 1',
        icon: 'reset',
        keywords: 'reset rewind beginning',
        run: () => {
          usePlaybackStore.getState().jumpTo('start');
        },
      });
    }

    if (current) {
      list.push({
        id: 'learn',
        label: `Learn about ${current.name}`,
        hint: 'use cases, quiz, practice problems',
        icon: 'book',
        keywords: 'study explain theory quiz interview',
        run: () => {
          useUiStore.getState().setRightPanelTab('learn');
          toast.info('Learn Mode', 'Opened the Learn tab in the inspector.');
        },
      });
      list.push({
        id: 'complexity',
        label: 'Show the complexity breakdown',
        hint: 'best, average, worst and space',
        icon: 'compass',
        keywords: 'big o runtime bounds',
        run: () => useUiStore.getState().setRightPanelTab('complexity'),
      });
    }

    for (const theme of THEME_COMMANDS) {
      list.push({
        id: `theme-${theme.theme}`,
        label: theme.label,
        hint: theme.hint,
        icon: theme.theme === 'light' ? 'sun' : theme.theme === 'cyberpunk' ? 'zap' : 'moon',
        keywords: 'appearance colours colors palette dark light neon switch',
        run: () => setTheme(theme.theme),
      });
    }

    list.push({
      id: 'sound',
      label: soundEnabled ? 'Mute the step sounds' : 'Unmute the step sounds',
      hint: soundEnabled ? 'Web Audio is on' : 'currently silent',
      icon: soundEnabled ? 'sound' : 'mute',
      keywords: 'audio click blips volume toggle',
      run: toggleSound,
    });

    list.push({
      id: 'compare-mode',
      label: compareMode ? 'Leave Compare Mode' : 'Enter Compare Mode',
      hint: current ? `race ${current.name} against a sibling` : 'pick any two algorithms',
      icon: 'users',
      keywords: 'race two lanes lockstep',
      run: () => {
        setCompareMode(!compareMode);
        if (!compareMode) {
          const anchor = compareAnchor ?? ALGORITHM_BY_ID.get('bubble-sort');
          const sibling = anchor
            ? [...ALGORITHM_BY_ID.values()].find(
                (entry) => entry.category === anchor.category && entry.status === 'ready' && entry.id !== anchor.id,
              )
            : undefined;
          if (anchor && sibling) navigate(`/compare/${anchor.id}/${sibling.id}`);
        }
      },
    });

    list.push({
      id: 'random',
      label: 'Feeling lucky — open a random algorithm',
      hint: 'somewhere you have not been yet',
      icon: 'shuffle',
      keywords: 'surprise random explore discover',
      run: () => {
        const ready = [...ALGORITHM_BY_ID.values()].filter((entry) => entry.status === 'ready');
        const pick = ready[Math.floor(Math.random() * ready.length)];
        if (pick) navigate(`/algorithms/${pick.category}/${pick.id}`);
      },
    });

    list.push({
      id: 'home',
      label: 'Go to the catalogue',
      hint: 'every category, one page',
      icon: 'grid',
      keywords: 'home index browse landing all algorithms',
      run: () => navigate('/'),
    });

    return list;
  }, [compareAnchor, compareMode, current, navigate, setCompareMode, setTheme, soundEnabled, toggleSound]);

  const matchedCommands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(needle) || command.keywords.includes(needle),
    );
  }, [commands, query]);

  const results = useMemo(() => searchAlgorithms(query, query.trim() ? 8 : 6), [query]);

  /** One flat list so ↑/↓ can cross the section boundary. */
  const rows = useMemo(
    () => [
      ...matchedCommands.map((command) => ({ kind: 'command' as const, command })),
      ...results.map((algorithm) => ({ kind: 'algorithm' as const, algorithm })),
    ],
    [matchedCommands, results],
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus after the enter animation starts, otherwise Safari ignores it.
      const id = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (activeIndex >= rows.length) setActiveIndex(0);
  }, [activeIndex, rows.length]);

  const commit = useCallback(
    (row: (typeof rows)[number] | undefined) => {
      if (!row) return;
      setOpen(false);
      if (row.kind === 'command') row.command.run();
      else navigate(`/algorithms/${row.algorithm.category}/${row.algorithm.id}`);
    },
    [navigate, setOpen],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(1, rows.length));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + rows.length) % Math.max(1, rows.length));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        commit(rows[activeIndex]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    },
    [activeIndex, commit, rows, setOpen],
  );

  const commandCount = matchedCommands.length;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[85] flex items-start justify-center bg-bg/60 px-4 pt-[12vh] backdrop-blur-sm"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -14, scale: 0.97, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.98, filter: 'blur(6px)' }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl border-line/70"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-2.5 border-b border-line/60 px-4 py-3">
              <Icon name="search" size={16} className="text-ink-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                placeholder="An algorithm, or a command — try “dijkstra”, “cyberpunk”, “export”…"
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                aria-label="Search algorithms and commands"
                aria-controls="command-results"
                role="combobox"
                aria-expanded
                aria-autocomplete="list"
              />
              <kbd className="kbd">esc</kbd>
            </div>

            <ul id="command-results" role="listbox" className="scroll-y max-h-[52vh] p-2">
              {commandCount > 0 ? (
                <li
                  role="presentation"
                  className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint"
                >
                  commands
                </li>
              ) : null}

              {rows.map((row, index) =>
                row.kind === 'command' ? (
                  <li key={row.command.id} role="option" aria-selected={index === activeIndex}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(row)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        index === activeIndex ? 'bg-accent-cyan/10' : 'hover:bg-surface/60',
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-surface/50 text-accent-cyan">
                        <Icon name={row.command.icon} size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{row.command.label}</span>
                        <span className="mt-0.5 block truncate text-2xs text-ink-faint">{row.command.hint}</span>
                      </span>
                    </button>
                  </li>
                ) : null,
              )}

              {results.length > 0 ? (
                <li
                  role="presentation"
                  className="px-3 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint"
                >
                  algorithms
                </li>
              ) : null}

              {rows.map((row, index) =>
                row.kind === 'algorithm' ? (
                  <li key={row.algorithm.id} role="option" aria-selected={index === activeIndex}>
                    <button
                      type="button"
                      onMouseEnter={() => {
                        setActiveIndex(index);
                        prefetchAlgorithm(row.algorithm.id);
                      }}
                      onClick={() => commit(row)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        index === activeIndex ? 'bg-accent-cyan/10' : 'hover:bg-surface/60',
                      )}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm text-ink">{row.algorithm.name}</span>
                          {row.algorithm.status !== 'ready' ? (
                            <span className="rounded border border-line/70 px-1 font-mono text-[9px] leading-4 text-ink-faint">
                              Phase {row.algorithm.phase}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-2xs text-ink-faint">
                          {CATEGORY_BY_ID[row.algorithm.category].name} · {row.algorithm.blurb}
                        </span>
                      </span>
                      <DifficultyBadge difficulty={row.algorithm.difficulty} />
                    </button>
                  </li>
                ) : null,
              )}

              {rows.length === 0 ? (
                <li className="px-3 py-8 text-center text-xs text-ink-faint">
                  Nothing found. AlgoVerse tracks 90+ algorithms — try a category, a theme, or “export”.
                </li>
              ) : null}
            </ul>

            <div className="flex items-center justify-between border-t border-line/60 px-4 py-2 text-2xs text-ink-faint">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="kbd">↑</kbd>
                  <kbd className="kbd">↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="kbd">↵</kbd> run
                </span>
              </span>
              <span className="font-mono">
                {commandCount} command{commandCount === 1 ? '' : 's'} · {results.length} algorithm
                {results.length === 1 ? '' : 's'}
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
