import {
  DOCUMENT_ENTITY,
  type DocumentKind,
  type EntityKey,
  PAYMENT_METHODS,
  RECURRING_INTERVALS,
  documentLinesSchema,
  recordPath,
  salesSettingsSchema,
} from "@quercy/core";
import {
  SalesError,
  addPayment,
  convertDocument,
  createCreditNote,
  deletePayment,
  duplicateDocument,
  emailDocument,
  finalizeDocument,
  generateFromRecurring,
  getDocument,
  invoiceProjectTime,
  makeRecurring,
  publicDocumentUrl,
  salesSettings,
  saveLines,
} from "@quercy/documents";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "../../env";
import { publish } from "../../realtime";
import { delegate, entityContext, type RecordsCtx } from "../../records/context";
import { decryptSecret, encryptSecret, maskSecret } from "../../secrets";
import { authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

const idInput = z.object({ id: z.string().min(1) });

/** Traduit les refus métier en erreurs lisibles côté interface. */
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof SalesError)
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}

/**
 * Contrôle d'accès à un document : module actif, droit demandé et document dans le périmètre
 * (tous, équipe, les siens) de la personne.
 */
async function access(
  ctx: RecordsCtx,
  id: string,
  action: "view" | "create" | "update" | "delete",
) {
  const doc = await ctx.db.salesDocument.findFirst({ where: { id }, select: { kind: true } });
  if (!doc)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Ce document n'existe pas ou a été supprimé.",
    });
  const entity = DOCUMENT_ENTITY[doc.kind as DocumentKind];
  const { scopeWhere } = await entityContext(ctx, entity, action);
  const visible = await delegate(ctx, entity).count({ where: { id, ...scopeWhere } });
  if (!visible)
    throw new TRPCError({ code: "FORBIDDEN", message: "Ce document est hors de votre périmètre." });
  return entity;
}

async function changed(ctx: RecordsCtx, entity: EntityKey, ids: string[]) {
  await publish(ctx.organizationId, { type: "record.changed", entity, ids, actorId: ctx.user.id });
}

export const salesRouter = createTRPCRouter({
  /** Document complet : en-tête, lignes, paiements, documents liés, droits. */
  document: orgProcedure.input(idInput).query(async ({ ctx, input }) => {
    const entity = await access(ctx, input.id, "view");
    const doc = await getDocument(ctx.organizationId, input.id);
    const canEdit = await access(ctx, input.id, "update")
      .then(() => !ctx.workspace.billing.readOnly)
      .catch(() => false);
    const settings = await salesSettings(ctx.organizationId);
    return {
      entity,
      doc: { ...doc, publicUrl: publicDocumentUrl(env().APP_URL, doc.publicToken) },
      canEdit,
      settings: {
        vatExempt: settings.vatExempt,
        configured: Boolean(settings.legalName && settings.siret),
        onlinePayment: Boolean(settings.stripeSecretKeyEnc),
      },
    };
  }),

  saveLines: orgProcedure
    .input(z.object({ id: z.string().min(1), lines: documentLinesSchema }))
    .mutation(async ({ ctx, input }) => {
      const entity = await access(ctx, input.id, "update");
      const doc = await guard(() => saveLines(ctx.organizationId, input.id, input.lines));
      await recordAudit(ctx, {
        action: "sales.lines.update",
        entityType: entity,
        entityId: input.id,
        metadata: { lines: input.lines.length, totalCents: doc.totalCents },
      });
      await changed(ctx, entity, [input.id]);
      return doc;
    }),

  updateTerms: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        notes: z.string().trim().max(5000).nullable(),
        paymentTermsDays: z.number().int().min(0).max(120),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entity = await access(ctx, input.id, "update");
      const doc = await getDocument(ctx.organizationId, input.id);
      if (doc.kind !== "RECURRING" && doc.status !== "draft")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Seul un brouillon est modifiable." });
      await ctx.db.salesDocument.update({
        where: { id: input.id },
        data: { notes: input.notes || null, paymentTermsDays: input.paymentTermsDays },
      });
      await changed(ctx, entity, [input.id]);
      return { ok: true };
    }),

  /** Émission : numéro définitif et date ; le document n'est plus modifiable. */
  finalize: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const entity = await access(ctx, input.id, "update");
    const doc = await guard(() => finalizeDocument(ctx.organizationId, input.id));
    await recordAudit(ctx, {
      action: "sales.finalize",
      entityType: entity,
      entityId: input.id,
      metadata: { name: doc.number, totalCents: doc.totalCents },
    });
    await changed(ctx, entity, [
      input.id,
      ...(doc.creditedInvoiceId ? [doc.creditedInvoiceId] : []),
    ]);
    return doc;
  }),

  /** Envoi par email (émet d'abord le brouillon) avec le PDF en pièce jointe. */
  send: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        to: z.email({ error: "Adresse email invalide." }),
        message: z.string().max(5000).optional(),
        reminder: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entity = await access(ctx, input.id, "update");
      const doc = await guard(() => finalizeDocument(ctx.organizationId, input.id));
      await guard(() =>
        emailDocument({
          organizationId: ctx.organizationId,
          documentId: input.id,
          to: input.to,
          message: input.message,
          appUrl: env().APP_URL,
          replyTo: ctx.user.email,
          mode: input.reminder ? "reminder" : "send",
        }),
      );
      await recordAudit(ctx, {
        action: input.reminder ? "sales.remind" : "sales.send",
        entityType: entity,
        entityId: input.id,
        metadata: { name: doc.number, to: input.to },
      });
      await changed(ctx, entity, [input.id]);
      return { ok: true };
    }),

  /** Statut manuel : devis accepté / refusé, commande livrée / annulée, avoir remboursé. */
  setStatus: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.enum([
          "accepted",
          "declined",
          "delivered",
          "cancelled",
          "refunded",
          "sent",
          "confirmed",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entity = await access(ctx, input.id, "update");
      const doc = await getDocument(ctx.organizationId, input.id);
      const allowed: Record<string, Record<string, string[]>> = {
        QUOTE: {
          sent: ["accepted", "declined"],
          expired: ["accepted", "declined"],
          accepted: ["sent"],
          declined: ["sent"],
        },
        ORDER: {
          confirmed: ["delivered", "cancelled"],
          delivered: ["confirmed"],
          cancelled: ["confirmed"],
        },
        CREDIT_NOTE: { issued: ["refunded"], refunded: ["issued"] },
      };
      if (!allowed[doc.kind]?.[doc.status]?.includes(input.status))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ce changement de statut n'est pas possible.",
        });
      await ctx.db.salesDocument.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "accepted" ? { acceptedAt: new Date() } : {}),
        },
      });
      // Devis accepté : l'opportunité liée est gagnée.
      if (input.status === "accepted" && doc.dealId)
        await ctx.db.deal.update({
          where: { id: doc.dealId },
          data: {
            stage: "won",
            probability: 100,
            closedAt: new Date(),
            amount: doc.totalExclCents / 100,
          },
        });
      await recordAudit(ctx, {
        action: "sales.status",
        entityType: entity,
        entityId: input.id,
        changes: { status: { before: doc.status, after: input.status } },
        metadata: { name: doc.number },
      });
      await changed(ctx, entity, [input.id]);
      if (doc.dealId) await changed(ctx, "deal", [doc.dealId]);
      return { ok: true };
    }),

  convert: orgProcedure
    .input(z.object({ id: z.string().min(1), to: z.enum(["ORDER", "INVOICE"]) }))
    .mutation(async ({ ctx, input }) => {
      const entity = await access(ctx, input.id, "update");
      const target = DOCUMENT_ENTITY[input.to];
      await entityContext(ctx, target, "create");
      const created = await guard(() =>
        convertDocument(ctx.organizationId, input.id, input.to, ctx.user.id),
      );
      await recordAudit(ctx, {
        action: "sales.convert",
        entityType: entity,
        entityId: input.id,
        metadata: { to: input.to, createdId: created.id },
      });
      await changed(ctx, entity, [input.id]);
      await changed(ctx, target, [created.id]);
      return { id: created.id, url: recordPath(target, created.id) };
    }),

  creditNote: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    await access(ctx, input.id, "view");
    await entityContext(ctx, "creditNote", "create");
    const created = await guard(() => createCreditNote(ctx.organizationId, input.id, ctx.user.id));
    await recordAudit(ctx, {
      action: "sales.credit_note",
      entityType: "invoice",
      entityId: input.id,
      metadata: { createdId: created.id },
    });
    await changed(ctx, "creditNote", [created.id]);
    return { id: created.id, url: recordPath("creditNote", created.id) };
  }),

  duplicate: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const entity = await access(ctx, input.id, "view");
    await entityContext(ctx, entity, "create");
    const created = await guard(() => duplicateDocument(ctx.organizationId, input.id, ctx.user.id));
    await recordAudit(ctx, {
      action: "sales.duplicate",
      entityType: entity,
      entityId: input.id,
      metadata: { createdId: created.id },
    });
    await changed(ctx, entity, [created.id]);
    return { id: created.id, url: recordPath(entity, created.id) };
  }),

  makeRecurring: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        interval: z.enum(RECURRING_INTERVALS.map((i) => i.value) as [string, ...string[]]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await access(ctx, input.id, "view");
      await entityContext(ctx, "recurringInvoice", "create");
      const created = await guard(() =>
        makeRecurring(ctx.organizationId, input.id, input.interval, ctx.user.id),
      );
      await recordAudit(ctx, {
        action: "sales.recurring.create",
        entityType: "recurringInvoice",
        entityId: created.id,
        metadata: { from: input.id, interval: input.interval },
      });
      await changed(ctx, "recurringInvoice", [created.id]);
      return { id: created.id, url: recordPath("recurringInvoice", created.id) };
    }),

  /** Génère tout de suite la prochaine facture d'un modèle récurrent. */
  generateNow: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    await access(ctx, input.id, "update");
    await entityContext(ctx, "invoice", "create");
    const { invoiceId } = await guard(() => generateFromRecurring(ctx.organizationId, input.id));
    await recordAudit(ctx, {
      action: "sales.recurring.generate",
      entityType: "recurringInvoice",
      entityId: input.id,
      metadata: { invoiceId },
    });
    await changed(ctx, "invoice", [invoiceId]);
    return { id: invoiceId, url: recordPath("invoice", invoiceId) };
  }),

  addPayment: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        amountCents: z.number().int().positive({ error: "Le montant doit être positif." }),
        date: z.coerce.date(),
        method: z.enum(PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]]),
        reference: z.string().trim().max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await access(ctx, input.id, "update");
      const doc = await guard(() =>
        addPayment(
          ctx.organizationId,
          input.id,
          {
            amountCents: input.amountCents,
            date: input.date,
            method: input.method,
            reference: input.reference || null,
          },
          ctx.user.id,
        ),
      );
      await recordAudit(ctx, {
        action: "sales.payment.create",
        entityType: "invoice",
        entityId: input.id,
        metadata: { name: doc.number, amountCents: input.amountCents, method: input.method },
      });
      await changed(ctx, "invoice", [input.id]);
      return doc;
    }),

  deletePayment: orgProcedure
    .input(z.object({ paymentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({ where: { id: input.paymentId } });
      if (!payment)
        throw new TRPCError({ code: "NOT_FOUND", message: "Ce paiement n'existe pas." });
      await access(ctx, payment.documentId, "update");
      await guard(() => deletePayment(ctx.organizationId, input.paymentId));
      await recordAudit(ctx, {
        action: "sales.payment.delete",
        entityType: "invoice",
        entityId: payment.documentId,
        metadata: { amountCents: payment.amountCents, method: payment.method },
      });
      await changed(ctx, "invoice", [payment.documentId]);
      return { ok: true };
    }),

  /** Facture brouillon du temps facturable non facturé d'un projet. */
  invoiceTime: orgProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "project", "view");
      const visible = await ctx.db.project.count({ where: { id: input.projectId, ...scopeWhere } });
      if (!visible) throw new TRPCError({ code: "NOT_FOUND", message: "Projet introuvable." });
      await entityContext(ctx, "invoice", "create");
      const { invoice, entries } = await guard(() =>
        invoiceProjectTime(ctx.organizationId, input.projectId, ctx.user.id),
      );
      await recordAudit(ctx, {
        action: "sales.invoice_time",
        entityType: "project",
        entityId: input.projectId,
        metadata: { invoiceId: invoice.id, entries },
      });
      await changed(ctx, "invoice", [invoice.id]);
      await changed(ctx, "timeEntry", []);
      return { id: invoice.id, url: recordPath("invoice", invoice.id), entries };
    }),

  /** Articles du catalogue pour la saisie des lignes. */
  catalog: orgProcedure
    .input(z.object({ search: z.string().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      await entityContext(ctx, "product", "view");
      const products = await ctx.db.product.findMany({
        where: {
          active: true,
          ...(input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { sku: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { name: "asc" },
        take: 30,
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          unitPrice: true,
          vatRate: true,
          description: true,
        },
      });
      return products.map((p) => ({
        ...p,
        unitPriceCents: Math.round(p.unitPrice * 100),
        vatRate: Number(p.vatRate),
      }));
    }),

  settings: orgProcedure.query(async ({ ctx }) => {
    authorize(ctx, "sales", "view");
    const s = await salesSettings(ctx.organizationId);
    let stripeKey: string | null = null;
    if (s.stripeSecretKeyEnc) {
      try {
        stripeKey = maskSecret(decryptSecret(s.stripeSecretKeyEnc));
      } catch {
        stripeKey = "illisible (clé de chiffrement changée)";
      }
    }
    const { stripeSecretKeyEnc: _k, stripeWebhookSecretEnc: _w, ...rest } = s;
    return {
      ...rest,
      stripe: {
        secretKey: stripeKey,
        webhookConfigured: Boolean(s.stripeWebhookSecretEnc),
        webhookUrl: `${env().APP_URL}/api/stripe/ventes/${ctx.organizationId}`,
      },
      canEdit:
        !ctx.workspace.billing.readOnly &&
        (ctx.workspace.role.permissions.sales?.admin ?? null) !== null,
    };
  }),

  updateSettings: orgProcedure.input(salesSettingsSchema).mutation(async ({ ctx, input }) => {
    authorize(ctx, "sales", "admin", "Les paramètres de vente sont réservés aux administrateurs.");
    const before = await salesSettings(ctx.organizationId);
    const data = {
      ...input,
      email: input.email || null,
      siret: input.siret || null,
      iban: input.iban || null,
      reminderDays: [...new Set(input.reminderDays)].sort((a, b) => a - b),
    };
    await ctx.db.salesSettings.update({ where: { organizationId: ctx.organizationId }, data });
    const changes = Object.fromEntries(
      Object.entries(data)
        .filter(([k, v]) => JSON.stringify(before[k as keyof typeof before]) !== JSON.stringify(v))
        .map(([k, v]) => [k, { before: before[k as keyof typeof before] ?? null, after: v }]),
    );
    await recordAudit(ctx, {
      action: "sales.settings.update",
      entityType: "sales_settings",
      changes,
    });
    return { ok: true };
  }),

  /** Clés Stripe de l'entreprise, pour le paiement en ligne de ses factures. */
  setStripe: orgProcedure
    .input(
      z.object({
        secretKey: z
          .string()
          .trim()
          .regex(/^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/, {
            error: "Clé secrète Stripe invalide (sk_… ou rk_…).",
          }),
        webhookSecret: z
          .string()
          .trim()
          .regex(/^whsec_[A-Za-z0-9]{10,}$/, { error: "Secret de webhook invalide (whsec_…)." }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      authorize(
        ctx,
        "sales",
        "admin",
        "Les paramètres de vente sont réservés aux administrateurs.",
      );
      await salesSettings(ctx.organizationId);
      await ctx.db.salesSettings.update({
        where: { organizationId: ctx.organizationId },
        data: {
          stripeSecretKeyEnc: encryptSecret(input.secretKey),
          stripeWebhookSecretEnc: encryptSecret(input.webhookSecret),
        },
      });
      await recordAudit(ctx, {
        action: "sales.settings.update",
        entityType: "sales_settings",
        metadata: {
          stripe: "configured",
          mode: input.secretKey.includes("_live_") ? "live" : "test",
        },
      });
      return { ok: true };
    }),

  removeStripe: orgProcedure.mutation(async ({ ctx }) => {
    authorize(ctx, "sales", "admin", "Les paramètres de vente sont réservés aux administrateurs.");
    await ctx.db.salesSettings.updateMany({
      data: { stripeSecretKeyEnc: null, stripeWebhookSecretEnc: null },
    });
    await recordAudit(ctx, {
      action: "sales.settings.update",
      entityType: "sales_settings",
      metadata: { stripe: "removed" },
    });
    return { ok: true };
  }),
});
