import { describe, expect, it } from 'vitest';
import type { AnyAlgorithmModule, AnyTrace, HashSnapshot } from '@/types';
import { assertTraceContract } from '@/test/traceContract';
import { chaining, doubleHashing, linearProbing, quadraticProbing, rehashing } from './index';
import { HashModel, hashKey, hashKey2 } from './kit';

const MODULES: readonly [string, AnyAlgorithmModule][] = [
  ['hash-chaining', chaining],
  ['hash-linear-probing', linearProbing],
  ['hash-quadratic-probing', quadraticProbing],
  ['hash-double-hashing', doubleHashing],
  ['hash-rehashing', rehashing],
];

function run(module: AnyAlgorithmModule): AnyTrace {
  return module.definition.generate(module.definition.defaultInput(), {
    runId: 'test',
    dataSet: 'random',
    seed: 1,
  });
}

describe('hash model', () => {
  it('hashes deterministically and never returns an out-of-range slot', () => {
    for (const key of ['kite', 'kiwi', 'mango', 'lime', 'mint', 'melon']) {
      const slot = hashKey(key, 7);
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(7);
      expect(hashKey(key, 7)).toBe(slot);
      expect(hashKey2(key, 7)).toBeGreaterThanOrEqual(1);
      expect(hashKey2(key, 7)).toBeLessThan(7);
    }
  });

  it('produces a full probe sequence for every open-addressing strategy', () => {
    for (const probe of ['linear', 'quadratic', 'double'] as const) {
      const model = new HashModel({ buckets: 11, probe });
      const sequence = model.probeSequence('kiwi');
      expect(sequence.length).toBe(11);
      for (const slot of sequence) {
        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThan(11);
      }
    }
  });

  it('reports the load factor as entries over buckets', () => {
    const model = new HashModel({ buckets: 4, probe: 'linear' });
    expect(model.loadFactor).toBe(0);
    model.entries[0] = { key: 'a', value: '1' };
    model.entries[1] = { key: 'b', value: '2' };
    expect(model.loadFactor).toBe(0.5);
  });
});

describe('hashing family', () => {
  it.each(MODULES)('%s emits a valid trace that ends with a populated table', (_id, module) => {
    const trace = run(module);
    assertTraceContract(trace);
    expect(trace.steps.length).toBeGreaterThan(8);

    const final = trace.steps[trace.steps.length - 1]?.state as HashSnapshot;
    const entries = final.buckets.reduce((sum, bucket) => sum + bucket.entries.length, 0);
    expect(entries).toBeGreaterThan(0);
    expect(final.loadFactor).toBeCloseTo(entries / final.buckets.length, 6);
  });

  it('narrates a collision when two keys share a home bucket', () => {
    const trace = run(chaining);
    const collisions = trace.steps.filter((step) => step.kind === 'collision' || /chain/i.test(step.description));
    expect(collisions.length).toBeGreaterThan(0);
  });

  it('keeps every key insertable and findable in each strategy', () => {
    for (const [, module] of MODULES) {
      const trace = run(module);
      const final = trace.steps[trace.steps.length - 1]?.state as HashSnapshot;
      const keys = final.buckets.flatMap((bucket) => bucket.entries.map((entry) => entry.key));
      for (const key of ['kite', 'kiwi', 'mango', 'lime']) {
        expect(keys, `${module.definition.meta.id} lost ${key}`).toContain(key);
      }
    }
  });

  it('grows the table when the load factor crosses its threshold', () => {
    const trace = run(rehashing);
    const grew = trace.steps.some((step) => /rehash to \d+ buckets/i.test(step.description));
    expect(grew).toBe(true);
    const first = trace.steps[0]?.state as HashSnapshot;
    const last = trace.steps[trace.steps.length - 1]?.state as HashSnapshot;
    expect(last.buckets.length).toBeGreaterThan(first.buckets.length);
  });

  it('records a miss for a key that is not in the table', () => {
    const trace = run(linearProbing);
    expect(trace.steps.some((step) => /not in the table/i.test(step.description))).toBe(true);
  });
});
