import "server-only";

import { AI_CREDIT_COST, type AiUsageKind, aiMonthlyQuota } from "@quercy/core";
import { prisma } from "@quercy/db";

import type { ResolvedWorkspace } from "../workspace";

/** Début du mois civil en cours (UTC) : les crédits se renouvellent chaque mois. */
export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Crédits de l'espace ce mois-ci : quota de l'offre effective, consommés, restants. */
export async function aiCredits(workspace: ResolvedWorkspace) {
  const quota = aiMonthlyQuota(workspace.billing.effectivePlan, workspace.billing.memberCount);
  const used = await prisma.aiUsage.aggregate({
    where: { organizationId: workspace.organization.id, createdAt: { gte: monthStart() } },
    _sum: { credits: true },
  });
  const consumed = used._sum.credits ?? 0;
  return { quota, used: consumed, left: Math.max(0, quota - consumed) };
}

/** Message affiché quand les crédits du mois sont épuisés (ou insuffisants). */
export function creditsExhaustedMessage(kind: AiUsageKind) {
  return kind === "extraction"
    ? `La lecture d'un document consomme ${AI_CREDIT_COST.extraction} crédits et il n'en reste pas assez ce mois-ci. Passez à l'offre supérieure ou attendez le 1er du mois.`
    : "Les crédits d'assistant du mois sont épuisés. Passez à l'offre supérieure ou attendez le 1er du mois.";
}

export async function recordUsage(input: {
  organizationId: string;
  userId: string;
  kind: AiUsageKind;
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  await prisma.aiUsage.create({ data: { ...input, credits: AI_CREDIT_COST[input.kind] } });
}
