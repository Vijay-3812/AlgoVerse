import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
const measure = async (label) => {
  const data = await page.evaluate(() => {
    const bars = Array.from(document.querySelectorAll('div[class*="rounded-t-"]'));
    const heights = bars.map((b) => Math.round(b.getBoundingClientRect().height)).slice(0, 6);
    const first = bars[0];
    return {
      count: bars.length,
      heights,
      barParent: first?.parentElement ? Math.round(first.parentElement.getBoundingClientRect().height) : null,
      barGrandparent: first?.parentElement?.parentElement ? Math.round(first.parentElement.parentElement.getBoundingClientRect().height) : null,
    };
  });
  console.log(label, JSON.stringify(data));
};
await page.goto('http://localhost:5173/algorithms/sorting/bubble-sort', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await measure('single:');
await page.goto('http://localhost:5173/compare/bubble-sort/merge-sort', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await measure('compare:');
await browser.close();
