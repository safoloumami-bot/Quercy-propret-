import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";

test("hors ligne : la création attend la connexion puis s'envoie", async ({ page, context }) => {
  const subject = `Ticket hors ligne ${randomBytes(3).toString("hex")}`;
  await page.goto("/support/tickets");
  await expect(page.getByRole("heading", { level: 1, name: "Tickets" })).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText(/Hors ligne : les écrans déjà consultés/)).toBeVisible();
  await page.getByRole("button", { name: "Nouveau ticket" }).click();
  await page.getByRole("dialog").getByLabel("Objet").fill(subject);
  await page.getByRole("dialog").getByRole("button", { name: /Créer/ }).click();
  await expect(page.getByText(/sera créé au retour de la connexion/)).toBeVisible();
  await expect(page.getByText(/1 en attente/)).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText("1 création hors ligne envoyée.")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(subject) })).toBeVisible();
});
