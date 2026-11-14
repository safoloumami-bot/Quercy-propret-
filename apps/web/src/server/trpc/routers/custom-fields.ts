import { ENTITY_KEYS, slugify } from "@quercy/core";
import { isUniqueViolation } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

const typeSchema = z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX"]);
const inputSchema = z.object({
  label: z.string().trim().min(2, { error: "Indiquez au moins 2 caractères." }).max(60),
  type: typeSchema,
  choices: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
  required: z.boolean().default(false),
});

export const customFieldsRouter = createTRPCRouter({
  list: orgProcedure.input(z.object({ entity: z.enum(ENTITY_KEYS) })).query(({ ctx, input }) =>
    ctx.db.customFieldDefinition.findMany({
      where: { entityType: input.entity },
      orderBy: { position: "asc" },
      select: { id: true, key: true, label: true, type: true, options: true, position: true },
    }),
  ),

  create: orgProcedure
    .input(inputSchema.extend({ entity: z.enum(ENTITY_KEYS) }))
    .mutation(async ({ ctx, input }) => {
      authorize(
        ctx,
        "settings",
        "admin",
        "Seuls les administrateurs créent des champs personnalisés.",
      );
      if (input.type === "SELECT" && input.choices.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Une liste doit proposer au moins un choix.",
        });
      }
      const count = await ctx.db.customFieldDefinition.count({
        where: { entityType: input.entity },
      });
      if (count >= 50)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "50 champs personnalisés maximum par type de fiche.",
        });
      const key = slugify(input.label).replaceAll("-", "_").slice(0, 40);
      const field = await ctx.db.customFieldDefinition
        .create({
          data: {
            organizationId: ctx.organizationId,
            entityType: input.entity,
            key,
            label: input.label,
            type: input.type,
            options: { choices: input.choices, required: input.required },
            position: count,
          },
        })
        .catch((error: unknown) => {
          if (isUniqueViolation(error))
            throw new TRPCError({ code: "CONFLICT", message: "Un champ porte déjà ce nom." });
          throw error;
        });
      await recordAudit(ctx, {
        action: "custom_field.create",
        entityType: "custom_field",
        entityId: field.id,
        metadata: { name: field.label, entity: input.entity },
      });
      return field;
    }),

  update: orgProcedure
    .input(inputSchema.omit({ type: true }).extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "settings", "admin");
      const field = await ctx.db.customFieldDefinition.findUnique({ where: { id: input.id } });
      if (!field) throw new TRPCError({ code: "NOT_FOUND", message: "Champ introuvable." });
      await ctx.db.customFieldDefinition.update({
        where: { id: field.id },
        data: { label: input.label, options: { choices: input.choices, required: input.required } },
      });
      await recordAudit(ctx, {
        action: "custom_field.update",
        entityType: "custom_field",
        entityId: field.id,
        changes: { label: { before: field.label, after: input.label } },
      });
      return { ok: true };
    }),

  /** Suppression du champ : les valeurs déjà saisies restent dans les fiches (et dans l'export). */
  delete: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "settings", "admin");
      const field = await ctx.db.customFieldDefinition.findUnique({ where: { id: input.id } });
      if (!field) throw new TRPCError({ code: "NOT_FOUND", message: "Champ introuvable." });
      await ctx.db.customFieldDefinition.delete({ where: { id: field.id } });
      await recordAudit(ctx, {
        action: "custom_field.delete",
        entityType: "custom_field",
        entityId: field.id,
        metadata: { name: field.label },
      });
      return { ok: true };
    }),
});
