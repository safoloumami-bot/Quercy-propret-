import { createHmac, randomBytes } from "node:crypto";

import { type APIRequestContext, type Page, expect } from "@playwright/test";

export const DEMO_PASSWORD = "Quercy-demo-2026";

export function uniqueEmail(label: string): string {
  return `${label}-${randomBytes(4).toString("hex")}@e2e.quercy.app`;
}

/** Attend l'email destiné à `to` dans la boîte de développement et renvoie ses liens. */
export async function waitForMail(
  request: APIRequestContext,
  to: string,
  subject?: RegExp,
): Promise<string[]> {
  let links: string[] = [];
  await expect
    .poll(
      async () => {
        const response = await request.get(`/api/dev/mailbox?to=${encodeURIComponent(to)}`);
        const { mails } = (await response.json()) as {
          mails: { subject: string; links: string[] }[];
        };
        const mail = mails.find((m) => !subject || subject.test(m.subject));
        links = mail?.links ?? [];
        return links.length;
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
  return links;
}

/** Premier lien de l'email vers l'application (ignore les liens décoratifs). */
export function appLink(links: string[], pattern: RegExp): string {
  const link = links.find((l) => pattern.test(l));
  if (!link) throw new Error(`Aucun lien ${pattern} dans : ${links.join(", ")}`);
  return link;
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of input.replace(/=+$/, "").toUpperCase()) {
    const value = alphabet.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g) ?? [];
  return Buffer.from(bytes.map((b) => parseInt(b, 2)));
}

/** Code TOTP (RFC 6238, SHA-1, 6 chiffres, 30 s) — comme une application d'authentification. */
export function totp(secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function signUp(page: Page, name: string, email: string, password: string) {
  await page.getByLabel("Prénom et nom").fill(name);
  await page.getByLabel("Adresse email professionnelle").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
}

/** Parcourt l'assistant d'accueil jusqu'à la création de l'espace. */
export async function createWorkspace(page: Page, name: string) {
  await expect(page).toHaveURL(/\/bienvenue/);
  await page.getByLabel("Nom de l'entreprise").fill(name);
  await page.getByLabel("Secteur d'activité").click();
  await page.getByRole("option", { name: "Services aux entreprises" }).click();
  await page.getByLabel("Taille").click();
  await page.getByRole("option", { name: "2 à 10 personnes" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("checkbox", { name: "Contacts & CRM" })).toBeChecked();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Créer l'espace" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Bonjour|Bonsoir) /);
}

/** Attend que l'interface soit interactive (raccourcis et écouteurs branchés). */
export async function waitForApp(page: Page) {
  await page.locator("html[data-ready]").waitFor();
}
