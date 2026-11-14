import { expect, test } from "@playwright/test";

/** Les réponses viennent du faux service Claude (scripts/fake-anthropic.ts). */
test.describe("Assistant IA", () => {
  test("Ctrl+J, question chiffrée avec graphique et lien vers la liste filtrée", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("html[data-ready]").waitFor();
    await page.keyboard.press("ControlOrMeta+j");
    const panel = page.getByRole("complementary", { name: "Assistant" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/crédits? restants? ce mois-ci/)).toBeVisible();

    await panel
      .getByRole("button", { name: "Quel est mon chiffre d'affaires ce mois-ci ?" })
      .click();
    await expect(panel.getByText(/le chiffre d'affaires facturé est de/)).toBeVisible();
    await expect(panel.getByRole("link", { name: "Ouvrir dans les rapports" })).toBeVisible();
    await panel.getByRole("link", { name: "Voir les factures" }).click();
    // Le filtre de l'adresse est appliqué au tableau (puis retiré de l'adresse) : statut et
    // période du rapport.
    await expect(page).toHaveURL(/\/ventes\/factures/);
    await expect(page.getByRole("button", { name: /^Filtrer\s*2$/ })).toBeVisible({
      timeout: 15_000,
    });
    // Le panneau reste ouvert pendant la navigation.
    await expect(panel).toBeVisible();

    await page.keyboard.press("ControlOrMeta+j");
    await expect(panel).toBeHidden();
  });

  test("action proposée : rien n'est créé avant la confirmation", async ({ page }) => {
    await page.goto("/ventes/devis");
    await page.locator("html[data-ready]").waitFor();
    await page.getByRole("button", { name: "Assistant", exact: true }).click();
    const panel = page.getByRole("complementary", { name: "Assistant" });
    await panel.getByLabel("Message à l'assistant").fill("Crée un devis pour Rocamadour");
    await page.keyboard.press("Enter");
    const card = panel.getByRole("region", { name: /Action proposée/ });
    await expect(card).toBeVisible();
    await expect(card.getByText("À confirmer")).toBeVisible();
    await expect(card).toContainText("Journée de conseil");

    await card.getByRole("button", { name: "Confirmer" }).click();
    await expect(card.getByText("Exécutée")).toBeVisible();
    await card.getByRole("link", { name: "Ouvrir" }).click();
    await expect(page).toHaveURL(/\/ventes\/devis\/[a-z0-9]+$/);
    await expect(page.getByText("Journée de conseil").first()).toBeVisible();

    // L'historique garde la conversation ; elle peut être supprimée.
    await panel.getByRole("button", { name: "Historique des conversations" }).click();
    const item = panel.getByRole("button", { name: /Crée un devis pour Rocamadour/ }).first();
    await expect(item).toBeVisible();
    await panel
      .getByRole("button", { name: /Supprimer la conversation « Crée un devis pour Rocamadour »/ })
      .first()
      .click();
    await expect(page.getByText("Conversation supprimée.")).toBeVisible();
  });

  test("lecture d'une facture fournisseur", async ({ page }) => {
    await page.goto("/");
    await page.locator("html[data-ready]").waitFor();
    await page.keyboard.press("ControlOrMeta+j");
    const panel = page.getByRole("complementary", { name: "Assistant" });
    await panel.getByLabel("Document à lire").setInputFiles({
      name: "facture-martin.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%test\n"),
    });
    const card = panel.getByRole("region", { name: "Données lues : facture-martin.pdf" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Papeterie Martin");
    await expect(card.getByText("Totaux cohérents")).toBeVisible();
  });
});
