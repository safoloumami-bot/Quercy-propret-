import { z } from "zod";

import type { DocumentKind } from "./records/entities";

// ─────────────────────────── Lignes et totaux ───────────────────────────

export const documentLineSchema = z.object({
  productId: z.string().min(1).nullish(),
  description: z
    .string()
    .trim()
    .min(1, { error: "La désignation est obligatoire." })
    .max(2000, { error: "Désignation trop longue (2 000 caractères maximum)." }),
  quantity: z
    .number({ error: "Quantité invalide." })
    .min(-1_000_000)
    .max(1_000_000)
    .refine((q) => q !== 0, { error: "La quantité ne peut pas être nulle." }),
  unit: z.string().max(20).nullish(),
  unitPriceCents: z.number().int().min(-100_000_000_00).max(100_000_000_00),
  discountPercent: z.number().min(0).max(100).default(0),
  vatRate: z.number().min(0).max(100),
});
export type DocumentLineInput = z.infer<typeof documentLineSchema>;

export const documentLinesSchema = z.array(documentLineSchema).max(500);

/** Montant HT d'une ligne, en centimes (arrondi au centime). */
export function lineTotalCents(line: {
  quantity: number;
  unitPriceCents: number;
  discountPercent?: number;
}): number {
  const discount = 1 - (line.discountPercent ?? 0) / 100;
  return Math.round(line.quantity * line.unitPriceCents * discount);
}

export interface VatBreakdown {
  rate: number;
  baseCents: number;
  taxCents: number;
}

export interface DocumentTotals {
  totalExclCents: number;
  taxCents: number;
  totalCents: number;
  vat: VatBreakdown[];
}

/**
 * Totaux d'un document. La TVA est calculée par taux sur la somme des bases (et non ligne par
 * ligne), comme sur une facture française ; en franchise de TVA, elle est nulle.
 */
export function computeTotals(
  lines: { quantity: number; unitPriceCents: number; discountPercent?: number; vatRate: number }[],
  options: { vatExempt?: boolean } = {},
): DocumentTotals {
  const bases = new Map<number, number>();
  let totalExclCents = 0;
  for (const line of lines) {
    const total = lineTotalCents(line);
    totalExclCents += total;
    const rate = options.vatExempt ? 0 : line.vatRate;
    bases.set(rate, (bases.get(rate) ?? 0) + total);
  }
  const vat = [...bases.entries()]
    .sort(([a], [b]) => b - a)
    .map(([rate, baseCents]) => ({
      rate,
      baseCents,
      taxCents: Math.round((baseCents * rate) / 100),
    }));
  const taxCents = vat.reduce((sum, v) => sum + v.taxCents, 0);
  return { totalExclCents, taxCents, totalCents: totalExclCents + taxCents, vat };
}

// ─────────────────────────── Numérotation et dates ───────────────────────────

/** Numéro définitif : préfixe-année-séquence (FA-2026-0042). Continu, sans trou, par année. */
export function formatDocumentNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

/** Clé du compteur de numérotation (un compteur par type de document et par année). */
export function sequenceKey(kind: DocumentKind, year: number): string {
  return `${kind}-${year}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Date du jour à minuit UTC (les dates de document n'ont pas d'heure). */
export function startOfDayUtc(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const RECURRING_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };

/** Prochaine échéance d'une facture récurrente (même jour du mois, borné à la fin du mois). */
export function nextRunDate(from: Date, interval: string): Date {
  const months = RECURRING_MONTHS[interval] ?? 1;
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(from.getUTCDate(), lastDay)));
}

// ─────────────────────────── Statuts ───────────────────────────

/** Statut d'une facture émise selon ses encaissements et son échéance. */
export function invoiceStatus(
  invoice: { totalCents: number; paidCents: number; creditedCents?: number; dueDate: Date | null },
  now: Date = new Date(),
): "sent" | "partial" | "paid" | "overdue" | "credited" {
  const credited = invoice.creditedCents ?? 0;
  if (credited >= invoice.totalCents && invoice.totalCents > 0 && invoice.paidCents === 0)
    return "credited";
  const due = invoice.totalCents - credited - invoice.paidCents;
  if (due <= 0) return "paid";
  if (invoice.dueDate && startOfDayUtc(now) > startOfDayUtc(invoice.dueDate)) return "overdue";
  return invoice.paidCents > 0 ? "partial" : "sent";
}

/**
 * Faut-il envoyer une relance ? Une relance par palier (J+7, J+15, J+30 par défaut après
 * l'échéance), jamais deux le même jour.
 */
export function reminderDue(
  invoice: { dueDate: Date | null; reminderCount: number; lastReminderAt: Date | null },
  reminderDays: number[],
  now: Date = new Date(),
): boolean {
  if (!invoice.dueDate) return false;
  const steps = [...reminderDays].sort((a, b) => a - b);
  const next = steps[invoice.reminderCount];
  if (next === undefined) return false;
  const late = Math.floor(
    (startOfDayUtc(now).getTime() - startOfDayUtc(invoice.dueDate).getTime()) / 86_400_000,
  );
  if (late < next) return false;
  return (
    !invoice.lastReminderAt ||
    startOfDayUtc(invoice.lastReminderAt).getTime() !== startOfDayUtc(now).getTime()
  );
}

export const PAYMENT_METHODS = [
  { value: "transfer", label: "Virement" },
  { value: "card", label: "Carte bancaire" },
  { value: "direct_debit", label: "Prélèvement" },
  { value: "check", label: "Chèque" },
  { value: "cash", label: "Espèces" },
  { value: "stripe", label: "Paiement en ligne (Stripe)" },
  { value: "other", label: "Autre" },
] as const;
export const paymentMethodSchema = z.enum(
  PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]],
);

export const DOCUMENT_TITLES: Record<DocumentKind, string> = {
  QUOTE: "Devis",
  ORDER: "Bon de commande",
  INVOICE: "Facture",
  CREDIT_NOTE: "Avoir",
  RECURRING: "Facture récurrente",
};

/** Statut initial d'un document émis. */
export const ISSUED_STATUS: Record<DocumentKind, string> = {
  QUOTE: "sent",
  ORDER: "confirmed",
  INVOICE: "sent",
  CREDIT_NOTE: "issued",
  RECURRING: "active",
};

/** Mentions légales obligatoires sur une facture française (hors coordonnées). */
export const DEFAULT_LATE_PENALTY_TEXT =
  "En cas de retard de paiement, des pénalités au taux de trois fois le taux d'intérêt légal " +
  "sont exigibles, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € " +
  "(art. L441-10 et D441-5 du Code de commerce). Pas d'escompte pour paiement anticipé.";

export const VAT_EXEMPT_MENTION = "TVA non applicable, art. 293 B du CGI.";

/** Paramètres de vente saisis (mentions légales, numérotation, relances). */
export const salesSettingsSchema = z.object({
  legalName: z.string().trim().min(1, { error: "La raison sociale est obligatoire." }).max(160),
  address: z.string().trim().max(200).nullable(),
  postalCode: z.string().trim().max(12).nullable(),
  city: z.string().trim().max(120).nullable(),
  country: z.string().trim().min(1).max(80),
  siret: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => v === "" || /^\d{14}$/.test(v), { error: "Le SIRET compte 14 chiffres." })
    .nullable(),
  vatNumber: z.string().trim().max(20).nullable(),
  email: z.union([z.email({ error: "Email invalide." }), z.literal("")]).nullable(),
  phone: z.string().trim().max(40).nullable(),
  iban: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, "").toUpperCase())
    .refine((v) => v === "" || /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v), {
      error: "IBAN invalide.",
    })
    .nullable(),
  bic: z.string().trim().max(11).nullable(),
  vatExempt: z.boolean(),
  quotePrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,6}$/, { error: "Préfixe : 1 à 6 lettres majuscules ou chiffres." }),
  orderPrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,6}$/, { error: "Préfixe : 1 à 6 lettres majuscules ou chiffres." }),
  invoicePrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,6}$/, { error: "Préfixe : 1 à 6 lettres majuscules ou chiffres." }),
  creditNotePrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,6}$/, { error: "Préfixe : 1 à 6 lettres majuscules ou chiffres." }),
  paymentTermsDays: z.number().int().min(0).max(120),
  quoteValidityDays: z.number().int().min(1).max(365),
  footer: z.string().trim().max(500).nullable(),
  latePenaltyText: z.string().trim().max(1000).nullable(),
  remindersEnabled: z.boolean(),
  reminderDays: z.array(z.number().int().min(1).max(365)).min(1).max(5),
});
export type SalesSettingsInput = z.input<typeof salesSettingsSchema>;
