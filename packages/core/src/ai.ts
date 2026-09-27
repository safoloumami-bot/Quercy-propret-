import { z } from "zod";

import { PLANS, type PlanKey } from "./billing";

/** Crédits consommés : une question (avec toutes ses étapes d'outils) ou une lecture de document. */
export const AI_CREDIT_COST = { chat: 1, extraction: 3 } as const;
export type AiUsageKind = keyof typeof AI_CREDIT_COST;

/** Crédits mensuels de l'espace : crédits par membre de l'offre × nombre de membres. */
export function aiMonthlyQuota(plan: PlanKey, members: number): number {
  return PLANS[plan].limits.aiCreditsPerMemberMonthly * Math.max(1, members);
}

/** Nombre maximal d'allers-retours outils pour une seule question. */
export const AI_MAX_TOOL_ROUNDS = 8;

/** Écran courant transmis à l'assistant (contexte de la question). */
export const aiScreenContextSchema = z.object({
  path: z.string().max(300),
  title: z.string().max(200).optional(),
  entity: z.string().max(40).optional(),
  recordId: z.string().max(40).optional(),
});
export type AiScreenContext = z.infer<typeof aiScreenContextSchema>;

/** Données extraites d'une facture fournisseur ou d'un justificatif. */
export const documentExtractionSchema = z.object({
  documentType: z.enum(["invoice", "credit_note", "receipt", "quote", "other"]),
  supplierName: z.string().nullable(),
  supplierSiret: z.string().nullable(),
  supplierVatNumber: z.string().nullable(),
  documentNumber: z.string().nullable(),
  issueDate: z.string().nullable().describe("AAAA-MM-JJ"),
  dueDate: z.string().nullable().describe("AAAA-MM-JJ"),
  currency: z.string().describe("Code ISO 4217, EUR par défaut"),
  totalExcludingTax: z.number().nullable(),
  totalTax: z.number().nullable(),
  totalIncludingTax: z.number().nullable(),
  vatLines: z.array(z.object({ rate: z.number(), base: z.number(), amount: z.number() })),
  lines: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().nullable(),
      unitPrice: z.number().nullable(),
      total: z.number().nullable(),
    }),
  ),
  paymentMethod: z.string().nullable(),
  iban: z.string().nullable(),
  notes: z.string().nullable().describe("Points d'attention : incohérences, champs illisibles"),
});
export type DocumentExtraction = z.infer<typeof documentExtractionSchema>;

/** Vérifie la cohérence HT + TVA = TTC (à 2 centimes près) d'une extraction. */
export function extractionConsistent(e: DocumentExtraction): boolean | null {
  if (e.totalExcludingTax === null || e.totalTax === null || e.totalIncludingTax === null)
    return null;
  return Math.abs(e.totalExcludingTax + e.totalTax - e.totalIncludingTax) <= 0.02;
}
