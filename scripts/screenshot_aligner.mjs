import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

page.on('console', msg => {
  if (msg.type() === 'error') console.log('ERR:', msg.text().slice(0, 120));
});

await page.goto('http://localhost:5173');
await page.waitForLoadState('networkidle');
await page.locator('button', { hasText: 'Stage 2' }).click();
await page.waitForTimeout(800);

// Click a tooth to open treatment panel
const ratio = 1320 / 1600;
const svgX = 40, svgY = 70;
await page.mouse.click(svgX + 800 * ratio, svgY + 350 * ratio);
await page.waitForTimeout(500);

// Click Clear Aligners
await page.mouse.click(555 + 145, 682 + 17);
await page.waitForTimeout(800);

// Full screenshot
await page.screenshot({ path: 'aligner_full.png' });

// Cropped to just the arch area (SVG is at x:40 y:70 w:1320 h:988)
// Arch is roughly in the middle third of the SVG height
await page.screenshot({
  path: 'aligner_crop.png',
  clip: { x: 40, y: 70 + 988 * 0.25, width: 940, height: 988 * 0.55 },
});
console.log('Done');

await browser.close();
