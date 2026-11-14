import {
  EQUIPMENT_STATUSES,
  RENTAL_PERIOD_LABELS,
  labelOf,
  rentalAmountCents,
  rentalPeriods,
  utcDay,
  vehicleDues,
} from "@quercy/core";
import { SalesError, invoiceRental } from "@quercy/documents";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  afterRentalChange,
  assertRecordConstraints,
  stockByLocation,
  trackEquipment,
} from "../../equipment/service";
import { afterRecordChange } from "../../records/after-change";
import { entityContext } from "../../records/context";
import { signedFileUrl } from "../../storage";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";

const equipmentStatus = z.enum(EQUIPMENT_STATUSES.map((s) => s.value) as [string, ...string[]]);
const locationInput = z.object({
  kind: z.enum(["warehouse", "vehicle", "holder", "site", "none"]),
  id: z.string().min(1).nullable(),
});
const locationColumns = (l: z.infer<typeof locationInput>) => ({
  warehouseId: l.kind === "warehouse" ? l.id : null,
  vehicleId: l.kind === "vehicle" ? l.id : null,
  holderId: l.kind === "holder" ? l.id : null,
  siteId: l.kind === "site" ? l.id : null,
});

export const assetsRouter = createTRPCRouter({
  /** Matériel : historique des mouvements, locations et pannes signalées. */
  equipmentHistory: orgProcedure
    .input(z.object({ equipmentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "equipment", "view");
      const equipment = await ctx.db.equipment.findFirst({
        where: { id: input.equipmentId, ...scopeWhere },
        include: {
          movements: {
            orderBy: { at: "desc" },
            take: 100,
            include: { movedBy: { select: { name: true } } },
          },
          rentals: {
            where: { deletedAt: null },
            orderBy: { startDate: "desc" },
            include: { company: { select: { name: true } } },
          },
        },
      });
      if (!equipment) throw new TRPCError({ code: "NOT_FOUND", message: "Matériel introuvable." });
      return {
        status: equipment.status,
        assignedUserId: equipment.assignedUserId,
        siteId: equipment.siteId,
        warehouseId: equipment.warehouseId,
        movements: equipment.movements.map((m) => ({
          id: m.id,
          at: m.at,
          status: m.status,
          statusLabel: labelOf(EQUIPMENT_STATUSES, m.status),
          location: m.location,
          note: m.note,
          by: m.movedBy?.name ?? null,
        })),
        rentals: equipment.rentals.map((r) => ({
          id: r.id,
          reference: r.reference,
          company: r.company?.name ?? null,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
          invoiced: Boolean(r.invoiceId),
        })),
      };
    }),

  /** Déplacer un matériel ou changer son état (dépôt → agent → chantier → maintenance…). */
  moveEquipment: orgProcedure
    .input(
      z.object({
        equipmentId: z.string().min(1),
        status: equipmentStatus,
        assignedUserId: z.string().min(1).nullable().default(null),
        siteId: z.string().min(1).nullable().default(null),
        warehouseId: z.string().min(1).nullable().default(null),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "equipment", "update");
      const equipment = await ctx.db.equipment.findFirst({
        where: { id: input.equipmentId, ...scopeWhere },
      });
      if (!equipment) throw new TRPCError({ code: "NOT_FOUND", message: "Matériel introuvable." });
      await ctx.db.equipment.update({
        where: { id: equipment.id },
        data: {
          status: input.status,
          assignedUserId: input.assignedUserId,
          siteId: input.siteId,
          warehouseId: input.warehouseId,
        },
      });
      await trackEquipment(ctx.organizationId, [equipment.id], ctx.user.id, input.note);
      await recordAudit(ctx, {
        action: "equipment.moved",
        entityType: "equipment",
        entityId: equipment.id,
        changes: { status: { before: equipment.status, after: input.status } },
        metadata: { name: equipment.name },
      });
      return { ok: true };
    }),

  /** États des lieux et pannes d'un véhicule ou d'un matériel. */
  reports: orgProcedure
    .input(
      z.object({
        vehicleId: z.string().min(1).optional(),
        equipmentId: z.string().min(1).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await entityContext(ctx, input.vehicleId ? "vehicle" : "equipment", "view");
      const rows = await ctx.db.assetReport.findMany({
        where: input.vehicleId
          ? { vehicleId: input.vehicleId }
          : { equipmentId: input.equipmentId },
        include: {
          reportedBy: { select: { name: true } },
          resolvedBy: { select: { name: true } },
          photo: { select: { id: true, storageKey: true, name: true, mimeType: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          kind: r.kind,
          mileage: r.mileage,
          note: r.note,
          status: r.status,
          createdAt: r.createdAt,
          reportedBy: r.reportedBy?.name ?? null,
          resolvedBy: r.resolvedBy?.name ?? null,
          resolution: r.resolution,
          photoUrl: r.photo ? await signedFileUrl(r.photo) : null,
        })),
      );
    }),

  resolveReport: orgProcedure
    .input(z.object({ id: z.string().min(1), resolution: z.string().trim().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.assetReport.findFirst({ where: { id: input.id } });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Signalement introuvable." });
      await entityContext(ctx, report.vehicleId ? "vehicle" : "equipment", "update");
      await ctx.db.assetReport.update({
        where: { id: report.id },
        data: {
          status: "resolved",
          resolution: input.resolution,
          resolvedById: ctx.user.id,
          resolvedAt: new Date(),
        },
      });
      await recordAudit(ctx, {
        action: "asset_report.resolved",
        entityType: report.vehicleId ? "vehicle" : "equipment",
        entityId: report.vehicleId ?? report.equipmentId,
        metadata: { kind: report.kind },
      });
      return { ok: true };
    }),

  /** Échéances d'un véhicule (contrôle technique, entretien, assurance, fin de contrat). */
  vehicleDues: orgProcedure
    .input(z.object({ vehicleId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "vehicle", "view");
      const vehicle = await ctx.db.vehicle.findFirst({
        where: { id: input.vehicleId, ...scopeWhere },
      });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Véhicule introuvable." });
      return vehicleDues(vehicle, utcDay(new Date()));
    }),

  /** Location : montant, état et facture, pour les boutons Sortie / Retour / Facturer. */
  rental: orgProcedure
    .input(z.object({ rentalId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "rental", "view");
      const r = await ctx.db.rental.findFirst({
        where: { id: input.rentalId, ...scopeWhere },
        include: { invoice: { select: { id: true, number: true, status: true } } },
      });
      if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "Location introuvable." });
      const periods = rentalPeriods(r.startDate, r.endDate, r.period);
      const unit = RENTAL_PERIOD_LABELS[r.period] ?? RENTAL_PERIOD_LABELS.day!;
      return {
        status: r.status,
        periods,
        periodLabel: periods > 1 ? unit.many : unit.one,
        amountCents: rentalAmountCents(r),
        depositCents: r.depositCents,
        depositReturned: r.depositReturned,
        outAt: r.outAt,
        returnedAt: r.returnedAt,
        invoice: r.invoice,
      };
    }),

  /** Sortie du matériel, retour (caution rendue ou non) ou annulation d'une location. */
  setRentalStatus: orgProcedure
    .input(
      z.object({
        rentalId: z.string().min(1),
        status: z.enum(["reserved", "out", "returned", "cancelled"]),
        depositReturned: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "rental", "update");
      const r = await ctx.db.rental.findFirst({ where: { id: input.rentalId, ...scopeWhere } });
      if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "Location introuvable." });
      if (input.status === "out" || input.status === "reserved") {
        const clash = await assertRecordConstraints(
          ctx.organizationId,
          "rental",
          { status: input.status },
          r,
        );
        if (clash) throw new TRPCError({ code: "CONFLICT", message: clash });
      }
      await ctx.db.rental.update({
        where: { id: r.id },
        data: {
          status: input.status,
          ...(input.status === "out" && !r.outAt ? { outAt: new Date() } : {}),
          ...(input.status === "returned" ? { returnedAt: new Date() } : {}),
          ...(input.depositReturned !== undefined
            ? { depositReturned: input.depositReturned }
            : {}),
        },
      });
      await afterRentalChange(ctx.organizationId, [r.id], ctx.user.id);
      await recordAudit(ctx, {
        action: "rental.status",
        entityType: "rental",
        entityId: r.id,
        changes: { status: { before: r.status, after: input.status } },
        metadata: { name: r.reference },
      });
      return { ok: true };
    }),

  /** Facture brouillon d'une location (périodes entamées × tarif). */
  invoiceRental: orgProcedure
    .input(z.object({ rentalId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await entityContext(ctx, "rental", "update");
      await entityContext(ctx, "invoice", "create");
      try {
        const { invoice } = await invoiceRental(ctx.organizationId, input.rentalId, ctx.user.id);
        await afterRentalChange(ctx.organizationId, [input.rentalId], ctx.user.id);
        await recordAudit(ctx, {
          action: "rental.invoiced",
          entityType: "rental",
          entityId: input.rentalId,
          metadata: { invoiceId: invoice.id },
        });
        return { invoiceId: invoice.id };
      } catch (error) {
        if (error instanceof SalesError)
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        throw error;
      }
    }),

  /** Stock d'un article par emplacement. */
  stockByLocation: orgProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await entityContext(ctx, "product", "view");
      if (!(await ctx.db.product.count({ where: { id: input.productId } })))
        throw new TRPCError({ code: "NOT_FOUND", message: "Article introuvable." });
      return stockByLocation(ctx.organizationId, input.productId);
    }),

  /** Transfert entre emplacements : une sortie et une entrée, le stock total ne bouge pas. */
  transferStock: orgProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive().max(1_000_000),
        from: locationInput,
        to: locationInput,
        note: z.string().trim().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await entityContext(ctx, "stockMovement", "create");
      if (input.from.kind === input.to.kind && input.from.id === input.to.id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choisissez deux emplacements différents.",
        });
      if (!(await ctx.db.product.count({ where: { id: input.productId } })))
        throw new TRPCError({ code: "NOT_FOUND", message: "Article introuvable." });
      const base = {
        organizationId: ctx.organizationId,
        productId: input.productId,
        quantity: input.quantity,
        reference: "Transfert",
        note: input.note ?? null,
        ownerId: ctx.user.id,
      };
      const out = await ctx.db.stockMovement.create({
        data: { ...base, type: "out", ...locationColumns(input.from) },
      });
      const into = await ctx.db.stockMovement.create({
        data: { ...base, type: "in", ...locationColumns(input.to) },
      });
      await afterRecordChange(ctx, "stockMovement", [out.id, into.id], "created");
      return { ok: true };
    }),

  /** Tarifs d'un fournisseur. */
  supplierPrices: orgProcedure
    .input(z.object({ supplierId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await entityContext(ctx, "supplier", "view");
      const rows = await ctx.db.supplierPrice.findMany({
        where: { supplierId: input.supplierId },
        include: { product: { select: { id: true, name: true, unit: true, sku: true } } },
        orderBy: { product: { name: "asc" } },
      });
      return rows.map((r) => ({
        id: r.id,
        product: r.product,
        priceCents: r.priceCents,
        supplierRef: r.supplierRef,
        minQuantity: r.minQuantity,
        updatedAt: r.updatedAt,
      }));
    }),

  saveSupplierPrice: orgProcedure
    .input(
      z.object({
        supplierId: z.string().min(1),
        productId: z.string().min(1),
        priceCents: z.number().int().min(0),
        supplierRef: z.string().trim().max(80).optional(),
        minQuantity: z.number().min(0).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await entityContext(ctx, "supplier", "update");
      const [supplier, product] = await Promise.all([
        ctx.db.supplier.count({ where: { id: input.supplierId } }),
        ctx.db.product.count({ where: { id: input.productId } }),
      ]);
      if (!supplier || !product)
        throw new TRPCError({ code: "NOT_FOUND", message: "Fournisseur ou article introuvable." });
      const data = {
        priceCents: input.priceCents,
        supplierRef: input.supplierRef || null,
        minQuantity: input.minQuantity ?? null,
      };
      await ctx.db.supplierPrice.upsert({
        where: {
          supplierId_productId: { supplierId: input.supplierId, productId: input.productId },
        },
        create: {
          ...data,
          organizationId: ctx.organizationId,
          supplierId: input.supplierId,
          productId: input.productId,
        },
        update: data,
      });
      return { ok: true };
    }),

  removeSupplierPrice: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await entityContext(ctx, "supplier", "update");
      await ctx.db.supplierPrice.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /** Lignes d'une commande fournisseur, avec les quantités reçues. */
  purchaseLines: orgProcedure
    .input(z.object({ purchaseOrderId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "purchaseOrder", "view");
      const order = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, ...scopeWhere },
        include: {
          lines: {
            orderBy: { sortOrder: "asc" },
            include: { product: { select: { id: true, name: true, unit: true } } },
          },
          supplier: { select: { id: true } },
        },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Commande introuvable." });
      const prices = await ctx.db.supplierPrice.findMany({
        where: { supplierId: order.supplierId },
        include: { product: { select: { id: true, name: true } } },
      });
      return {
        status: order.status,
        totalExclCents: order.totalExclCents,
        lines: order.lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          productName: l.product?.name ?? null,
          label: l.label,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          receivedQuantity: l.receivedQuantity,
        })),
        supplierPrices: prices.map((p) => ({
          productId: p.productId,
          name: p.product.name,
          priceCents: p.priceCents,
        })),
      };
    }),

  savePurchaseLines: orgProcedure
    .input(
      z.object({
        purchaseOrderId: z.string().min(1),
        lines: z
          .array(
            z.object({
              productId: z.string().min(1).nullable(),
              label: z.string().trim().min(1).max(200),
              quantity: z.number().positive().max(1_000_000),
              unitPriceCents: z.number().int().min(0),
            }),
          )
          .max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "purchaseOrder", "update");
      const order = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, ...scopeWhere },
        include: { lines: { select: { receivedQuantity: true } } },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Commande introuvable." });
      if (order.lines.some((l) => l.receivedQuantity > 0))
        throw new TRPCError({
          code: "CONFLICT",
          message: "Une partie a déjà été reçue : les lignes ne se modifient plus.",
        });
      const totalExclCents = input.lines.reduce(
        (n, l) => n + Math.round(l.quantity * l.unitPriceCents),
        0,
      );
      await ctx.db.purchaseOrder.update({
        where: { id: order.id },
        data: {
          totalExclCents,
          lines: {
            deleteMany: {},
            createMany: {
              data: input.lines.map((l, i) => ({
                organizationId: ctx.organizationId,
                ...l,
                sortOrder: i,
              })),
            },
          },
        },
      });
      return { totalExclCents };
    }),

  /**
   * Réception (totale ou partielle) : les articles reçus entrent en stock, au dépôt choisi ;
   * la commande passe « reçue en partie » ou « reçue ».
   */
  receivePurchase: orgProcedure
    .input(
      z.object({
        purchaseOrderId: z.string().min(1),
        warehouseId: z.string().min(1).nullable().default(null),
        lines: z
          .array(z.object({ lineId: z.string().min(1), quantity: z.number().positive() }))
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "purchaseOrder", "update");
      await entityContext(ctx, "stockMovement", "create");
      const order = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, ...scopeWhere },
        include: { lines: true },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Commande introuvable." });
      if (order.status === "cancelled")
        throw new TRPCError({ code: "CONFLICT", message: "Commande annulée." });
      const byId = new Map(order.lines.map((l) => [l.id, l]));
      const movementIds: string[] = [];
      for (const r of input.lines) {
        const line = byId.get(r.lineId);
        if (!line) throw new TRPCError({ code: "BAD_REQUEST", message: "Ligne inconnue." });
        const remaining = line.quantity - line.receivedQuantity;
        if (r.quantity > remaining + 1e-9)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `« ${line.label} » : ${remaining} restant${remaining > 1 ? "s" : ""} à recevoir.`,
          });
        await ctx.db.purchaseOrderLine.update({
          where: { id: line.id },
          data: { receivedQuantity: line.receivedQuantity + r.quantity },
        });
        line.receivedQuantity += r.quantity;
        if (line.productId) {
          const m = await ctx.db.stockMovement.create({
            data: {
              organizationId: ctx.organizationId,
              productId: line.productId,
              type: "in",
              quantity: r.quantity,
              warehouseId: input.warehouseId,
              reference: order.number ? `Réception ${order.number}` : "Réception fournisseur",
              purchaseOrderId: order.id,
              ownerId: ctx.user.id,
            },
          });
          movementIds.push(m.id);
        }
      }
      const complete = order.lines.every((l) => l.receivedQuantity >= l.quantity - 1e-9);
      await ctx.db.purchaseOrder.update({
        where: { id: order.id },
        data: { status: complete ? "received" : "partial" },
      });
      if (movementIds.length) await afterRecordChange(ctx, "stockMovement", movementIds, "created");
      await recordAudit(ctx, {
        action: "purchase_order.received",
        entityType: "purchaseOrder",
        entityId: order.id,
        metadata: { lines: input.lines.length, complete },
      });
      return { status: complete ? "received" : "partial" };
    }),
});
