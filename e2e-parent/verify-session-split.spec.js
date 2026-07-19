/**
 * Verify per-session Medisave implant grouping (SESSION_SPLIT_IDS change).
 *
 * Flow: v3 parent app (port 5173) → chart iframe (Stage 1 → Stage 2) → select teeth → apply implant
 * → Export Plan → Summary tab → confirm separate rows per apply.
 */
import { test, expect } from '@playwright/test';

const SS = String.raw`C:\Users\ZMZ\AppData\Local\Temp\claude\c--Users-ZMZ-Desktop-Claude\46ed7b87-398a-4d34-aaf2-67a3974c36e5\scratchpad`;

function chartFrame(page) {
  return page.frames().find((f) => f.url().includes('/chart/dist'));
}

async function goToStage2(page) {
  const cf = chartFrame(page);
  // Dock button, icon-only — accessible name comes from aria-label, not text.
  const advBtn = cf.getByRole('button', { name: 'Stage 2' });
  if (await advBtn.count() > 0) {
    await advBtn.click();
    await page.waitForTimeout(500);
  }
}

async function clickTooth(cf, toothId) {
  // toothId is the full string like "upper-16" or just the data-tooth-id value
  const el = cf.locator(`[data-tooth-id="${toothId}"]`).first();
  await el.waitFor({ state: 'visible', timeout: 5000 });
  await el.click();
  await cf.waitForTimeout(300);
}

async function applyImplantFromPopover(cf) {
  // After tooth click, popover should appear. Find "Implant" category/button.
  // The popover shows treatment groups. Look for "Implant" text.
  const implantOption = cf.locator('button:has-text("Implant Only"), [data-tx-id="implant-only"], button:has-text("Dental Implant")').first();
  if (await implantOption.count() > 0) {
    await implantOption.click();
    await cf.waitForTimeout(500);
    return true;
  }

  // Try navigating popover categories
  const popoverBtns = await cf.locator('.popover button, .treatment-popover button, .pop button').allTextContents();
  console.log('Popover buttons:', JSON.stringify(popoverBtns));

  // Try implant category
  const implantCat = cf.locator('button:has-text("Implant"), [data-category="implant"]').first();
  if (await implantCat.count() > 0) {
    await implantCat.click();
    await cf.waitForTimeout(300);
    // Then click the first implant option
    const implantItem = cf.locator('button:has-text("Implant Only"), button:has-text("implant-only")').first();
    if (await implantItem.count() > 0) {
      await implantItem.click();
      await cf.waitForTimeout(500);
      return true;
    }
  }

  return false;
}

test.describe('Per-session Medisave implant grouping', () => {

  test('Stage 2 recon — discover popover after tooth click', async ({ page }) => {
    await page.goto('/v3/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const cf = chartFrame(page);
    await goToStage2(page);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SS}\\stage2_00.png`, fullPage: false });

    // Click a tooth
    await clickTooth(cf, 'upper-16');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SS}\\stage2_01_after_click.png`, fullPage: false });

    // Read what appeared
    const allBtns = await cf.locator('button').allTextContents();
    console.log('Chart buttons after tooth click:', JSON.stringify(allBtns.slice(0, 30)));

    // Check for any new popover / overlay elements
    const newEls = await cf.evaluate(() => {
      const els = document.querySelectorAll('[class*="popover"], [class*="panel"], [class*="overlay"], [class*="treat"], [data-tx-id]');
      return Array.from(els).slice(0, 20).map((e) => ({
        tag: e.tagName, class: e.className?.toString?.()?.slice(0, 60) || '',
        text: e.textContent?.trim().slice(0, 40),
        dataAttrs: Object.fromEntries(Array.from(e.attributes).filter((a) => a.name.startsWith('data-')).map((a) => [a.name, a.value.slice(0, 30)])),
      }));
    });
    console.log('Popover/panel elements:', JSON.stringify(newEls, null, 2));

    expect(true).toBe(true);
  });

});
