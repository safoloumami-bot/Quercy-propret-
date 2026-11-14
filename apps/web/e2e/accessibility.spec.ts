import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { waitForApp } from "./helpers";

/** Écrans principaux audités (WCAG 2.1 A et AA) : aucune violation grave ou critique. */
const SCREENS = [
  "/",
  "/crm/entreprises",
  "/ventes/factures",
  "/projets/taches",
  "/achats/factures",
  "/support/tickets",
  "/rapports",
  "/automatisations",
  "/integrations",
  "/reglages/membres",
];

for (const path of SCREENS) {
  test(`accessibilité : ${path}`, async ({ page }) => {
    await page.goto(path);
    await waitForApp(page);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // Réanalyse tant que des widgets finissent de charger ; une violation durable échoue.
    const audit = async () => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      return results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map(
          (v) =>
            `${v.id} (${v.impact}) : ${v.nodes
              .map((n) => n.target.join(" "))
              .slice(0, 3)
              .join(" | ")}`,
        );
    };
    await expect.poll(audit, { timeout: 15_000, intervals: [1_000, 2_000] }).toEqual([]);
  });
}
