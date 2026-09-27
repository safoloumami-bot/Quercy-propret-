import { PLANS, inviteSchema, memberLimitError } from "@quercy/core";
import { prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { syncSeats } from "../../billing/seats";
import { PlanLimitError, loadBillingState } from "../../billing/state";
import { createInvitations, hashInvitationToken } from "../../invitations";
import {
  authedProcedure,
  authorize,
  createTRPCRouter,
  orgProcedure,
  publicProcedure,
  recordAudit,
} from "../init";

async function findPendingByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token: hashInvitationToken(token) },
    include: {
      organization: { select: { id: true, name: true, logoUrl: true, deletedAt: true } },
      role: { select: { id: true, name: true } },
      invitedBy: { select: { name: true } },
    },
  });
  if (!invitation || invitation.organization.deletedAt) return { state: "invalid" as const };
  if (invitation.status !== "PENDING") return { state: "used" as const, invitation };
  if (invitation.expiresAt < new Date()) return { state: "expired" as const, invitation };
  return { state: "pending" as const, invitation };
}

export const invitationsRouter = createTRPCRouter({
  list: orgProcedure.query(async ({ ctx }) => {
    authorize(ctx, "members", "view");
    return ctx.db.invitation.findMany({
      where: { status: "PENDING", expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        expiresAt: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
        invitedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: orgProcedure.input(inviteSchema).mutation(async ({ ctx, input }) => {
    authorize(ctx, "members", "create", "Votre rôle ne permet pas d'inviter des personnes.");
    const role = await ctx.db.role.findUnique({ where: { id: input.roleId } });
    if (!role)
      throw new TRPCError({ code: "NOT_FOUND", message: "Ce rôle n'existe pas dans l'espace." });
    if (role.systemKey === "owner") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Le rôle Propriétaire ne s'attribue pas par invitation : invitez la personne, puis transmettez-lui le rôle.",
      });
    }
    const { effectivePlan, limits, memberCount } = ctx.workspace.billing;
    const pending = await ctx.db.invitation.count({
      where: { status: "PENDING", expiresAt: { gt: new Date() }, email: { notIn: input.emails } },
    });
    const limitMessage = memberLimitError(
      limits,
      memberCount + pending + new Set(input.emails).size,
      PLANS[effectivePlan].name,
    );
    if (limitMessage) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: limitMessage,
        cause: new PlanLimitError(limitMessage),
      });
    }
    return createInvitations({
      organization: { id: ctx.organizationId, name: ctx.workspace.organization.name },
      inviter: ctx.user,
      role,
      emails: input.emails,
      headers: ctx.headers,
    });
  }),

  /** Renvoie l'invitation avec un nouveau lien (l'ancien cesse de fonctionner). */
  resend: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "members", "create");
      const invitation = await ctx.db.invitation.findUnique({
        where: { id: input.id },
        include: { role: true },
      });
      if (!invitation || invitation.status !== "PENDING") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cette invitation n'est plus en attente.",
        });
      }
      const [result] = await createInvitations({
        organization: { id: ctx.organizationId, name: ctx.workspace.organization.name },
        inviter: ctx.user,
        role: invitation.role,
        emails: [invitation.email],
        headers: ctx.headers,
      });
      return result;
    }),

  revoke: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "members", "delete");
      const invitation = await ctx.db.invitation.findUnique({ where: { id: input.id } });
      if (!invitation || invitation.status !== "PENDING") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cette invitation n'est plus en attente.",
        });
      }
      await ctx.db.invitation.update({ where: { id: input.id }, data: { status: "REVOKED" } });
      await recordAudit(ctx, {
        action: "invitation.revoke",
        entityType: "invitation",
        entityId: input.id,
        metadata: { email: invitation.email },
      });
      return { ok: true };
    }),

  /** Informations publiques d'une invitation (page /invitation/[token]). */
  byToken: publicProcedure
    .input(z.object({ token: z.string().min(10).max(200) }))
    .query(async ({ input }) => {
      const result = await findPendingByToken(input.token);
      if (result.state === "invalid") return { state: result.state };
      const { invitation } = result;
      return {
        state: result.state,
        email: invitation.email,
        organizationName: invitation.organization.name,
        organizationLogo: invitation.organization.logoUrl,
        roleName: invitation.role.name,
        inviterName: invitation.invitedBy.name,
      };
    }),

  accept: authedProcedure
    .input(z.object({ token: z.string().min(10).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const result = await findPendingByToken(input.token);
      if (result.state !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            result.state === "expired"
              ? "Cette invitation a expiré. Demandez-en une nouvelle."
              : "Cette invitation n'est plus valable.",
        });
      }
      const { invitation } = result;
      const target = await prisma.organization.findUniqueOrThrow({
        where: { id: invitation.organizationId },
      });
      const targetState = await loadBillingState(target);
      if (
        memberLimitError(
          targetState.limits,
          targetState.memberCount + 1,
          PLANS[targetState.effectivePlan].name,
        )
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${invitation.organization.name} a atteint la limite de son offre. Demandez à la personne qui vous a invité de passer à l'offre supérieure.`,
        });
      }
      if (invitation.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cette invitation a été envoyée à ${invitation.email}. Connectez-vous avec cette adresse.`,
        });
      }

      const organizationId = invitation.organizationId;
      await prisma.$transaction(async (tx) => {
        const existing = await tx.membership.findUnique({
          where: { organizationId_userId: { organizationId, userId: ctx.user.id } },
        });
        const membership = existing
          ? await tx.membership.update({
              where: { id: existing.id },
              data: existing.deletedAt ? { deletedAt: null, roleId: invitation.roleId } : {},
            })
          : await tx.membership.create({
              data: { organizationId, userId: ctx.user.id, roleId: invitation.roleId },
            });
        await tx.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } });
        await tx.auditLog.create({
          data: {
            organizationId,
            actorId: ctx.user.id,
            action: "member.join",
            entityType: "membership",
            entityId: membership.id,
            metadata: { role: invitation.role.name, invitationId: invitation.id },
          },
        });
      });
      await prisma.session.update({
        where: { token: ctx.session.session.token },
        data: { activeOrganizationId: organizationId },
      });
      await syncSeats(organizationId);
      return { organizationName: invitation.organization.name };
    }),
});
