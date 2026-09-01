import { test, expect } from '@playwright/test';

// Supported floor for the chart is 768px (older iPad portrait). Phone widths
// (375px) are intentionally excluded from WCAG 2.5.8 enforcement — all 32 teeth
// are narrower than 24px there and the product does not target phone usage.
// See docs/plans/2026-08-28-touch-targets.md for the full decision record.
test.describe('iPad portrait viewport responsiveness (C3)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-tooth-id]');
  });

  test('no horizontal scroll at 768px', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  // Revised 2026-08-28: the app used to switch to TabletChart at <=1180px. That
  // component had no handlers and no parent bridge, so it was non-functional
  // everywhere it rendered — and it caught every iPad. One responsive layout now
  // serves all widths. See docs/plans/2026-08-28-phase-a-ipad-findings.md.
  test('renders the interactive chart at 768px, not a static fallback', async ({ page }) => {
    await expect(page.locator('.tablet-chart')).toHaveCount(0);
    await expect(page.locator('[role="button"][data-tooth-id]')).toHaveCount(32);
  });

  test('all 32 teeth render in the DOM at 768px', async ({ page }) => {
    const teeth = page.locator('[data-tooth-id]');
    await expect(teeth).toHaveCount(32);
  });

  test('tooth tap targets meet WCAG 2.5.8 minimum (24px) at 768px', async ({ page }) => {
    const teeth = await page.locator('[data-tooth-id]').all();
    for (const tooth of teeth) {
      const box = await tooth.boundingBox();
      if (!box) continue;
      // WCAG 2.5.8 requires 24×24 CSS px minimum tap target.
      // Lower central incisors (31/41) were 22px wide before the MIN_TAP_W
      // rect fix in dental-arch.jsx — this test proves the fix holds.
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });
});
