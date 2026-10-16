import { defineConfig, devices } from '@playwright/test'

const CI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  // 首次运行生成视觉基线（e2e/*-snapshots/），之后有差异即失败；更新基线用 --update-snapshots
  updateSnapshots: 'missing',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @app/api dev',
      url: 'http://localhost:8787/api/health',
      env: { DATABASE_URL: 'pglite://memory' },
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
  ],
})
