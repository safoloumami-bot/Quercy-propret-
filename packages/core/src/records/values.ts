import { z } from "zod";

import { type FieldDef, isCustomKey } from "./fields";

/**
 * Durée saisie → minutes. Accepte « 90 », « 1h30 », « 1 h », « 1:30 », « 1,5h », « 45 min ».
 * Renvoie null si la saisie est vide, NaN si elle est illisible.
 */
export function parseDuration(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input) : Number.NaN;
  const v = input.trim().toLowerCase().replace(/\s+/g, "").replace(",", ".");
  if (v === "") return null;
  let m = /^(\d+):(\d{1,2})$/.exec(v);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(\d+(?:\.\d+)?)h(?:(\d{1,2})(?:min|m)?)?$/.exec(v);
  if (m) return Math.round(Number(m[1]) * 60) + Number(m[2] ?? 0);
  m = /^(\d+)(?:min|m)?$/.exec(v);
  if (m) return Number(m[1]);
  return Number.NaN;
}

/** Minutes → « 1 h 30 », « 45 min ». */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "";
  const sign = minutes < 0 ? "−" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m} min`;
  return m === 0 ? `${sign}${h} h` : `${sign}${h} h ${String(m).padStart(2, "0")}`;
}

/** Schéma Zod d'une valeur selon son type de champ (création, édition, import). */
export function fieldValueSchema(field: FieldDef): z.ZodType<unknown> {
  const optionalText = (max = 500) =>
    z
      .string()
      .trim()
      .max(max, { error: `${field.label} : ${max} caractères maximum.` })
      .transform((v) => (v === "" ? null : v))
      .nullable();
  let schema: z.ZodType<unknown>;
  switch (field.type) {
    case "text":
    case "phone":
      schema = optionalText(field.maxLength ?? 500);
      break;
    case "longtext":
      schema = optionalText(field.maxLength ?? 20_000);
      break;
    case "email":
      schema = z
        .string()
        .trim()
        .toLowerCase()
        .transform((v) => (v === "" ? null : v))
        .pipe(z.email({ error: `${field.label} : adresse invalide.` }).nullable())
        .nullable();
      break;
    case "url":
      schema = z
        .string()
        .trim()
        .transform((v) => (v === "" ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`))
        .pipe(z.url({ error: `${field.label} : adresse web invalide.` }).nullable())
        .nullable();
      break;
    case "number":
    case "percent":
    case "currency":
      schema = z
        .union([z.number(), z.string()])
        .transform((v, ctx) => {
          if (typeof v === "number") {
            if (field.cents) return Math.round(v * 100);
            return field.integer ? Math.round(v) : v;
          }
          const cleaned = v.replace(/\s|€/g, "").replace(",", ".");
          if (cleaned === "") return null;
          const n = Number(cleaned);
          if (!Number.isFinite(n)) {
            ctx.addIssue({ code: "custom", message: `${field.label} : nombre attendu.` });
            return z.NEVER;
          }
          if (field.cents) return Math.round(n * 100);
          return field.integer ? Math.round(n) : n;
        })
        .nullable();
      break;
    case "duration":
      schema = z
        .union([z.number(), z.string()])
        .transform((v, ctx) => {
          const minutes = parseDuration(v);
          if (minutes !== null && (Number.isNaN(minutes) || minutes < 0)) {
            ctx.addIssue({
              code: "custom",
              message: `${field.label} : durée invalide (ex. 1h30, 90, 1:30).`,
            });
            return z.NEVER;
          }
          return minutes;
        })
        .nullable();
      break;
    case "date":
    case "datetime":
      schema = z
        .union([z.date(), z.string()])
        .transform((v, ctx) => {
          if (v instanceof Date) return v;
          if (v.trim() === "") return null;
          const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
          const d = fr ? new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1])) : new Date(v);
          if (Number.isNaN(d.getTime())) {
            ctx.addIssue({
              code: "custom",
              message: `${field.label} : date invalide (JJ/MM/AAAA).`,
            });
            return z.NEVER;
          }
          return d;
        })
        .nullable();
      break;
    case "boolean":
      schema = z
        .union([z.boolean(), z.string()])
        .transform((v) =>
          typeof v === "boolean"
            ? v
            : ["oui", "true", "1", "x", "vrai"].includes(v.trim().toLowerCase()),
        );
      break;
    case "select": {
      const values = field.options?.map((o) => o.value) ?? [];
      const labels = new Map(field.options?.map((o) => [o.label.toLowerCase(), o.value]) ?? []);
      schema = z
        .string()
        .transform((v, ctx) => {
          const t = v.trim();
          if (t === "") return null;
          if (values.includes(t)) return t;
          const byLabel = labels.get(t.toLowerCase());
          if (byLabel) return byLabel;
          ctx.addIssue({ code: "custom", message: `${field.label} : valeur « ${t} » inconnue.` });
          return z.NEVER;
        })
        .nullable();
      break;
    }
    case "multiselect":
    case "tags":
      schema = z
        .union([z.array(z.string()), z.string()])
        .transform((v) =>
          [
            ...new Set(
              (Array.isArray(v) ? v : v.split(/[,;]/)).map((t) => t.trim()).filter(Boolean),
            ),
          ].slice(0, 30),
        );
      break;
    case "user":
    case "relation":
      schema = z
        .string()
        .transform((v) => (v === "" ? null : v))
        .nullable();
      break;
  }
  if (field.required) {
    return schema.refine((v) => v !== null && v !== undefined && v !== "", {
      message: `${field.label} est obligatoire.`,
    });
  }
  return schema.optional();
}

export interface ParsedRecord {
  data: Record<string, unknown>;
  customFields: Record<string, unknown>;
}

/**
 * Valide un enregistrement saisi (formulaire, cellule, ligne d'import) : seuls les champs
 * modifiables connus sont acceptés ; les champs personnalisés sont rangés à part.
 */
export function parseRecordInput(
  fields: FieldDef[],
  input: Record<string, unknown>,
  mode: "create" | "update",
): { success: true; value: ParsedRecord } | { success: false; errors: Record<string, string> } {
  const data: Record<string, unknown> = {};
  const customFields: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!field.editable) continue;
    const present = Object.prototype.hasOwnProperty.call(input, field.key);
    const fallback =
      mode === "create" && !present && field.defaultValue !== undefined
        ? field.defaultValue === "today"
          ? new Date().toISOString().slice(0, 10)
          : field.defaultValue
        : undefined;
    if (!present && fallback === undefined && (mode === "update" || !field.required)) continue;
    const parsed = fieldValueSchema(field).safeParse(present ? input[field.key] : fallback);
    if (!parsed.success) {
      errors[field.key] = parsed.error.issues[0]?.message ?? `${field.label} invalide.`;
      continue;
    }
    if (parsed.data === undefined) continue;
    if (isCustomKey(field.key))
      customFields[field.key.slice(3)] =
        parsed.data instanceof Date ? parsed.data.toISOString().slice(0, 10) : parsed.data;
    else data[field.column ?? field.key] = parsed.data;
  }
  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : { success: true, value: { data, customFields } };
}
