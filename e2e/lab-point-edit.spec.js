import { test, expect } from '@playwright/test';

// Lab loads crown-molar-upper by default.
// CX=200, CY=130, W=38, H=88.
// M point: (200 + 0.48*38, 130 + 0*88) = (218.24, 130).
// First C endpoint: (200 + 0.42*38, 130 + -0.40*88) = (215.96, 94.8).
// Midpoint of first C segment ≈ (217, 112) — used for hover/insert tests.

test.describe('Lab — point insert', () => {
  test('phantom dot appears when hovering near outline', async ({ page }) => {
    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();

    // Hover near the first C segment (roughly midpoint between M and first anchor)
    const svgBox = await svg.boundingBox();
    const hoverX = svgBox.x + 217;
    const hoverY = svgBox.y + 112;
    await page.mouse.move(hoverX, hoverY);

    // Phantom dot: green circle (fill includes rgba(34,197,94))
    // It has pointer-events: none so it won't interfere with other elements
    const phantom = svg.locator('circle[fill*="34,197,94"]');
    await expect(phantom).toBeVisible({ timeout: 2000 });
  });

  test('clicking near outline inserts a new segment', async ({ page }) => {
    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    const svg = page.locator('svg').first();
    const pre = page.locator('pre').first();

    // Get initial segment count from JSON panel
    const initialJson = await pre.textContent();
    const initialSegCount = (JSON.parse(initialJson)).segments.length;

    const svgBox = await svg.boundingBox();
    const hoverX = svgBox.x + 217;
    const hoverY = svgBox.y + 112;

    // Hover to trigger phantom dot
    await page.mouse.move(hoverX, hoverY);
    // Wait for phantom to appear
    await expect(svg.locator('circle[fill*="34,197,94"]')).toBeVisible({ timeout: 2000 });

    // Click to insert
    await page.mouse.click(hoverX, hoverY);

    // JSON panel should now have one more segment
    const updatedJson = await pre.textContent();
    const updatedSegCount = (JSON.parse(updatedJson)).segments.length;
    expect(updatedSegCount).toBe(initialSegCount + 1);
  });
});

test.describe('Lab — point delete', () => {
  test('right-click on anchor removes a segment', async ({ page }) => {
    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    const svg = page.locator('svg').first();
    const pre = page.locator('pre').first();

    const initialJson = await pre.textContent();
    const initialSegCount = (JSON.parse(initialJson)).segments.length;

    // The first C anchor is at screen (215.96, 94.8) within the SVG.
    // Right-click it to delete. We use a slightly rounded position.
    const svgBox = await svg.boundingBox();
    await page.mouse.click(svgBox.x + 216, svgBox.y + 95, { button: 'right' });

    // Segment count should decrease by 1
    const updatedJson = await pre.textContent();
    const updatedSegCount = (JSON.parse(updatedJson)).segments.length;
    expect(updatedSegCount).toBe(initialSegCount - 1);
  });

  test('select anchor then Delete key removes a segment', async ({ page }) => {
    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    const svg = page.locator('svg').first();
    const pre = page.locator('pre').first();

    const initialJson = await pre.textContent();
    const initialSegCount = (JSON.parse(initialJson)).segments.length;

    // Click the first C anchor to select it (turns gold)
    const svgBox = await svg.boundingBox();
    await page.mouse.click(svgBox.x + 216, svgBox.y + 95);

    // Selected anchor turns gold — verify
    const goldCircle = svg.locator('circle[fill="#fbbf24"]');
    await expect(goldCircle).toBeVisible({ timeout: 1000 });

    // Press Delete
    await page.keyboard.press('Delete');

    const updatedJson = await pre.textContent();
    const updatedSegCount = (JSON.parse(updatedJson)).segments.length;
    expect(updatedSegCount).toBe(initialSegCount - 1);
  });
});

test.describe('Lab — variable point count rendering', () => {
  test('lab handles shapes with more segments after insert without errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    const svg = page.locator('svg').first();
    const svgBox = await svg.boundingBox();

    // Insert 3 points in sequence
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(svgBox.x + 217, svgBox.y + 112);
      await page.waitForTimeout(100);
      await page.mouse.click(svgBox.x + 217, svgBox.y + 112);
      await page.waitForTimeout(100);
    }

    // SVG still renders without errors and crown path is still visible
    const paths = svg.locator('path');
    await expect(paths.first()).toBeVisible();
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
