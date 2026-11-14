import { expect, test } from "@playwright/test";

const SCREENS: [string, string][] = [
  ["/achats/fournisseurs", "Fournisseurs"],
  ["/achats/factures", "Factures fournisseurs"],
  ["/achats/notes-de-frais", "Notes de frais"],
  ["/stocks/mouvements", "Mouvements de stock"],
  ["/agenda/evenements", "Événements"],
  ["/support/tickets", "Tickets"],
  ["/rh/salaries", "Salariés"],
  ["/rh/absences", "Congés et absences"],
  ["/tresorerie/operations", "Opérations bancaires"],
  ["/documents/bibliotheque", "Documents"],
];

test.describe("Modules complémentaires", () => {
  test("chaque écran s'ouvre avec ses données de démonstration", async ({ page }) => {
    for (const [path, title] of SCREENS) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole("row").nth(1)).toBeVisible();
    }
  });
});
