import "server-only";

import { DEFAULT_INSURANCE_MENTION, type TradePreset } from "@quercy/core";
import type { Prisma } from "@quercy/db";

/**
 * Applique le préréglage d'un corps de métier à un espace : ajoute au catalogue les
 * prestations types absentes (comparaison sur le nom) et prépare les mentions des devis et
 * factures. Le préréglage vient de listTradePresets (modifiable par l'équipe). Ne retire et ne remplace jamais rien de ce que l'entreprise a déjà saisi.
 */
export async function applyTradePreset(
  tx: Prisma.TransactionClient,
  organizationId: string,
  def: Pick<TradePreset, "catalog" | "decennial" | "renovationVat">,
): Promise<{ productsAdded: number }> {
  const existing = await tx.product.findMany({
    where: { organizationId, deletedAt: null },
    select: { name: true },
  });
  const known = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  const missing = def.catalog.filter((item) => !known.has(item.name.toLowerCase()));
  if (missing.length > 0) {
    await tx.product.createMany({
      data: missing.map((item) => ({
        organizationId,
        name: item.name,
        type: "service",
        unit: item.unit,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        category: item.category || null,
        description: item.description ?? null,
      })),
    });
  }

  if (!def.decennial && !def.renovationVat) return { productsAdded: missing.length };

  const settings = await tx.salesSettings.findUnique({ where: { organizationId } });
  if (!settings) {
    await tx.salesSettings.create({
      data: {
        organizationId,
        insuranceMention: def.decennial ? DEFAULT_INSURANCE_MENTION : null,
        renovationVatMention: def.renovationVat,
      },
    });
  } else {
    await tx.salesSettings.update({
      where: { organizationId },
      data: {
        insuranceMention:
          settings.insuranceMention ?? (def.decennial ? DEFAULT_INSURANCE_MENTION : null),
        renovationVatMention: settings.renovationVatMention || def.renovationVat,
      },
    });
  }

  return { productsAdded: missing.length };
}
