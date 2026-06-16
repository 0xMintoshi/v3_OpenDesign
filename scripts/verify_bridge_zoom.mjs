import { chromium } from 'playwright';

const PORT = 5176;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto(`http://localhost:${PORT}`);
await page.waitForLoadState('networkidle');

await page.locator('text=Stage 2').first().click();
await page.waitForTimeout(500);

async function selectAndBridge(teeth) {
  for (const fdi of teeth) {
    await page.locator(`[data-tooth-fdi="${fdi}"]`).first().click({ button: 'right', force: true });
    await page.waitForTimeout(120);
  }
  await page.locator('text=Apply treatment').first().click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    for (const span of document.querySelectorAll('.tx-item-label')) {
      if (span.textContent.trim() === 'Bridge (span)') {
        (span.closest('button') || span.parentElement).click();
        return;
      }
    }
  });
  await page.waitForTimeout(800);
  // Click neutral to dismiss any label popover
  await page.mouse.click(200, 80);
  await page.waitForTimeout(300);
}

// Apply lower 43-44-45 and upper 13-14-15-16
await selectAndBridge(['43', '44', '45']);
await selectAndBridge(['13', '14', '15', '16']);

// Dismiss any remaining popover
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.mouse.click(200, 80);
await page.waitForTimeout(400);

// Full chart
await page.screenshot({ path: '/tmp/bridge-full.png' });

// Lower bridge crop: around teeth 43-45
const box44 = await page.locator('[data-tooth-fdi="44"]').first().boundingBox();
await page.screenshot({
  path: '/tmp/bridge-zoom-lower.png',
  clip: { x: box44.x - 130, y: box44.y - 40, width: 390, height: 220 },
});

// Upper bridge crop: around teeth 13-16
const box14 = await page.locator('[data-tooth-fdi="14"]').first().boundingBox();
await page.screenshot({
  path: '/tmp/bridge-zoom-upper.png',
  clip: { x: box14.x - 100, y: box14.y - 20, width: 380, height: 200 },
});

console.log('Done');
await browser.close();
