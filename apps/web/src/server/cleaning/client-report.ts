import "server-only";

import {
  INTERVENTION_STATUSES,
  anomalyClientEligible,
  anomalyTypeLabel,
  ANOMALY_STATUSES,
  dayKey,
  parseDay,
  todayIn,
} from "@quercy/core";
import { type ReportData, renderReportPdf } from "@quercy/documents";
import { TRPCError } from "@trpc/server";

import type { RecordsCtx } from "../records/context";
import { readObject } from "../storage";
import { parsePreferences } from "../workspace";
import { clientSiteIds, isCleaningManager } from "../trpc/routers/sites";

const STATUS = Object.fromEntries(INTERVENTION_STATUSES.map((s) => [s.value, s.label]));
const ANOMALY_STATUS = Object.fromEntries(ANOMALY_STATUSES.map((s) => [s.value, s.label]));
const DUE_STATUSES = ["done", "missed", "access_impossible", "to_rework", "in_progress"];

const frDay = (d: Date) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
const frLong = (day: string) =>
  parseDay(day).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export interface ClientReportPeriod {
  companyId: string;
  /** Jours inclus, « AAAA-MM-JJ ». */
  from: string;
  to: string;
}

/**
 * Rapport client (syndic) sur une période : un seul rapport pour toutes ses résidences et
 * cages. Seules les anomalies validées et marquées « visible par le client » y figurent.
 */
export async function clientReport(ctx: RecordsCtx, period: ClientReportPeriod) {
  if (!isCleaningManager(ctx))
    throw new TRPCError({ code: "FORBIDDEN", message: "Rapport réservé aux responsables." });
  if (period.from > period.to)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Période invalide." });
  const company = await ctx.db.company.findFirst({
    where: { id: period.companyId },
    select: { id: true, name: true },
  });
  if (!company) throw new TRPCError({ code: "NOT_FOUND", message: "Client introuvable." });
  const ids = [...(await clientSiteIds(ctx, company.id))];
  const from = parseDay(period.from);
  const to = parseDay(period.to);
  const toEnd = new Date(to.getTime() + 86_400_000);
  const [sites, interventions, anomalies] = await Promise.all([
    ctx.db.site.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, name: true, parentId: true },
    }),
    ctx.db.intervention.findMany({
      where: {
        siteId: { in: ids },
        deletedAt: null,
        date: { gte: from, lte: to },
        status: { not: "cancelled" },
      },
      include: {
        owner: { select: { name: true } },
        replacementAgent: { select: { name: true } },
        actualAgent: { select: { name: true } },
        proofs: { select: { type: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    ctx.db.anomaly.findMany({
      where: {
        siteId: { in: ids },
        archivedAt: null,
        reportedAt: { gte: from, lt: toEnd },
      },
      include: { photo: { select: { storageKey: true, mimeType: true } } },
      orderBy: { reportedAt: "asc" },
    }),
  ]);
  const siteName = new Map(
    sites.map((s) => [s.id, s.code ? `${s.code} · ${s.name}` : s.name] as const),
  );
  const shown = anomalies.filter((a) => a.visibleToClient && anomalyClientEligible(a.status));
  const withheld = anomalies.filter(
    (a) => anomalyClientEligible(a.status) && !a.visibleToClient,
  ).length;
  const anomaliesOf = new Map<string, string[]>();
  for (const a of shown)
    if (a.interventionId)
      anomaliesOf.set(a.interventionId, [
        ...(anomaliesOf.get(a.interventionId) ?? []),
        anomalyTypeLabel(a.type),
      ]);

  // Passages dus : jusqu'à aujourd'hui (les passages futurs de la période ne comptent pas).
  const today = parseDay(todayIn());
  const due = interventions.filter((i) => i.date <= today || DUE_STATUSES.includes(i.status));
  const done = interventions.filter((i) => i.status === "done").length;
  const rate = due.length ? Math.round((done / due.length) * 100) : null;
  const visitedSites = new Set(interventions.map((i) => i.siteId));

  // Ordre du rapport : date, puis résidence (code), puis heure.
  const passages = interventions.map((i) => {
    const photos = i.proofs.filter((p) => p.type.startsWith("photo")).length;
    const proof = [
      photos ? `${photos} photo${photos > 1 ? "s" : ""}` : null,
      i.signatureUrl ? "signé" : null,
      i.reportNumber,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: i.id,
      site: siteName.get(i.siteId!) ?? "",
      date: dayKey(i.date),
      time: i.startTime,
      service: i.title,
      agent: (i.actualAgent ?? i.replacementAgent ?? i.owner)?.name ?? "",
      status: STATUS[i.status] ?? i.status,
      proof,
      observation: i.notes ?? "",
      anomalies: anomaliesOf.get(i.id) ?? [],
    };
  });
  passages.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.site.localeCompare(b.site, "fr", { numeric: true }) ||
      (a.time ?? "").localeCompare(b.time ?? ""),
  );

  return {
    company,
    period,
    totals: {
      planned: interventions.length,
      due: due.length,
      done,
      completionRate: rate,
      anomalies: shown.length,
      sites: visitedSites.size,
      sitesInContract: ids.length,
    },
    /** Anomalies validées mais pas cochées « visible par le client » : absentes du rapport. */
    withheldAnomalies: withheld,
    passages,
    anomalies: shown.map((a) => ({
      id: a.id,
      date: dayKey(a.reportedAt),
      site: a.siteId ? (siteName.get(a.siteId) ?? "") : "",
      type: anomalyTypeLabel(a.type),
      location: a.location ?? "",
      comment: a.comment ?? "",
      status: ANOMALY_STATUS[a.status] ?? a.status,
      resolution: a.resolution ?? "",
      photo: a.photo,
    })),
  };
}

export type ClientReport = Awaited<ReturnType<typeof clientReport>>;

/** PDF du rapport client, au nom de l'entreprise (marque blanche). */
export async function clientReportPdf(ctx: RecordsCtx, report: ClientReport): Promise<Uint8Array> {
  const org = await ctx.db.organization.findFirst({
    where: { id: ctx.organizationId },
    select: { name: true, preferences: true },
  });
  const photos = await Promise.all(
    report.anomalies.map((a) =>
      a.photo && /^image\/(jpeg|png)$/.test(a.photo.mimeType)
        ? readObject(a.photo.storageKey).catch(() => null)
        : null,
    ),
  );
  const t = report.totals;
  const data: ReportData = {
    title: `Rapport d'intervention — ${report.company.name}`,
    subtitle: `Du ${frLong(report.period.from)} au ${frLong(report.period.to)}`,
    issuer: org?.name ?? "",
    accent: org ? parsePreferences(org.preferences).accentColor : null,
    generatedAt: new Date(),
    summary: [
      { label: "Passages prévus", value: String(t.planned) },
      { label: "Passages réalisés", value: String(t.done) },
      {
        label: "Taux de réalisation",
        value: t.completionRate === null ? "—" : `${t.completionRate} %`,
        hint: "sur les passages dus à ce jour",
      },
      { label: "Anomalies", value: String(t.anomalies) },
      { label: "Sites concernés", value: String(t.sites), hint: `sur ${t.sitesInContract}` },
    ],
    sections: [
      {
        title: "Détail des passages",
        columns: [
          { label: "Résidence", width: 3 },
          { label: "Date", width: 1.3 },
          { label: "Prestation", width: 2.6 },
          { label: "Intervenant", width: 1.8 },
          { label: "Statut", width: 1.4 },
          { label: "Preuve", width: 1.8 },
          { label: "Observation", width: 3 },
          { label: "Anomalie", width: 1.8 },
        ],
        rows: report.passages.map((p) => ({
          cells: [
            p.site,
            `${frDay(parseDay(p.date))}${p.time ? ` ${p.time}` : ""}`,
            p.service,
            p.agent,
            p.status,
            p.proof,
            p.observation,
            p.anomalies.join(", "),
          ],
        })),
        empty: "Aucun passage sur la période.",
      },
      {
        title: "Anomalies",
        intro: "Anomalies constatées sur vos sites et validées par notre responsable.",
        columns: [
          { label: "Date", width: 1.2 },
          { label: "Résidence", width: 2.6 },
          { label: "Type", width: 1.8 },
          { label: "Emplacement", width: 1.8 },
          { label: "Commentaire", width: 3.4 },
          { label: "Statut", width: 1.4 },
          { label: "Photo", width: 1.4 },
        ],
        rows: report.anomalies.map((a, i) => ({
          cells: [
            frDay(parseDay(a.date)),
            a.site,
            a.type,
            a.location,
            [a.comment, a.resolution ? `Traitement : ${a.resolution}` : ""]
              .filter(Boolean)
              .join("\n"),
            a.status,
            "",
          ],
          image: photos[i] ?? null,
        })),
        empty: "Aucune anomalie sur la période.",
      },
    ],
  };
  return renderReportPdf(data);
}
