import { test, expect } from '@playwright/test';

test.describe('Phone viewport responsiveness (C3)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-tooth-id]');
  });

  test('no horizontal scroll at 375px', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('renders tablet layout at 375px (TabletChart)', async ({ page }) => {
    // At <= 1180px the app switches to TabletChart
    const tabletChart = page.locator('.tablet-chart');
    await expect(tabletChart).toBeVisible();
  });

  test('all 32 teeth render in the DOM at 375px', async ({ page }) => {
    const teeth = page.locator('[data-tooth-id]');
    await expect(teeth).toHaveCount(32);
  });

  test('tooth tap targets meet WCAG 2.5.8 minimum (24px) at 375px', async ({ page }) => {
    const teeth = await page.locator('[data-tooth-id]').all();
    for (const tooth of teeth) {
      const box = await tooth.boundingBox();
      if (!box) continue;
      // WCAG 2.5.8 requires 24×24 CSS px minimum tap target
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });
});
