import type { Prisma } from "@quercy/db";
import { prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AiTurn } from "@/lib/ai-types";

import { aiConfigured } from "../../ai/client";
import { executeAction } from "../../ai/tools";
import { aiCredits } from "../../ai/usage";
import { createTRPCRouter, orgProcedure } from "../init";

const idInput = z.object({ id: z.string().min(1).max(40) });

/** Assistant : état, crédits, historique des conversations et confirmation des actions. */
export const aiRouter = createTRPCRouter({
  status: orgProcedure.query(async ({ ctx }) => ({
    configured: aiConfigured(),
    credits: await aiCredits(ctx.workspace),
  })),

  conversations: orgProcedure.query(({ ctx }) =>
    prisma.aiConversation.findMany({
      where: { organizationId: ctx.organizationId, userId: ctx.user.id },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ),

  conversation: orgProcedure.input(idInput).query(async ({ ctx, input }) => {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId, userId: ctx.user.id },
      include: {
        actions: { select: { id: true, status: true, result: true, error: true } },
      },
    });
    if (!conversation)
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversation introuvable." });
    return {
      id: conversation.id,
      title: conversation.title,
      turns: conversation.display as unknown as AiTurn[],
      actions: Object.fromEntries(
        conversation.actions.map((a) => [
          a.id,
          {
            status: a.status as ActionStatus,
            result: a.result as ActionResult | null,
            error: a.error,
          },
        ]),
      ),
    };
  }),

  deleteConversation: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const { count } = await prisma.aiConversation.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId, userId: ctx.user.id },
    });
    if (count === 0)
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversation introuvable." });
    return { ok: true };
  }),

  action: orgProcedure.input(idInput).query(async ({ ctx, input }) => {
    const action = await findAction(ctx.organizationId, ctx.user.id, input.id);
    return {
      id: action.id,
      status: action.status as ActionStatus,
      result: action.result as ActionResult | null,
      error: action.error,
    };
  }),

  /**
   * Exécute une action proposée, avec les droits actuels de la personne (mêmes contrôles
   * que depuis l'interface). Une action ne peut être confirmée qu'une fois.
   */
  confirmAction: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const action = await findAction(ctx.organizationId, ctx.user.id, input.id);
    const claimed = await prisma.aiAction.updateMany({
      where: { id: action.id, status: "pending" },
      data: { status: "confirmed", decidedAt: new Date() },
    });
    if (claimed.count === 0)
      throw new TRPCError({ code: "CONFLICT", message: "Cette action a déjà été traitée." });
    // Import différé : le routeur racine importe ce routeur.
    const { createCaller } = await import("../root");
    const caller = createCaller({ headers: ctx.headers, session: ctx.session });
    try {
      const result = await executeAction(caller, action.tool, action.input);
      await prisma.aiAction.update({
        where: { id: action.id },
        data: { result: result as Prisma.InputJsonValue },
      });
      return { status: "confirmed" as const, result };
    } catch (error) {
      const message =
        error instanceof TRPCError || error instanceof z.ZodError
          ? error instanceof z.ZodError
            ? "Les paramètres de l'action ne sont plus valides."
            : error.message
          : "L'action a échoué.";
      if (!(error instanceof TRPCError) && !(error instanceof z.ZodError)) console.error(error);
      await prisma.aiAction.update({
        where: { id: action.id },
        data: { status: "failed", error: message },
      });
      return { status: "failed" as const, error: message };
    }
  }),

  rejectAction: orgProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const action = await findAction(ctx.organizationId, ctx.user.id, input.id);
    const { count } = await prisma.aiAction.updateMany({
      where: { id: action.id, status: "pending" },
      data: { status: "rejected", decidedAt: new Date() },
    });
    if (count === 0)
      throw new TRPCError({ code: "CONFLICT", message: "Cette action a déjà été traitée." });
    return { status: "rejected" as const };
  }),
});

export type ActionStatus = "pending" | "confirmed" | "rejected" | "failed";
export interface ActionResult {
  message: string;
  url?: string;
}

async function findAction(organizationId: string, userId: string, id: string) {
  const action = await prisma.aiAction.findFirst({ where: { id, organizationId, userId } });
  if (!action) throw new TRPCError({ code: "NOT_FOUND", message: "Action introuvable." });
  return action;
}
