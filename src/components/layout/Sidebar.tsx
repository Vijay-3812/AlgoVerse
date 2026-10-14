import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AlgorithmMeta, CategoryId } from '@/types';
import { CATEGORIES, CATEGORY_BY_ID, algorithmsInCategory, searchAlgorithms } from '@/engine/catalogue';
import { prefetchAlgorithm } from '@/engine/registry';
import { DifficultyBadge } from '@/components/primitives/Badge';
import { Icon, type IconName } from '@/components/primitives/Icon';
import { Tooltip } from '@/components/primitives/Tooltip';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

export interface SidebarProps {
  readonly className?: string;
  /** Mobile sheets close themselves after a navigation. */
  readonly onNavigate?: () => void;
  readonly width?: number;
}

const CATEGORY_ICON: Record<CategoryId, IconName> = {
  sorting: 'bars',
  searching: 'search',
  linear: 'stack',
  hashing: 'hash',
  trees: 'tree',
  graphs: 'graph',
  recursion: 'layers',
  dp: 'table',
  greedy: 'spark',
  strings: 'text',
  misc: 'divide',
};

/**
 * The algorithm tree: searchable, collapsible, keyboard-navigable, with the
 * selected item marked by a shared-layout pill.
 *
 * Hovering an item prefetches its module chunk, so the click → animate path has
 * no network wait.
 */
export function Sidebar({ className, onNavigate, width = 300 }: SidebarProps) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { categoryId, algorithmId } = useParams<{ categoryId?: string; algorithmId?: string }>();

  const [query, setQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<CategoryId>>(
    () => new Set(categoryId ? [categoryId as CategoryId] : ['sorting']),
  );
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchAlgorithms(query, 60), [query]);
  const searching = query.trim().length > 0;

  const toggleCategory = useCallback((id: CategoryId) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Roving focus across the visible items (↑/↓/Enter). */
  const onListKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>('[data-nav-item]') ?? []);
    if (items.length === 0) return;
    event.preventDefault();
    const active = document.activeElement as HTMLElement | null;
    const index = items.findIndex((item) => item === active || item.contains(active));
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    const target = items[(next + items.length) % items.length];
    target?.focus();
  }, []);

  if (collapsed) {
    return (
      <aside className={cn('flex flex-col items-center gap-1 rounded-2xl border border-line/60 bg-surface/40 py-2', className)}>
        <Tooltip label="Expand sidebar" shortcut="]" side="right">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <Icon name="panelLeft" size={15} />
          </button>
        </Tooltip>
        {CATEGORIES.map((category) => (
          <Tooltip key={category.id} label={category.name} side="right">
            <Link
              to={`/algorithms/${category.id}`}
              aria-label={category.name}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                categoryId === category.id
                  ? 'bg-accent-cyan/12 text-accent-cyan'
                  : 'text-ink-faint hover:bg-surface hover:text-ink',
              )}
            >
              <Icon name={CATEGORY_ICON[category.id]} size={16} />
            </Link>
          </Tooltip>
        ))}
      </aside>
    );
  }

  return (
    <aside
      style={{ width }}
      className={cn('flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line/60 bg-surface/40', className)}
    >
      <div className="flex items-center gap-2 border-b border-line/60 px-3 py-2.5">
        <label className="relative flex-1">
          <span className="sr-only">Search algorithms</span>
          <Icon
            name="search"
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder="Search 90+ algorithms…"
            type="search"
            className={cn(
              'h-8 w-full rounded-lg border border-line/70 bg-bg/40 pl-8 pr-2.5 text-xs text-ink placeholder:text-ink-faint',
              'transition-colors focus:border-accent-cyan/50 focus:outline-none',
            )}
          />
        </label>
        <Tooltip label="Collapse sidebar" shortcut="[" side="bottom">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <Icon name="panelLeft" size={15} />
          </button>
        </Tooltip>
      </div>

      <div
        ref={listRef}
        onKeyDown={onListKeyDown}
        className="scroll-y flex-1 px-2 py-2"
        aria-label="Algorithm catalogue"
      >
        {searching ? (
          <SearchResults results={results} activeId={algorithmId} onNavigate={onNavigate} />
        ) : (
          CATEGORIES.map((category) => (
            <CategoryGroup
              key={category.id}
              categoryId={category.id}
              open={openCategories.has(category.id)}
              activeAlgorithmId={algorithmId}
              onToggle={() => toggleCategory(category.id)}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>

      <div className="border-t border-line/60 px-3 py-2 text-2xs text-ink-faint">
        <span className="font-mono">⌘K</span> search · <span className="font-mono">[ ]</span> collapse
      </div>
    </aside>
  );
}

function CategoryGroup({
  categoryId,
  open,
  activeAlgorithmId,
  onToggle,
  onNavigate,
}: {
  categoryId: CategoryId;
  open: boolean;
  activeAlgorithmId?: string;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const category = CATEGORY_BY_ID[categoryId];
  const algorithms = algorithmsInCategory(categoryId);
  const readyCount = algorithms.filter((a) => a.status === 'ready').length;
  const containsActive = algorithms.some((a) => a.id === activeAlgorithmId);

  return (
    <section className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
          containsActive ? 'text-ink' : 'text-ink-dim hover:bg-surface/60 hover:text-ink',
        )}
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }} className="text-ink-faint">
          <Icon name="chevronRight" size={13} />
        </motion.span>
        <Icon name={CATEGORY_ICON[categoryId]} size={15} className={cn('shrink-0', containsActive && 'text-accent-cyan')} />
        <span className="flex-1 truncate text-xs font-medium">{category.name}</span>
        <span className="font-mono text-2xs tabular-nums text-ink-faint">
          {readyCount > 0 ? `${readyCount}/` : ''}
          {algorithms.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {algorithms.map((algorithm) => (
              <AlgorithmRow
                key={algorithm.id}
                algorithm={algorithm}
                isActive={algorithm.id === activeAlgorithmId}
                onNavigate={onNavigate}
              />
            ))}
            {algorithms.length === 0 ? (
              <li className="px-3 py-2 text-2xs text-ink-faint">Nothing here yet.</li>
            ) : null}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function AlgorithmRow({
  algorithm,
  isActive,
  onNavigate,
}: {
  algorithm: AlgorithmMeta;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const soon = algorithm.status !== 'ready';

  return (
    <li>
      <Link
        to={`/algorithms/${algorithm.category}/${algorithm.id}`}
        data-nav-item
        onMouseEnter={() => prefetchAlgorithm(algorithm.id)}
        onFocus={() => prefetchAlgorithm(algorithm.id)}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-2 rounded-lg py-1.5 pl-8 pr-2 text-left transition-colors',
          isActive ? 'text-ink' : 'text-ink-dim hover:bg-surface/60 hover:text-ink',
        )}
      >
        {isActive ? (
          <motion.span
            layoutId="sidebar-active"
            transition={{ type: 'spring', stiffness: 480, damping: 38 }}
            className="absolute inset-0 -z-10 rounded-lg border border-accent-cyan/35 bg-accent-cyan/10"
          />
        ) : null}

        <span className={cn('truncate text-xs', isActive && 'font-medium')}>
          {algorithm.name}
        </span>

        <span className="ml-auto flex shrink-0 items-center gap-1.5 opacity-80">
          {soon ? (
            <span
              title={`Ships in Phase ${algorithm.phase}`}
              className="rounded border border-line/70 px-1 font-mono text-[9px] leading-4 text-ink-faint"
            >
              P{algorithm.phase}
            </span>
          ) : null}
          <span
            aria-label={algorithm.difficulty}
            title={algorithm.difficulty}
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              algorithm.difficulty === 'easy' && 'bg-accent-lime',
              algorithm.difficulty === 'medium' && 'bg-accent-amber',
              algorithm.difficulty === 'hard' && 'bg-accent-red',
            )}
          />
        </span>
      </Link>
    </li>
  );
}

function SearchResults({
  results,
  activeId,
  onNavigate,
}: {
  results: readonly AlgorithmMeta[];
  activeId?: string;
  onNavigate?: () => void;
}) {
  if (results.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-2xs text-ink-faint">
        No algorithm matches that. Try “heap”, “shortest path” or “kmp”.
      </p>
    );
  }

  return (
    <ul>
      {results.map((algorithm) => (
        <li key={algorithm.id} className="mb-1">
          <Link
            to={`/algorithms/${algorithm.category}/${algorithm.id}`}
            data-nav-item
            onMouseEnter={() => prefetchAlgorithm(algorithm.id)}
            onClick={onNavigate}
            aria-current={algorithm.id === activeId ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors',
              algorithm.id === activeId ? 'bg-accent-cyan/10 text-ink' : 'hover:bg-surface/60',
            )}
          >
            <Icon
              name={CATEGORY_ICON[algorithm.category]}
              size={14}
              className="shrink-0 text-ink-faint"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-ink">{algorithm.name}</span>
              <span className="block truncate text-2xs text-ink-faint">{algorithm.blurb}</span>
            </span>
            <DifficultyBadge difficulty={algorithm.difficulty} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
