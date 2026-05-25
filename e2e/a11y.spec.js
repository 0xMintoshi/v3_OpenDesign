import { test, expect } from '@playwright/test';

test.describe('Dental chart keyboard accessibility (A6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Wait for teeth to be present
    await page.waitForSelector('[data-tooth-id]');
  });

  test('Tab from outside chart reaches first tooth', async ({ page }) => {
    // Focus the body, then tab until we hit a tooth button
    await page.keyboard.press('Tab');
    // Keep tabbing until a tooth is focused (max 20 tabs)
    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-tooth-id'));
      if (focused) break;
      await page.keyboard.press('Tab');
    }
    const toothId = await page.evaluate(() => document.activeElement?.getAttribute('data-tooth-id'));
    expect(toothId).toBeTruthy();
  });

  test('focused tooth has correct accessible name', async ({ page }) => {
    // Tab into the chart
    await page.keyboard.press('Tab');
    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-tooth-id'));
      if (focused) break;
      await page.keyboard.press('Tab');
    }
    const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(label).toBeTruthy();
    expect(label).toMatch(/Tooth \d+/);
  });

  test('ArrowRight moves focus to next tooth in arch', async ({ page }) => {
    // Tab into the chart
    await page.keyboard.press('Tab');
    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-tooth-id'));
      if (focused) break;
      await page.keyboard.press('Tab');
    }
    const firstId = await page.evaluate(() => document.activeElement?.getAttribute('data-tooth-id'));
    await page.keyboard.press('ArrowRight');
    const secondId = await page.evaluate(() => document.activeElement?.getAttribute('data-tooth-id'));
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);
  });

  test('Enter on focused tooth sets aria-pressed to true', async ({ page }) => {
    // Advance to treatment stage (baseline → treatment)
    await page.locator('.advance-btn').click();

    // Tab into chart
    await page.keyboard.press('Tab');
    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-tooth-id'));
      if (focused) break;
      await page.keyboard.press('Tab');
    }
    const toothId = await page.evaluate(() => document.activeElement?.getAttribute('data-tooth-id'));
    expect(toothId).toBeTruthy();

    // Press Enter to select
    await page.keyboard.press('Enter');
    const pressed = await page.evaluate(() => document.activeElement?.getAttribute('aria-pressed'));
    expect(pressed).toBe('true');
  });
});
