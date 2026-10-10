import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createWorkspace, signUp, uniqueEmail, waitForApp } from "./helpers";

// Parcours de la définition de « terminé », dans un espace neuf.
test.use({ storageState: { cookies: [], origins: [] } });

test("inscription → accueil → invitation → client → devis → facture → paiement → tableau de bord → question à l'IA", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const tag = randomBytes(3).toString("hex");
  const company = `Boulangerie ${tag}`;

  // Inscription et assistant d'accueil.
  await page.goto("/inscription");
  await signUp(page, "Claire Parcours", uniqueEmail("parcours"), "Une-phrase-assez-longue-2026");
  await createWorkspace(page, `Parcours ${tag}`);

  // Invitation d'un collègue.
  await page.goto("/reglages/membres");
  await page.getByRole("button", { name: "Inviter" }).click();
  await page.getByLabel("Adresses email").fill(uniqueEmail("collegue"));
  await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
  await expect(page.getByRole("heading", { name: "Invitations envoyées" })).toBeVisible();
  await page.getByRole("button", { name: "Terminé" }).click();

  // Création du client.
  await page.goto("/crm/entreprises");
  await page.getByRole("button", { name: "Nouvelle entreprise" }).click();
  const newCompany = page.getByRole("dialog", { name: "Nouvelle entreprise" });
  await newCompany.getByLabel("Nom").fill(company);
  await newCompany.getByLabel("Email").fill(`compta.${tag}@exemple.fr`);
  await newCompany.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByText(`Entreprise « ${company} » créée.`)).toBeVisible();

  // Devis envoyé puis facturé.
  await page.goto("/ventes/devis");
  await page.getByRole("button", { name: "Nouveau devis" }).click();
  const newQuote = page.getByRole("dialog", { name: "Nouveau devis" });
  await newQuote.getByPlaceholder("Rechercher une entreprise…").fill(company);
  await newQuote.getByRole("option", { name: new RegExp(company) }).click();
  await newQuote.getByLabel("Objet").fill("Nettoyage du magasin");
  await newQuote.getByRole("button", { name: "Créer" }).click();
  await expect(page).toHaveURL(/\/ventes\/devis\/[a-z0-9]+$/);
  await page.getByRole("button", { name: "Ajouter une ligne" }).click();
  await page.getByLabel("Désignation, ligne 1").fill("Nettoyage complet");
  await page.getByLabel("Quantité, ligne 1").fill("1");
  await page.getByLabel("Prix unitaire HT, ligne 1").fill("500");
  await page.getByRole("button", { name: "Envoyer" }).click();
  const send = page.getByRole("dialog", { name: "Envoyer par email" });
  await send.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("heading", { name: /^Devis DV-\d{4}-\d{4}$/ })).toBeVisible();
  await page.getByRole("button", { name: "Facturer" }).click();
  await expect(page).toHaveURL(/\/ventes\/factures\/[a-z0-9]+$/);

  // Facture émise puis payée.
  await page.getByRole("button", { name: "Émettre" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Émettre" }).click();
  await expect(page.getByRole("heading", { name: /^Facture FA-\d{4}-\d{4}$/ })).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer un paiement" }).click();
  await page
    .getByRole("dialog", { name: "Enregistrer un paiement" })
    .getByRole("button", { name: "Enregistrer" })
    .click();
  await expect(page.getByText("Paiement enregistré.")).toBeVisible();

  // Tableau de bord : le chiffre d'affaires et l'encaissement apparaissent.
  await page.goto("/");
  await waitForApp(page);
  const revenue = page.getByRole("region", { name: "Chiffre d'affaires facturé" });
  await expect(revenue.getByText(/^500(,00)?\s€$/)).toBeVisible();

  // Question à l'assistant (réponses du faux service Claude).
  await page.keyboard.press("ControlOrMeta+j");
  const panel = page.getByRole("complementary", { name: "Assistant" });
  await panel.getByRole("button", { name: "Quel est mon chiffre d'affaires ce mois-ci ?" }).click();
  await expect(panel.getByText(/le chiffre d'affaires facturé est de/)).toBeVisible();
  await expect(panel.getByRole("link", { name: "Voir les factures" })).toBeVisible();
});
