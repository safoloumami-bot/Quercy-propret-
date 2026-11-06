import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
const FAKE_AI_PORT = Number(process.env.E2E_FAKE_AI_PORT ?? 4010);

/** Parcours de bout en bout, sur écran d'ordinateur (1280 px et 2560 px). */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop-1280",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: "e2e/.auth/owner.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "desktop-2560",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 2560, height: 1440 },
        storageState: "e2e/.auth/owner.json",
      },
      dependencies: ["setup"],
      testMatch: /layout\.spec\.ts/,
    },
  ],
  webServer: [
    {
      // Faux service Claude : réponses scriptées pour l'assistant, sans clé ni réseau.
      command: `tsx scripts/fake-anthropic.ts ${FAKE_AI_PORT}`,
      port: FAKE_AI_PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: process.env.CI ? `pnpm start -p ${PORT}` : `pnpm dev -p ${PORT}`,
      url: `${baseURL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // Les parcours E2E enchaînent plus de connexions que la limite anti-abus n'en autorise.
      env: {
        BETTER_AUTH_URL: baseURL,
        AUTH_RATE_LIMIT: "off",
        ANTHROPIC_API_KEY: "sk-e2e",
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${FAKE_AI_PORT}`,
      },
    },
  ],
  timeout: 60_000,
});
