import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-parent',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npx http-server -c-1 -p 5173 "C:\\Users\\ZMZ\\Desktop\\Claude\\Dentistry\\Quotation App"',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
