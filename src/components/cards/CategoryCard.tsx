import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CategoryMeta } from '@/types';
import { countByStatus } from '@/engine/catalogue';
import { Icon, type IconName } from '@/components/primitives/Icon';
import { TiltCard } from './TiltCard';
import { staggerChild } from '@/components/layout/RouteTransition';
import { cn } from '@/utils/cn';

const ICON: Record<CategoryMeta['id'], IconName> = {
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

const ACCENT_CLASS: Record<CategoryMeta['accent'], string> = {
  cyan: 'from-accent-cyan/25 text-accent-cyan',
  violet: 'from-accent-violet/25 text-accent-violet',
  pink: 'from-accent-pink/25 text-accent-pink',
  lime: 'from-accent-lime/25 text-accent-lime',
  amber: 'from-accent-amber/25 text-accent-amber',
};

export interface CategoryCardProps {
  readonly category: CategoryMeta;
  /** Featured cards get the gradient border treatment. */
  readonly featured?: boolean;
}

/**
 * Category tile with tilt + spotlight. The icon tile carries a `layoutId`, so
 * navigating into the category morphs this exact element into the page header
 * instead of cutting to a new screen.
 */
export function CategoryCard({ category, featured = false }: CategoryCardProps) {
  const { ready, total } = countByStatus(category.id);
  const accent = ACCENT_CLASS[category.accent];

  return (
    <motion.div variants={staggerChild} className="h-full">
      <TiltCard className="h-full">
        <Link
          to={`/algorithms/${category.id}`}
          className={cn(
            'flex h-full flex-col gap-3 rounded-2xl border p-4 transition-colors duration-300',
            featured
              ? 'border-transparent bg-gradient-to-br ' + accent.split(' ')[0] + ' glass'
              : 'glass border-line/60 hover:border-accent-cyan/40',
          )}
          aria-label={`${category.name} — ${total} algorithms`}
        >
          <div className="flex items-start justify-between gap-3">
            <motion.span
              layoutId={`category-glyph-${category.id}`}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl border border-line/60 bg-surface/70',
                accent.split(' ')[1],
              )}
            >
              <Icon name={ICON[category.id]} size={20} />
            </motion.span>
            <span className="rounded-full border border-line/60 px-2 py-0.5 font-mono text-2xs text-ink-faint">
              {ready}/{total}
            </span>
          </div>

          <div className="mt-auto space-y-1.5">
            <h3 className="font-display text-sm font-semibold text-ink">{category.name}</h3>
            <p className="text-2xs leading-relaxed text-ink-dim">{category.blurb}</p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-2xs text-ink-faint">Phase {category.phase}</span>
            <span className="flex items-center gap-1 text-2xs text-ink-faint transition-colors group-hover:text-accent-cyan">
              Explore
              <Icon name="chevronRight" size={12} />
            </span>
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}
