import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import type { AlgorithmMeta, CategoryId } from '@/types';
import { CATEGORY_BY_ID, algorithmsInCategory } from '@/engine/catalogue';
import { prefetchAlgorithm } from '@/engine/registry';
import { TiltCard } from '@/components/cards/TiltCard';
import { DifficultyBadge } from '@/components/primitives/Badge';
import { Icon, type IconName } from '@/components/primitives/Icon';
import { staggerChild, staggerContainer } from '@/components/layout/RouteTransition';
import { NotFoundPage } from './NotFoundPage';
import { cn } from '@/utils/cn';

const ICON: Record<CategoryId, IconName> = {
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

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

/**
 * Category page: the algorithm list for one bucket.
 *
 * The glyph carries the same `layoutId` as the landing card, so arriving here
 * feels like the card *became* the page (Framer Motion morphs it across the
 * route change) rather than a cut to a new screen.
 */
export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const category = categoryId ? CATEGORY_BY_ID[categoryId as CategoryId] : undefined;

  if (!category) return <NotFoundPage title="No such category" />;

  const algorithms = [...algorithmsInCategory(category.id)].sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.name.localeCompare(b.name),
  );
  const ready = algorithms.filter((a) => a.status === 'ready').length;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-2xs text-ink-faint transition-colors hover:bg-surface/60 hover:text-ink"
      >
        <Icon name="chevronLeft" size={12} />
        All categories
      </Link>

      <header className="mt-4 flex flex-wrap items-start gap-4">
        <motion.span
          layoutId={`category-glyph-${category.id}`}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line/60 bg-surface/70 text-accent-cyan"
        >
          <Icon name={ICON[category.id]} size={26} />
        </motion.span>

        <div className="min-w-0 flex-1">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
          >
            {category.name}
          </motion.h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-ink-dim">{category.blurb}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line/70 bg-surface/50 px-3 py-1 font-mono text-2xs text-ink-dim">
            {ready}/{algorithms.length} playable
          </span>
          <span className="rounded-full border border-accent-violet/35 bg-accent-violet/10 px-3 py-1 font-mono text-2xs text-accent-violet">
            Phase {category.phase}
          </span>
        </div>
      </header>

      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {algorithms.map((algorithm) => (
          <AlgorithmCard key={algorithm.id} algorithm={algorithm} />
        ))}
      </motion.ul>

      {algorithms.length === 0 ? (
        <p className="mt-10 text-center text-xs text-ink-faint">This category is still empty.</p>
      ) : null}
    </div>
  );
}

function AlgorithmCard({ algorithm }: { algorithm: AlgorithmMeta }) {
  const playable = algorithm.status === 'ready';

  return (
    <motion.li variants={staggerChild}>
      <TiltCard maxTilt={4}>
        <Link
          to={`/algorithms/${algorithm.category}/${algorithm.id}`}
          onMouseEnter={() => prefetchAlgorithm(algorithm.id)}
          onFocus={() => prefetchAlgorithm(algorithm.id)}
          className={cn(
            'glass flex h-full flex-col gap-3 rounded-2xl border-line/60 p-4 transition-colors duration-300',
            'hover:border-accent-cyan/40',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">{algorithm.name}</h2>
            <DifficultyBadge difficulty={algorithm.difficulty} />
          </div>

          <p className="text-2xs leading-relaxed text-ink-dim">{algorithm.blurb}</p>

          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            {playable ? (
              <span className="rounded-full border border-accent-lime/35 bg-accent-lime/10 px-2 py-0.5 text-2xs text-accent-lime">
                playable
              </span>
            ) : (
              <span className="rounded-full border border-line/70 px-2 py-0.5 text-2xs text-ink-faint">
                Phase {algorithm.phase}
              </span>
            )}
            {algorithm.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full border border-line/60 px-2 py-0.5 font-mono text-[10px] text-ink-faint">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1 text-2xs text-ink-faint transition-colors group-hover:text-accent-cyan">
            <Icon name="play" size={11} filled />
            Open visualiser
          </div>
        </Link>
      </TiltCard>
    </motion.li>
  );
}
