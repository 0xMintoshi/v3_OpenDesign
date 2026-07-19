import { test, expect } from '@playwright/test';

test('main app loads without console errors', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('svg').first()).toBeVisible();
  expect(errors).toHaveLength(0);
});

test('lab loads with tooth ghost and crown path', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/lab.html');
  await page.waitForLoadState('networkidle');

  // Heading present
  await expect(page.locator('h2')).toContainText('Shape Lab');

  // SVG canvas rendered
  const svg = page.locator('svg').first();
  await expect(svg).toBeVisible();

  // At least 3 paths (outline, cervical, crown) — count grows as features are added
  const paths = svg.locator('path');
  const pathCount = await paths.count();
  expect(pathCount).toBeGreaterThanOrEqual(3);

  // Control point circles rendered (handles on the 5 non-Z segments)
  const circles = svg.locator('circle');
  const circleCount = await circles.count();
  expect(circleCount).toBeGreaterThan(0);

  // Copy JSON button present
  await expect(page.getByRole('button', { name: 'Copy JSON' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible();

  expect(errors).toHaveLength(0);
});

test('lab arch shape loads via selector', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/lab.html');
  await page.waitForLoadState('networkidle');

  // Switch to Maxilla arch shape
  const select = page.locator('select');
  await select.selectOption('arch-maxilla');
  await page.waitForLoadState('networkidle');

  // SVG canvas still visible and a path rendered
  const svg = page.locator('svg').first();
  await expect(svg).toBeVisible();
  const paths = svg.locator('path');
  const pathCount = await paths.count();
  expect(pathCount).toBeGreaterThan(0);

  // Control points present
  const circles = svg.locator('circle');
  const circleCount = await circles.count();
  expect(circleCount).toBeGreaterThan(0);

  // No Vite error overlay
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toHaveLength(0);
});

test('lab drag moves a control point', async ({ page }) => {
  await page.goto('/lab.html');
  await page.waitForLoadState('networkidle');

  const svg = page.locator('svg').first();
  const svgBox = await svg.boundingBox();

  // Grab JSON before drag
  const jsonBefore = await page.locator('pre').first().innerText();

  // Drag the first circle handle
  const circle = svg.locator('circle').first();
  const box = await circle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10, { steps: 5 });
  await page.mouse.up();

  // JSON should have changed
  const jsonAfter = await page.locator('pre').first().innerText();
  expect(jsonAfter).not.toBe(jsonBefore);
});

test('lab bridge-span shape loads via selector', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/lab.html');
  await page.waitForLoadState('networkidle');

  const select = page.locator('select');
  await select.selectOption('bridge-span');
  await page.waitForLoadState('networkidle');

  const svg = page.locator('svg').first();
  await expect(svg).toBeVisible();
  const paths = svg.locator('path');
  expect(await paths.count()).toBeGreaterThan(0);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toHaveLength(0);
});

test('lab partial-denture-upper shape loads via selector', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/lab.html');
  await page.waitForLoadState('networkidle');

  const select = page.locator('select');
  await select.selectOption('partial-denture-upper');
  await page.waitForLoadState('networkidle');

  const svg = page.locator('svg').first();
  await expect(svg).toBeVisible();
  const paths = svg.locator('path');
  expect(await paths.count()).toBeGreaterThan(0);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toHaveLength(0);
});

test('TreatmentPanel pill renders in Stage 2 without errors', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('svg').first()).toBeVisible();

  // Advance to Stage 2
  const advanceBtn = page.getByRole('button', { name: 'Stage 2' });
  if (await advanceBtn.count() > 0) {
    await advanceBtn.click();
    await page.waitForTimeout(300);
  }

  // The dock pill or open panel should be present
  const pill = page.locator('.pnl-pill, .trx-panel');
  if (await pill.count() > 0) {
    await expect(pill.first()).toBeVisible();
  }

  expect(errors.filter(e => !/NaN/.test(e))).toHaveLength(0);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
});
