import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";

const tag = randomBytes(3).toString("hex");

test.describe("Tableau de bord et rapports", () => {
  test("indicateurs, clic vers la liste filtrée, personnalisation", async ({ page }) => {
    await page.goto("/");
    const revenue = page.getByRole("region", { name: "Chiffre d'affaires facturé" });
    await expect(revenue).toBeVisible();
    await expect(revenue.getByText(/la période précédente/)).toBeVisible();

    // Période globale : l'indicateur se recalcule.
    await page.getByRole("combobox", { name: "Période" }).click();
    await page.getByRole("option", { name: "12 derniers mois" }).click();
    await expect(page.getByRole("combobox", { name: "Période" })).toHaveText(/12 derniers mois/);

    // Clic sur le chiffre : liste des factures filtrée.
    await revenue.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/ventes\/factures$/);
    await expect(page.getByRole("button", { name: /Filtrer/ })).toContainText("2");
    await page.goBack();

    // Personnalisation : ajout d'un objectif, configuration, puis retour au tableau par défaut.
    await page.getByRole("button", { name: "Personnaliser" }).click();
    await page.getByRole("button", { name: "Ajouter un widget" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Objectif de chiffre d'affaires/ })
      .click();
    await expect(page.getByText("Widget « Objectif de chiffre d'affaires » ajouté.")).toBeVisible();
    await page.getByRole("button", { name: "Terminer" }).click();
    await expect(page.getByText("Tableau de bord enregistré.")).toBeVisible();
    const objective = page.getByRole("region", { name: "Objectif de chiffre d'affaires" });
    await objective.getByRole("button", { name: /Options du widget/ }).click();
    await page.getByRole("menuitem", { name: "Configurer" }).click();
    await page.getByLabel("Objectif (€ HT)").fill("250000");
    await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
    await expect(
      objective.getByRole("progressbar", { name: "Progression vers l'objectif" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Personnaliser" }).click();
    await page.getByRole("button", { name: "Par défaut" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Rétablir" }).click();
    await expect(page.getByText("Tableau de bord par défaut rétabli.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Objectif de chiffre d'affaires" })).toHaveCount(
      0,
    );
  });

  test("construire un rapport à partir d'un modèle, l'enregistrer et l'exporter", async ({
    page,
  }) => {
    const name = `Rapport E2E ${tag}`;
    await page.goto("/rapports");
    await page.getByRole("link", { name: /Chiffre d'affaires par client/ }).click();
    await expect(
      page.getByRole("heading", { name: "Chiffre d'affaires par client" }),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: "Chiffre d'affaires par client" })).toBeVisible();

    await page.getByLabel("Affichage").click();
    await page.getByRole("option", { name: "Tableau" }).click();
    await expect(page.getByRole("row", { name: /Total/ })).toBeVisible();

    await page.getByRole("button", { name: "Enregistrer le rapport" }).click();
    const dialog = page.getByRole("dialog", { name: "Enregistrer le rapport" });
    await dialog.getByLabel("Nom").fill(name);
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/rapports\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name })).toBeVisible();

    const csvHref = await page
      .getByRole("button", { name: "Exporter" })
      .click()
      .then(() => page.getByRole("menuitem", { name: "CSV" }).getAttribute("href"));
    const csv = await page.request.get(csvHref!);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(await csv.text()).toContain("Total");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Supprimer le rapport" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
    await expect(page).toHaveURL(/\/rapports$/);
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
  });
});
