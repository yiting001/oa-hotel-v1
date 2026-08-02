import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4273',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: [
    {
      command: 'PORT=3101 npm run start:test -w @oa/api',
      url: 'http://127.0.0.1:3101/api/v1/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        'OA_API_ORIGIN=http://127.0.0.1:3101 npm run preview -w @oa/web -- --host 127.0.0.1 --port 4273',
      url: 'http://127.0.0.1:4273',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
