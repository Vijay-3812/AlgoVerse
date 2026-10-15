import { describe, expect, it } from 'vitest';
import { decodeSharedSession, encodeSharedSession, shareUrl } from './urlState';

describe('urlState', () => {
  it('round-trips a full session', () => {
    const session = {
      datasetKind: 'nearly-sorted' as const,
      size: 24,
      seed: 42,
      values: [5, 3, 9],
      target: 7,
      graphPreset: 'ring' as const,
      step: 12,
      speed: 2,
      theme: 'cyberpunk' as const,
      tab: 'learn' as const,
      lang: 'python' as const,
      view: 'dots',
    };
    const decoded = decodeSharedSession(encodeSharedSession(session));
    expect(decoded).toEqual(session);
  });

  it('drops fields that match the base session', () => {
    const query = encodeSharedSession({ size: 16, speed: 1 }, { base: { size: 16 } });
    expect(query).toContain('speed=1');
    expect(query).not.toContain('n=16');
  });

  it('clamps rather than trusts hostile input', () => {
    expect(decodeSharedSession('n=999999').size).toBeUndefined();
    expect(decodeSharedSession('n=1').size).toBeUndefined();
    expect(decodeSharedSession('n=32').size).toBe(32);
    expect(decodeSharedSession('speed=99').speed).toBe(8);
    expect(decodeSharedSession('speed=0.01').speed).toBe(0.25);
    expect(decodeSharedSession('speed=nan').speed).toBeUndefined();
    expect(decodeSharedSession('seed=-4').seed).toBeUndefined();
  });

  it('ignores unknown enum values instead of throwing', () => {
    const decoded = decodeSharedSession('ds=chaotic&theme=neon&tab=secrets&lang=rust&view=spiral');
    expect(decoded).toEqual({});
  });

  it('parses a values list and rejects an empty one', () => {
    expect(decodeSharedSession('vals=4,8,15,16').values).toEqual([4, 8, 15, 16]);
    expect(decodeSharedSession('vals=abc').values).toBeUndefined();
  });

  it('builds an absolute share URL, replacing any previous query and keeping the hash', () => {
    const url = shareUrl('https://algoverse.app/algorithms/graphs/bfs?step=99#top', { theme: 'light' });
    expect(url).toBe('https://algoverse.app/algorithms/graphs/bfs?theme=light#top');
  });

  it('returns a bare path when there is nothing worth sharing', () => {
    expect(shareUrl('https://algoverse.app/algorithms/sorting/bubble-sort', {})).toBe(
      'https://algoverse.app/algorithms/sorting/bubble-sort',
    );
  });
});
