import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  /* Aborts with a clear message if something other than this chart app is already
     serving baseURL. reuseExistingServer below will happily adopt a stray server,
     and the resulting whole-suite timeout looks like broken specs rather than a
     port collision. See e2e/assert-right-server.js. */
  globalSetup: './e2e/assert-right-server.js',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
