import { defineConfig } from '@playwright/test';

const baseURL = process.env.APP_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Se já houver um dev server rodando, exporte PW_WEB_SERVER=skip ao rodar o teste.
  webServer:
    process.env.PW_WEB_SERVER === 'skip'
      ? undefined
      : {
          command: 'npm run dev -- --host --port 5173',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 60_000,
        },
});
