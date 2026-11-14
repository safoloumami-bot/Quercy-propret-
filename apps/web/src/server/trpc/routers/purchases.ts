import { documentExtractionSchema, recordPath } from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { entityContext } from "../../records/context";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";

const cents = (value: number | null) => (value === null ? 0 : Math.round(value * 100));
const day = (value: string | null) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;

/** Achats : création d'une facture fournisseur à partir d'un document lu par l'assistant. */
export const purchasesRouter = createTRPCRouter({
  billFromExtraction: orgProcedure
    .input(z.object({ data: documentExtractionSchema }))
    .mutation(async ({ ctx, input }) => {
      await entityContext(ctx, "bill", "create");
      const d = input.data;
      if (!d.supplierName)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le fournisseur n'a pas été lu : créez la facture manuellement.",
        });
      let supplier = await ctx.db.supplier.findFirst({
        where: { name: { equals: d.supplierName, mode: "insensitive" } },
        select: { id: true },
      });
      if (!supplier) {
        await entityContext(ctx, "supplier", "create");
        supplier = await ctx.db.supplier.create({
          data: {
            organizationId: ctx.organizationId,
            name: d.supplierName,
            siret: d.supplierSiret,
            vatNumber: d.supplierVatNumber,
            iban: d.iban,
            ownerId: ctx.user.id,
          },
          select: { id: true },
        });
      }
      const bill = await ctx.db.bill.create({
        data: {
          organizationId: ctx.organizationId,
          supplierId: supplier.id,
          number: d.documentNumber,
          status: "to_pay",
          category: "supplies",
          issueDate: day(d.issueDate) ?? new Date(),
          dueDate: day(d.dueDate),
          totalExclCents: cents(d.totalExcludingTax),
          vatCents: cents(d.totalTax),
          totalCents: cents(d.totalIncludingTax),
          notes: d.notes,
          ownerId: ctx.user.id,
        },
        select: { id: true, number: true },
      });
      await recordAudit(ctx, {
        action: "record.create",
        entityType: "bill",
        entityId: bill.id,
        metadata: { name: bill.number ?? "Facture fournisseur", source: "assistant" },
      });
      return { id: bill.id, url: recordPath("bill", bill.id) };
    }),
});
