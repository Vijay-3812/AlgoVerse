import type { AlgorithmMeta, CategoryMeta, Complexity, LearnContent, PracticeLink, QuizQuestion } from '@/types';
import { ALGORITHMS, CATEGORY_BY_ID } from '@/engine/catalogue';

/**
 * ---------------------------------------------------------------------------
 *  LEARN MODE — derived content
 * ---------------------------------------------------------------------------
 *  Hand-written prose cannot scale to every algorithm, and a quiz that says
 *  "coming soon" is worse than no quiz at all. So the Learn tab is *assembled*:
 *  authored content (if any) wins, and everything missing is derived from data
 *  the app already guarantees is correct — the complexity table, the category,
 *  the tags, and the id itself as a stable seed.
 *
 *  Every distractor is a real complexity string from another algorithm, so a
 *  wrong answer is always plausible rather than obviously silly.
 */

/** Candidate wrong answers. Deliberately a superset of the catalogue's strings. */
const COMPLEXITY_POOL: readonly string[] = [
  'O(1)',
  'O(log n)',
  'O(n)',
  'O(n log n)',
  'O(n²)',
  'O(n³)',
  'O(2ⁿ)',
  'O(n!)',
  'O(√n)',
  'O(n + m)',
  'O(V + E)',
  'O(V²)',
  'O(V·E)',
  'O(V³)',
  'O(E log E)',
  'O(n log k)',
  'O(k·n)',
  'O(n·m)',
  'O(d·n)',
  'O(log n) amortised',
];

/** FNV-1a. Small, stable, and identical on every machine — quizzes do not shuffle. */
function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic sample: same seed ⇒ same picks, so a quiz never answers differently twice. */
function pick<T>(pool: readonly T[], count: number, seed: string): T[] {
  const taken = new Set<number>();
  const out: T[] = [];
  let cursor = hashString(seed);
  let guard = 0;
  while (out.length < count && taken.size < pool.length && guard < pool.length * 8) {
    cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
    const index = cursor % pool.length;
    guard += 1;
    if (taken.has(index)) continue;
    taken.add(index);
    out.push(pool[index] as T);
  }
  return out;
}

/** Three plausible wrong answers plus the truth, shuffled deterministically. */
function multipleChoice(
  question: string,
  correct: string,
  pool: readonly string[],
  seed: string,
  why: string,
): QuizQuestion {
  const distractors = pick(
    pool.filter((option) => option !== correct),
    3,
    seed,
  );
  const options = [...distractors, correct];
  // A stable rotation (rather than a shuffle) keeps the answer index varied
  // between questions while staying reproducible in tests.
  const offset = hashString(`${seed}:answer`) % options.length;
  const rotated = [...options.slice(offset), ...options.slice(0, offset)];
  return { question, options: rotated, answer: rotated.indexOf(correct), why };
}

function complexityPoolFor(meta: AlgorithmMeta): readonly string[] {
  // Only offer complexities that belong to the same broad shape of problem, so
  // "O(V + E)" never appears as an option for a sorting algorithm.
  const graphish = meta.category === 'graphs';
  const treeish = meta.category === 'trees';
  return COMPLEXITY_POOL.filter((option) => {
    const isGraph = option.includes('V') || option.includes('E');
    if (graphish) return isGraph || option === 'O(n log n)' || option === 'O(n²)' || option === 'O(1)';
    if (treeish) return !isGraph || option.startsWith('O(log');
    return !isGraph;
  });
}

/**
 * Two questions every algorithm can answer honestly (time and space), plus an
 * "odd one out" question built from real sibling algorithms.
 */
export function derivedQuiz(
  meta: AlgorithmMeta,
  complexity: Complexity | null,
  siblings: readonly AlgorithmMeta[] = [],
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const pool = complexityPoolFor(meta);

  if (complexity) {
    questions.push(
      multipleChoice(
        `What is the average-case time complexity of ${meta.name}?`,
        complexity.time.average,
        pool,
        `${meta.id}:avg`,
        `Best ${complexity.time.best}, worst ${complexity.time.worst} — the average case is ${complexity.time.average}.`,
      ),
    );
    questions.push(
      multipleChoice(
        `How much extra space does ${meta.name} need?`,
        complexity.space,
        pool,
        `${meta.id}:space`,
        `Space is ${complexity.space}${complexity.kind ? ` (${complexity.kind})` : ''}.`,
      ),
    );
  }

  const category = CATEGORY_BY_ID[meta.category];
  const outsider = outsiderFor(meta, siblings);
  if (outsider && siblings.length >= 2) {
    const insiders = pick(siblings, 3, `${meta.id}:siblings`).map((sibling) => sibling.name);
    const options = [...insiders, outsider.name];
    const offset = hashString(`${meta.id}:out`) % options.length;
    const rotated = [...options.slice(offset), ...options.slice(0, offset)];
    questions.push({
      question: `Which of these does *not* belong to ${category.name}?`,
      options: rotated,
      answer: rotated.indexOf(outsider.name),
      why: `${outsider.name} lives under ${CATEGORY_BY_ID[outsider.category].name}; the rest are ${category.name} algorithms.`,
    });
  }

  return questions;
}

/** Catalogue order, used to walk to a neighbouring category. */
const CATEGORY_ORDER: readonly string[] = Object.keys(CATEGORY_BY_ID);

/**
 * A recognisable algorithm from a *different* category — never from the same
 * one, so the "odd one out" question has exactly one correct answer.
 *
 * Prefers a sibling already in the caller's list (a category page passes its
 * own peers) and otherwise walks the catalogue, so the question is well-formed
 * no matter how narrow the caller's list is.
 */
function outsiderFor(meta: AlgorithmMeta, siblings: readonly AlgorithmMeta[]): AlgorithmMeta | null {
  const other = siblings.find((sibling) => sibling.category !== meta.category);
  if (other) return other;
  const index = CATEGORY_ORDER.indexOf(meta.category);
  for (let step = 1; step <= CATEGORY_ORDER.length; step += 1) {
    const next = CATEGORY_ORDER[(index + step) % CATEGORY_ORDER.length];
    const found = ALGORITHMS.find((entry) => entry.category === next);
    if (found) return found;
  }
  return null;
}

/** Search URL used when an algorithm ships no hand-picked practice problems. */
function fallbackPractice(meta: AlgorithmMeta): PracticeLink {
  const slug = meta.name.replace(/[^a-z0-9 ]/gi, '').trim().replace(/\s+/g, '+');
  return {
    title: `Practice “${meta.name}” on LeetCode`,
    url: `https://leetcode.com/problemset/?search=${slug}&sorting=W3sic29ydE9yZGVyIjoiQVNDRU5ESU5HIiwib3JkZXJCeSI6IkRJRkZJQ1VMVFkifV0%3D`,
  };
}

export interface ResolvedLearn {
  readonly intro: readonly string[];
  readonly useCases: readonly string[];
  readonly quiz: readonly QuizQuestion[];
  readonly practice: readonly PracticeLink[];
  /** True when at least one section came from hand-written content. */
  readonly authored: boolean;
  /** How many quiz questions were generated rather than authored. */
  readonly generatedQuestions: number;
}

/**
 * Field-level merge of two Learn payloads.
 *
 * A generator's own `learn` block is authoritative for the fields it defines,
 * but it should not *erase* the hand-written intro/quiz that lives in
 * `src/data/learn.ts` — the two are complementary, and dropping one silently
 * is how a Learn tab ends up thinner than intended.
 */
export function mergeLearn(base: LearnContent | undefined, override: LearnContent | undefined): LearnContent | undefined {
  if (!base) return override;
  if (!override) return base;
  return {
    ...(override.intro ?? base.intro ? { intro: override.intro ?? base.intro } : {}),
    useCases: override.useCases.length > 0 ? override.useCases : base.useCases,
    ...(override.quiz ?? base.quiz ? { quiz: [...(base.quiz ?? []), ...(override.quiz ?? [])] } : {}),
    ...(override.practice ?? base.practice ? { practice: override.practice ?? base.practice } : {}),
  };
}

export interface ResolveLearnArgs {
  readonly meta: AlgorithmMeta;
  readonly complexity: Complexity | null;
  /** Prose shipped with the algorithm (`definition.explanation`). */
  readonly explanation: readonly string[];
  /** Hand-written content, from the definition or `src/data/learn.ts`. */
  readonly authored?: LearnContent | undefined;
  /** Other algorithms in the catalogue, for the odd-one-out question. */
  readonly catalogue: readonly AlgorithmMeta[];
  readonly category?: CategoryMeta | undefined;
}

/**
 * Assembles the Learn tab. Authored content always wins; anything missing is
 * filled in, and the result is guaranteed to be non-empty for every algorithm
 * in the catalogue — there is no such thing as an empty Learn tab.
 */
export function resolveLearn({
  meta,
  complexity,
  explanation,
  authored,
  catalogue,
  category,
}: ResolveLearnArgs): ResolvedLearn {
  const siblings = catalogue.filter((entry) => entry.id !== meta.id);
  const generated = derivedQuiz(meta, complexity, siblings);
  const written = authored?.quiz ?? [];

  const intro = authored?.intro ?? (explanation.length > 0 ? explanation : [meta.blurb]);
  const useCases =
    authored?.useCases ??
    [
      `${category?.name ?? meta.category} work where ${meta.blurb.replace(/\.$/, '').toLowerCase()}.`,
      `Any problem tagged ${meta.tags.slice(0, 3).map((tag) => `“${tag}”`).join(', ') || '“fundamentals”'}.`,
      'Interview practice: reproduce the trace from memory, then check the pseudocode.',
    ];
  const practice = authored?.practice ?? [fallbackPractice(meta)];

  return {
    intro,
    useCases,
    quiz: [...written, ...generated],
    practice,
    authored: Boolean(authored && (authored.intro || authored.useCases.length > 0)),
    generatedQuestions: generated.length,
  };
}
