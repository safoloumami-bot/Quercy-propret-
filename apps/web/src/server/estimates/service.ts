import "server-only";

import { computeEstimate, visitsPerMonthOf } from "@quercy/core";
import { prisma } from "@quercy/db";

/** Marge minimale de l'entreprise (en %), réglée dans les paramètres de vente. */
export async function minMarginOf(organizationId: string): Promise<number> {
  const settings = await prisma.salesSettings.findUnique({
    where: { organizationId },
    select: { minMarginPct: true },
  });
  return settings?.minMarginPct ?? 20;
}

/**
 * Après une écriture de chiffrages : référence lisible et valeurs calculées (coût, prix
 * minimum et conseillé, marge, prix mensuel), enregistrées pour lister, trier et filtrer.
 */
export async function recomputeEstimates(organizationId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const minMargin = await minMarginOf(organizationId);
  const rows = await prisma.estimate.findMany({ where: { organizationId, id: { in: ids } } });
  for (const e of rows) {
    const c = computeEstimate(
      {
        ...e,
        visitsPerMonth: e.kind === "recurring" ? visitsPerMonthOf(e.weekdays) : null,
      },
      minMargin,
    );
    let reference = e.reference;
    if (!reference) {
      const year = e.createdAt.getFullYear();
      const seq = await prisma.numberSequence.upsert({
        where: { organizationId_key: { organizationId, key: `chiffrage-${year}` } },
        create: { organizationId, key: `chiffrage-${year}`, value: 1 },
        update: { value: { increment: 1 } },
      });
      reference = `CH-${year}-${String(seq.value).padStart(4, "0")}`;
    }
    await prisma.estimate.update({
      where: { id: e.id },
      data: {
        reference,
        costCents: c.costCents,
        minPriceCents: c.minPriceCents,
        advisedPriceCents: c.advisedPriceCents,
        marginPct: c.costCents ? c.marginPct : null,
        monthlyPriceCents: c.monthlyPriceCents,
        ownerApprovalRequired: c.belowMinimum,
      },
    });
  }
}

/** Patrons de l'espace (propriétaire et administrateurs) : ils valident sous la marge minimale. */
export async function bossIds(organizationId: string): Promise<string[]> {
  const members = await prisma.membership.findMany({
    where: {
      organizationId,
      deletedAt: null,
      role: { systemKey: { in: ["owner", "admin"] } },
    },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}
