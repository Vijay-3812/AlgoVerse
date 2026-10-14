import { describe, expect, it } from 'vitest';
import { ALGORITHMS, CATEGORIES, algorithmsInCategory, countByStatus, searchAlgorithms } from './catalogue';
import { _resetRegistry, isRegistered, loadAlgorithmModule, registerAlgorithm } from './registry';
import { registerBuiltins } from '@/algorithms/register';

describe('catalogue', () => {
  it('has unique ids and a valid category for every entry', () => {
    const ids = new Set<string>();
    for (const algorithm of ALGORITHMS) {
      expect(ids.has(algorithm.id)).toBe(false);
      ids.add(algorithm.id);
      expect(CATEGORIES.some((c) => c.id === algorithm.category)).toBe(true);
      expect(algorithm.phase).toBeGreaterThanOrEqual(1);
      expect(algorithm.blurb.length).toBeGreaterThan(8);
    }
    expect(ids.size).toBe(ALGORITHMS.length);
  });

  it('covers all twelve requested feature areas', () => {
    const required = [
      'sorting',
      'searching',
      'linear',
      'hashing',
      'trees',
      'graphs',
      'recursion',
      'dp',
      'greedy',
      'strings',
      'misc',
    ];
    for (const id of required) {
      expect(CATEGORIES.map((c) => c.id)).toContain(id);
    }
  });

  it('reports counts per category', () => {
    const sorting = countByStatus('sorting');
    expect(sorting.total).toBe(algorithmsInCategory('sorting').length);
    expect(sorting.total).toBeGreaterThanOrEqual(11);
  });

  it('searches by name, alias, tag and category', () => {
    expect(searchAlgorithms('dijkstra')[0]?.id).toBe('dijkstra');
    expect(searchAlgorithms('mst').map((a) => a.id)).toEqual(
      expect.arrayContaining(['prim', 'kruskal']),
    );
    expect(searchAlgorithms('kmp')[0]?.id).toBe('kmp');
    expect(searchAlgorithms('sorting').length).toBeGreaterThan(5);
    expect(searchAlgorithms('zzzzz')).toHaveLength(0);
  });
});

describe('registry', () => {
  it('registers every catalogue entry and resolves them lazily', async () => {
    _resetRegistry();
    registerBuiltins();

    for (const algorithm of ALGORITHMS) {
      expect(isRegistered(algorithm.id)).toBe(true);
    }

    const module = await loadAlgorithmModule('bubble-sort');
    expect(module.definition.meta.id).toBe('bubble-sort');
    // Second load is served from cache (same object identity).
    expect(await loadAlgorithmModule('bubble-sort')).toBe(module);
  });

  it('throws a helpful error for an unknown id', async () => {
    _resetRegistry();
    await expect(loadAlgorithmModule('not-a-real-algorithm')).rejects.toThrow(/no module registered/i);
  });

  it('lets a later phase replace a placeholder loader', async () => {
    _resetRegistry();
    registerAlgorithm(ALGORITHMS[0]!, async () =>
      Promise.resolve({
        definition: {
          meta: { ...ALGORITHMS[0]!, status: 'ready' },
          complexity: { time: { best: 'x', average: 'x', worst: 'x' }, space: 'x' },
          pseudocode: [],
          code: {},
          explanation: [],
          defaultInput: () => ({ kind: 'array', values: [1, 2] }),
          generate: () => {
            throw new Error('not used in this test');
          },
        },
        Visualizer: () => null,
      }),
    );
    const module = await loadAlgorithmModule(ALGORITHMS[0]!.id);
    expect(module.definition.meta.status).toBe('ready');
  });
});
