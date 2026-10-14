import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5173/algorithms/sorting/bubble-sort', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.keyboard.press('End');
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  const bars = Array.from(document.querySelectorAll('div[class*="rounded-t-"]'));
  const bar = bars[0];
  const row = bar?.parentElement?.parentElement;
  return {
    barCount: bars.length,
    barStyle: bar?.getAttribute('style'),
    barRect: bar?.getBoundingClientRect(),
    rowClass: row?.className,
    rowRect: row?.getBoundingClientRect(),
    rowStyle: row?.getAttribute('style'),
    computedHeight: bar ? getComputedStyle(bar).height : null,
    computedAlign: row ? getComputedStyle(row).alignItems : null,
  };
});
console.log(JSON.stringify(info, null, 2).slice(0, 1800));
await browser.close();
