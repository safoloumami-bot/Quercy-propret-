import { expect, test } from "@playwright/test";

import {
  appLink,
  createWorkspace,
  signIn,
  signUp,
  totp,
  uniqueEmail,
  waitForMail,
} from "./helpers";

// Ces parcours partent d'un navigateur sans session.
test.use({ storageState: { cookies: [], origins: [] } });

const PASSWORD = "Une-phrase-assez-longue-2026";

test("sans session, l'application redirige vers la connexion", async ({ page }) => {
  await page.goto("/reglages/membres");
  await expect(page).toHaveURL(/\/connexion\?next=%2Freglages%2Fmembres/);
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
});

test("un mauvais mot de passe affiche un message clair", async ({ page }) => {
  await signIn(page, "demo@quercy.app", "mauvais-mot-de-passe");
  await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
});

test("inscription → accueil → invitation → acceptation par le nouveau membre", async ({
  browser,
  page,
  request,
}) => {
  const ownerEmail = uniqueEmail("proprio");
  const inviteeEmail = uniqueEmail("invite");
  const workspace = `Atelier ${Date.now()}`;

  await page.goto("/inscription");
  await signUp(page, "Marie Dupont", ownerEmail, PASSWORD);
  await createWorkspace(page, workspace);
  await expect(
    page.getByRole("button", { name: `Espace : ${workspace}. Changer d'espace` }),
  ).toBeVisible();

  // Invitation depuis la page Membres.
  await page.goto("/reglages/membres");
  await page.getByRole("button", { name: "Inviter" }).click();
  await page.getByLabel("Adresses email").fill(inviteeEmail);
  await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
  await expect(page.getByRole("heading", { name: "Invitations envoyées" })).toBeVisible();
  await page.getByRole("button", { name: "Terminé" }).click();
  await expect(page.getByText(inviteeEmail)).toBeVisible();

  // La personne invitée ouvre le lien reçu par email, crée son compte et rejoint l'espace.
  const link = appLink(await waitForMail(request, inviteeEmail, /invite/), /\/invitation\//);
  const invitee = await (
    await browser.newContext({ storageState: { cookies: [], origins: [] } })
  ).newPage();
  await invitee.goto(link);
  await expect(invitee.getByRole("heading", { name: `Rejoindre ${workspace}` })).toBeVisible();
  await invitee.getByRole("link", { name: "Créer mon compte" }).click();
  await expect(invitee.getByLabel("Adresse email professionnelle")).toHaveValue(inviteeEmail);
  await invitee.getByLabel("Prénom et nom").fill("Paul Martin");
  await invitee.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await invitee.getByRole("button", { name: "Créer mon compte" }).click();
  await invitee.getByRole("button", { name: "Rejoindre l'espace" }).click();
  await expect(
    invitee.getByRole("button", { name: `Espace : ${workspace}. Changer d'espace` }),
  ).toBeVisible();
  await invitee.close();

  // Côté propriétaire : le nouveau membre apparaît, l'audit trace son arrivée.
  await page.reload();
  await expect(page.getByRole("cell", { name: /Paul Martin/ }).first()).toBeVisible();
  await page.goto("/reglages/audit");
  await expect(page.getByText("Paul Martin a rejoint l'espace")).toBeVisible();
});

test("connexion par lien magique", async ({ page, request }) => {
  await page.goto("/connexion");
  await page
    .getByRole("button", { name: "Recevoir plutôt un lien de connexion par email" })
    .click();
  await page.getByLabel("Adresse email").fill("sophie.lacombe@quercy.app");
  await page.getByRole("button", { name: "Recevoir le lien" }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();
  const link = appLink(
    await waitForMail(request, "sophie.lacombe@quercy.app", /connexion/),
    /magic-link/,
  );
  await page.goto(link);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Bonjour|Bonsoir) Sophie/);
});

test("mot de passe oublié puis réinitialisé", async ({ page, request }) => {
  const email = uniqueEmail("oubli");
  await page.goto("/inscription");
  await signUp(page, "Léa Roux", email, PASSWORD);
  await expect(page).toHaveURL(/\/bienvenue/);
  await page.context().clearCookies();

  await page.goto("/mot-de-passe-oublie");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();
  await page.goto(appLink(await waitForMail(request, email, /Réinitialisation/), /reset-password/));
  await page.getByLabel("Nouveau mot de passe").fill("Nouvelle-phrase-secrete-2026");
  await page.getByLabel("Confirmation").fill("Nouvelle-phrase-secrete-2026");
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page).toHaveURL(/\/connexion/);

  await signIn(page, email, "Nouvelle-phrase-secrete-2026");
  await expect(page).toHaveURL(/\/bienvenue/);
});

test("double authentification : activation puis connexion avec un code", async ({ page }) => {
  const email = uniqueEmail("2fa");
  await page.goto("/inscription");
  await signUp(page, "Hugo Bernard", email, PASSWORD);
  await createWorkspace(page, `Sécurité ${Date.now()}`);

  await page.goto("/reglages/securite");
  await page.getByRole("button", { name: "Activer" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await dialog.getByRole("button", { name: "Continuer" }).click();
  const secret = (await dialog.locator("code").textContent())!.trim();
  await dialog.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await dialog.getByRole("button", { name: "Activer" }).click();
  await expect(page.getByText("Activée sur votre compte.")).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/connexion\/deux-facteurs/);
  await page.getByLabel("Code", { exact: true }).fill(totp(secret));
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Bonjour|Bonsoir) Hugo/);
});
