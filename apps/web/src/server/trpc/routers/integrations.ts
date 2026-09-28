import { API_SCOPES, webhookSchema } from "@quercy/core";
import { prisma } from "@quercy/db";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { enqueueDeliveries } from "../../automations/webhooks";
import { generateKey } from "../../api/keys";
import { decryptSecret, encryptSecret } from "../../secrets";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";
import { requireModule } from "./automations";

const idInput = z.object({ id: z.string().min(1) });

/** Intégrations : clés d'API, webhooks sortants et flux d'agenda. */
export const integrationsRouter = createTRPCRouter({
  overview: orgProcedure.query(async ({ ctx }) => {
    requireModule(ctx, "integrations");
    const [keys, hooks] = await Promise.all([
      prisma.apiKey.findMany({
        where: { organizationId: ctx.organizationId, revokedAt: null },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.webhook.findMany({
        where: { organizationId: ctx.organizationId },
        include: { deliveries: { orderBy: { createdAt: "desc" }, take: 5 } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return {
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        scope: k.scope,
        owner: k.user.name,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
      webhooks: hooks.map((h) => ({
        id: h.id,
        url: h.url,
        events: h.events,
        active: h.active,
        lastStatus: h.lastStatus,
        lastDeliveredAt: h.lastDeliveredAt,
        deliveries: h.deliveries.map((d) => ({
          id: d.id,
          event: d.event,
          status: d.status,
          statusCode: d.statusCode,
          error: d.error,
          createdAt: d.createdAt,
        })),
      })),
    };
  }),

  /** La clé complète n'est affichée qu'une fois ; elle agit avec les droits de sa créatrice. */
  createKey: orgProcedure
    .input(z.object({ name: z.string().trim().min(1).max(80), scope: z.enum(API_SCOPES) }))
    .mutation(async ({ ctx, input }) => {
      requireModule(ctx, "integrations");
      const { key, prefix, hash } = generateKey();
      const created = await prisma.apiKey.create({
        data: {
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          name: input.name,
          scope: input.scope,
          prefix,
          hash,
        },
      });
      await recordAudit(ctx, {
        action: "api_key.create",
        entityType: "api_key",
        entityId: created.id,
        metadata: { name: input.name, scope: input.scope },
      });
      return { key };
    }),

  revokeKey: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    requireModule(ctx, "integrations");
    const key = await prisma.apiKey.update({
      where: { id: input.id, organizationId: ctx.organizationId },
      data: { revokedAt: new Date() },
    });
    await recordAudit(ctx, {
      action: "api_key.revoke",
      entityType: "api_key",
      entityId: key.id,
      metadata: { name: key.name },
    });
    return { ok: true };
  }),

  saveWebhook: orgProcedure
    .input(webhookSchema.extend({ id: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireModule(ctx, "integrations");
      const { id, ...data } = input;
      if (id) {
        await prisma.webhook.update({ where: { id, organizationId: ctx.organizationId }, data });
        return { id, secret: null };
      }
      const secret = `whsec_${randomBytes(24).toString("base64url")}`;
      const hook = await prisma.webhook.create({
        data: { ...data, organizationId: ctx.organizationId, secret: encryptSecret(secret) },
      });
      await recordAudit(ctx, {
        action: "webhook.create",
        entityType: "webhook",
        entityId: hook.id,
        metadata: { url: hook.url },
      });
      return { id: hook.id, secret };
    }),

  webhookSecret: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    requireModule(ctx, "integrations");
    const hook = await prisma.webhook.findFirstOrThrow({
      where: { id: input.id, organizationId: ctx.organizationId },
    });
    return { secret: decryptSecret(hook.secret) };
  }),

  deleteWebhook: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    requireModule(ctx, "integrations");
    const hook = await prisma.webhook.delete({
      where: { id: input.id, organizationId: ctx.organizationId },
    });
    await recordAudit(ctx, {
      action: "webhook.delete",
      entityType: "webhook",
      entityId: hook.id,
      metadata: { url: hook.url },
    });
    return { ok: true };
  }),

  testWebhook: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    requireModule(ctx, "integrations");
    const sent = await enqueueDeliveries(
      ctx.organizationId,
      "ping",
      { message: "Test de webhook Quercy" },
      input.id,
    );
    return { sent };
  }),
});
