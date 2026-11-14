import { parseDay, recordPath, todayIn } from "@quercy/core";
import { SalesError, invoicePeriod } from "@quercy/documents";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { billingPreview, pendingExtras, periodBounds } from "../../cleaning/billing";
import { notify } from "../../notify";
import { entityContext } from "../../records/context";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";
import { isCleaningManager } from "./sites";

const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide.");

function requireManager(ctx: Parameters<typeof isCleaningManager>[0]) {
  if (!isCleaningManager(ctx))
    throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
}

export const cleaningBillingRouter = createTRPCRouter({
  /** Ce que chaque client doit pour le mois, et les suppléments à valider. */
  preview: orgProcedure.input(z.object({ period })).query(async ({ ctx, input }) => {
    requireManager(ctx);
    await entityContext(ctx, "invoice", "view");
    const [preview, extras] = await Promise.all([
      billingPreview(ctx.organizationId, input.period),
      pendingExtras(ctx.organizationId, input.period),
    ]);
    const { end } = periodBounds(input.period);
    return { ...preview, extras, finished: end < parseDay(todayIn()) };
  }),

  /** Valide ou refuse un supplément (prix ajustable au passage). */
  decideExtra: orgProcedure
    .input(
      z.object({
        interventionId: z.string().min(1),
        approve: z.boolean(),
        priceCents: z.number().int().min(0).max(100_000_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const visit = await ctx.db.intervention.findFirst({
        where: { id: input.interventionId, extraStatus: "pending" },
        select: { id: true, title: true, ownerId: true, extraPriceCents: true, invoiceId: true },
      });
      if (!visit)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supplément introuvable ou déjà traité.",
        });
      await ctx.db.intervention.update({
        where: { id: visit.id },
        data: {
          extraStatus: input.approve ? "approved" : "rejected",
          ...(input.approve && input.priceCents !== undefined
            ? { extraPriceCents: input.priceCents }
            : {}),
        },
      });
      await recordAudit(ctx, {
        action: input.approve ? "intervention.extra_approved" : "intervention.extra_rejected",
        entityType: "intervention",
        entityId: visit.id,
        metadata: { name: visit.title, priceCents: input.priceCents ?? visit.extraPriceCents },
      });
      return { ok: true };
    }),

  /**
   * Factures brouillon du mois (un mois terminé seulement), une par client choisi. Les
   * passages comptés sont rattachés à leur facture : ils ne seront jamais refacturés.
   */
  createInvoices: orgProcedure
    .input(z.object({ period, companyIds: z.array(z.string().min(1)).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      await entityContext(ctx, "invoice", "create");
      const { end, label } = periodBounds(input.period);
      if (end >= parseDay(todayIn()))
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Le mois n'est pas terminé : la facture partira une fois tous les passages faits.",
        });
      const preview = await billingPreview(ctx.organizationId, input.period);
      const created: { companyId: string; invoiceId: string }[] = [];
      const skipped: { companyId: string; reason: string }[] = [];
      for (const companyId of input.companyIds) {
        const client = preview.clients.find((c) => c.companyId === companyId);
        if (!client || client.invoice) {
          skipped.push({ companyId, reason: client?.invoice ? "déjà facturé" : "rien à facturer" });
          continue;
        }
        try {
          const { invoice } = await invoicePeriod({
            organizationId: ctx.organizationId,
            companyId,
            period: input.period,
            periodLabel: label,
            lines: client.lines,
            interventionIds: client.interventionIds,
            ownerId: ctx.user.id,
          });
          created.push({ companyId, invoiceId: invoice.id });
        } catch (error) {
          if (!(error instanceof SalesError)) throw error;
          skipped.push({ companyId, reason: error.message });
        }
      }
      if (created.length) {
        await recordAudit(ctx, {
          action: "cleaning.invoices_created",
          entityType: "invoice",
          entityId: created[0]!.invoiceId,
          metadata: { period: input.period, count: created.length },
        });
        await notify({
          organizationId: ctx.organizationId,
          userIds: [ctx.user.id],
          actorId: "system",
          type: "cleaning.invoices_created",
          title: `${created.length} facture${created.length > 1 ? "s" : ""} brouillon — ${label}`,
          url:
            created.length === 1
              ? recordPath("invoice", created[0]!.invoiceId)
              : "/ventes/factures",
        });
      }
      return { created, skipped };
    }),
});
