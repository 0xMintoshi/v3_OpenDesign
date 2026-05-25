import { test, expect } from '@playwright/test';

test('desktop viewport does not render TabletChart', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.locator('[data-testid="tablet-upper-row"]')).not.toBeAttached();
});

test('tablet viewport renders TabletChart rows', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 600 });
  await page.goto('/');
  await expect(page.locator('[data-testid="tablet-upper-row"]')).toBeVisible();
  await expect(page.locator('[data-testid="tablet-lower-row"]')).toBeVisible();
});
