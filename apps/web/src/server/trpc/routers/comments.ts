import { ENTITIES, ENTITY_KEYS, type EntityKey, recordTitle } from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { notify } from "../../notify";
import { publish } from "../../realtime";
import { delegate, entityContext } from "../../records/context";
import { createTRPCRouter, orgProcedure } from "../init";

const target = z.object({ entity: z.enum(ENTITY_KEYS), id: z.string().min(1) });

/** La fiche doit être visible par l'utilisateur pour lire ou écrire ses commentaires. */
async function assertVisible(
  ctx: Parameters<typeof entityContext>[0],
  entity: EntityKey,
  id: string,
) {
  const { scopeWhere } = await entityContext(ctx, entity, "view");
  const record = (await delegate(ctx, entity).findFirst({
    where: { id, ...scopeWhere },
  })) as Record<string, unknown> | null;
  if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Fiche introuvable." });
  return record;
}

export const commentsRouter = createTRPCRouter({
  list: orgProcedure.input(target).query(async ({ ctx, input }) => {
    await assertVisible(ctx, input.entity, input.id);
    const comments = await ctx.db.comment.findMany({
      where: { entityType: input.entity, entityId: input.id },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
    return comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
      author: c.author,
      mine: c.authorId === ctx.user.id,
    }));
  }),

  create: orgProcedure
    .input(
      target.extend({
        body: z.string().trim().min(1, { error: "Le commentaire est vide." }).max(10_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const record = await assertVisible(ctx, input.entity, input.id);
      // Mentions : « @[Nom](id) » inséré par l'éditeur ; seules les personnes de l'espace comptent.
      const mentioned = [...input.body.matchAll(/@\[[^\]]+\]\(([a-z0-9]+)\)/gi)].map((m) => m[1]!);
      const members = mentioned.length
        ? (
            await ctx.db.membership.findMany({
              where: { userId: { in: mentioned } },
              select: { userId: true },
            })
          ).map((m) => m.userId)
        : [];
      const comment = await ctx.db.comment.create({
        data: {
          organizationId: ctx.organizationId,
          entityType: input.entity,
          entityId: input.id,
          authorId: ctx.user.id,
          body: input.body,
          mentions: members,
        },
      });
      const def = ENTITIES[input.entity];
      const url = `/${def.module}/${def.slug}/${input.id}?onglet=commentaires`;
      const title = recordTitle(input.entity, record);
      await notify({
        organizationId: ctx.organizationId,
        userIds: members,
        actorId: ctx.user.id,
        type: "mention",
        title: `${ctx.user.name} vous a mentionné sur « ${title} »`,
        body: input.body.replace(/@\[([^\]]+)\]\([a-z0-9]+\)/gi, "@$1").slice(0, 200),
        url,
      });
      const owner = record.ownerId as string | null;
      if (owner && !members.includes(owner)) {
        await notify({
          organizationId: ctx.organizationId,
          userIds: [owner],
          actorId: ctx.user.id,
          type: "comment",
          title: `${ctx.user.name} a commenté « ${title} »`,
          url,
        });
      }
      await publish(ctx.organizationId, {
        type: "comment.changed",
        entity: input.entity,
        id: input.id,
        actorId: ctx.user.id,
      });
      return { id: comment.id };
    }),

  update: orgProcedure
    .input(z.object({ commentId: z.string().min(1), body: z.string().trim().min(1).max(10_000) }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUnique({ where: { id: input.commentId } });
      if (!comment || comment.authorId !== ctx.user.id)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seul l'auteur peut modifier un commentaire.",
        });
      await ctx.db.comment.update({
        where: { id: comment.id },
        data: { body: input.body, editedAt: new Date() },
      });
      await publish(ctx.organizationId, {
        type: "comment.changed",
        entity: comment.entityType,
        id: comment.entityId,
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  delete: orgProcedure
    .input(z.object({ commentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUnique({ where: { id: input.commentId } });
      const isAdmin = ctx.workspace.role.permissions.settings?.admin === "all";
      if (!comment || (comment.authorId !== ctx.user.id && !isAdmin)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seuls l'auteur et les administrateurs peuvent supprimer un commentaire.",
        });
      }
      await ctx.db.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
      await publish(ctx.organizationId, {
        type: "comment.changed",
        entity: comment.entityType,
        id: comment.entityId,
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});
