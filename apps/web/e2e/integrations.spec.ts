import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";

const tag = randomBytes(3).toString("hex");

test.describe("Automatisations et intégrations", () => {
  test("créer une automatisation puis la désactiver", async ({ page }) => {
    const name = `Relance ${tag}`;
    await page.goto("/automatisations");
    await page.getByRole("button", { name: "Nouvelle automatisation" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nom").fill(name);
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Automatisation enregistrée.")).toBeVisible();
    const toggle = page.getByRole("switch", { name: `Activer « ${name} »` });
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
  });

  test("créer une clé d'API et l'utiliser", async ({ page }) => {
    await page.goto("/integrations");
    await page.getByRole("button", { name: "Nouvelle clé" }).click();
    await page.getByRole("dialog").getByLabel("Nom").fill(`E2E ${tag}`);
    await page.getByRole("dialog").getByRole("button", { name: "Créer la clé" }).click();
    const key = await page.getByRole("textbox", { name: "Nouvelle clé d'API" }).inputValue();
    expect(key).toMatch(/^qk_/);
    const response = await page.request.get("/api/v1/company?limit=1", {
      headers: { authorization: `Bearer ${key}` },
    });
    expect(response.status()).toBe(200);
    expect(((await response.json()) as { total: number }).total).toBeGreaterThan(0);
    const openapi = await page.request.get("/api/v1/openapi.json");
    expect(((await openapi.json()) as { openapi: string }).openapi).toBe("3.1.0");
  });
});
