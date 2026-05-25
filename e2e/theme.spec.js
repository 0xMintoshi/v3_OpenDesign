import { test, expect } from '@playwright/test';

test('?clinic=titan applies --clinic-accent CSS variable', async ({ page }) => {
  await page.goto('/?clinic=titan');
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--clinic-accent').trim()
  );
  expect(accent).toBe('#1a1a2e');
});

test('unknown clinic slug falls back to default theme', async ({ page }) => {
  await page.goto('/?clinic=nonexistent');
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--clinic-accent').trim()
  );
  expect(accent).toBe('#2563eb');
});
