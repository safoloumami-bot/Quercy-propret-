import "server-only";

import { type EntityKey } from "@quercy/core";
import { generateInterventions } from "@quercy/jobs";

import { runAutomations } from "../automations/engine";
import {
  afterRentalChange,
  alertLowStock,
  recomputeProductStock,
  trackEquipment,
} from "../equipment/service";
import { enqueueDeliveries, webhookEvent } from "../automations/webhooks";
import { type RecordsCtx, delegate } from "./context";

export type ChangeAction = "created" | "updated" | "deleted" | "restored";

/** Fiches traitées au plus par écriture groupée pour les automatisations et webhooks. */
const MAX_EVENT_RECORDS = 200;

/**
 * Effets après une écriture de fiches (création, modification, corbeille, restauration,
 * import) : valeurs calculées (stock, soldes), webhooks et automatisations.
 * Une erreur d'automatisation ou de webhook n'annule jamais l'écriture de la personne.
 */
export async function afterRecordChange(
  ctx: RecordsCtx,
  entity: EntityKey,
  ids: string[],
  action: ChangeAction,
  depth = 0,
): Promise<void> {
  if (entity === "stockMovement") await syncStock(ctx, ids);
  if (entity === "equipment" && ids.length)
    await trackEquipment(ctx.organizationId, ids, ctx.user.id);
  if (entity === "rental" && ids.length)
    await afterRentalChange(ctx.organizationId, ids, ctx.user.id);
  if (entity === "bankTransaction" || entity === "bankAccount")
    await syncBalances(ctx, entity, ids);
  // Un contrat d'entretien créé ou modifié remplit aussitôt le planning.
  if (entity === "cleaningContract" && ids.length > 0 && action !== "deleted")
    await generateInterventions({ organizationId: ctx.organizationId, contractIds: ids });
  // L'import (sans identifiants) ne déclenche ni automatisation ni webhook.
  if (ids.length === 0) return;
  const trigger = action === "restored" ? "created" : action;
  try {
    const rows = (await delegate(ctx, entity).findMany({
      where: { id: { in: ids.slice(0, MAX_EVENT_RECORDS) }, deletedAt: undefined },
    })) as (Record<string, unknown> & { id: string })[];
    for (const row of rows)
      await enqueueDeliveries(ctx.organizationId, webhookEvent(entity, trigger), row);
    await runAutomations(ctx, entity, rows, trigger, depth, (e, changed, d) =>
      afterRecordChange(ctx, e, changed, e === entity ? "updated" : "created", d),
    );
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", msg: "automation.failed", entity, error: String(error) }),
    );
  }
}

/** Stock d'un article = entrées − sorties ± ajustements (mouvements hors corbeille). */
async function syncStock(ctx: RecordsCtx, ids: string[]) {
  const moved = await ctx.db.stockMovement.findMany({
    // `deletedAt` explicite : la corbeille compte (un mouvement supprimé change le stock).
    where: { ...(ids.length ? { id: { in: ids } } : {}), deletedAt: undefined },
    select: { productId: true },
  });
  const crossed = await recomputeProductStock(
    ctx.organizationId,
    moved.map((m) => m.productId),
  );
  await alertLowStock(ctx.organizationId, crossed, [ctx.user.id]);
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
