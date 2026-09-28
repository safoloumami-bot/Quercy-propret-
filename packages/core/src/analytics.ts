import { z } from "zod";

import type { ModuleKey } from "./modules";
import type { SystemRoleKey } from "./permissions";
import { ENTITIES } from "./records/entities";
import { ENTITY_KEYS, type EntityKey, type FieldDef } from "./records/fields";
import { EMPTY_FILTER, type FilterGroup, filterGroupSchema } from "./records/filters";

// ─────────────────────────── Périodes ───────────────────────────

export const PERIOD_PRESETS = [
  "today",
  "7d",
  "30d",
  "month",
  "quarter",
  "year",
  "12m",
  "custom",
] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Aujourd'hui",
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  month: "Ce mois-ci",
  quarter: "Ce trimestre",
  year: "Cette année",
  "12m": "12 derniers mois",
  custom: "Personnalisée",
};

export const periodSchema = z
  .object({
    preset: z.enum(PERIOD_PRESETS),
    /** Période personnalisée : dates locales AAAA-MM-JJ (incluses). */
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine((p) => p.preset !== "custom" || (p.from && p.to && p.from <= p.to), {
    error: "Période personnalisée incomplète ou inversée.",
  });
export type PeriodInput = z.infer<typeof periodSchema>;

export interface ResolvedPeriod {
  /** Début inclus. */
  from: Date;
  /** Fin exclue. */
  to: Date;
  previous: { from: Date; to: Date };
  label: string;
}

/** Décalage (ms) entre l'heure locale d'un fuseau et UTC à un instant donné. */
export function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return local - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instant UTC du minuit local (fuseau donné) d'une date calendaire. */
export function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(year, month, day));
  const first = new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
  // Second passage : corrige un éventuel changement d'heure entre les deux instants.
  return new Date(guess.getTime() - tzOffsetMs(first, timeZone));
}

/** Date calendaire (année, mois 0-11, jour) d'un instant dans un fuseau. */
export function zonedParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const local = new Date(date.getTime() + tzOffsetMs(date, timeZone));
  return { year: local.getUTCFullYear(), month: local.getUTCMonth(), day: local.getUTCDate() };
}

/**
 * Bornes d'une période (et de la période précédente de même durée) dans le fuseau de l'espace.
 * Les périodes calendaires (mois, trimestre, année) se comparent à la précédente équivalente.
 */
export function resolvePeriod(
  input: PeriodInput,
  now: Date = new Date(),
  timeZone = "Europe/Paris",
): ResolvedPeriod {
  const { year, month, day } = zonedParts(now, timeZone);
  const mid = (y: number, m: number, d: number) => zonedMidnight(y, m, d, timeZone);
  const tomorrow = mid(year, month, day + 1);
  switch (input.preset) {
    case "today":
      return {
        from: mid(year, month, day),
        to: tomorrow,
        previous: { from: mid(year, month, day - 1), to: mid(year, month, day) },
        label: PERIOD_LABELS.today,
      };
    case "7d":
    case "30d": {
      const n = input.preset === "7d" ? 7 : 30;
      return {
        from: mid(year, month, day - n + 1),
        to: tomorrow,
        previous: { from: mid(year, month, day - 2 * n + 1), to: mid(year, month, day - n + 1) },
        label: PERIOD_LABELS[input.preset],
      };
    }
    case "month":
      return {
        from: mid(year, month, 1),
        to: mid(year, month + 1, 1),
        previous: { from: mid(year, month - 1, 1), to: mid(year, month, 1) },
        label: PERIOD_LABELS.month,
      };
    case "quarter": {
      const q = Math.floor(month / 3) * 3;
      return {
        from: mid(year, q, 1),
        to: mid(year, q + 3, 1),
        previous: { from: mid(year, q - 3, 1), to: mid(year, q, 1) },
        label: PERIOD_LABELS.quarter,
      };
    }
    case "year":
      return {
        from: mid(year, 0, 1),
        to: mid(year + 1, 0, 1),
        previous: { from: mid(year - 1, 0, 1), to: mid(year, 0, 1) },
        label: PERIOD_LABELS.year,
      };
    case "12m":
      return {
        from: mid(year, month - 11, 1),
        to: mid(year, month + 1, 1),
        previous: { from: mid(year, month - 23, 1), to: mid(year, month - 11, 1) },
        label: PERIOD_LABELS["12m"],
      };
    case "custom": {
      const [fy, fm, fd] = input.from!.split("-").map(Number) as [number, number, number];
      const [ty, tm, td] = input.to!.split("-").map(Number) as [number, number, number];
      const from = mid(fy, fm - 1, fd);
      const to = mid(ty, tm - 1, td + 1);
      const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
      return {
        from,
        to,
        previous: { from: mid(fy, fm - 1, fd - days), to: from },
        label: `Du ${fd}/${fm}/${fy} au ${td}/${tm}/${ty}`,
      };
    }
  }
}

/** Évolution en % par rapport à la période précédente (null si non calculable). */
export function changeRatio(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

// ─────────────────────────── Rapports ───────────────────────────

export const MEASURE_OPS = ["count", "sum", "avg"] as const;
export const DATE_BUCKETS = ["day", "week", "month", "quarter", "year"] as const;
export type DateBucket = (typeof DATE_BUCKETS)[number];
export const CHART_TYPES = ["bar", "line", "area", "pie", "table", "number"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const CHART_LABELS: Record<ChartType, string> = {
  bar: "Barres",
  line: "Courbe",
  area: "Aire",
  pie: "Secteurs",
  table: "Tableau",
  number: "Chiffre clé",
};
export const BUCKET_LABELS: Record<DateBucket, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  quarter: "Trimestre",
  year: "Année",
};

export const reportDefinitionSchema = z.object({
  entity: z.enum(ENTITY_KEYS),
  measure: z.object({
    op: z.enum(MEASURE_OPS),
    field: z.string().max(80).nullish(),
  }),
  groupBy: z.string().max(80).nullish(),
  dateBucket: z.enum(DATE_BUCKETS).nullish(),
  /** Champ date sur lequel s'applique la période (null : toutes les fiches). */
  dateField: z.string().max(80).nullish(),
  filter: filterGroupSchema.default(EMPTY_FILTER),
  chart: z.enum(CHART_TYPES),
  limit: z.number().int().min(1).max(50).default(12),
  sort: z.enum(["label", "value_desc", "value_asc"]).default("value_desc"),
});
export type ReportDefinition = z.infer<typeof reportDefinitionSchema>;

const GROUPABLE_TYPES = new Set([
  "select",
  "user",
  "relation",
  "boolean",
  "date",
  "datetime",
  "text",
]);
const MEASURABLE_TYPES = new Set(["number", "currency", "percent", "duration"]);

/** Champs proposés dans le constructeur (regroupement, mesure, période). */
export function reportFields(entity: EntityKey) {
  const fields = ENTITIES[entity].fields;
  return {
    groupable: fields.filter((f) => GROUPABLE_TYPES.has(f.type) && f.filterable !== false),
    measurable: fields.filter((f) => MEASURABLE_TYPES.has(f.type)),
    dates: fields.filter((f) => f.type === "date" || f.type === "datetime"),
  };
}

/** Vérifie une définition contre le registre ; renvoie un message d'erreur ou null. */
export function validateReport(def: ReportDefinition): string | null {
  const { groupable, measurable, dates } = reportFields(def.entity);
  if (def.measure.op !== "count" && !measurable.some((f) => f.key === def.measure.field))
    return "Choisissez un champ numérique à additionner ou à moyenner.";
  if (def.groupBy && !groupable.some((f) => f.key === def.groupBy))
    return "Ce champ ne permet pas le regroupement.";
  const groupField = groupable.find((f) => f.key === def.groupBy);
  const isDate = groupField && (groupField.type === "date" || groupField.type === "datetime");
  if (isDate && !def.dateBucket)
    return "Choisissez l'intervalle (jour, mois…) du regroupement par date.";
  if (def.dateField && !dates.some((f) => f.key === def.dateField))
    return "Le champ de période doit être une date.";
  if (def.chart !== "number" && def.chart !== "table" && !def.groupBy)
    return "Un graphique a besoin d'un regroupement.";
  return null;
}

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** Semaine ISO (année, numéro) d'une date calendaire. */
function isoWeek(y: number, m: number, d: number): { year: number; week: number } {
  const date = new Date(Date.UTC(y, m, d));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return { year: date.getUTCFullYear(), week };
}

/** Clé triable et libellé d'une date pour un intervalle donné, dans le fuseau de l'espace. */
export function bucketOf(
  date: Date,
  bucket: DateBucket,
  timeZone = "Europe/Paris",
): { key: string; label: string } {
  const { year, month, day } = zonedParts(date, timeZone);
  const mm = String(month + 1).padStart(2, "0");
  switch (bucket) {
    case "day":
      return {
        key: `${year}-${mm}-${String(day).padStart(2, "0")}`,
        label: `${day} ${MONTHS[month]} ${year}`,
      };
    case "week": {
      const w = isoWeek(year, month, day);
      return {
        key: `${w.year}-S${String(w.week).padStart(2, "0")}`,
        label: `S${w.week} ${w.year}`,
      };
    }
    case "month":
      return { key: `${year}-${mm}`, label: `${MONTHS[month]} ${year}` };
    case "quarter": {
      const q = Math.floor(month / 3) + 1;
      return { key: `${year}-T${q}`, label: `T${q} ${year}` };
    }
    case "year":
      return { key: String(year), label: String(year) };
  }
}

/** Intervalles successifs couvrant une période (pour afficher aussi les intervalles vides). */
export function bucketsBetween(
  from: Date,
  to: Date,
  bucket: DateBucket,
  timeZone = "Europe/Paris",
) {
  const out: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  const step = bucket === "day" || bucket === "week" ? 86_400_000 : 86_400_000 * 5;
  for (let t = from.getTime(); t < to.getTime() && out.length < 400; t += step) {
    const b = bucketOf(new Date(t), bucket, timeZone);
    if (!seen.has(b.key)) {
      seen.add(b.key);
      out.push(b);
    }
  }
  return out;
}

/** Clé du groupe « Autres » (au-delà de la limite) : il ne mène à aucune liste filtrée. */
export const OTHERS_KEY = "__autres__";

export interface ReportPoint {
  /** Valeur brute du regroupement (identifiant, valeur de liste, clé de date) ou null. */
  key: string | null;
  label: string;
  value: number;
  count: number;
}

export interface ReportResult {
  points: ReportPoint[];
  total: number;
  count: number;
  /** Nombre de groupes au-delà de la limite (regroupés dans « Autres »). */
  truncated: number;
}

/**
 * Agrégation d'un rapport (fonction pure, testée) : regroupement, mesure (nombre, somme,
 * moyenne), tri et limite. `labels` traduit les identifiants (personnes, fiches liées).
 */
export function aggregateReport(
  rows: Record<string, unknown>[],
  def: ReportDefinition,
  options: {
    labels?: Map<string, string>;
    timeZone?: string;
    range?: { from: Date; to: Date };
  } = {},
): ReportResult {
  const fields = new Map<string, FieldDef>(ENTITIES[def.entity].fields.map((f) => [f.key, f]));
  const group = def.groupBy ? fields.get(def.groupBy) : undefined;
  const isDate = group && (group.type === "date" || group.type === "datetime");
  const bucket = isDate ? (def.dateBucket ?? "month") : null;
  const buckets = new Map<string | null, { label: string; sum: number; count: number }>();

  const valueOf = (row: Record<string, unknown>) => {
    if (def.measure.op === "count") return 1;
    const v = row[def.measure.field!];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  for (const row of rows) {
    let key: string | null = null;
    let label = "Non renseigné";
    if (group) {
      const raw = row[group.key];
      if (raw !== null && raw !== undefined && raw !== "") {
        if (bucket) {
          const b = bucketOf(
            raw instanceof Date ? raw : new Date(String(raw)),
            bucket,
            options.timeZone,
          );
          key = b.key;
          label = b.label;
        } else if (group.type === "boolean") {
          key = String(Boolean(raw));
          label = raw ? "Oui" : "Non";
        } else {
          key = String(raw);
          label =
            group.options?.find((o) => o.value === key)?.label ?? options.labels?.get(key) ?? key;
        }
      }
    } else {
      key = "total";
      label = "Total";
    }
    const value = valueOf(row);
    const entry = buckets.get(key) ?? { label, sum: 0, count: 0 };
    if (value !== null) {
      entry.sum += value;
      entry.count += 1;
    } else if (def.measure.op === "count") entry.count += 1;
    buckets.set(key, entry);
  }

  if (bucket && options.range) {
    for (const b of bucketsBetween(options.range.from, options.range.to, bucket, options.timeZone))
      if (!buckets.has(b.key)) buckets.set(b.key, { label: b.label, sum: 0, count: 0 });
  }

  let points: ReportPoint[] = [...buckets.entries()].map(([key, b]) => ({
    key,
    label: b.label,
    count: b.count,
    value: def.measure.op === "avg" ? (b.count ? b.sum / b.count : 0) : b.sum,
  }));
  if (bucket || def.sort === "label")
    points.sort((a, b) =>
      bucket ? String(a.key).localeCompare(String(b.key)) : a.label.localeCompare(b.label, "fr"),
    );
  else points.sort((a, b) => (def.sort === "value_asc" ? a.value - b.value : b.value - a.value));

  let truncated = 0;
  if (!bucket && points.length > def.limit) {
    const kept = points.slice(0, def.limit - 1);
    const rest = points.slice(def.limit - 1);
    truncated = rest.length;
    const restCount = rest.reduce((s, p) => s + p.count, 0);
    const restSum = rest.reduce(
      (s, p) => s + (def.measure.op === "avg" ? p.value * p.count : p.value),
      0,
    );
    kept.push({
      key: OTHERS_KEY,
      label: `Autres (${rest.length})`,
      count: restCount,
      value: def.measure.op === "avg" ? (restCount ? restSum / restCount : 0) : restSum,
    });
    points = kept;
  }

  const count = rows.length;
  const measured = rows.map(valueOf).filter((v): v is number => v !== null);
  const sum = measured.reduce((s, v) => s + v, 0);
  const total = def.measure.op === "avg" ? (measured.length ? sum / measured.length : 0) : sum;
  return { points, total, count, truncated };
}

/** Rapports prêts à l'emploi, par module. */
export const PRESET_REPORTS: {
  key: string;
  module: ModuleKey;
  name: string;
  /** Période proposée à l'ouverture du modèle. */
  period: Exclude<PeriodPreset, "custom">;
  definition: ReportDefinition;
}[] = [
  {
    key: "revenue-by-month",
    period: "12m",
    module: "sales",
    name: "Chiffre d'affaires facturé par mois",
    definition: {
      entity: "invoice",
      measure: { op: "sum", field: "totalExclCents" },
      groupBy: "issueDate",
      dateBucket: "month",
      dateField: "issueDate",
      filter: {
        combinator: "and",
        rules: [{ field: "status", operator: "not_in", value: ["draft"] }],
      },
      chart: "bar",
      limit: 12,
      sort: "label",
    },
  },
  {
    key: "revenue-by-customer",
    period: "year",
    module: "sales",
    name: "Chiffre d'affaires par client",
    definition: {
      entity: "invoice",
      measure: { op: "sum", field: "totalExclCents" },
      groupBy: "companyId",
      dateField: "issueDate",
      filter: {
        combinator: "and",
        rules: [{ field: "status", operator: "not_in", value: ["draft"] }],
      },
      chart: "bar",
      limit: 10,
      sort: "value_desc",
    },
  },
  {
    key: "unpaid-by-customer",
    period: "year",
    module: "sales",
    name: "Reste dû par client",
    definition: {
      entity: "invoice",
      measure: { op: "sum", field: "dueCents" },
      groupBy: "companyId",
      dateField: null,
      filter: {
        combinator: "and",
        rules: [{ field: "status", operator: "in", value: ["sent", "partial", "overdue"] }],
      },
      chart: "table",
      limit: 20,
      sort: "value_desc",
    },
  },
  {
    key: "quotes-by-status",
    period: "year",
    module: "sales",
    name: "Devis par statut",
    definition: {
      entity: "quote",
      measure: { op: "sum", field: "totalExclCents" },
      groupBy: "status",
      dateField: "issueDate",
      filter: EMPTY_FILTER,
      chart: "pie",
      limit: 10,
      sort: "value_desc",
    },
  },
  {
    key: "pipeline-by-stage",
    period: "year",
    module: "crm",
    name: "Pipeline par étape",
    definition: {
      entity: "deal",
      measure: { op: "sum", field: "amount" },
      groupBy: "stage",
      dateField: null,
      filter: EMPTY_FILTER,
      chart: "bar",
      limit: 10,
      sort: "label",
    },
  },
  {
    key: "deals-by-owner",
    period: "year",
    module: "crm",
    name: "Affaires gagnées par commercial",
    definition: {
      entity: "deal",
      measure: { op: "sum", field: "amount" },
      groupBy: "ownerId",
      dateField: "closedAt",
      filter: { combinator: "and", rules: [{ field: "stage", operator: "in", value: ["won"] }] },
      chart: "bar",
      limit: 10,
      sort: "value_desc",
    },
  },
  {
    key: "activities-by-type",
    period: "quarter",
    module: "crm",
    name: "Activités par type",
    definition: {
      entity: "activity",
      measure: { op: "count" },
      groupBy: "type",
      dateField: "dueAt",
      filter: EMPTY_FILTER,
      chart: "pie",
      limit: 10,
      sort: "value_desc",
    },
  },
  {
    key: "time-by-project",
    period: "30d",
    module: "projects",
    name: "Temps passé par projet",
    definition: {
      entity: "timeEntry",
      measure: { op: "sum", field: "minutes" },
      groupBy: "projectId",
      dateField: "date",
      filter: EMPTY_FILTER,
      chart: "bar",
      limit: 10,
      sort: "value_desc",
    },
  },
  {
    key: "time-by-person",
    period: "30d",
    module: "projects",
    name: "Temps passé par personne",
    definition: {
      entity: "timeEntry",
      measure: { op: "sum", field: "minutes" },
      groupBy: "ownerId",
      dateField: "date",
      filter: EMPTY_FILTER,
      chart: "bar",
      limit: 10,
      sort: "value_desc",
    },
  },
  {
    key: "tasks-by-status",
    period: "year",
    module: "projects",
    name: "Tâches par statut",
    definition: {
      entity: "task",
      measure: { op: "count" },
      groupBy: "status",
      dateField: null,
      filter: EMPTY_FILTER,
      chart: "pie",
      limit: 10,
      sort: "label",
    },
  },
  {
    key: "cash-flow-by-month",
    period: "12m",
    module: "treasury",
    name: "Flux de trésorerie par mois",
    definition: {
      entity: "bankTransaction",
      measure: { op: "sum", field: "amountCents" },
      groupBy: "date",
      dateBucket: "month",
      dateField: "date",
      filter: { combinator: "and", rules: [] },
      chart: "bar",
      limit: 12,
      sort: "label",
    },
  },
  {
    key: "bills-to-pay",
    period: "year",
    module: "purchases",
    name: "Factures fournisseurs à payer par échéance",
    definition: {
      entity: "bill",
      measure: { op: "sum", field: "totalCents" },
      groupBy: "dueDate",
      dateBucket: "month",
      dateField: "dueDate",
      filter: {
        combinator: "and",
        rules: [{ field: "status", operator: "in", value: ["to_pay"] }],
      },
      chart: "bar",
      limit: 12,
      sort: "label",
    },
  },
  {
    key: "purchases-by-supplier",
    period: "12m",
    module: "purchases",
    name: "Achats par fournisseur",
    definition: {
      entity: "bill",
      measure: { op: "sum", field: "totalExclCents" },
      groupBy: "supplierId",
      dateBucket: null,
      dateField: "issueDate",
      filter: {
        combinator: "and",
        rules: [{ field: "status", operator: "not_in", value: ["cancelled"] }],
      },
      chart: "bar",
      limit: 12,
      sort: "value_desc",
    },
  },
  {
    key: "tickets-by-status",
    period: "30d",
    module: "support",
    name: "Tickets par statut",
    definition: {
      entity: "ticket",
      measure: { op: "count" },
      groupBy: "status",
      dateBucket: null,
      dateField: "createdAt",
      filter: { combinator: "and", rules: [] },
      chart: "pie",
      limit: 12,
      sort: "value_desc",
    },
  },
  {
    key: "leave-days-by-type",
    period: "year",
    module: "hr",
    name: "Jours d'absence par type",
    definition: {
      entity: "leave",
      measure: { op: "sum", field: "days" },
      groupBy: "type",
      dateBucket: null,
      dateField: "startDate",
      filter: {
        combinator: "and",
        rules: [{ field: "status", operator: "in", value: ["approved"] }],
      },
      chart: "bar",
      limit: 12,
      sort: "value_desc",
    },
  },
];

export const REPORT_SCHEDULES = ["none", "weekly", "monthly"] as const;
export type ReportSchedule = (typeof REPORT_SCHEDULES)[number];

/** L'envoi programmé d'un rapport est-il dû ce jour-là (lundi / 1er du mois) ? */
export function scheduleDue(
  schedule: ReportSchedule,
  lastSentAt: Date | null,
  now: Date = new Date(),
  timeZone = "Europe/Paris",
): boolean {
  if (schedule === "none") return false;
  const { year, month, day } = zonedParts(now, timeZone);
  const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
  const due = schedule === "weekly" ? weekday === 1 : day === 1;
  if (!due) return false;
  if (!lastSentAt) return true;
  const last = zonedParts(lastSentAt, timeZone);
  return !(last.year === year && last.month === month && last.day === day);
}

// ─────────────────────────── Tableau de bord ───────────────────────────

export interface WidgetDefinition {
  key: string;
  label: string;
  description: string;
  /** Module requis (le widget est masqué s'il est désactivé ou interdit au rôle). */
  module: ModuleKey | null;
  size: { w: number; h: number };
  minSize: { w: number; h: number };
}

export const WIDGETS: WidgetDefinition[] = [
  {
    key: "revenue",
    label: "Chiffre d'affaires facturé",
    description:
      "CA hors taxes des factures émises sur la période, comparé à la période précédente.",
    module: "sales",
    size: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    key: "cash",
    label: "Encaissements",
    description: "Paiements reçus sur la période.",
    module: "sales",
    size: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    key: "overdue",
    label: "Factures en retard",
    description: "Reste dû des factures échues, par ancienneté.",
    module: "sales",
    size: { w: 3, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    key: "revenue_trend",
    label: "Évolution du CA",
    description: "Facturé et encaissé mois par mois sur 12 mois.",
    module: "sales",
    size: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    key: "top_customers",
    label: "Meilleurs clients",
    description: "Clients qui ont le plus facturé sur la période.",
    module: "sales",
    size: { w: 3, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    key: "quotes",
    label: "Devis en attente",
    description: "Devis envoyés sans réponse et taux de transformation.",
    module: "sales",
    size: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    key: "objective",
    label: "Objectif de chiffre d'affaires",
    description: "Progression du CA facturé vers votre objectif de la période.",
    module: "sales",
    size: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    key: "pipeline",
    label: "Pipeline",
    description: "Montant des opportunités ouvertes par étape, et montant pondéré.",
    module: "crm",
    size: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    key: "deals_won",
    label: "Affaires gagnées",
    description: "Montant des opportunités gagnées sur la période.",
    module: "crm",
    size: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    key: "activities_today",
    label: "Mes activités du jour",
    description: "Appels, rendez-vous et tâches prévus aujourd'hui ou en retard.",
    module: "crm",
    size: { w: 3, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    key: "tasks_today",
    label: "Mes tâches",
    description: "Tâches qui vous sont confiées, en retard ou à échéance proche.",
    module: "projects",
    size: { w: 3, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    key: "time_spent",
    label: "Temps passé",
    description: "Temps saisi sur la période, par projet.",
    module: "projects",
    size: { w: 3, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    key: "start",
    label: "Pour bien démarrer",
    description:
      "Palette de commandes, raccourcis, apparence : les gestes utiles pour prendre l'application en main.",
    module: null,
    size: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    key: "report",
    label: "Rapport enregistré",
    description: "N'importe quel rapport du constructeur, sous forme de graphique.",
    module: null,
    size: { w: 6, h: 4 },
    minSize: { w: 3, h: 3 },
  },
];

export const widgetByKey = (key: string) => WIDGETS.find((w) => w.key === key);

export const dashboardItemSchema = z.object({
  i: z.string().min(1).max(40),
  widget: z.string().min(1).max(40),
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(1000),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(12),
  config: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .default({}),
});
export type DashboardItem = z.infer<typeof dashboardItemSchema>;
export const dashboardLayoutSchema = z.array(dashboardItemSchema).max(40);

/** Tableau de bord par défaut selon le rôle (et les modules actifs). */
export function defaultDashboard(
  role: SystemRoleKey | null,
  modules: readonly ModuleKey[],
): DashboardItem[] {
  const plans: Record<string, string[]> = {
    owner: [
      "revenue",
      "cash",
      "deals_won",
      "quotes",
      "revenue_trend",
      "overdue",
      "top_customers",
      "pipeline",
      "tasks_today",
      "activities_today",
    ],
    admin: [
      "revenue",
      "cash",
      "deals_won",
      "quotes",
      "revenue_trend",
      "overdue",
      "top_customers",
      "pipeline",
      "tasks_today",
      "activities_today",
    ],
    manager: [
      "deals_won",
      "quotes",
      "revenue",
      "objective",
      "pipeline",
      "activities_today",
      "tasks_today",
      "time_spent",
      "top_customers",
    ],
    member: [
      "deals_won",
      "quotes",
      "activities_today",
      "tasks_today",
      "pipeline",
      "time_spent",
      "start",
    ],
    viewer: ["revenue", "deals_won", "quotes", "revenue_trend", "pipeline", "start"],
    accountant: ["revenue", "cash", "quotes", "revenue_trend", "overdue", "top_customers"],
  };
  const keys = (plans[role ?? "member"] ?? plans.member!).filter((key) => {
    const w = widgetByKey(key);
    return w && (!w.module || modules.includes(w.module));
  });
  // Placement en lignes de 12 colonnes, dans l'ordre du plan.
  const items: DashboardItem[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const key of keys) {
    const { w, h } = widgetByKey(key)!.size;
    if (x + w > 12) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    items.push({ i: key, widget: key, x, y, w, h, config: {} });
    x += w;
    rowHeight = Math.max(rowHeight, h);
  }
  return items;
}

// ─────────────────────────── Accès à la liste filtrée ───────────────────────────

function ymd(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m, d));
  return date.toISOString().slice(0, 10);
}

/** Jours (inclus) couverts par la clé d'un intervalle de date (« 2026-03 », « 2026-T1 »…). */
export function bucketRange(key: string, bucket: DateBucket): { from: string; to: string } | null {
  let m: RegExpExecArray | null;
  switch (bucket) {
    case "day":
      return /^\d{4}-\d{2}-\d{2}$/.test(key) ? { from: key, to: key } : null;
    case "month":
      m = /^(\d{4})-(\d{2})$/.exec(key);
      return m ? { from: ymd(+m[1]!, +m[2]! - 1, 1), to: ymd(+m[1]!, +m[2]!, 0) } : null;
    case "quarter":
      m = /^(\d{4})-T([1-4])$/.exec(key);
      return m ? { from: ymd(+m[1]!, (+m[2]! - 1) * 3, 1), to: ymd(+m[1]!, +m[2]! * 3, 0) } : null;
    case "year":
      return /^\d{4}$/.test(key) ? { from: `${key}-01-01`, to: `${key}-12-31` } : null;
    case "week": {
      m = /^(\d{4})-S(\d{2})$/.exec(key);
      if (!m) return null;
      // Lundi de la semaine ISO : le 4 janvier est toujours en semaine 1.
      const jan4 = new Date(Date.UTC(+m[1]!, 0, 4));
      const monday = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86_400_000);
      const start = new Date(monday.getTime() + (+m[2]! - 1) * 7 * 86_400_000);
      const end = new Date(start.getTime() + 6 * 86_400_000);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
  }
}

/**
 * Filtre de la liste correspondant à un point d'un rapport (clic sur une barre) : filtre du
 * rapport, valeur du regroupement et période. Null si le point ne se traduit pas en filtre
 * (groupe « Autres »).
 */
export function drillDownFilter(
  def: ReportDefinition,
  point: Pick<ReportPoint, "key"> | null,
  range: { from: string; to: string } | null,
): FilterGroup | null {
  const rules: FilterGroup["rules"] =
    def.filter.combinator === "and"
      ? [...def.filter.rules]
      : def.filter.rules.length
        ? [def.filter]
        : [];
  if (range && def.dateField)
    rules.push({ field: def.dateField, operator: "between", value: [range.from, range.to] });
  if (point && def.groupBy) {
    const field = ENTITIES[def.entity].fields.find((f) => f.key === def.groupBy);
    if (!field || point.key === OTHERS_KEY) return null;
    if (point.key === null) {
      rules.push({ field: field.key, operator: "is_empty" });
    } else if (field.type === "date" || field.type === "datetime") {
      const r = bucketRange(point.key, def.dateBucket ?? "month");
      if (!r) return null;
      rules.push({ field: field.key, operator: "between", value: [r.from, r.to] });
    } else if (field.type === "boolean") {
      rules.push({ field: field.key, operator: point.key === "true" ? "is_true" : "is_false" });
    } else if (field.type === "text") {
      rules.push({ field: field.key, operator: "equals", value: point.key });
    } else {
      rules.push({ field: field.key, operator: "in", value: [point.key] });
    }
  }
  // Un filtre OU contenant déjà des sous-groupes dépasserait deux niveaux : pas de raccourci.
  if (rules.some((r) => "combinator" in r && r.rules.some((x) => "combinator" in x))) return null;
  return { combinator: "and", rules };
}
