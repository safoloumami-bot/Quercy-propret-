import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";

const tag = randomBytes(3).toString("hex");

test.describe("CRM — moteur de fiches", () => {
  test("créer une entreprise, la modifier en cellule, la commenter et y joindre un fichier", async ({
    page,
  }) => {
    const name = `Entreprise E2E ${tag}`;
    await page.goto("/crm/entreprises");
    await expect(page.getByRole("grid", { name: "Entreprises" })).toBeVisible();

    // Création (raccourci « C »).
    await page.getByRole("grid", { name: "Entreprises" }).focus();
    await page.keyboard.press("Escape");
    await page.locator("body").press("c");
    const dialog = page.getByRole("dialog", { name: "Nouvelle entreprise" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Nom").fill(name);
    await dialog.getByLabel("Ville").fill("Cahors");
    await dialog.getByRole("button", { name: "Créer" }).click();
    await expect(page.getByText(`Entreprise « ${name} » créée.`)).toBeVisible();

    // Recherche puis édition en place (double-clic sur la cellule Ville).
    await page.getByLabel("Rechercher dans les entreprises").fill(name);
    const row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row).toBeVisible();
    await row.getByRole("gridcell", { name: "Cahors" }).dblclick();
    const editor = row.getByRole("textbox", { name: "Ville" });
    await editor.fill("Figeac");
    await editor.press("Enter");
    await expect(row.getByRole("gridcell", { name: "Figeac" })).toBeVisible();

    // Panneau latéral : commentaire et pièce jointe.
    await row.getByRole("gridcell", { name, exact: true }).click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByRole("heading", { name })).toBeVisible();
    await panel.getByRole("tab", { name: "Commentaires" }).click();
    await panel.getByLabel("Nouveau commentaire").fill("Premier contact très positif.");
    await panel.getByRole("button", { name: "Commenter" }).click();
    await expect(panel.getByText("Premier contact très positif.")).toBeVisible();

    await panel.getByRole("tab", { name: "Fichiers" }).click();
    await panel.locator('input[type="file"]').setInputFiles({
      name: "devis.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
    });
    await expect(panel.getByRole("link", { name: "devis.pdf", exact: true })).toBeVisible();

    await panel.getByRole("tab", { name: "Historique" }).click();
    await expect(panel.getByText("Cahors").first()).toBeVisible();
    await expect(panel.getByText("Figeac").first()).toBeVisible();
  });

  test("importer des contacts depuis un CSV, puis les retrouver avec Ctrl+K", async ({ page }) => {
    await page.goto("/crm/contacts");
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Importer (CSV, Excel)" }).click();
    const dialog = page.getByRole("dialog", { name: "Importer des contacts" });
    const csv = `Prénom;Nom;Email;Statut\nAlice;Importée${tag};alice.${tag}@exemple.fr;Client\n;;pas-un-email;\n`;
    await dialog
      .locator('input[type="file"]')
      .setInputFiles({ name: "contacts.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(dialog.getByText("contacts.csv — 2 lignes")).toBeVisible();
    await dialog.getByRole("button", { name: "Vérifier les données" }).click();
    await expect(dialog.getByText("1 ligne(s) prête(s)")).toBeVisible();
    await expect(dialog.getByText("1 ligne(s) en erreur")).toBeVisible();
    await dialog.getByRole("button", { name: "Importer 1 ligne(s)" }).click();
    await expect(dialog.getByText(/1 fiche\(s\) importée\(s\)/)).toBeVisible();
    await dialog.getByRole("button", { name: "Terminé" }).click();

    await page.keyboard.press("ControlOrMeta+k");
    await page.keyboard.type(`Importée${tag}`);
    const result = page.getByRole("option", { name: new RegExp(`Alice Importée${tag}`) });
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(/\/crm\/contacts\/[a-z0-9]+$/);
    await expect(
      page.getByRole("heading", { level: 1, name: `Alice Importée${tag}` }),
    ).toBeVisible();
    // La fiche ouverte apparaît dans les onglets internes.
    await expect(
      page
        .getByRole("navigation", { name: "Fiches ouvertes" })
        .getByRole("link", { name: `Alice Importée${tag}` }),
    ).toBeVisible();
  });

  test("corbeille avec annulation, export et regroupement", async ({ page }) => {
    await page.goto("/crm/entreprises");
    const grid = page.getByRole("grid", { name: "Entreprises" });
    await expect(grid.getByRole("row").nth(2)).toBeVisible();

    // Mise à la corbeille via le menu contextuel, puis « Annuler ».
    const target = grid.getByRole("row").nth(1);
    const name = (await target.getByRole("gridcell").nth(1).textContent())!.trim();
    await target.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Mettre à la corbeille" }).click();
    await page.getByRole("button", { name: "Mettre à la corbeille" }).click();
    await expect(page.getByText("Fiche mise à la corbeille.")).toBeVisible();
    await page
      .getByLabel(/^Notifications/)
      .getByRole("button", { name: "Annuler" })
      .click();
    await expect(page.getByText("Fiche restaurée.")).toBeVisible();
    await expect(grid.getByRole("gridcell", { name, exact: true }).first()).toBeVisible();

    // Export Excel de la vue.
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Exporter la vue (Excel)" }).click();
    expect((await download).suggestedFilename()).toMatch(/^entreprises-\d{4}-\d{2}-\d{2}\.xlsx$/);

    // Regroupement par type avec sous-totaux.
    await page.getByRole("combobox", { name: "Regrouper par" }).click();
    await page.getByRole("option", { name: "Regrouper par type" }).click();
    await expect(page.getByRole("button", { name: /^Client \d+/ })).toBeVisible();
    await page.getByRole("combobox", { name: "Regrouper par" }).click();
    await page.getByRole("option", { name: "Sans regroupement" }).click();
  });
});
