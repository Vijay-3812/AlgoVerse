import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/primitives/Button';
import { CATEGORIES } from '@/engine/catalogue';
import { Icon } from '@/components/primitives/Icon';

/** 404 with a way out — every category is reachable in one click. */
export function NotFoundPage({ title = 'Nothing at this address' }: { title?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center">
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line/70 bg-surface/60 text-ink-faint"
      >
        <Icon name="compass" size={24} />
      </motion.span>

      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-dim">
        That trace does not exist. Pick a category below, or press <kbd className="kbd">⌘K</kbd> and search
        the catalogue.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {CATEGORIES.slice(0, 6).map((category) => (
          <Link key={category.id} to={`/algorithms/${category.id}`}>
            <Button size="sm" variant="secondary">
              {category.name}
            </Button>
          </Link>
        ))}
      </div>

      <Link to="/" className="mt-6">
        <Button size="sm" variant="ghost" icon="chevronLeft">
          Back to the landing page
        </Button>
      </Link>
    </div>
  );
}
