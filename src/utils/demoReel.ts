/**
 * Hero demo reel.
 *
 * The landing stage loops a *pre-recorded* sorting animation so the page has
 * life before any module chunk loads. It is deliberately the same shape as a
 * real trace — a list of frames with an order, a highlight set and a sorted
 * prefix — so Phase 2 can swap this for the actual `bubble-sort` trace with a
 * one-line change, and Phase 8 can drive it from the GSAP timeline.
 */

export interface DemoFrame {
  /** Bar ids in display order. Keys are stable, so Framer Motion FLIPs them. */
  readonly order: readonly string[];
  /** Ids being compared / swapped in this frame. */
  readonly active: readonly string[];
  /** How many leading positions are already in their final place. */
  readonly sorted: number;
  readonly caption: string;
}

export interface DemoBar {
  readonly id: string;
  readonly value: number;
}

const VALUES = [42, 78, 26, 91, 58, 34, 70, 15, 63, 84] as const;

export const DEMO_BARS: readonly DemoBar[] = VALUES.map((value, index) => ({
  id: `bar-${index}`,
  value,
}));

/** Frames of a bubble sort on `DEMO_BARS`, recorded by hand-runnable logic. */
export function buildDemoReel(): DemoFrame[] {
  const items = DEMO_BARS.map((bar) => ({ ...bar }));
  const frames: DemoFrame[] = [
    {
      order: items.map((i) => i.id),
      active: [],
      sorted: 0,
      caption: '10 unsorted values',
    },
  ];

  let sorted = 0;
  for (let pass = 0; pass < items.length - 1; pass += 1) {
    for (let i = 0; i < items.length - 1 - pass; i += 1) {
      const a = items[i];
      const b = items[i + 1];
      if (!a || !b) continue;

      frames.push({
        order: items.map((item) => item.id),
        active: [a.id, b.id],
        sorted,
        caption: `compare ${a.value} and ${b.value}`,
      });

      if (a.value > b.value) {
        items[i] = b;
        items[i + 1] = a;
        frames.push({
          order: items.map((item) => item.id),
          active: [a.id, b.id],
          sorted,
          caption: `swap → ${b.value}, ${a.value}`,
        });
      }
    }
    sorted += 1;
    frames.push({
      order: items.map((item) => item.id),
      active: [],
      sorted,
      caption: `position ${items.length - sorted} locked`,
    });
  }

  frames.push({
    order: items.map((item) => item.id),
    active: [],
    sorted: items.length,
    caption: 'sorted',
  });

  return frames;
}

/** Bar height as a fraction of the stage, with a floor so short bars stay visible. */
export function barHeight(value: number, min = 15, max = 91): number {
  return 0.12 + (0.72 * (value - min)) / (max - min);
}
