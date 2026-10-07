import "server-only";

import { salesSettings } from "@quercy/documents";
import { prisma } from "@quercy/db";

import { type Body, txt } from "./http";
import type { TerrainOrgRow } from "./org";

export const ALERT_KEYS = ["retard", "veille", "matin", "factures"] as const;
export type AlertKey = (typeof ALERT_KEYS)[number];

const DEFAULT_TERMS = "Paiement par virement à 30 jours. Pas d'escompte pour paiement anticipé.";

/** Réglages de l'application terrain (créés à la première lecture). */
export async function terrainSettings(organizationId: string) {
  return (
    (await prisma.terrainSettings.findUnique({ where: { organizationId } })) ??
    prisma.terrainSettings.upsert({
      where: { organizationId },
      create: { organizationId },
      update: {},
    })
  );
}

/**
 * « Réglages de l'entreprise » vus par l'application : identité, facturation et mentions
 * viennent des paramètres de vente du logiciel (une seule source) ; tarif, TVA, SAP, lien
 * d'avis et alertes sont propres à l'application.
 */
export async function entrepriseConf(org: TerrainOrgRow) {
  const [sales, t] = await Promise.all([salesSettings(org.id), terrainSettings(org.id)]);
  const alerts = (t.alerts ?? {}) as Partial<Record<AlertKey, boolean>>;
  return {
    nom: sales.legalName || org.name,
    adresse: sales.address ?? "",
    cp: sales.postalCode ?? "",
    ville: sales.city ?? "",
    tel: sales.phone ?? "",
    email: sales.email ?? "",
    siret: sales.siret ?? "",
    iban: sales.iban ?? "",
    bic: sales.bic ?? "",
    tvaIntra: sales.vatNumber ?? "",
    sap: t.sapNumber ?? "",
    sapDate: t.sapDate ?? "",
    avisGoogle: t.reviewUrl ?? "",
    taux: t.hourlyRateCents / 100,
    tva: t.vatRate,
    mentions: sales.footer ?? "",
    conditions: t.paymentTerms ?? DEFAULT_TERMS,
    alertes: Object.fromEntries(ALERT_KEYS.map((k) => [k, alerts[k] !== false])) as Record<
      AlertKey,
      boolean
    >,
  };
}
export type EntrepriseConf = Awaited<ReturnType<typeof entrepriseConf>>;

/** Enregistre les réglages saisis dans l'application (paramètres de vente + réglages terrain). */
export async function saveEntreprise(org: TerrainOrgRow, body: Body) {
  await salesSettings(org.id);
  const has = (k: string) => body[k] !== undefined;
  const sales: Record<string, string | null> = {};
  const map: [string, string, number][] = [
    ["nom", "legalName", 160],
    ["adresse", "address", 200],
    ["cp", "postalCode", 12],
    ["ville", "city", 120],
    ["tel", "phone", 40],
    ["email", "email", 160],
    ["tvaIntra", "vatNumber", 20],
    ["bic", "bic", 11],
    ["mentions", "footer", 600],
  ];
  for (const [from, to, max] of map) if (has(from)) sales[to] = txt(body[from], max) || null;
  if (has("siret")) {
    const v = txt(body.siret, 20).replace(/\s/g, "");
    sales.siret = /^\d{14}$/.test(v) ? v : null;
  }
  if (has("iban")) {
    const v = txt(body.iban, 40).replace(/\s/g, "").toUpperCase();
    sales.iban = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v) ? v : null;
  }
  if (sales.legalName === null) delete sales.legalName;
  if (Object.keys(sales).length)
    await prisma.salesSettings.update({ where: { organizationId: org.id }, data: sales });

  const t = await terrainSettings(org.id);
  const data: Record<string, unknown> = {};
  if (has("sap")) data.sapNumber = txt(body.sap, 40) || null;
  if (has("sapDate"))
    data.sapDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.sapDate)) ? body.sapDate : null;
  if (has("avisGoogle")) {
    const u = txt(body.avisGoogle, 400);
    data.reviewUrl = /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null;
  }
  if (has("conditions")) data.paymentTerms = txt(body.conditions, 600) || null;
  if (has("taux")) data.hourlyRateCents = Math.max(0, Math.round((Number(body.taux) || 0) * 100));
  if (has("tva") && [0, 5.5, 10, 20].includes(Number(body.tva))) data.vatRate = Number(body.tva);
  if (body.alertes && typeof body.alertes === "object") {
    const next = { ...((t.alerts ?? {}) as Record<string, boolean>) };
    for (const k of ALERT_KEYS) {
      const v = (body.alertes as Record<string, unknown>)[k];
      if (typeof v === "boolean") next[k] = v;
    }
    data.alerts = next;
  }
  if (Object.keys(data).length)
    await prisma.terrainSettings.update({ where: { organizationId: org.id }, data });
  return entrepriseConf(org);
}

/** Modèles de contrôle qualité et prestations proposés à la planification. */
export const PRESTATIONS = [
  "Changement de locataires",
  "Ménage récurrent",
  "Entretien de bureaux",
  "Parties communes",
  "Remise en état",
  "Nettoyage de vitres",
  "Fin de chantier",
  "État des lieux",
];

/** Couleurs proposées aux agents. */
export const COULEURS = ["#009C84", "#B07B2A", "#3C6E9F", "#8A5B9E", "#B8553C", "#4C8C4A"];
