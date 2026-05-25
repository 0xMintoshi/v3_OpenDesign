import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Lab — image import panel', () => {
  test('Import Image button toggles the panel', async ({ page }) => {
    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    const btn = page.getByRole('button', { name: /import image/i });
    await expect(btn).toBeVisible();
    await btn.click();

    // Panel should appear
    await expect(page.getByText('Import from Image')).toBeVisible();

    // Toggle off
    await page.getByRole('button', { name: /hide import/i }).click();
    await expect(page.getByText('Import from Image')).not.toBeVisible();
  });

  test('file upload shows threshold slider and Trace button', async ({ page }) => {
    await page.goto('/lab.html');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /import image/i }).click();

    // Upload a 1×1 white PNG via file input
    // Build a minimal PNG in base64 (1×1 white pixel)
    const tiny1x1WhitePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const tmpPath = path.join(__dirname, '_tmp_test.png');
    const { writeFileSync, unlinkSync } = await import('fs');
    writeFileSync(tmpPath, tiny1x1WhitePng);

    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(tmpPath);

    // Threshold slider should appear
    await expect(page.getByText(/threshold/i)).toBeVisible({ timeout: 2000 });
    await expect(page.getByRole('button', { name: /^trace$/i })).toBeVisible();

    unlinkSync(tmpPath);
  });
});
