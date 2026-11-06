import { diffChanges, teamInputSchema } from "@quercy/core";
import { isUniqueViolation } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

type Ctx = Parameters<Parameters<typeof orgProcedure.query>[0]>[0]["ctx"];

/** Vérifie que toutes les personnes citées sont membres de l'espace. */
async function assertMembers(ctx: Ctx, userIds: string[]) {
  if (userIds.length === 0) return;
  const unique = [...new Set(userIds)];
  const count = await ctx.db.membership.count({ where: { userId: { in: unique } } });
  if (count !== unique.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Certaines personnes ne sont pas membres de l'espace.",
    });
  }
}

function conflict(error: unknown): never {
  if (isUniqueViolation(error))
    throw new TRPCError({ code: "CONFLICT", message: "Une équipe porte déjà ce nom." });
  throw error;
}

export const teamsRouter = createTRPCRouter({
  list: orgProcedure.query(async ({ ctx }) => {
    authorize(ctx, "members", "view");
    const teams = await ctx.db.team.findMany({
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { name: "asc" },
    });
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      leadUserId: t.leadUserId,
      members: t.members.map((m) => m.user),
    }));
  }),

  create: orgProcedure.input(teamInputSchema).mutation(async ({ ctx, input }) => {
    authorize(ctx, "members", "admin", "Seuls les administrateurs gèrent les équipes.");
    const memberIds = [
      ...new Set([...input.memberIds, ...(input.leadUserId ? [input.leadUserId] : [])]),
    ];
    await assertMembers(ctx, memberIds);
    const team = await ctx.db.team
      .create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          color: input.color ?? null,
          leadUserId: input.leadUserId ?? null,
          members: { createMany: { data: memberIds.map((userId) => ({ userId })) } },
        },
      })
      .catch(conflict);
    await recordAudit(ctx, {
      action: "team.create",
      entityType: "team",
      entityId: team.id,
      metadata: { name: team.name },
    });
    return { id: team.id };
  }),

  update: orgProcedure
    .input(teamInputSchema.extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "members", "admin", "Seuls les administrateurs gèrent les équipes.");
      const team = await ctx.db.team.findUnique({
        where: { id: input.id },
        include: { members: true },
      });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Équipe introuvable." });
      const memberIds = [
        ...new Set([...input.memberIds, ...(input.leadUserId ? [input.leadUserId] : [])]),
      ].sort();
      await assertMembers(ctx, memberIds);
      const changes = diffChanges(
        {
          name: team.name,
          color: team.color,
          leadUserId: team.leadUserId,
          members: team.members.map((m) => m.userId).sort(),
        },
        {
          name: input.name,
          color: input.color ?? null,
          leadUserId: input.leadUserId ?? null,
          members: memberIds,
        },
      );
      await ctx.db.team
        .update({
          where: { id: team.id },
          data: {
            name: input.name,
            color: input.color ?? null,
            leadUserId: input.leadUserId ?? null,
            members: {
              deleteMany: {},
              createMany: { data: memberIds.map((userId) => ({ userId })) },
            },
          },
        })
        .catch(conflict);
      await recordAudit(ctx, {
        action: "team.update",
        entityType: "team",
        entityId: team.id,
        changes,
      });
      return { ok: true };
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "members", "admin", "Seuls les administrateurs gèrent les équipes.");
      const team = await ctx.db.team.findUnique({ where: { id: input.id } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Équipe introuvable." });
      await ctx.db.team.update({
        where: { id: team.id },
        data: {
          deletedAt: new Date(),
          name: `${team.name} (supprimée ${team.id.slice(-6)})`,
          members: { deleteMany: {} },
        },
      });
      await recordAudit(ctx, {
        action: "team.delete",
        entityType: "team",
        entityId: team.id,
        metadata: { name: team.name },
      });
      return { ok: true };
    }),
});
