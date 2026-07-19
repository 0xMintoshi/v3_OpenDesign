import { test, expect } from '@playwright/test';

const SS = String.raw`C:\Users\ZMZ\AppData\Local\Temp\claude\c--Users-ZMZ-Desktop-Claude\46ed7b87-398a-4d34-aaf2-67a3974c36e5\scratchpad`;

test('Inspect chart DOM for tooth selectors', async ({ page }) => {
  await page.goto('/v3/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SS}\\dom_00_main.png`, fullPage: false });

  const cf = page.frames().find((f) => f.url().includes('/chart/dist'));
  await cf.waitForTimeout(2000);

  // Check what attributes SVG/g elements have
  const info = await cf.evaluate(() => {
    // Find all elements with data-* attributes
    const all = document.querySelectorAll('[data-tooth], [data-fdi], [data-id], [class*="tooth"], [class*="arch"], g[id]');
    return Array.from(all).slice(0, 20).map((el) => ({
      tag: el.tagName,
      id: el.id,
      class: el.className?.toString?.()?.slice(0, 50) || '',
      dataAttrs: Object.fromEntries(
        Array.from(el.attributes)
          .filter((a) => a.name.startsWith('data-') || a.name === 'id')
          .map((a) => [a.name, a.value.slice(0, 30)])
      ),
    }));
  });
  console.log('Chart DOM elements:', JSON.stringify(info, null, 2));

  // Also check what's clickable
  const clickable = await cf.evaluate(() => {
    const all = document.querySelectorAll('[onclick], g, path, circle, ellipse, rect, svg');
    return Array.from(all).slice(0, 10).map((el) => ({
      tag: el.tagName,
      id: el.id,
      class: el.className?.toString?.()?.slice(0, 40) || '',
    }));
  });
  console.log('Clickable SVG elements:', JSON.stringify(clickable, null, 2));

  // Check tooth count by trying data-tooth-id
  const toothIds = await cf.evaluate(() => {
    const toothEls = document.querySelectorAll('g[data-tooth-id], g[data-tooth], [aria-label*="tooth"], [title]');
    return Array.from(toothEls).slice(0, 10).map((el) => ({
      id: el.id,
      dataToothId: el.getAttribute('data-tooth-id'),
      dataTooth: el.getAttribute('data-tooth'),
      ariaLabel: el.getAttribute('aria-label'),
      title: el.querySelector('title')?.textContent,
    }));
  });
  console.log('Tooth elements:', JSON.stringify(toothIds, null, 2));

  // Read React's internal state via window variables
  const chartState = await cf.evaluate(() => {
    // Check if chart exposes any state
    return {
      windowKeys: Object.keys(window).filter(k => !['__', 'webkit', 'chrome'].some(p => k.startsWith(p))).slice(0, 20),
    };
  });
  console.log('Window state keys:', chartState.windowKeys);

  expect(true).toBe(true);
});
