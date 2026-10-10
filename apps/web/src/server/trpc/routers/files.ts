import { ENTITY_KEYS } from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { canAccessRecord } from "../../files/access";
import { publish } from "../../realtime";
import { signedFileUrl } from "../../storage";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";

export const filesRouter = createTRPCRouter({
  /** Pièces jointes d'une fiche, avec des liens signés valables 5 minutes. */
  list: orgProcedure
    .input(z.object({ entity: z.enum(ENTITY_KEYS), id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!(await canAccessRecord(ctx, input.entity, input.id, "view")))
        throw new TRPCError({ code: "NOT_FOUND", message: "Fiche introuvable." });
      const files = await ctx.db.storedFile.findMany({
        where: { entityType: input.entity, entityId: input.id },
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return Promise.all(
        files.map(async (f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          createdAt: f.createdAt,
          uploadedBy: f.uploadedBy.name,
          url: await signedFileUrl(f),
          downloadUrl: await signedFileUrl(f, true),
        })),
      );
    }),

  delete: orgProcedure
    .input(z.object({ fileId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.storedFile.findUnique({ where: { id: input.fileId } });
      if (!file || !file.entityType || !file.entityId)
        throw new TRPCError({ code: "NOT_FOUND", message: "Fichier introuvable." });
      const entity = file.entityType as (typeof ENTITY_KEYS)[number];
      if (!(await canAccessRecord(ctx, entity, file.entityId, "update"))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous ne pouvez pas supprimer ce fichier.",
        });
      }
      await ctx.db.storedFile.update({ where: { id: file.id }, data: { deletedAt: new Date() } });
      await recordAudit(ctx, {
        action: "file.delete",
        entityType: entity,
        entityId: file.entityId,
        metadata: { name: file.name },
      });
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity,
        ids: [file.entityId],
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});
