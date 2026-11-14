import { expect, test } from "@playwright/test";

test("la page de santé confirme la base et Redis", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.checks.database.ok).toBe(true);
  expect(body.checks.redis.ok).toBe(true);
});
