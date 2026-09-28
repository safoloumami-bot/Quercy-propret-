import "server-only";

import { type EntityKey, recordPath } from "@quercy/core";

import { notify } from "../notify";
import type { RecordsCtx } from "./context";

export type ChangeAction = "created" | "updated" | "deleted" | "restored";

/**
 * Effets après une écriture de fiches (création, modification, corbeille, restauration,
 * import) : valeurs calculées (stock, soldes).
 */
export async function afterRecordChange(
  ctx: RecordsCtx,
  entity: EntityKey,
  ids: string[],
  _action: ChangeAction,
): Promise<void> {
  if (entity === "stockMovement") await syncStock(ctx, ids);
  if (entity === "bankTransaction" || entity === "bankAccount")
    await syncBalances(ctx, entity, ids);
}

/** Stock d'un article = entrées − sorties ± ajustements (mouvements hors corbeille). */
async function syncStock(ctx: RecordsCtx, ids: string[]) {
  const moved = await ctx.db.stockMovement.findMany({
    // `deletedAt` explicite : la corbeille compte (un mouvement supprimé change le stock).
    where: { ...(ids.length ? { id: { in: ids } } : {}), deletedAt: undefined },
    select: { productId: true },
  });
  const productIds = [...new Set(moved.map((m) => m.productId))];
  for (const productId of productIds) {
    const rows = await ctx.db.stockMovement.groupBy({
      by: ["type"],
      where: { productId, deletedAt: null },
      _sum: { quantity: true },
    });
    const sum = (type: string) => rows.find((r) => r.type === type)?._sum.quantity ?? 0;
    const quantity = sum("in") - sum("out") + sum("adjust");
    const product = await ctx.db.product.findFirst({
      where: { id: productId },
      select: { stockQuantity: true, reorderLevel: true, name: true, ownerId: true },
    });
    if (!product) continue;
    await ctx.db.product.update({ where: { id: productId }, data: { stockQuantity: quantity } });
    const threshold = product.reorderLevel;
    if (threshold !== null && quantity <= threshold && product.stockQuantity > threshold) {
      await notify({
        organizationId: ctx.organizationId,
        userIds: [product.ownerId ?? ctx.user.id],
        actorId: "system",
        type: "stock.low",
        title: `Stock bas : « ${product.name} » (${quantity} restant${quantity > 1 ? "s" : ""})`,
        url: recordPath("product", productId),
      });
    }
  }
}

/** Solde d'un compte = solde initial + opérations hors corbeille. */
async function syncBalances(ctx: RecordsCtx, entity: EntityKey, ids: string[]) {
  const accountIds =
    entity === "bankAccount"
      ? ids
      : [
          ...new Set(
            (
              await ctx.db.bankTransaction.findMany({
                where: { ...(ids.length ? { id: { in: ids } } : {}), deletedAt: undefined },
                select: { accountId: true },
              })
            ).map((t) => t.accountId),
          ),
        ];
  for (const accountId of accountIds) {
    const account = await ctx.db.bankAccount.findFirst({
      where: { id: accountId },
      select: { openingBalanceCents: true },
    });
    if (!account) continue;
    const total = await ctx.db.bankTransaction.aggregate({
      where: { accountId, deletedAt: null },
      _sum: { amountCents: true },
    });
    await ctx.db.bankAccount.update({
      where: { id: accountId },
      data: { balanceCents: account.openingBalanceCents + (total._sum.amountCents ?? 0) },
    });
  }
}
