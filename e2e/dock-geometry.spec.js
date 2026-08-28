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

  // Phone-viewport note — REVISED 2026-08-28.
  //
  // The 2026-08-25 version of this test asserted the opposite: that .dock is
  // ABSENT at 375px, because ≤1180px rendered .tablet-chart instead of
  // .stage + .dock. That reading treated a bug as intended design. The same note
  // observed that the `@media (max-width: 480px) .dock` rule in src/styles.css
  // had become unreachable and wondered whether to delete it — which was the
  // clue: the rule was written for a dock that was supposed to be there.
  //
  // The tablet branch made the chart unusable on every iPad (no CHART_READY, so
  // the parent's loading overlay never cleared) and has been removed. One layout
  // now renders at every width, so the dock exists at 375px again and that media
  // rule is live. See docs/plans/2026-08-28-phase-a-ipad-findings.md.
  test('phone viewport: dock renders and stays on screen at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300); // allow media-query reflow
    await expect(page.locator('.dock')).toBeVisible();
    const box = await page.locator('.dock').boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  });

  // Regression guard for the iPad break. This asserts through the REAL call site
  // at a real iPad width — the previous unit test rendered TabletChart with
  // explicit props the production render never passed, so it stayed green while
  // the app was dead on the device it was meant to cover.
  test('iPad width renders the interactive chart, not a static one', async ({ page }) => {
    await page.setViewportSize({ width: 810, height: 1080 });
    await page.waitForTimeout(300);
    await expect(page.locator('.dock')).toBeVisible();
    // role=button is what makes a tooth an interactive control; the removed
    // tablet layout drew bare <g data-tooth-id> with no role and no handlers.
    await expect(page.locator('[role="button"][data-tooth-id]')).toHaveCount(32);
    await expect(page.locator('.tablet-chart')).toHaveCount(0);
  });
});
