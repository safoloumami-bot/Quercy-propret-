import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { syncSeats } from "../../billing/seats";
import { authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

type Ctx = Parameters<Parameters<typeof orgProcedure.query>[0]>[0]["ctx"];

async function ownerCount(ctx: Ctx): Promise<number> {
  return ctx.db.membership.count({ where: { role: { systemKey: "owner" } } });
}

export const membersRouter = createTRPCRouter({
  list: orgProcedure.query(async ({ ctx }) => {
    authorize(ctx, "members", "view");
    const memberships = await ctx.db.membership.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            teamMembers: {
              where: { team: { organizationId: ctx.organizationId, deletedAt: null } },
              select: { team: { select: { id: true, name: true } } },
            },
          },
        },
        role: { select: { id: true, name: true, systemKey: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => ({
      id: m.id,
      joinedAt: m.createdAt,
      isMe: m.userId === ctx.user.id,
      user: { id: m.user.id, name: m.user.name, email: m.user.email, image: m.user.image },
      teams: m.user.teamMembers.map((t) => t.team),
      role: m.role,
    }));
  }),

  updateRole: orgProcedure
    .input(z.object({ membershipId: z.string().min(1), roleId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "members", "admin", "Seuls les administrateurs peuvent changer les rôles.");
      const [membership, role] = await Promise.all([
        ctx.db.membership.findUnique({
          where: { id: input.membershipId },
          include: { role: true, user: true },
        }),
        ctx.db.role.findUnique({ where: { id: input.roleId } }),
      ]);
      if (!membership || !role)
        throw new TRPCError({ code: "NOT_FOUND", message: "Membre ou rôle introuvable." });
      if (membership.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous ne pouvez pas changer votre propre rôle.",
        });
      }
      const touchesOwner = role.systemKey === "owner" || membership.role.systemKey === "owner";
      if (touchesOwner && ctx.workspace.role.systemKey !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seul un propriétaire peut attribuer ou retirer ce rôle.",
        });
      }
      if (
        membership.role.systemKey === "owner" &&
        role.systemKey !== "owner" &&
        (await ownerCount(ctx)) <= 1
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "L'espace doit garder au moins un propriétaire.",
        });
      }
      if (membership.roleId === role.id) return { ok: true };

      await ctx.db.membership.update({ where: { id: membership.id }, data: { roleId: role.id } });
      await recordAudit(ctx, {
        action: "member.role.update",
        entityType: "membership",
        entityId: membership.id,
        changes: { role: { before: membership.role.name, after: role.name } },
        metadata: { member: membership.user.email },
      });
      return { ok: true };
    }),

  remove: orgProcedure
    .input(z.object({ membershipId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "members", "delete", "Votre rôle ne permet pas de retirer des membres.");
      const membership = await ctx.db.membership.findUnique({
        where: { id: input.membershipId },
        include: { role: true, user: true },
      });
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Membre introuvable." });
      if (membership.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pour partir, utilisez « Quitter l'espace ».",
        });
      }
      if (membership.role.systemKey === "owner") {
        if (ctx.workspace.role.systemKey !== "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seul un propriétaire peut retirer un propriétaire.",
          });
        }
        if ((await ownerCount(ctx)) <= 1) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "L'espace doit garder au moins un propriétaire.",
          });
        }
      }
      await ctx.db.membership.update({
        where: { id: membership.id },
        data: { deletedAt: new Date() },
      });
      await ctx.db.teamMember.deleteMany({
        where: { userId: membership.userId, team: { organizationId: ctx.organizationId } },
      });
      await recordAudit(ctx, {
        action: "member.remove",
        entityType: "membership",
        entityId: membership.id,
        metadata: { member: membership.user.email, role: membership.role.name },
      });
      await syncSeats(ctx.organizationId);
      return { ok: true };
    }),
});
