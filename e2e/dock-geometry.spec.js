import { test, expect } from '@playwright/test';

// Dock geometry assertions (C4) — verifies the centred dock layout introduced
// in 2026-08-24.
//
// CONSTANTS — kept in sync with source manually; grep these comments when the
// source values change so the spec doesn't silently drift again.
//
//   PILL_BOTTOM  → app/tweaks-panel.jsx:50    export const PILL_BOTTOM = 30;
//   PILL_H       → app/tweaks-panel.jsx:51    export const PILL_H = 32;
//   PANEL_BOTTOM → app/treatment-panel.jsx:8  const PANEL_BOTTOM = PILL_BOTTOM + PILL_H + 18;
//   DOCK_BOTTOM  → src/styles.css:210         bottom: 30px  (CSS-only; no JS constant)
//
// Importing from .jsx is not supported in the Playwright (non-Vite) runner, so
// the values are mirrored here. If you change one in the source, update it here.

const PILL_BOTTOM = 30;   // app/tweaks-panel.jsx:50
const PILL_H = 32;        // app/tweaks-panel.jsx:51
const PANEL_BOTTOM = PILL_BOTTOM + PILL_H + 18; // = 80; app/treatment-panel.jsx:8
const DOCK_BOTTOM = 30;   // src/styles.css:210 — CSS-only, no JS constant

test.describe('Dock geometry (C4)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-tooth-id]');
  });

  test('dock height is 53px', async ({ page }) => {
    const dock = page.locator('.dock');
    const box = await dock.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeCloseTo(53, 0);
  });

  test('dock is horizontally centred within 1px of viewport centre', async ({ page }) => {
    const dock = page.locator('.dock');
    const box = await dock.boundingBox();
    const innerWidth = await page.evaluate(() => window.innerWidth);
    const dockCentre = box.x + box.width / 2;
    expect(Math.abs(dockCentre - innerWidth / 2)).toBeLessThanOrEqual(1);
  });

  test('dock bottom edge is 30px from viewport bottom', async ({ page }) => {
    const dock = page.locator('.dock');
    const box = await dock.boundingBox();
    const innerHeight = await page.evaluate(() => window.innerHeight);
    const bottomGap = innerHeight - (box.y + box.height);
    expect(bottomGap).toBeCloseTo(DOCK_BOTTOM, 0);
  });

  test('PanelDock pill is 30px from viewport bottom, 40px from right', async ({ page }) => {
    const pill = page.locator('.pnl-dock');
    const box = await pill.boundingBox();
    const innerHeight = await page.evaluate(() => window.innerHeight);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    const bottomGap = innerHeight - (box.y + box.height);
    const rightGap = innerWidth - (box.x + box.width);
    expect(bottomGap).toBeCloseTo(PILL_BOTTOM, 0);
    expect(rightGap).toBeCloseTo(40, 0);
  });

  test('tweaks panel sits at bottom 80px when visible', async ({ page }) => {
    // PANEL_BOTTOM = PILL_BOTTOM(30) + PILL_H(32) + 18 = 80
    // The app initialises with openPanel='tweaks' (dental-arch.jsx:469), so the
    // panel is already open on page load — no click needed.
    const panel = page.locator('.twk-panel');
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    const innerHeight = await page.evaluate(() => window.innerHeight);
    const bottomGap = innerHeight - (box.y + box.height);
    expect(bottomGap).toBeCloseTo(PANEL_BOTTOM, 0);
  });

  test('dock top edge clears the lowest rendered arch content', async ({ page }) => {
    // The arch SVG's bounding box extends into empty viewBox space at the bottom
    // (the SVG viewBox is 0 0 1600 800 and the bottom ~37px of the bounding box
    // is empty).  Measured live 2026-08-25: lowest .anatomy-layer content ends at
    // ~634px; dock top is at ~660px — 25.6px clearance.
    //
    // We assert content-clearance ≥ 10px, NOT bounding-box non-intersection.
    const dock = page.locator('.dock');
    const archContent = page.locator('.arch-svg .anatomy-layer').first();
    const dockBox = await dock.boundingBox();
    const contentBox = await archContent.boundingBox();
    expect(dockBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    const clearance = dockBox.y - (contentBox.y + contentBox.height);
    expect(clearance).toBeGreaterThanOrEqual(10);
  });

  // Phone-viewport note (2026-08-25):
  // The chart uses useIsTablet() with TABLET_QUERY = '(max-width: 1180px)'.
  // At ≤1180px the component renders .tablet-chart instead of .stage + .dock,
  // so .dock does not exist at 375px or 480px.  The earlier test asserting dock
  // centring at 375px could never pass.  The @media (max-width: 480px) .dock
  // rule in src/styles.css is therefore unreachable — confirm with Minzhe
  // whether it should be removed.
  //
  // This test verifies the tablet layout IS rendered at 375px instead.
  test('phone viewport: tablet layout renders at 375px (dock absent)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300); // allow media-query reflow
    const tabletChart = page.locator('.tablet-chart');
    await expect(tabletChart).toBeVisible();
    // .count() returns 0 immediately when element is absent — don't use .boundingBox()
    // which waits for the element to exist/visible and hangs when it never renders.
    const dockCount = await page.locator('.dock').count();
    expect(dockCount).toBe(0); // dock must not exist in tablet layout
  });
});
