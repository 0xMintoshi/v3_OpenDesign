import { test, expect } from '@playwright/test';

// crown-molar-upper is a treatment shape: CX=20, CY=20, W=38, H=88.
// M anchor (nx=0.48, ny=0):    SVG (38.24, 20)
// 1st C endpoint (nx=0.42, ny=-0.40): SVG (35.96, -15.2)
// Hover point = chord midpoint ≈ SVG (37.1, 2.4) — within HOVER_THRESHOLD_PX=10 of the path.

/** Screen coords of the nth white anchor circle (r=5), using the SVG's CTM. */
async function getAnchorScreen(page, idx) {
  return page.evaluate((n) => {
    const svg = document.querySelector('svg');
    const anchors = [...svg.querySelectorAll('circle[r="5"]')];
    const a = anchors[n];
    const pt = svg.createSVGPoint();
    pt.x = parseFloat(a.getAttribute('cx'));
    pt.y = parseFloat(a.getAttribute('cy'));
    const s = pt.matrixTransform(a.getScreenCTM());
    return { x: Math.round(s.x), y: Math.round(s.y) };
  }, idx);
}

/** Screen coords of the chord midpoint between two anchors — close enough to the bezier path. */
async function getChordMidScreen(page, i1, i2) {
  return page.evaluate(([n1, n2]) => {
    const svg = document.querySelector('svg');
    const anchors = [...svg.querySelectorAll('circle[r="5"]')];
    function screenOf(a) {
      const pt = svg.createSVGPoint();
      pt.x = parseFloat(a.getAttribute('cx'));
      pt.y = parseFloat(a.getAttribute('cy'));
      const s = pt.matrixTransform(a.getScreenCTM());
      return { x: Math.round(s.x), y: Math.round(s.y) };
    }
    const p1 = screenOf(anchors[n1]);
    const p2 = screenOf(anchors[n2]);
    return { x: Math.round((p1.x + p2.x) / 2), y: Math.round((p1.y + p2.y) / 2) };
  }, [i1, i2]);
}

test.describe('Lab — point insert', () => {
  test('phantom dot appears when hovering near outline', async ({ page }) => {
    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();

    // Hover near the chord midpoint between anchor 0 (M) and anchor 1 (first C endpoint)
    const hoverPos = await getChordMidScreen(page, 0, 1);
    await page.mouse.move(hoverPos.x, hoverPos.y);

    // Phantom dot: green circle (fill includes rgba(34,197,94))
    const phantom = svg.locator('circle[fill*="34,197,94"]');
    await expect(phantom).toBeVisible({ timeout: 2000 });
  });

  test('clicking near outline inserts a new segment', async ({ page }) => {
    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    const svg = page.locator('svg').first();
    const pre = page.locator('pre').first();

    const initialJson = await pre.textContent();
    const initialSegCount = (JSON.parse(initialJson)).segments.length;

    const hoverPos = await getChordMidScreen(page, 0, 1);
    await page.mouse.move(hoverPos.x, hoverPos.y);
    await expect(svg.locator('circle[fill*="34,197,94"]')).toBeVisible({ timeout: 2000 });

    await page.mouse.click(hoverPos.x, hoverPos.y);

    const updatedJson = await pre.textContent();
    const updatedSegCount = (JSON.parse(updatedJson)).segments.length;
    expect(updatedSegCount).toBe(initialSegCount + 1);
  });
});

test.describe('Lab — point delete', () => {
  test('right-click on anchor removes a segment', async ({ page }) => {
    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    const pre = page.locator('pre').first();
    const initialJson = await pre.textContent();
    const initialSegCount = (JSON.parse(initialJson)).segments.length;

    // Right-click anchor index 3 (segment 3, a C endpoint, inside SVG bounds) to delete it.
    // Anchors 1 & 2 are above the SVG hit box (negative SVG-Y), so use index 3.
    const anchorPos = await getAnchorScreen(page, 3);
    await page.mouse.click(anchorPos.x, anchorPos.y, { button: 'right' });

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

    // Left-click anchor index 3 (in-bounds C endpoint) to select it (turns gold)
    const anchorPos = await getAnchorScreen(page, 3);
    await page.mouse.click(anchorPos.x, anchorPos.y);

    const goldCircle = svg.locator('circle[fill="#fbbf24"]');
    await expect(goldCircle).toBeVisible({ timeout: 1000 });

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

    // Insert 3 points in sequence
    for (let i = 0; i < 3; i++) {
      const hoverPos = await getChordMidScreen(page, 0, 1);
      await page.mouse.move(hoverPos.x, hoverPos.y);
      await page.waitForTimeout(100);
      await page.mouse.click(hoverPos.x, hoverPos.y);
      await page.waitForTimeout(100);
    }

    const paths = svg.locator('path');
    await expect(paths.first()).toBeVisible();
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
