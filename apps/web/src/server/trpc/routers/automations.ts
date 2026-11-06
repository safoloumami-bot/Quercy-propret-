import {
  AUTOMATION_ACTION_LABELS,
  ENTITIES,
  TRIGGER_LABELS,
  automationSchema,
  entityFields,
} from "@quercy/core";
import { type Prisma, prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ResolvedWorkspace } from "../../workspace";
import { authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

/** Gestion réservée aux administrateurs du module (activé dans l'espace). */
export function requireModule(
  ctx: { workspace: ResolvedWorkspace },
  module: "automations" | "integrations",
) {
  if (!ctx.workspace.organization.modules.includes(module))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Ce module n'est pas activé dans l'espace (Réglages › Espace › Modules).",
    });
  authorize(ctx, module, "admin", "La gestion est réservée aux administrateurs.");
}

const idInput = z.object({ id: z.string().min(1) });

export const automationsRouter = createTRPCRouter({
  list: orgProcedure.query(async ({ ctx }) => {
    requireModule(ctx, "automations");
    const rows = await prisma.automation.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((a) => ({
      ...a,
      entityLabel: ENTITIES[a.entity as keyof typeof ENTITIES]?.labelPlural ?? a.entity,
      triggerLabel: TRIGGER_LABELS[a.trigger as keyof typeof TRIGGER_LABELS] ?? a.trigger,
      summary: (a.actions as { type: keyof typeof AUTOMATION_ACTION_LABELS }[])
        .map((x) => AUTOMATION_ACTION_LABELS[x.type])
        .join(", "),
    }));
  }),

  save: orgProcedure
    .input(automationSchema.extend({ id: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireModule(ctx, "automations");
      const { id, ...data } = input;
      if (!ctx.workspace.organization.modules.includes(ENTITIES[data.entity].module))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le module de ces fiches n'est pas activé.",
        });
      const fields = entityFields(ENTITIES[data.entity]);
      for (const action of data.actions)
        if (
          action.type === "set_field" &&
          !fields.some((f) => f.key === action.field && f.editable)
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Champ non modifiable : ${action.field}.`,
          });
      const payload = {
        ...data,
        conditions: data.conditions as unknown as Prisma.InputJsonValue,
        actions: data.actions as unknown as Prisma.InputJsonValue,
      };
      const saved = id
        ? await prisma.automation.update({
            where: { id, organizationId: ctx.organizationId },
            data: { ...payload, lastError: null },
          })
        : await prisma.automation.create({
            data: { ...payload, organizationId: ctx.organizationId, createdById: ctx.user.id },
          });
      await recordAudit(ctx, {
        action: id ? "automation.update" : "automation.create",
        entityType: "automation",
        entityId: saved.id,
        metadata: { name: saved.name },
      });
      return { id: saved.id };
    }),

  setActive: orgProcedure
    .input(idInput.extend({ active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      requireModule(ctx, "automations");
      await prisma.automation.update({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { active: input.active },
      });
      return { ok: true };
    }),

  delete: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    requireModule(ctx, "automations");
    const removed = await prisma.automation.delete({
      where: { id: input.id, organizationId: ctx.organizationId },
    });
    await recordAudit(ctx, {
      action: "automation.delete",
      entityType: "automation",
      entityId: removed.id,
      metadata: { name: removed.name },
    });
    return { ok: true };
  }),
});
