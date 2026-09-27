import { diffChanges, roleInputSchema } from "@quercy/core";
import { isUniqueViolation } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

function conflict(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new TRPCError({ code: "CONFLICT", message: "Un rôle porte déjà ce nom." });
  }
  throw error;
}

export const rolesRouter = createTRPCRouter({
  list: orgProcedure.query(async ({ ctx }) => {
    authorize(ctx, "members", "view");
    const roles = await ctx.db.role.findMany({
      include: { _count: { select: { memberships: { where: { deletedAt: null } } } } },
      orderBy: { createdAt: "asc" },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      systemKey: r.systemKey,
      permissions: r.permissions,
      memberCount: r._count.memberships,
    }));
  }),

  create: orgProcedure.input(roleInputSchema).mutation(async ({ ctx, input }) => {
    authorize(ctx, "settings", "admin", "Seuls les administrateurs gèrent les rôles.");
    const role = await ctx.db.role
      .create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          description: input.description ?? null,
          permissions: input.permissions,
        },
      })
      .catch(conflict);
    await recordAudit(ctx, {
      action: "role.create",
      entityType: "role",
      entityId: role.id,
      metadata: { name: role.name },
    });
    return { id: role.id };
  }),

  update: orgProcedure
    .input(roleInputSchema.extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "settings", "admin", "Seuls les administrateurs gèrent les rôles.");
      const role = await ctx.db.role.findUnique({ where: { id: input.id } });
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Rôle introuvable." });
      if (role.systemKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Les rôles prédéfinis ne se modifient pas : dupliquez-le.",
        });
      }
      const next = {
        name: input.name,
        description: input.description ?? null,
        permissions: input.permissions,
      };
      const changes = diffChanges(
        { name: role.name, description: role.description, permissions: role.permissions },
        next,
      );
      await ctx.db.role.update({ where: { id: role.id }, data: next }).catch(conflict);
      await recordAudit(ctx, {
        action: "role.update",
        entityType: "role",
        entityId: role.id,
        changes,
      });
      return { ok: true };
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "settings", "admin", "Seuls les administrateurs gèrent les rôles.");
      const role = await ctx.db.role.findUnique({ where: { id: input.id } });
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Rôle introuvable." });
      if (role.systemKey)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Les rôles prédéfinis ne se suppriment pas.",
        });
      const [members, invitations] = await Promise.all([
        ctx.db.membership.count({ where: { roleId: role.id } }),
        ctx.db.invitation.count({ where: { roleId: role.id, status: "PENDING" } }),
      ]);
      if (members + invitations > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Ce rôle est encore attribué (${members} membre(s), ${invitations} invitation(s)). Changez leur rôle avant de le supprimer.`,
        });
      }
      // Le nom est libéré pour pouvoir recréer un rôle homonyme.
      await ctx.db.role.update({
        where: { id: role.id },
        data: { deletedAt: new Date(), name: `${role.name} (supprimé ${role.id.slice(-6)})` },
      });
      await recordAudit(ctx, {
        action: "role.delete",
        entityType: "role",
        entityId: role.id,
        metadata: { name: role.name },
      });
      return { ok: true };
    }),
});
