import { expect, test } from "@playwright/test";

test.describe("cadre de l'application", () => {
  test("l'accueil s'affiche avec la barre latérale et sans défilement horizontal", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Bonjour|Bonsoir) /);
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Accueil" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("le design system présente les jetons et les composants", async ({ page }) => {
    await page.goto("/design-system");
    await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Couleurs" })).toBeVisible();
    await page.getByRole("button", { name: "Ouvrir une confirmation" }).click();
    await expect(page.getByRole("dialog", { name: "Supprimer ce devis ?" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});
