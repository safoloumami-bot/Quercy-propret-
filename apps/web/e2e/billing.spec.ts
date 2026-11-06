import { expect, test } from "@playwright/test";

import { DEMO_PASSWORD, signIn } from "./helpers";

test("la facturation présente l'offre, l'utilisation et les offres disponibles", async ({
  page,
}) => {
  await page.goto("/reglages/facturation");
  await expect(page.getByRole("heading", { level: 1, name: "Facturation" })).toBeVisible();
  const current = page.getByRole("region", { name: "Offre actuelle" });
  await expect(current).toContainText("Business");
  await expect(current).toContainText("Actif");
  await expect(page.getByRole("meter", { name: "Membres" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Modules actifs" })).toBeVisible();

  const plans = page.getByRole("region", { name: "Offres" });
  await expect(plans.getByText("Sur devis", { exact: true })).toBeVisible();
  await plans.getByRole("tab", { name: "Mensuel" }).click();
  await expect(plans.getByText(/^15\s€/)).toBeVisible();
  await plans.getByRole("tab", { name: /Annuel/ }).click();
  await expect(plans.getByText(/^12\s€/)).toBeVisible();
  await expect(page.getByText("Aucune facture pour l'instant")).toBeVisible();
});

test.describe("sans droit de facturation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("un membre ne voit pas la facturation", async ({ page }) => {
    await signIn(page, "sophie.lacombe@quercy.app", DEMO_PASSWORD);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Bonjour|Bonsoir) Sophie/);
    await page.goto("/reglages/facturation");
    await expect(page.getByRole("heading", { name: "Accès réservé" })).toBeVisible();
  });
});

test.describe("administration de la plateforme", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("le super-admin suit les clients et ouvre une session d'assistance tracée", async ({
    page,
  }) => {
    await signIn(page, "admin@quercy.app", DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/bienvenue/);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Tableau de bord de la plateforme" }),
    ).toBeVisible();
    await expect(page.getByText("Revenu mensuel récurrent (MRR)")).toBeVisible();

    await page.getByLabel("Rechercher un espace").fill("Studio Cahors");
    const row = page.getByRole("row", { name: /Studio Cahors/ });
    await expect(row.getByText("Paiement refusé")).toBeVisible();
    await row.getByRole("button", { name: "Se connecter en tant que" }).click();
    await page.getByRole("button", { name: "Ouvrir la session d'assistance" }).click();

    await expect(
      page.getByText("Session d'assistance : vous êtes connecté en tant que"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Espace : Studio Cahors. Changer d'espace" }),
    ).toBeVisible();
    // Paiement refusé : le bandeau du délai de grâce s'affiche.
    await expect(page.getByText(/Le dernier paiement a échoué/)).toBeVisible();

    await page.goto("/reglages/audit");
    await expect(page.getByText(/a ouvert une session d'assistance/).first()).toBeVisible();

    await page.getByRole("button", { name: "Terminer la session" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("l'administration est invisible pour un client", async ({ page }) => {
    await signIn(page, "demo@quercy.app", DEMO_PASSWORD);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Bonjour|Bonsoir) /);
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
  });
});
