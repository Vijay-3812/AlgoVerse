/**
 * Captures the README's screenshots from a running dev server.
 *
 * ```bash
 * npm run dev            # in one terminal
 * npm run screenshots    # in another
 * ```
 *
 * Every frame is the real app in a real browser — the visualiser, the timeline,
 * the inspector and the theme tokens are whatever the current commit renders.
 * Frames are deterministic: the theme is seeded through `localStorage` before
 * the first paint, and each stage is driven to a fixed step before capture.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'docs/media');
const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:5173';

/** viewport, deviceScaleFactor 2 → crisp 2× bitmaps for GitHub's dark theme. */
const VIEWPORT = { width: 1600, height: 900 };

const shots = [
  { name: 'hero-dark', path: '/', theme: 'dark', settle: 1600, steps: 0 },
  { name: 'sorting-bubble', path: '/algorithms/sorting/bubble-sort', theme: 'dark', settle: 700, steps: 26 },
  { name: 'sorting-merge', path: '/algorithms/sorting/merge-sort', theme: 'dark', settle: 700, steps: 30 },
  { name: 'trees-avl', path: '/algorithms/trees/avl', theme: 'dark', settle: 700, steps: 34 },
  { name: 'trees-bst', path: '/algorithms/trees/bst', theme: 'dark', settle: 700, steps: 12 },
  { name: 'graphs-dijkstra', path: '/algorithms/graphs/dijkstra', theme: 'dark', settle: 900, steps: 40 },
  { name: 'graphs-bfs', path: '/algorithms/graphs/bfs', theme: 'dark', settle: 900, steps: 24 },
  { name: 'linear-stack', path: '/algorithms/linear/stack', theme: 'dark', settle: 700, steps: 10 },
  { name: 'searching-binary', path: '/algorithms/searching/binary-search', theme: 'dark', settle: 700, steps: 8 },
  { name: 'hero-light', path: '/', theme: 'light', settle: 1600, steps: 0 },
  { name: 'sorting-cyberpunk', path: '/algorithms/sorting/quick-sort', theme: 'cyberpunk', settle: 900, steps: 22 },
];

async function capture(browser, shot) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: shot.theme === 'light' ? 'light' : 'dark',
    reducedMotion: 'no-preference',
  });

  // Seed persisted preferences before any app code runs — the stores read them
  // on first render, so the very first paint is already themed (no flash) and
  // the first-run tour does not cover the screenshot.
  await context.addInitScript((theme) => {
    try {
      window.localStorage.setItem('algoverse.theme', theme);
      window.localStorage.setItem('algoverse.tour', 'screenshot');
    } catch {
      /* private mode */
    }
  }, shot.theme);

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(shot.settle);

  if (shot.steps > 0) {
    // Step with the arrow key so the capture shows a real mid-run frame.
    await page.keyboard.press('End');
    await page.waitForTimeout(250);
    for (let i = 0; i < shot.steps; i += 1) {
      await page.keyboard.press('ArrowLeft');
    }
    await page.waitForTimeout(600);
  }

  // Freeze ambient loops (aurora, particles) so frames are comparable run to run.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(350);

  const file = `${OUT}/${shot.name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  await context.close();

  const status = errors.length === 0 ? 'ok' : `warnings: ${errors.slice(0, 2).join(' | ')}`;
  console.log(`${shot.name.padEnd(20)} ${status}`);
}

const browser = await chromium.launch();
try {
  await mkdir(OUT, { recursive: true });
  for (const shot of shots) {
    await capture(browser, shot);
  }
} finally {
  await browser.close();
}
console.log(`\nSaved ${shots.length} frames to docs/media/`);
