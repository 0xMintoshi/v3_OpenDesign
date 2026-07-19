import { test, expect } from '@playwright/test';

const SS = String.raw`C:\Users\ZMZ\AppData\Local\Temp\claude\c--Users-ZMZ-Desktop-Claude\46ed7b87-398a-4d34-aaf2-67a3974c36e5\scratchpad`;

test('Recon — discover v3 page structure', async ({ page }) => {
  await page.goto('/v3/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${SS}\\recon_00_loaded.png`, fullPage: true });

  const title = await page.title();
  console.log('Title:', title);
  const frames = page.frames();
  console.log('Frame count:', frames.length);
  for (const f of frames) console.log('  Frame URL:', f.url());

  const inputs = await page.locator('input').count();
  const buttons = await page.locator('button').count();
  console.log(`Inputs: ${inputs}, Buttons: ${buttons}`);
  const btns = await page.locator('button').allTextContents();
  console.log('Buttons:', JSON.stringify(btns.slice(0, 10)));

  expect(true).toBe(true);
});
