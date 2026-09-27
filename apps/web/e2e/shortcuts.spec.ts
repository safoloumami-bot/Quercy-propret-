import { expect, test } from "@playwright/test";

test.describe("clavier", () => {
  test("Ctrl+K ouvre la palette et navigue vers un écran", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByRole("dialog", { name: "Palette de commandes" });
    await expect(palette).toBeVisible();
    await page.keyboard.type("design");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/design-system$/);
    await expect(palette).toBeHidden();
  });

  test("? affiche l'aide et « G puis R » ouvre l'apparence", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Raccourcis clavier" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("g");
    await page.keyboard.press("r");
    await expect(page).toHaveURL(/\/reglages\/apparence$/);
    await expect(page.getByRole("heading", { level: 1, name: "Apparence" })).toBeVisible();
  });

  test("Ctrl+B replie la barre latérale et l'état survit au rechargement", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const sidebar = page.getByRole("complementary", { name: "Barre latérale" });
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
    await page.keyboard.press("ControlOrMeta+b");
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await page.reload();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await page.keyboard.press("ControlOrMeta+b");
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  });
});
