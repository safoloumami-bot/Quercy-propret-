import { type FinancePreset, financeRange, parseDay, todayIn } from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { financeDashboard } from "../../finance/dashboard";
import { createTRPCRouter, orgProcedure } from "../init";
import { isCleaningManager } from "./sites";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const financeRouter = createTRPCRouter({
  /** Pilotage financier (responsables) : période prédéfinie ou dates, filtres optionnels. */
  dashboard: orgProcedure
    .input(
      z.object({
        preset: z.enum(["month", "last_month", "quarter", "12m", "year"]).default("12m"),
        from: day.optional(),
        to: day.optional(),
        companyId: z.string().min(1).nullable().default(null),
        siteId: z.string().min(1).nullable().default(null),
        activity: z.string().trim().min(1).max(80).nullable().default(null),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!isCleaningManager(ctx))
        throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
      const range =
        input.from && input.to
          ? { from: parseDay(input.from), to: parseDay(input.to) }
          : financeRange(input.preset as FinancePreset, parseDay(todayIn()));
      if (range.to < range.from)
        throw new TRPCError({ code: "BAD_REQUEST", message: "La fin précède le début." });
      const data = await financeDashboard(ctx.organizationId, {
        ...range,
        companyId: input.companyId,
        siteId: input.siteId,
        activity: input.activity,
      });
      return {
        ...data,
        from: range.from.toISOString().slice(0, 10),
        to: range.to.toISOString().slice(0, 10),
      };
    }),
});
