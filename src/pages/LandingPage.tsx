import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CATEGORIES, ALGORITHMS } from '@/engine/catalogue';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { staggerChild, staggerContainer } from '@/components/layout/RouteTransition';
import { useUiStore } from '@/store/uiStore';
import { formatCount } from '@/utils/format';
import { HeroStage } from '@/components/hero/HeroStage';

/**
 * Landing page (light version).
 *
 * Phase 8 replaces the stage with the full GSAP/Lenis timeline — mouse-reactive
 * parallax hero, scroll-triggered sections, live demo strip. What matters now
 * is that the shell, theming, motion vocabulary and category grid are already
 * the real thing, so the hero upgrade is additive rather than a rewrite.
 */
export function LandingPage() {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const readyCount = ALGORITHMS.filter((a) => a.status === 'ready').length;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 sm:pt-14">
      <motion.section variants={staggerContainer} initial="hidden" animate="show" className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="space-y-6">
          <motion.div variants={staggerChild} className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface/50 px-3 py-1 text-2xs text-ink-dim">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-cyan opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-cyan" />
            </span>
            Phase 1 · trace engine, shell & design system live
          </motion.div>

          <motion.h1
            variants={staggerChild}
            className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl"
          >
            Algorithms you can
            <br />
            <span className="text-gradient">watch think.</span>
          </motion.h1>

          <motion.p variants={staggerChild} className="max-w-lg text-sm leading-relaxed text-ink-dim sm:text-base">
            AlgoVerse runs every algorithm as a pure trace — an immutable list of steps — then replays it
            with cinematic motion. Scrub, rewind, compare and slow down 10 000 steps of merge sort until it
            finally clicks.
          </motion.p>

          <motion.div variants={staggerChild} className="flex flex-wrap items-center gap-3">
            <Button size="lg" variant="primary" icon="play" magnetic onClick={() => setCommandPaletteOpen(true)}>
              Search an algorithm
            </Button>
            <Link to="/algorithms/sorting">
              <Button size="lg" variant="secondary" icon="bars" iconPosition="left">
                Browse sorting
              </Button>
            </Link>
            <span className="hidden items-center gap-1.5 text-2xs text-ink-faint sm:flex">
              <kbd className="kbd">⌘K</kbd> to jump anywhere
            </span>
          </motion.div>

          <motion.dl variants={staggerChild} className="grid max-w-md grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Algorithms', value: ALGORITHMS.length },
              { label: 'Categories', value: CATEGORIES.length },
              { label: 'Playable now', value: readyCount },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-line/60 bg-surface/40 px-3 py-2">
                <dt className="text-2xs uppercase tracking-wide text-ink-faint">{stat.label}</dt>
                <dd className="font-display text-lg font-semibold text-ink">{formatCount(stat.value)}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div variants={staggerChild}>
          <HeroStage />
        </motion.div>
      </motion.section>

      <section className="mt-16 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xs font-medium uppercase tracking-[0.18em] text-ink-faint">The catalogue</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-ink">Every structure, one engine</h2>
          </div>
          <p className="hidden max-w-sm text-2xs leading-relaxed text-ink-dim sm:block">
            Pick a category — the sidebar tree and ⌘K cover all {ALGORITHMS.length} algorithms, with
            categorised difficulty tags and honest phase markers.
          </p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {CATEGORIES.map((category, index) => (
            <CategoryCard key={category.id} category={category} featured={index === 0} />
          ))}
        </motion.div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: 'layers' as const,
            title: 'Pure trace generators',
            body: 'Algorithms never touch the DOM. They emit immutable steps; the UI replays them. Rewind is array indexing, not re-execution.',
          },
          {
            icon: 'sliders' as const,
            title: 'Metrics for free',
            body: 'Every generator gets comparisons, swaps, writes, reads, call depth and Big-O bounds from the same builder — no per-algorithm bookkeeping.',
          },
          {
            icon: 'zap' as const,
            title: 'Built for 60fps',
            body: 'Transform and opacity only, memoised highlight sets, one rAF clock, canvas for particles, code-split per category.',
          },
        ].map((feature, index) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-2xl p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line/60 bg-surface/60 text-accent-cyan">
              <Icon name={feature.icon} size={17} />
            </span>
            <h3 className="mt-3.5 text-sm font-semibold text-ink">{feature.title}</h3>
            <p className="mt-1.5 text-2xs leading-relaxed text-ink-dim">{feature.body}</p>
          </motion.article>
        ))}
      </section>
    </div>
  );
}
