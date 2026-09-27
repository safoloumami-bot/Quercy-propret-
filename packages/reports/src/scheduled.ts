import {
  type PeriodPreset,
  PERIOD_PRESETS,
  type ReportSchedule,
  reportDefinitionSchema,
  resolvePeriod,
  scheduleDue,
} from "@quercy/core";
import { prisma } from "@quercy/db";
import { sendMail } from "@quercy/mailer";

import { AccessError, accessFor } from "./access";
import { reportCsv, reportPdf } from "./export";
import { formatMeasure } from "./format";
import { ReportError, measureLabel, runReport } from "./run";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fileSlug(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "rapport"
  );
}

export interface ScheduledResult {
  sent: number;
  skipped: { reportId: string; reason: string }[];
}

/**
 * Envois programmés (worker) : chaque rapport hebdomadaire (lundi) ou mensuel (1er du mois)
 * est exécuté avec les droits de son auteur, puis envoyé en PDF et CSV à ses destinataires.
 */
export async function dispatchScheduledReports(
  appUrl: string,
  now: Date = new Date(),
): Promise<ScheduledResult> {
  const result: ScheduledResult = { sent: 0, skipped: [] };
  const reports = await prisma.report.findMany({
    where: { schedule: { in: ["weekly", "monthly"] }, deletedAt: null },
    include: {
      owner: { select: { email: true, name: true } },
      organization: { select: { name: true, preferences: true } },
    },
  });
  for (const report of reports) {
    const timeZone =
      ((report.organization.preferences ?? {}) as { timezone?: string }).timezone ?? "Europe/Paris";
    if (!scheduleDue(report.schedule as ReportSchedule, report.lastSentAt, now, timeZone)) continue;
    const parsed = reportDefinitionSchema.safeParse(report.definition);
    if (!parsed.success) {
      result.skipped.push({ reportId: report.id, reason: "définition invalide" });
      continue;
    }
    try {
      const def = parsed.data;
      const access = await accessFor(report.organizationId, report.ownerId, def.entity, "view");
      const preset = (PERIOD_PRESETS as readonly string[]).includes(report.period)
        ? (report.period as PeriodPreset)
        : "30d";
      // Un envoi porte sur la période écoulée (la semaine ou le mois précédent l'envoi).
      const period = resolvePeriod(
        { preset: preset === "custom" ? "30d" : preset },
        new Date(now.getTime() - 86_400_000),
        timeZone,
      );
      const run = await runReport(access.db, {
        definition: def,
        fields: access.fields,
        scopeWhere: access.scopeWhere,
        range: def.dateField ? { from: period.from, to: period.to } : null,
        timeZone,
      });
      const pdf = await reportPdf(
        report.name,
        def,
        run,
        def.dateField ? period : null,
        report.organization.name,
      );
      const csv = reportCsv(def, run);
      const url = `${appUrl.replace(/\/$/, "")}/rapports/${report.id}`;
      const recipients = report.recipients.length ? report.recipients : [report.owner.email];
      const top = run.points
        .slice(0, 5)
        .map(
          (p) =>
            `<li>${esc(p.label)} : <strong>${esc(formatMeasure(run.measureField, p.value))}</strong></li>`,
        )
        .join("");
      for (const to of recipients) {
        await sendMail({
          to,
          subject: `Rapport « ${report.name} » — ${period.label.toLowerCase()}`,
          html: `<!doctype html><html lang="fr"><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<p style="color:#6b7280;font-size:13px">${esc(report.organization.name)}</p>
<h1 style="font-size:18px">${esc(report.name)}</h1>
<p>${esc(measureLabel(def))} · ${esc(period.label)} : <strong>${esc(formatMeasure(run.measureField, run.total))}</strong></p>
${top ? `<ul>${top}</ul>` : ""}
<p><a href="${esc(url)}">Ouvrir le rapport dans Quercy</a></p>
<p style="color:#6b7280;font-size:12px">Rapport complet en PDF et CSV en pièces jointes. Envoi ${report.schedule === "weekly" ? "hebdomadaire" : "mensuel"} programmé par ${esc(report.owner.name)}.</p>
</body></html>`,
          text: `${report.name}\n${measureLabel(def)} · ${period.label} : ${formatMeasure(run.measureField, run.total)}\n\n${url}`,
          attachments: [
            {
              filename: `${fileSlug(report.name)}.pdf`,
              content: pdf,
              contentType: "application/pdf",
            },
            {
              filename: `${fileSlug(report.name)}.csv`,
              content: new TextEncoder().encode(csv),
              contentType: "text/csv",
            },
          ],
        });
      }
      await prisma.report.update({ where: { id: report.id }, data: { lastSentAt: now } });
      result.sent += 1;
    } catch (error) {
      if (error instanceof AccessError || error instanceof ReportError)
        result.skipped.push({ reportId: report.id, reason: error.message });
      else throw error;
    }
  }
  return result;
}
