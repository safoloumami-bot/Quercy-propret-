import { type ReportDefinition, type ResolvedPeriod, ENTITIES } from "@quercy/core";

import { exportMeasure, exportMeasureHeader, formatMeasure, toCsv } from "./format";
import { renderReportPdf } from "./pdf";
import { type RunReportOutput, measureLabel } from "./run";

/** Lignes d'export d'un rapport exécuté (groupe, valeur, nombre de fiches). */
export function reportTable(def: ReportDefinition, result: RunReportOutput) {
  const groupLabel = result.groupField?.label ?? "Ensemble";
  const measure = measureLabel(def);
  const rows = result.points.map((p) => ({
    label: p.label,
    value: p.value,
    count: p.count,
  }));
  return { groupLabel, measure, rows };
}

export function reportCsv(def: ReportDefinition, result: RunReportOutput): string {
  const t = reportTable(def, result);
  return toCsv(
    [t.groupLabel, exportMeasureHeader(result.measureField, t.measure), "Nombre de fiches"],
    [
      ...t.rows.map((r) => [r.label, exportMeasure(result.measureField, r.value), r.count]),
      ["Total", exportMeasure(result.measureField, result.total), result.count],
    ],
  );
}

export function reportPdf(
  name: string,
  def: ReportDefinition,
  result: RunReportOutput,
  period: ResolvedPeriod | null,
  organization: string,
) {
  const t = reportTable(def, result);
  const max = Math.max(0, ...t.rows.map((r) => r.value));
  return renderReportPdf({
    title: name,
    subtitle: `${ENTITIES[def.entity].labelPlural} · ${t.measure}${period ? ` · ${period.label}` : " · toutes périodes"}`,
    organization,
    columns: [t.groupLabel, "Valeur", "Fiches"],
    rows: t.rows.map((r) => ({
      label: r.label,
      value: formatMeasure(result.measureField, r.value),
      ratio: max > 0 ? r.value / max : 0,
      count: r.count,
    })),
    total: formatMeasure(result.measureField, result.total),
  });
}
