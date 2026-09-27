import { expect, test } from "@playwright/test";

test.describe("apparence", () => {
  test("le thème sombre s'applique et se mémorise", async ({ page }) => {
    await page.goto("/reglages/apparence");
    await page.getByRole("radio", { name: "Sombre" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("radio", { name: "Clair" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("la couleur d'accent de l'espace s'enregistre et peut être annulée", async ({ page }) => {
    await page.goto("/reglages/apparence");
    const brand = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--brand").trim().toUpperCase(),
      );
    const initial = await brand();

    await page.getByRole("radio", { name: "Indigo" }).click();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Couleur d'accent enregistrée.")).toBeVisible();
    await expect.poll(brand).toBe("#4F46E5");

    await page.getByRole("button", { name: "Annuler" }).click();
    await expect.poll(brand).toBe(initial);
  });
});
