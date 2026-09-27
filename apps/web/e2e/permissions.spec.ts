import { expect, test } from "@playwright/test";

import { DEMO_PASSWORD, signIn } from "./helpers";

test.describe("compte lecteur", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("un lecteur ne voit ni la gestion des rôles, ni l'audit, ni le bouton d'invitation", async ({
    page,
  }) => {
    await signIn(page, "lucas.roux@quercy.app", DEMO_PASSWORD);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Bonjour|Bonsoir) Lucas/);

    await page.goto("/reglages/membres");
    const nav = page.getByRole("navigation", { name: "Réglages" });
    await expect(nav.getByRole("link", { name: "Membres" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Rôles et permissions" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Journal d'audit" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Inviter" })).toHaveCount(0);

    await page.goto("/reglages/roles");
    await expect(page.getByRole("heading", { name: "Accès réservé" })).toBeVisible();
  });
});

test("le propriétaire change un rôle et la modification est tracée", async ({ page }) => {
  await page.goto("/reglages/membres");
  const select = page.getByRole("combobox", { name: "Rôle de Nadia Benali" });
  await select.click();
  await page.getByRole("option", { name: "Lecteur" }).click();
  await expect(page.getByText("Rôle mis à jour.")).toBeVisible();
  await select.click();
  await page.getByRole("option", { name: "Comptable externe" }).click();
  await expect(select).toHaveText("Comptable externe");

  await page.goto("/reglages/audit");
  await expect(
    page.getByText("Camille Delmas a changé le rôle d'un membre — nadia.benali@quercy.app").first(),
  ).toBeVisible();
});
