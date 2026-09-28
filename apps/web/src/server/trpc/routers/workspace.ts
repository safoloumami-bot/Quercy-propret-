import {
  MODULE_KEYS,
  PLANS,
  TRIAL_DAYS,
  SYSTEM_ROLE_LABELS,
  createOrganizationSchema,
  diffChanges,
  hexColorSchema,
  moduleKeySchema,
  moduleLimitError,
  slugify,
  updateOrganizationSchema,
} from "@quercy/core";
import { SYSTEM_ROLE_SEEDS, prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { syncSeats } from "../../billing/seats";
import { PlanLimitError } from "../../billing/state";
import { createInvitations } from "../../invitations";
import { parsePreferences } from "../../workspace";
import { authedProcedure, authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const exists = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
  }
  throw new TRPCError({
    code: "CONFLICT",
    message: "Impossible de générer un identifiant d'espace.",
  });
}

async function setActiveOrganization(sessionToken: string, organizationId: string) {
  await prisma.session.update({
    where: { token: sessionToken },
    data: { activeOrganizationId: organizationId },
  });
}

export const workspaceRouter = createTRPCRouter({
  /** Espaces dont l'utilisateur est membre. */
  list: authedProcedure.query(async ({ ctx }) => {
    const memberships = await prisma.membership.findMany({
      where: { userId: ctx.user.id, deletedAt: null, organization: { deletedAt: null } },
      include: { organization: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => m.organization);
  }),

  /** Création d'un espace (assistant d'accueil) avec essai Business de 14 jours. */
  create: authedProcedure.input(createOrganizationSchema).mutation(async ({ ctx, input }) => {
    const slug = await uniqueSlug(input.name);
    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name: input.name,
          slug,
          industry: input.industry,
          size: input.size,
          plan: "BUSINESS",
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          modules: input.modules,
          preferences: parsePreferences({ accentColor: input.accentColor.toUpperCase() }),
          onboardedAt: new Date(),
        },
      });
      await tx.role.createMany({
        data: SYSTEM_ROLE_SEEDS.map((r) => ({ ...r, organizationId: created.id })),
      });
      const owner = await tx.role.findFirstOrThrow({
        where: { organizationId: created.id, systemKey: "owner" },
      });
      await tx.membership.create({
        data: { organizationId: created.id, userId: ctx.user.id, roleId: owner.id },
      });
      await tx.auditLog.create({
        data: {
          organizationId: created.id,
          actorId: ctx.user.id,
          action: "organization.create",
          entityType: "organization",
          entityId: created.id,
          metadata: { name: created.name, modules: input.modules },
        },
      });
      return created;
    });

    await setActiveOrganization(ctx.session.session.token, org.id);

    if (input.invitations.length > 0) {
      const roles = await prisma.role.findMany({
        where: {
          organizationId: org.id,
          systemKey: { in: input.invitations.map((i) => i.systemRole) },
        },
      });
      for (const role of roles) {
        const emails = input.invitations
          .filter((i) => i.systemRole === role.systemKey)
          .map((i) => i.email);
        await createInvitations({
          organization: { id: org.id, name: org.name },
          inviter: ctx.user,
          role,
          emails,
          headers: ctx.headers,
        });
      }
    }
    return { id: org.id };
  }),

  /** Bascule vers un autre espace dont l'utilisateur est membre. */
  switch: authedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          organizationId: input.organizationId,
          deletedAt: null,
          organization: { deletedAt: null },
        },
        include: { organization: { select: { name: true } } },
      });
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas membre de cet espace.",
        });
      }
      await setActiveOrganization(ctx.session.session.token, input.organizationId);
      return { name: membership.organization.name };
    }),

  /** Réglages de l'espace actif. */
  current: orgProcedure.query(({ ctx }) => {
    authorize(ctx, "settings", "view");
    return ctx.workspace.organization;
  }),

  update: orgProcedure.input(updateOrganizationSchema).mutation(async ({ ctx, input }) => {
    authorize(ctx, "settings", "update");
    const before = ctx.workspace.organization;
    const preferences = {
      ...before.preferences,
      currency: input.currency,
      timezone: input.timezone,
      dateFormat: input.dateFormat,
      locale: input.locale,
    };
    const changes = diffChanges(
      { name: before.name, industry: before.industry, size: before.size, ...before.preferences },
      { name: input.name, industry: input.industry, size: input.size, ...preferences },
    );
    if (Object.keys(changes).length === 0) return { changed: false };

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { name: input.name, industry: input.industry, size: input.size, preferences },
    });
    await recordAudit(ctx, {
      action: "organization.update",
      entityType: "organization",
      entityId: ctx.organizationId,
      changes,
    });
    return { changed: true };
  }),

  updateAccent: orgProcedure
    .input(z.object({ color: hexColorSchema }))
    .mutation(async ({ ctx, input }) => {
      authorize(
        ctx,
        "settings",
        "update",
        "Seuls les administrateurs peuvent modifier l'apparence de l'espace.",
      );
      const current = ctx.workspace.organization.preferences;
      const accentColor = input.color.toUpperCase();
      if (accentColor === current.accentColor) return { changed: false };
      await prisma.organization.update({
        where: { id: ctx.organizationId },
        data: { preferences: { ...current, accentColor } },
      });
      await recordAudit(ctx, {
        action: "organization.preferences.update",
        entityType: "organization",
        entityId: ctx.organizationId,
        changes: { accentColor: { before: current.accentColor, after: accentColor } },
      });
      return { changed: true };
    }),

  updateModules: orgProcedure
    .input(
      z.object({
        modules: z.array(moduleKeySchema).min(1, { error: "Gardez au moins un module actif." }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      authorize(
        ctx,
        "settings",
        "admin",
        "Seuls les administrateurs peuvent activer ou désactiver des modules.",
      );
      const ordered = MODULE_KEYS.filter((k) => input.modules.includes(k));
      const { effectivePlan, limits } = ctx.workspace.billing;
      const limitMessage = moduleLimitError(limits, ordered.length, PLANS[effectivePlan].name);
      if (limitMessage) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: limitMessage,
          cause: new PlanLimitError(limitMessage),
        });
      }
      const before = ctx.workspace.organization.modules;
      await prisma.organization.update({
        where: { id: ctx.organizationId },
        data: { modules: ordered },
      });
      await recordAudit(ctx, {
        action: "organization.modules.update",
        entityType: "organization",
        entityId: ctx.organizationId,
        changes: { modules: { before, after: ordered } },
      });
      return { modules: ordered };
    }),

  /** Quitter l'espace (impossible pour le dernier propriétaire). */
  leave: orgProcedure.mutation(async ({ ctx }) => {
    if (ctx.workspace.role.systemKey === "owner") {
      const owners = await ctx.db.membership.count({ where: { role: { systemKey: "owner" } } });
      if (owners <= 1) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Vous êtes le seul ${SYSTEM_ROLE_LABELS.owner.toLowerCase()} : transmettez ce rôle avant de quitter l'espace.`,
        });
      }
    }
    await ctx.db.membership.update({
      where: { id: ctx.workspace.membership.id },
      data: { deletedAt: new Date() },
    });
    await ctx.db.teamMember.deleteMany({
      where: { userId: ctx.user.id, team: { organizationId: ctx.organizationId } },
    });
    await recordAudit(ctx, {
      action: "member.leave",
      entityType: "membership",
      entityId: ctx.workspace.membership.id,
    });
    await syncSeats(ctx.organizationId);
    await prisma.session.update({
      where: { token: ctx.session.session.token },
      data: { activeOrganizationId: null },
    });
    return { ok: true };
  }),
});
