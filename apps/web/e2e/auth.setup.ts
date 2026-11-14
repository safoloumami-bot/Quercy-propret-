import { expect, test as setup } from "@playwright/test";

import { DEMO_PASSWORD, signIn } from "./helpers";

/** Connexion unique du propriétaire de démonstration, réutilisée par les autres tests. */
setup("connexion du compte de démonstration", async ({ page }) => {
  await signIn(page, "demo@quercy.app", DEMO_PASSWORD);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Bonjour|Bonsoir) Camille/);
  await page.context().storageState({ path: "e2e/.auth/owner.json" });
});
