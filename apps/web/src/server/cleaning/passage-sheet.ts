import "server-only";

import { INTERVENTION_STATUSES, dayKey, parseDay } from "@quercy/core";
import { renderReportPdf } from "@quercy/documents";
import { TRPCError } from "@trpc/server";

import type { RecordsCtx } from "../records/context";
import { isCleaningManager } from "../trpc/routers/sites";
import { parsePreferences } from "../workspace";

const STATUS = Object.fromEntries(INTERVENTION_STATUSES.map((s) => [s.value, s.label]));
const time = (d: Date | null) =>
  d
    ? d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      })
    : "";
const frDay = (d: Date) =>
  d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Feuille de passage nominative d'un site sur une période : date, heure, statut, intervenant
 * réel, conformité du contrôle, observation.
 */
export async function passageSheet(
  ctx: RecordsCtx,
  input: { siteId: string; from: string; to: string },
) {
  if (!isCleaningManager(ctx))
    throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
  const site = await ctx.db.site.findFirst({
    where: { id: input.siteId },
    select: { id: true, name: true, code: true, address: true, city: true },
  });
  if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site introuvable." });
  const visits = await ctx.db.intervention.findMany({
    where: {
      siteId: site.id,
      deletedAt: null,
      status: { not: "cancelled" },
      date: { gte: parseDay(input.from), lte: parseDay(input.to) },
    },
    include: {
      owner: { select: { name: true } },
      replacementAgent: { select: { name: true } },
      actualAgent: { select: { name: true } },
      tasks: { select: { done: true, critical: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return {
    site,
    rows: visits.map((v) => {
      const done = v.tasks.filter((t) => t.done).length;
      const criticalMissed = v.tasks.filter((t) => t.critical && !t.done).length;
      return {
        date: dayKey(v.date),
        planned: v.startTime ?? "",
        arrival: time(v.checkInAt),
        departure: time(v.checkOutAt),
        status: STATUS[v.status] ?? v.status,
        agent: (v.actualAgent ?? v.replacementAgent ?? v.owner)?.name ?? "",
        conformity: v.tasks.length
          ? `${done}/${v.tasks.length} points${criticalMissed ? ` · ${criticalMissed} critique(s) non fait(s)` : ""}`
          : "",
        observation: v.notes ?? "",
        report: v.reportNumber ?? "",
      };
    }),
  };
}

export async function passageSheetPdf(
  ctx: RecordsCtx,
  sheet: Awaited<ReturnType<typeof passageSheet>>,
  period: { from: string; to: string },
): Promise<Uint8Array> {
  const org = await ctx.db.organization.findFirst({
    where: { id: ctx.organizationId },
    select: { name: true, preferences: true },
  });
  const name = sheet.site.code ? `${sheet.site.code} · ${sheet.site.name}` : sheet.site.name;
  const long = (day: string) =>
    parseDay(day).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  const done = sheet.rows.filter((r) => r.status === STATUS.done).length;
  return renderReportPdf({
    title: `Feuille de passage — ${name}`,
    subtitle: [
      `Du ${long(period.from)} au ${long(period.to)}`,
      [sheet.site.address, sheet.site.city].filter(Boolean).join(", "),
    ]
      .filter(Boolean)
      .join(" · "),
    issuer: org?.name ?? "",
    accent: org ? parsePreferences(org.preferences).accentColor : null,
    generatedAt: new Date(),
    summary: [
      { label: "Passages", value: String(sheet.rows.length) },
      { label: "Réalisés", value: String(done) },
    ],
    sections: [
      {
        title: "Passages",
        columns: [
          { label: "Date", width: 1.6 },
          { label: "Prévu", width: 0.8 },
          { label: "Arrivée", width: 0.8 },
          { label: "Départ", width: 0.8 },
          { label: "Statut", width: 1.3 },
          { label: "Intervenant", width: 1.7 },
          { label: "Conformité", width: 2 },
          { label: "Observation", width: 3.2 },
          { label: "Bon", width: 1.2 },
        ],
        rows: sheet.rows.map((r) => ({
          cells: [
            frDay(parseDay(r.date)),
            r.planned,
            r.arrival,
            r.departure,
            r.status,
            r.agent,
            r.conformity,
            r.observation,
            r.report,
          ],
        })),
        empty: "Aucun passage sur la période.",
      },
    ],
  });
}
