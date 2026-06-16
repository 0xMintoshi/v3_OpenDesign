import { chromium } from 'playwright';

const PORT = 5176;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto(`http://localhost:${PORT}`);
await page.waitForLoadState('networkidle');

// Enter Stage 2 (treatment mode)
await page.locator('text=Stage 2').first().click();
await page.waitForTimeout(500);

async function applyBridge(teeth, label) {
  // RIGHT-CLICK each tooth to add to multi-selection (no popover opens)
  for (const fdi of teeth) {
    await page.locator(`[data-tooth-fdi="${fdi}"]`).first().click({ button: 'right', force: true });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/bridge-sel-${label}.png` });

  // Click "Apply treatment ->" in the SelectionBar
  await page.locator('text=Apply treatment').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/bridge-menu-${label}.png` });

  // JS-click the Bridge (span) item
  const clicked = await page.evaluate(() => {
    const spans = document.querySelectorAll('.tx-item-label');
    for (const span of spans) {
      if (span.textContent.trim() === 'Bridge (span)') {
        const btn = span.closest('button') || span.closest('li') || span.parentElement;
        if (btn.disabled) return `disabled: ${btn.className}`;
        btn.click();
        return 'clicked';
      }
    }
    return 'not found';
  });
  console.log(`${label} Bridge click result:`, clicked);

  await page.waitForTimeout(1000);
  // Click neutral area to close any popover
  await page.mouse.click(400, 150);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/bridge-result-${label}.png` });
  console.log(`${label} result screenshot saved`);
}

// Lower arch: 43, 44, 45
await applyBridge(['43', '44', '45'], 'lower');

// Reload for upper arch
await page.reload();
await page.waitForLoadState('networkidle');
await page.locator('text=Stage 2').first().click();
await page.waitForTimeout(500);

// Upper arch: 13, 14, 15, 16
await applyBridge(['13', '14', '15', '16'], 'upper');

// Both arches
await page.reload();
await page.waitForLoadState('networkidle');
await page.locator('text=Stage 2').first().click();
await page.waitForTimeout(500);
for (const fdi of ['43', '44', '45']) {
  await page.locator(`[data-tooth-fdi="${fdi}"]`).first().click({ button: 'right', force: true });
  await page.waitForTimeout(100);
}
await page.locator('text=Apply treatment').first().click();
await page.waitForTimeout(300);
await page.evaluate(() => {
  const spans = document.querySelectorAll('.tx-item-label');
  for (const span of spans) {
    if (span.textContent.trim() === 'Bridge (span)') {
      (span.closest('button') || span.parentElement).click();
      return;
    }
  }
});
await page.waitForTimeout(800);
await page.mouse.click(400, 150);
await page.waitForTimeout(300);

for (const fdi of ['13', '14', '15', '16']) {
  await page.locator(`[data-tooth-fdi="${fdi}"]`).first().click({ button: 'right', force: true });
  await page.waitForTimeout(100);
}
await page.locator('text=Apply treatment').first().click();
await page.waitForTimeout(300);
await page.evaluate(() => {
  const spans = document.querySelectorAll('.tx-item-label');
  for (const span of spans) {
    if (span.textContent.trim() === 'Bridge (span)') {
      (span.closest('button') || span.parentElement).click();
      return;
    }
  }
});
await page.waitForTimeout(1000);
await page.mouse.click(400, 150);
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/bridge-both.png' });
console.log('Both arches screenshot saved');

await browser.close();
console.log('Done');
