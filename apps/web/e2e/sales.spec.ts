import { randomBytes } from "node:crypto";

import { type Page, expect, test } from "@playwright/test";

import { appLink, waitForMail } from "./helpers";

const tag = randomBytes(3).toString("hex");

async function createCompany(page: Page, name: string) {
  await page.goto("/crm/entreprises");
  await page.getByRole("button", { name: "Nouvelle entreprise" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouvelle entreprise" });
  await dialog.getByLabel("Nom").fill(name);
  await dialog.getByLabel("Email").fill(`compta.${tag}@exemple.fr`);
  await dialog.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByText(`Entreprise « ${name} » créée.`)).toBeVisible();
}

/** Crée un document commercial pour un client puis ouvre son écran. */
async function createDocument(
  page: Page,
  list: string,
  button: string,
  company: string,
  subject: string,
) {
  await page.goto(list);
  await page.getByRole("button", { name: button }).click();
  const dialog = page.getByRole("dialog", { name: button });
  await dialog.getByPlaceholder("Rechercher une entreprise…").fill(company);
  await dialog.getByRole("option", { name: new RegExp(company) }).click();
  await dialog.getByLabel("Objet").fill(subject);
  await dialog.getByRole("button", { name: "Créer" }).click();
  await expect(page).toHaveURL(new RegExp(`${list}/[a-z0-9]+$`));
}

async function addLine(page: Page, description: string, quantity: string, price: string) {
  await page.getByRole("button", { name: "Ajouter une ligne" }).click();
  await page.getByLabel("Désignation, ligne 1").fill(description);
  await page.getByLabel("Quantité, ligne 1").fill(quantity);
  await page.getByLabel("Prix unitaire HT, ligne 1").fill(price);
}

test.describe("Ventes & facturation", () => {
  const company = `Client Ventes ${tag}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: "e2e/.auth/owner.json" });
    await createCompany(page, company);
    await page.close();
  });

  test("facture : lignes, émission numérotée, paiement, PDF Factur-X", async ({ page }) => {
    await createDocument(page, "/ventes/factures", "Nouvelle facture", company, "Remise en état");
    await expect(page.getByRole("heading", { name: "Facture — brouillon" })).toBeVisible();
    await addLine(page, "Remise en état après travaux", "2", "150");
    const totals = page.getByLabel("Totaux");
    await expect(totals.getByText(/^360(,00)?\s€$/)).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer les lignes" }).click();
    await expect(page.getByText("Lignes enregistrées.")).toBeVisible();

    await page.getByRole("button", { name: "Émettre" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Émettre" }).click();
    await expect(page.getByRole("heading", { name: /^Facture FA-\d{4}-\d{4}$/ })).toBeVisible();
    await expect(page.getByLabel("Désignation, ligne 1")).toHaveCount(0);

    await page.getByRole("button", { name: "Enregistrer un paiement" }).click();
    const payment = page.getByRole("dialog", { name: "Enregistrer un paiement" });
    await expect(payment.getByLabel("Montant (€)")).toHaveValue("360,00");
    await payment.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Paiement enregistré.")).toBeVisible();
    await expect(page.getByText("Payée", { exact: true }).first()).toBeVisible();

    const id = page.url().split("/").pop()!;
    const pdf = await page.request.get(`/api/ventes/documents/${id}/pdf`);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    const body = await pdf.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(body.includes(Buffer.from("factur-x.xml"))).toBe(true);
  });

  test("devis envoyé par email puis accepté en ligne par le client", async ({
    page,
    browser,
    request,
  }) => {
    const email = `acheteur.${tag}@exemple.fr`;
    await createDocument(page, "/ventes/devis", "Nouveau devis", company, "Entretien annuel");
    await addLine(page, "Entretien de bureaux — forfait mensuel", "12", "890");
    await page.getByRole("button", { name: "Envoyer" }).click();
    const send = page.getByRole("dialog", { name: "Envoyer par email" });
    await send.getByLabel("Destinataire").fill(email);
    await send.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText(`Envoyé à ${email}.`)).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Devis DV-\d{4}-\d{4}$/ })).toBeVisible();

    const links = await waitForMail(request, email, /Devis/);
    const publicLink = appLink(links, /\/document\/[a-z0-9]+$/);

    // Le client, sans compte, consulte et accepte le devis.
    const client = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const clientPage = await client.newPage();
    await clientPage.goto(publicLink);
    await expect(clientPage.getByRole("heading", { name: /^Devis DV-/ })).toBeVisible();
    await clientPage.getByLabel("Nom et prénom du signataire").fill("Marie Dupont");
    await clientPage.getByLabel(/Bon pour accord/).check();
    await clientPage.getByRole("button", { name: "Accepter le devis" }).click();
    await expect(clientPage.getByText(/Le devis est accepté/)).toBeVisible();
    const pdf = await clientPage.request.get(`${publicLink}/pdf`);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    await client.close();

    await page.reload();
    await expect(page.getByText("Accepté", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Facturer" }).click();
    await expect(page).toHaveURL(/\/ventes\/factures\/[a-z0-9]+$/);
    await expect(page.getByText("Facture créée à partir du devis.")).toBeVisible();
  });
});

test.describe("CRM et projets", () => {
  test("pipeline Kanban : déplacer une opportunité vers « Gagnée »", async ({ page }) => {
    const name = `Opportunité ${tag}`;
    await page.goto("/crm/opportunites");
    await page.getByRole("radio", { name: "Kanban" }).click();
    await page.getByRole("button", { name: "Nouvelle opportunité" }).click();
    const dialog = page.getByRole("dialog", { name: "Nouvelle opportunité" });
    await dialog.getByLabel("Nom").fill(name);
    await dialog.getByLabel("Montant").fill("4800");
    await dialog.getByRole("button", { name: "Créer" }).click();
    await expect(page.getByText(`Opportunité « ${name} » créée.`)).toBeVisible();
    await page.keyboard.press("Escape");

    const lead = page.locator('section[aria-label^="Nouvelle"]');
    await expect(lead.getByRole("button", { name, exact: true })).toBeVisible();
    await lead.getByRole("button", { name: `Déplacer « ${name} »` }).click();
    await page.getByRole("menuitem", { name: "Gagnée" }).click();
    const won = page.locator('section[aria-label^="Gagnée"]');
    await expect(won.getByRole("button", { name, exact: true })).toBeVisible();
    await expect(lead.getByRole("button", { name, exact: true })).toHaveCount(0);
  });

  test("fusionner deux entreprises en double", async ({ page }) => {
    const first = `Boulangerie Doublon ${tag}`;
    await createCompany(page, first);
    await createCompany(page, `${first} SARL`);
    await page.goto("/crm/doublons");
    const pair = page.getByRole("listitem").filter({ hasText: `${first} SARL` });
    await expect(pair).toBeVisible();
    await pair.getByRole("button", { name: "Conserver celle-ci" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Fusionner" }).click();
    await expect(page.getByText(/Fiches fusionnées/)).toBeVisible();
    await expect(pair).toHaveCount(0);
  });

  test("chronomètre, Gantt et calendrier des tâches", async ({ page }) => {
    await page.goto("/projets/taches");
    await page.getByRole("button", { name: "Démarrer un chronomètre" }).click();
    await page.getByLabel("Sur quoi travaillez-vous ?").fill(`Préparation ${tag}`);
    await page.getByRole("button", { name: "Démarrer sans tâche" }).click();
    const stop = page.getByRole("button", { name: "Arrêter le chronomètre" });
    await expect(stop).toBeVisible();
    await stop.click();
    await expect(stop).toHaveCount(0);

    await page.getByRole("radio", { name: "Gantt" }).click();
    await expect(page.getByText("Début → Échéance")).toBeVisible();
    await page.getByRole("radio", { name: "Calendrier" }).click();
    await expect(page.getByRole("grid", { name: "Calendrier des tâches" })).toBeVisible();
    await page.getByRole("radio", { name: "Tableau" }).click();
    await expect(page.getByRole("grid", { name: "Tâches" })).toBeVisible();
  });
});
