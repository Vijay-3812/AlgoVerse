import { describe, expect, it } from 'vitest';
import { ALGORITHMS, ALGORITHM_BY_ID, CATEGORY_BY_ID } from '@/engine/catalogue';
import { LEARN_CONTENT } from '@/data/learn';
import { derivedQuiz, resolveLearn } from './learnQuiz';

const sample = ALGORITHM_BY_ID.get('quick-sort');
const complexity = {
  time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
  space: 'O(log n)',
  stable: false,
  kind: 'in-place',
};

describe('learnQuiz', () => {
  it('every authored entry points at a real algorithm with in-range answers', () => {
    expect(Object.keys(LEARN_CONTENT).length).toBeGreaterThan(20);
    for (const [id, content] of Object.entries(LEARN_CONTENT)) {
      expect(ALGORITHM_BY_ID.has(id), `${id} is not in the catalogue`).toBe(true);
      expect(content.useCases.length).toBeGreaterThan(0);
      for (const question of content.quiz ?? []) {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(question.options.length);
        expect(question.why.length).toBeGreaterThan(0);
      }
    }
  });

  it('derives time, space and category questions with exactly one correct answer', () => {
    expect(sample).toBeDefined();
    if (!sample) return;
    const questions = derivedQuiz(sample, complexity, ALGORITHMS);
    expect(questions.length).toBeGreaterThanOrEqual(2);

    for (const question of questions) {
      expect(new Set(question.options).size).toBe(question.options.length);
      const answer = question.options[question.answer];
      expect(answer).toBeTruthy();
    }

    const [timeQuestion, spaceQuestion] = questions;
    expect(timeQuestion?.options[timeQuestion.answer]).toBe('O(n log n)');
    expect(spaceQuestion?.options[spaceQuestion?.answer ?? 0]).toBe('O(log n)');

    const odd = questions[2];
    expect(odd).toBeDefined();
    if (odd) {
      const wrong = odd.options[odd.answer];
      expect(wrong).toBeTruthy();
      const outsider = ALGORITHMS.find((entry) => entry.name === wrong);
      expect(outsider).toBeDefined();
      expect(outsider?.category).not.toBe(sample.category);
    }
  });

  it('is deterministic — the same algorithm always sees the same quiz', () => {
    if (!sample) return;
    const first = derivedQuiz(sample, complexity, ALGORITHMS);
    const second = derivedQuiz(sample, complexity, ALGORITHMS);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('never offers a graph complexity as a distractor for a sorting algorithm', () => {
    if (!sample) return;
    for (const question of derivedQuiz(sample, complexity, ALGORITHMS)) {
      for (const option of question.options) {
        if (question.options[question.answer] === option) continue;
        expect(option.includes('V')).toBe(false);
      }
    }
  });

  it('falls back to authored content and fills the gaps for every catalogue entry', () => {
    for (const meta of ALGORITHMS) {
      const resolved = resolveLearn({
        meta,
        complexity: null,
        explanation: [],
        authored: LEARN_CONTENT[meta.id],
        catalogue: ALGORITHMS,
        category: CATEGORY_BY_ID[meta.category],
      });
      expect(resolved.intro.length, `${meta.id} intro`).toBeGreaterThan(0);
      expect(resolved.intro[0]).toBeTruthy();
      expect(resolved.useCases.length, `${meta.id} use cases`).toBeGreaterThan(0);
      expect(resolved.quiz.length, `${meta.id} quiz`).toBeGreaterThan(0);
      expect(resolved.practice.length, `${meta.id} practice`).toBeGreaterThan(0);
      for (const question of resolved.quiz) {
        expect(question.options[question.answer], `${meta.id} answer in range`).toBeTruthy();
      }
    }
  });

  it('prefers hand-written content over derived filler', () => {
    const meta = ALGORITHM_BY_ID.get('bubble-sort');
    expect(meta).toBeDefined();
    if (!meta) return;
    const resolved = resolveLearn({
      meta,
      complexity,
      explanation: ['generated prose'],
      authored: LEARN_CONTENT['bubble-sort'],
      catalogue: ALGORITHMS,
    });
    expect(resolved.authored).toBe(true);
    expect(resolved.intro[0]).toContain('compares neighbours');
    // Derived questions still fill the gap behind the authored one.
    expect(resolved.generatedQuestions).toBeGreaterThan(0);
  });

  it('uses the shipped explanation when nobody authored an intro', () => {
    const meta = ALGORITHM_BY_ID.get('radix-sort');
    expect(meta).toBeDefined();
    if (!meta) return;
    const resolved = resolveLearn({
      meta,
      complexity: null,
      explanation: ['Radix sorts digit by digit.'],
      catalogue: ALGORITHMS,
    });
    expect(resolved.intro).toEqual(['Radix sorts digit by digit.']);
    expect(resolved.authored).toBe(false);
  });
});
