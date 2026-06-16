import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5174');   // ShapeLab runs on 5174
await page.waitForLoadState('networkidle');
// Select "Aligner — Upper" from the dropdown
await page.selectOption('select', 'aligner-upper');
await page.waitForTimeout(600);
await page.screenshot({ path: 'lab_aligner_upper.png' });
// Select "Aligner — Lower"
await page.selectOption('select', 'aligner-lower');
await page.waitForTimeout(600);
await page.screenshot({ path: 'lab_aligner_lower.png' });
console.log('Done');
await browser.close();
