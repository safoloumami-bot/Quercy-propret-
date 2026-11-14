import {
  ENTITIES,
  type EntityKey,
  type FieldDef,
  type ReportDefinition,
  type ReportResult,
  aggregateReport,
  buildWhere,
  recordTitle,
  validateReport,
} from "@quercy/core";
import { type TenantClient, prisma } from "@quercy/db";

import { entityDelegate } from "./access";

/** Au-delà, le rapport demande d'affiner les filtres (agrégation en mémoire). */
export const REPORT_ROW_LIMIT = 50_000;

export class ReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportError";
  }
}

export interface RunReportInput {
  definition: ReportDefinition;
  fields: FieldDef[];
  scopeWhere: Record<string, unknown>;
  range: { from: Date; to: Date } | null;
  timeZone: string;
}

export interface RunReportOutput extends ReportResult {
  measureField: FieldDef | null;
  groupField: FieldDef | null;
}

/**
 * Exécute un rapport : fiches du périmètre (droits, filtre, période), lues avec les seules
 * colonnes utiles, puis agrégées (regroupement, mesure).
 */
export async function runReport(db: TenantClient, input: RunReportInput): Promise<RunReportOutput> {
  const def = input.definition;
  const problem = validateReport(def);
  if (problem) throw new ReportError(problem);
  const entity: EntityKey = def.entity;
  const groupField = def.groupBy ? (input.fields.find((f) => f.key === def.groupBy) ?? null) : null;
  const measureField = def.measure.field
    ? (input.fields.find((f) => f.key === def.measure.field) ?? null)
    : null;
  const columns = new Set<string>(["id"]);
  if (groupField) columns.add(groupField.column ?? groupField.key);
  if (measureField) columns.add(measureField.column ?? measureField.key);

  const where = {
    AND: [
      input.scopeWhere,
      buildWhere(input.fields, def.filter),
      input.range && def.dateField
        ? { [def.dateField]: { gte: input.range.from, lt: input.range.to } }
        : {},
    ],
  };
  const rows = (await entityDelegate(db, entity).findMany({
    where,
    select: Object.fromEntries([...columns].map((c) => [c, true])),
    take: REPORT_ROW_LIMIT + 1,
  })) as unknown as Record<string, unknown>[];
  if (rows.length > REPORT_ROW_LIMIT)
    throw new ReportError(
      `Plus de ${REPORT_ROW_LIMIT.toLocaleString("fr-FR")} fiches : réduisez la période ou ajoutez un filtre.`,
    );

  // Libellés des personnes et fiches liées.
  const labels = new Map<string, string>();
  if (groupField && (groupField.type === "user" || groupField.type === "relation")) {
    const ids = [
      ...new Set(
        rows.map((r) => r[groupField.key]).filter((v): v is string => typeof v === "string"),
      ),
    ];
    if (ids.length && groupField.type === "user") {
      for (const u of await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      }))
        labels.set(u.id, u.name);
    } else if (ids.length && groupField.relation) {
      const target = groupField.relation;
      const related = (await entityDelegate(db, target).findMany({
        where: { id: { in: ids } },
      })) as unknown as Record<string, unknown>[];
      for (const r of related) labels.set(String(r.id), recordTitle(target, r));
    }
  }

  const result = aggregateReport(rows, def, {
    labels,
    timeZone: input.timeZone,
    range: input.range ?? undefined,
  });
  return { ...result, measureField, groupField };
}

/** Nom lisible de la mesure (« Somme de Total HT », « Nombre de factures »). */
export function measureLabel(def: ReportDefinition): string {
  const entity = ENTITIES[def.entity];
  if (def.measure.op === "count") return `Nombre de ${entity.labelPlural.toLowerCase()}`;
  const field = entity.fields.find((f) => f.key === def.measure.field);
  return `${def.measure.op === "sum" ? "Somme" : "Moyenne"} — ${field?.label ?? def.measure.field}`;
}
