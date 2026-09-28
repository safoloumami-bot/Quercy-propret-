import { type FieldDef, formatCents, formatDuration } from "@quercy/core";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/** Valeur lisible d'un champ (export, sous-titres, historique). */
export function displayValue(
  field: FieldDef,
  row: Record<string, unknown> & { labels?: Record<string, string> },
): string {
  const value = row[field.key];
  if (value === null || value === undefined || value === "") return "";
  switch (field.type) {
    case "select":
      return field.options?.find((o) => o.value === value)?.label ?? String(value);
    case "multiselect":
    case "tags":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "user":
    case "relation":
      return row.labels?.[field.key] ?? "";
    case "boolean":
      return value ? "Oui" : "Non";
    case "date":
      return dateFmt.format(new Date(value as string));
    case "datetime":
      return dateTimeFmt.format(new Date(value as string));
    case "currency":
      // Montants des documents stockés en centimes : exportés en euros.
      return String(field.cents ? Number(value) / 100 : value);
    default:
      return String(value);
  }
}

/** Valeur rédigée pour un humain (assistant, résumés) : montants et durées formatés. */
export function readableValue(
  field: FieldDef,
  row: Record<string, unknown> & { labels?: Record<string, string> },
): string {
  const value = row[field.key];
  if (value === null || value === undefined || value === "") return "";
  if (field.type === "currency")
    return formatCents(Math.round(field.cents ? Number(value) : Number(value) * 100)).replace(
      /[\u202F\u00A0]/g,
      " ",
    );
  if (field.type === "duration") return formatDuration(Number(value));
  if (field.type === "percent") return `${String(value)} %`;
  return displayValue(field, row);
}
