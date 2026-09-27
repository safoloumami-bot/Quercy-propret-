import {
  passwordSchema,
  profileSchema,
  userPreferencesInputSchema,
  userPreferencesSchema,
} from "@quercy/core";
import { prisma, verifyPassword } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { auth } from "../../auth";
import { authedProcedure, createTRPCRouter } from "../init";

export const profileRouter = createTRPCRouter({
  me: authedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        preferences: true,
        twoFactorEnabled: true,
        createdAt: true,
        accounts: { select: { providerId: true } },
      },
    });
    return {
      ...user,
      preferences: userPreferencesSchema.parse(user.preferences ?? {}),
      hasPassword: user.accounts.some((a) => a.providerId === "credential"),
      providers: [...new Set(user.accounts.map((a) => a.providerId))],
    };
  }),

  update: authedProcedure.input(profileSchema).mutation(async ({ ctx, input }) => {
    await prisma.user.update({ where: { id: ctx.user.id }, data: { name: input.name } });
    return { ok: true };
  }),

  updatePreferences: authedProcedure
    .input(userPreferencesInputSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { preferences: true },
      });
      const current = userPreferencesSchema.parse(user.preferences ?? {});
      const next = {
        ...current,
        ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
      };
      await prisma.user.update({ where: { id: ctx.user.id }, data: { preferences: next } });
      return next;
    }),

  /** Définit un mot de passe pour un compte créé par lien magique, Google ou Microsoft. */
  setPassword: authedProcedure
    .input(z.object({ newPassword: passwordSchema }))
    .mutation(async ({ ctx, input }) => {
      const has = await prisma.account.count({
        where: { userId: ctx.user.id, providerId: "credential" },
      });
      if (has > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Un mot de passe existe déjà : utilisez « Changer le mot de passe ».",
        });
      }
      await auth().api.setPassword({
        body: { newPassword: input.newPassword },
        headers: ctx.headers,
      });
      return { ok: true };
    }),

  /**
   * Suppression du compte (droit à l'effacement, RGPD). Les données personnelles sont
   * anonymisées ; les espaces dont l'utilisateur était le seul membre partent en corbeille.
   * Refusée si l'utilisateur est le dernier propriétaire d'un espace partagé.
   */
  deleteAccount: authedProcedure
    .input(
      z.object({ password: z.string().optional(), confirmEmail: z.string().trim().toLowerCase() }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        include: { accounts: true },
      });
      if (input.confirmEmail !== user.email.toLowerCase()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Saisissez exactement votre adresse email pour confirmer.",
        });
      }
      const credential = user.accounts.find((a) => a.providerId === "credential" && a.password);
      if (credential) {
        const ok = input.password
          ? await verifyPassword({ hash: credential.password!, password: input.password })
          : false;
        if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Mot de passe incorrect." });
      }

      const memberships = await prisma.membership.findMany({
        where: { userId: user.id, deletedAt: null },
        include: { role: true, organization: true },
      });
      const soleOrganizations: string[] = [];
      for (const m of memberships) {
        const others = await prisma.membership.count({
          where: { organizationId: m.organizationId, deletedAt: null, userId: { not: user.id } },
        });
        if (others === 0) {
          soleOrganizations.push(m.organizationId);
          continue;
        }
        if (m.role.systemKey === "owner") {
          const otherOwners = await prisma.membership.count({
            where: {
              organizationId: m.organizationId,
              deletedAt: null,
              userId: { not: user.id },
              role: { systemKey: "owner" },
            },
          });
          if (otherOwners === 0) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Vous êtes le seul propriétaire de « ${m.organization.name} ». Transmettez ce rôle à un autre membre avant de supprimer votre compte.`,
            });
          }
        }
      }

      const now = new Date();
      await prisma.$transaction([
        prisma.organization.updateMany({
          where: { id: { in: soleOrganizations } },
          data: { deletedAt: now },
        }),
        prisma.membership.updateMany({
          where: { userId: user.id, deletedAt: null },
          data: { deletedAt: now },
        }),
        prisma.teamMember.deleteMany({ where: { userId: user.id } }),
        prisma.invitation.updateMany({
          where: { email: user.email, status: "PENDING" },
          data: { status: "REVOKED" },
        }),
        prisma.session.deleteMany({ where: { userId: user.id } }),
        prisma.account.deleteMany({ where: { userId: user.id } }),
        prisma.twoFactor.deleteMany({ where: { userId: user.id } }),
        prisma.user.update({
          where: { id: user.id },
          data: {
            name: "Utilisateur supprimé",
            email: `supprime-${user.id}@invalid.quercy.app`,
            image: null,
            emailVerified: false,
            twoFactorEnabled: false,
            preferences: {},
            deletedAt: now,
          },
        }),
      ]);
      return { ok: true };
    }),
});
