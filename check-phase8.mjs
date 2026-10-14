import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
  acceptDownloads: true,
});
await context.addInitScript(() => { try { window.localStorage.setItem('algoverse.tour', 'done'); } catch {} });
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('WebSocket')) errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

const shot = async (name) => {
  await page.screenshot({ path: `/tmp/v8/${name}.png` });
  console.log(`shot ${name}`);
};

// ── 1. Learn tab ────────────────────────────────────────────────────────────
await page.goto(`${BASE}/algorithms/sorting/bubble-sort`, { waitUntil: 'networkidle' });
await page.getByRole('tab', { name: /learn/i }).click().catch(async () => {
  await page.getByRole('button', { name: /learn/i }).first().click();
});
await page.waitForTimeout(1200);
const learnHeadings = await page.locator('h2').allInnerTexts();
console.log('learn headings:', learnHeadings.slice(0, 6).join(' | '));
const optionCount = await page.locator('button[aria-pressed]').count();
console.log('quiz options rendered:', optionCount);
// answer the first question
const firstOption = page.locator('button[aria-pressed]').first();
await firstOption.click();
await page.waitForTimeout(500);
await shot('learn');

// ── 2. Compare mode ─────────────────────────────────────────────────────────
await page.goto(`${BASE}/compare/bubble-sort/merge-sort`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
console.log('compare headings:', (await page.locator('h1').allInnerTexts()).join(' | '));
console.log('lanes:', await page.locator('section[aria-label$="lane"]').count());
console.log('metric rows:', await page.locator('table tbody tr').count());
await page.getByRole('button', { name: /play both traces/i }).click();
await page.waitForTimeout(2500);
await page.getByRole('button', { name: /pause both traces/i }).click();
const cursorText = await page.locator('span.font-mono').filter({ hasText: /\/ / }).first().innerText();
console.log('cursor after play:', cursorText);
await shot('compare');

// ── 3. Export PNG ───────────────────────────────────────────────────────────
await page.goto(`${BASE}/algorithms/trees/avl`, { waitUntil: 'networkidle' });
await page.keyboard.press('End');
await page.waitForTimeout(900);
await page.getByRole('button', { name: /export and share/i }).click();
await page.waitForTimeout(300);
await shot('export-menu');
const [pngDownload] = await Promise.all([
  page.waitForEvent('download', { timeout: 20000 }),
  page.getByRole('menuitem', { name: /png/i }).click(),
]);
const pngPath = '/tmp/v8/avl.png';
await pngDownload.saveAs(pngPath);
console.log('png downloaded:', pngDownload.suggestedFilename(), (await import('node:fs')).statSync(pngPath).size, 'bytes');

// ── 4. Export GIF (heavier) ────────────────────────────────────────────────
await page.getByRole('button', { name: /export and share/i }).click();
await page.waitForTimeout(300);
const [gifDownload] = await Promise.all([
  page.waitForEvent('download', { timeout: 90000 }),
  page.getByRole('menuitem', { name: /gif/i }).click(),
]);
const gifPath = '/tmp/v8/avl.gif';
await gifDownload.saveAs(gifPath);
console.log('gif downloaded:', gifDownload.suggestedFilename(), (await import('node:fs')).statSync(gifPath).size, 'bytes');

// ── 5. Does a browser render the GIF we produced? ──────────────────────────
const gifCheck = await page.evaluate(async (bytes) => {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  const ok = await new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
  return { ok, w: img.naturalWidth, h: img.naturalHeight };
}, Array.from((await import('node:fs')).readFileSync(gifPath)));
console.log('gif rendered by chromium:', JSON.stringify(gifCheck));

// ── 6. Share link ──────────────────────────────────────────────────────────
await page.goto(`${BASE}/algorithms/graphs/dijkstra?graph=ring&n=24&theme=cyberpunk`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
console.log('url after hydrate:', page.url());
await shot('shared-link');

console.log('console errors:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
