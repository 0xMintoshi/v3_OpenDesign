import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://localhost:5174/lab.html');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1500);

await page.locator('select').selectOption({ label: 'Upper Wisdom Tooth' });
await page.waitForTimeout(600);

function getPathBounds() {
  return page.evaluate(() => {
    const paths = document.querySelectorAll('svg circle, svg path');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    paths.forEach(p => {
      const bb = p.getBoundingClientRect();
      if (bb.width > 2 && bb.height > 2) {
        minX = Math.min(minX, bb.left);
        minY = Math.min(minY, bb.top);
        maxX = Math.max(maxX, bb.right);
        maxY = Math.max(maxY, bb.bottom);
      }
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  });
}

// 1x screenshot
let b = await getPathBounds();
const pad = 30;
await page.screenshot({
  path: 'C:/Users/ZMZ/AppData/Local/Temp/dots_1x.png',
  clip: { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: b.w + pad*2, height: b.h + pad*2 }
});
console.log('1x bounds:', JSON.stringify(b));

// Zoom to 4x
const zoomPlus = page.locator('button').nth(16);
for (let i = 0; i < 12; i++) {
  await zoomPlus.click();
  await page.waitForTimeout(60);
}
await page.waitForTimeout(400);

// 4x screenshot — find tooth wherever it scrolled to
b = await getPathBounds();
console.log('4x bounds:', JSON.stringify(b));
await page.screenshot({
  path: 'C:/Users/ZMZ/AppData/Local/Temp/dots_4x.png',
  clip: { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: Math.min(b.w + pad*2, 600), height: Math.min(b.h + pad*2, 600) }
});

console.log('Done');
await browser.close();
