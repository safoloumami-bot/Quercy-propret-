import { z } from "zod";

import { CUSTOM_PREFIX, type FieldDef, type FieldType, isCustomKey } from "./fields";

export const OPERATORS = [
  "contains",
  "not_contains",
  "equals",
  "not_equals",
  "starts_with",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "before",
  "after",
  "in_last_days",
  "in_next_days",
  "in",
  "not_in",
  "has_any",
  "has_all",
  "has_none",
  "is_true",
  "is_false",
  "is_empty",
  "is_not_empty",
] as const;
export type Operator = (typeof OPERATORS)[number];

export const OPERATOR_LABELS: Record<Operator, string> = {
  contains: "contient",
  not_contains: "ne contient pas",
  equals: "est",
  not_equals: "n'est pas",
  starts_with: "commence par",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "entre",
  before: "avant le",
  after: "après le",
  in_last_days: "dans les derniers (jours)",
  in_next_days: "dans les prochains (jours)",
  in: "est l'un de",
  not_in: "n'est aucun de",
  has_any: "contient l'un de",
  has_all: "contient tous",
  has_none: "ne contient aucun de",
  is_true: "est coché",
  is_false: "n'est pas coché",
  is_empty: "est vide",
  is_not_empty: "n'est pas vide",
};

const TEXT_OPS: Operator[] = [
  "contains",
  "not_contains",
  "equals",
  "not_equals",
  "starts_with",
  "is_empty",
  "is_not_empty",
];
const NUMBER_OPS: Operator[] = [
  "equals",
  "not_equals",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "is_empty",
  "is_not_empty",
];
const DATE_OPS: Operator[] = [
  "before",
  "after",
  "between",
  "in_last_days",
  "in_next_days",
  "is_empty",
  "is_not_empty",
];
const CHOICE_OPS: Operator[] = ["in", "not_in", "is_empty", "is_not_empty"];
const LIST_OPS: Operator[] = ["has_any", "has_all", "has_none", "is_empty", "is_not_empty"];

export const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  text: TEXT_OPS,
  longtext: ["contains", "not_contains", "is_empty", "is_not_empty"],
  email: TEXT_OPS,
  phone: TEXT_OPS,
  url: TEXT_OPS,
  number: NUMBER_OPS,
  currency: NUMBER_OPS,
  percent: NUMBER_OPS,
  date: DATE_OPS,
  datetime: DATE_OPS,
  boolean: ["is_true", "is_false"],
  select: CHOICE_OPS,
  user: CHOICE_OPS,
  relation: CHOICE_OPS,
  duration: NUMBER_OPS,
  multiselect: LIST_OPS,
  tags: LIST_OPS,
};

/** Opérateurs sans valeur à saisir. */
export const VALUELESS: ReadonlySet<Operator> = new Set([
  "is_empty",
  "is_not_empty",
  "is_true",
  "is_false",
]);

export const filterRuleSchema = z.object({
  field: z.string().min(1).max(80),
  operator: z.enum(OPERATORS),
  value: z.unknown().optional(),
});
export type FilterRule = z.infer<typeof filterRuleSchema>;

export interface FilterGroup {
  combinator: "and" | "or";
  rules: (FilterRule | FilterGroup)[];
}

/** Deux niveaux suffisent pour exprimer « (A et B) ou (C et D) » ; au-delà, l'interface devient illisible. */
const innerGroupSchema = z.object({
  combinator: z.enum(["and", "or"]),
  rules: z.array(filterRuleSchema).max(20),
});
export const filterGroupSchema: z.ZodType<FilterGroup> = z.object({
  combinator: z.enum(["and", "or"]),
  rules: z.array(z.union([filterRuleSchema, innerGroupSchema])).max(20),
});

export const EMPTY_FILTER: FilterGroup = { combinator: "and", rules: [] };

export const sortSpecSchema = z.object({
  field: z.string().min(1).max(80),
  direction: z.enum(["asc", "desc"]),
});
export type SortSpec = z.infer<typeof sortSpecSchema>;

export const viewColumnSchema = z.object({
  key: z.string().min(1).max(80),
  visible: z.boolean(),
  width: z.number().int().min(60).max(800).optional(),
  pinned: z.boolean().optional(),
});

export const VIEW_LAYOUTS = ["table", "board", "calendar", "gantt"] as const;
export type ViewLayout = (typeof VIEW_LAYOUTS)[number];

export const viewConfigSchema = z.object({
  columns: z.array(viewColumnSchema).max(100),
  sort: z.array(sortSpecSchema).max(5),
  filter: filterGroupSchema,
  groupBy: z.string().max(80).nullable(),
  density: z.enum(["compact", "normal", "comfortable"]),
  /** Affichage : tableau, Kanban, calendrier ou Gantt (selon l'entité). */
  layout: z.enum(VIEW_LAYOUTS).default("table"),
});
export type ViewConfig = z.infer<typeof viewConfigSchema>;

export function isGroup(rule: FilterRule | FilterGroup): rule is FilterGroup {
  return "combinator" in rule;
}

/** Nombre de règles actives (pour le badge du bouton « Filtrer »). */
export function countRules(group: FilterGroup): number {
  return group.rules.reduce((n, r) => n + (isGroup(r) ? countRules(r) : 1), 0);
}

type Where = Record<string, unknown>;

function asNumber(v: unknown): number | null {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim() !== ""
        ? Number(v.replace(",", "."))
        : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Filtre saisi en euros sur une colonne en centimes. */
function toCents(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(toCents);
  const n = asNumber(v);
  return n === null ? v : Math.round(n * 100);
}

function asDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v !== "") return [v];
  return [];
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Condition sur une colonne standard. Renvoie null si la règle est incomplète (ignorée). */
function columnCondition(field: FieldDef, rule: FilterRule, now: Date): Where | null {
  const column = field.column ?? field.key;
  const v = field.cents ? toCents(rule.value) : rule.value;
  const textual = ["text", "longtext", "email", "phone", "url"].includes(field.type);
  const insensitive = textual ? { mode: "insensitive" as const } : {};

  switch (rule.operator) {
    case "contains":
      return typeof v === "string" && v ? { [column]: { contains: v, ...insensitive } } : null;
    case "not_contains":
      return typeof v === "string" && v
        ? { NOT: { [column]: { contains: v, ...insensitive } } }
        : null;
    case "starts_with":
      return typeof v === "string" && v ? { [column]: { startsWith: v, ...insensitive } } : null;
    case "equals":
    case "not_equals": {
      const value = textual ? (typeof v === "string" ? v : null) : asNumber(v);
      if (value === null || value === "") return null;
      const cond = textual ? { [column]: { equals: value, ...insensitive } } : { [column]: value };
      return rule.operator === "equals" ? cond : { NOT: cond };
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const n = asNumber(v);
      return n === null ? null : { [column]: { [rule.operator]: n } };
    }
    case "between": {
      const [a, b] = Array.isArray(v) ? v : [];
      if (field.type === "date" || field.type === "datetime") {
        const from = asDate(a);
        const to = asDate(b);
        if (!from && !to) return null;
        return {
          [column]: {
            ...(from ? { gte: startOfDay(from) } : {}),
            ...(to ? { lt: new Date(startOfDay(to).getTime() + 86_400_000) } : {}),
          },
        };
      }
      const min = asNumber(a);
      const max = asNumber(b);
      if (min === null && max === null) return null;
      return {
        [column]: { ...(min !== null ? { gte: min } : {}), ...(max !== null ? { lte: max } : {}) },
      };
    }
    case "before": {
      const d = asDate(v);
      return d ? { [column]: { lt: startOfDay(d) } } : null;
    }
    case "after": {
      const d = asDate(v);
      return d ? { [column]: { gte: new Date(startOfDay(d).getTime() + 86_400_000) } } : null;
    }
    case "in_last_days": {
      const n = asNumber(v);
      return n === null
        ? null
        : { [column]: { gte: new Date(now.getTime() - n * 86_400_000), lte: now } };
    }
    case "in_next_days": {
      const n = asNumber(v);
      return n === null
        ? null
        : { [column]: { gte: now, lte: new Date(now.getTime() + n * 86_400_000) } };
    }
    case "in":
    case "not_in": {
      const list = asList(v);
      if (list.length === 0) return null;
      return rule.operator === "in"
        ? { [column]: { in: list } }
        : { OR: [{ [column]: { notIn: list } }, { [column]: null }] };
    }
    case "has_any": {
      const list = asList(v);
      return list.length ? { [column]: { hasSome: list } } : null;
    }
    case "has_all": {
      const list = asList(v);
      return list.length ? { [column]: { hasEvery: list } } : null;
    }
    case "has_none": {
      const list = asList(v);
      return list.length ? { NOT: { [column]: { hasSome: list } } } : null;
    }
    case "is_true":
      return { [column]: true };
    case "is_false":
      return { [column]: false };
    case "is_empty":
      if (field.type === "tags" || field.type === "multiselect")
        return { [column]: { isEmpty: true } };
      return textual ? { OR: [{ [column]: null }, { [column]: "" }] } : { [column]: null };
    case "is_not_empty":
      if (field.type === "tags" || field.type === "multiselect")
        return { NOT: { [column]: { isEmpty: true } } };
      return textual
        ? { AND: [{ NOT: { [column]: null } }, { NOT: { [column]: "" } }] }
        : { NOT: { [column]: null } };
  }
}

/** Condition sur un champ personnalisé (colonne JSON `customFields`). */
function customCondition(field: FieldDef, rule: FilterRule): Where | null {
  const path = [field.key.slice(CUSTOM_PREFIX.length)];
  const json = (filter: Where): Where => ({ customFields: { path, ...filter } });
  const v = rule.value;
  switch (rule.operator) {
    case "contains":
      return typeof v === "string" && v ? json({ string_contains: v }) : null;
    case "not_contains":
      return typeof v === "string" && v ? { NOT: json({ string_contains: v }) } : null;
    case "starts_with":
      return typeof v === "string" && v ? json({ string_starts_with: v }) : null;
    case "equals":
      return v === undefined || v === ""
        ? null
        : json({ equals: field.type === "number" ? asNumber(v) : v });
    case "not_equals":
      return v === undefined || v === ""
        ? null
        : { NOT: json({ equals: field.type === "number" ? asNumber(v) : v }) };
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const n = asNumber(v);
      return n === null ? null : json({ [rule.operator]: n });
    }
    case "before":
    case "after": {
      const d = asDate(v);
      if (!d) return null;
      const iso = d.toISOString().slice(0, 10);
      return json({ [rule.operator === "before" ? "lt" : "gt"]: iso });
    }
    case "in": {
      const list = asList(v);
      return list.length ? { OR: list.map((item) => json({ equals: item })) } : null;
    }
    case "not_in": {
      const list = asList(v);
      return list.length ? { NOT: { OR: list.map((item) => json({ equals: item })) } } : null;
    }
    case "is_true":
      return json({ equals: true });
    case "is_false":
      return { NOT: json({ equals: true }) };
    case "is_empty":
      return {
        OR: [
          json({ equals: null }),
          json({ equals: "" }),
          { NOT: { customFields: { path, not: null } } },
        ],
      };
    case "is_not_empty":
      return { AND: [{ customFields: { path, not: null } }, { NOT: json({ equals: "" }) }] };
    default:
      return null;
  }
}

/**
 * Convertit un groupe de filtres en clause `where` Prisma. Les règles incomplètes ou portant
 * sur un champ inconnu/non filtrable sont ignorées : un filtre ne peut jamais viser une colonne
 * arbitraire (liste blanche des champs de l'entité).
 */
export function buildWhere(fields: FieldDef[], group: FilterGroup, now: Date = new Date()): Where {
  const byKey = new Map(fields.filter((f) => f.filterable !== false).map((f) => [f.key, f]));
  const parts: Where[] = [];
  for (const rule of group.rules) {
    if (isGroup(rule)) {
      const nested = buildWhere(fields, rule, now);
      if (Object.keys(nested).length > 0) parts.push(nested);
      continue;
    }
    const field = byKey.get(rule.field);
    if (!field || !OPERATORS_BY_TYPE[field.type].includes(rule.operator)) continue;
    const condition = isCustomKey(field.key)
      ? customCondition(field, rule)
      : columnCondition(field, rule, now);
    if (condition) parts.push(condition);
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return group.combinator === "and" ? { AND: parts } : { OR: parts };
}

/** Colonnes jamais nulles : Prisma refuse l'option `nulls` sur celles-ci. */
const NON_NULL = new Set(["id", "createdAt", "updatedAt"]);

/** Tri Prisma, limité aux champs triables ; les champs personnalisés ne se trient pas (JSON). */
export function buildOrderBy(fields: FieldDef[], sort: SortSpec[], fallback: SortSpec): Where[] {
  const sortable = new Map(
    fields.filter((f) => f.sortable && !isCustomKey(f.key)).map((f) => [f.key, f]),
  );
  const clause = (field: FieldDef | undefined, key: string, direction: "asc" | "desc"): Where => {
    const column = field?.column ?? key;
    const nullable = !(field?.required || field?.notNull || NON_NULL.has(key));
    return { [column]: nullable ? { sort: direction, nulls: "last" } : direction };
  };
  const order = sort
    .filter((s) => sortable.has(s.field))
    .map((s) => clause(sortable.get(s.field), s.field, s.direction));
  if (order.length === 0)
    order.push(
      clause(
        fields.find((f) => f.key === fallback.field),
        fallback.field,
        fallback.direction,
      ),
    );
  // Départage stable (pagination sans doublon).
  order.push({ id: "asc" });
  return order;
}
