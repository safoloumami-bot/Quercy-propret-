import type { FieldDef } from "@quercy/core";

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
    default:
      return String(value);
  }
}
