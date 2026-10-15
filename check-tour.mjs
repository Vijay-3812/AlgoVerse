import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://localhost:5173/algorithms/sorting/bubble-sort', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
const visible = await page.getByRole('dialog', { name: /guided tour/i }).isVisible().catch(() => false);
console.log('tour auto-opened:', visible);
console.log('step title:', await page.locator('[role="dialog"] h2').first().innerText().catch(() => 'n/a'));
for (let i = 0; i < 4; i += 1) {
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.waitForTimeout(500);
}
console.log('title after 3 nexts:', await page.locator('[role="dialog"] h2').first().innerText());
await page.screenshot({ path: '/tmp/v8/tour.png' });
await page.getByRole('button', { name: /start exploring/i }).click();
await page.waitForTimeout(400);
console.log('tour closed:', !(await page.getByRole('dialog', { name: /guided tour/i }).isVisible().catch(() => false)));
// reload: must not auto-open again
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
console.log('auto-opens again:', await page.getByRole('dialog', { name: /guided tour/i }).isVisible().catch(() => false));
// top bar button still works
await page.getByRole('button', { name: /guided tour/i }).click();
await page.waitForTimeout(600);
console.log('manual open works:', await page.getByRole('dialog', { name: /guided tour/i }).isVisible());
await browser.close();
