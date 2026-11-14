import { type FieldDef, formatCents, formatDuration } from "@quercy/core";

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Valeur d'une mesure affichée selon son champ (montant, durée, nombre). */
export function formatMeasure(field: FieldDef | null, value: number): string {
  if (!field) return number.format(value);
  if (field.type === "currency")
    return field.cents ? formatCents(Math.round(value)) : formatCents(Math.round(value * 100));
  if (field.type === "duration") return formatDuration(value);
  if (field.type === "percent") return `${number.format(value)} %`;
  return number.format(value);
}

/** Valeur exportée (CSV, Excel) : nombre brut en euros ou en heures, lisible par un tableur. */
export function exportMeasure(field: FieldDef | null, value: number): number {
  if (field?.type === "currency" && field.cents) return Math.round(value) / 100;
  if (field?.type === "duration") return Math.round((value / 60) * 100) / 100;
  return Math.round(value * 100) / 100;
}

/** Libellé de colonne d'export de la mesure (unité comprise). */
export function exportMeasureHeader(field: FieldDef | null, label: string): string {
  if (field?.type === "currency") return `${label} (€)`;
  if (field?.type === "duration") return `${label} (heures)`;
  return label;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** CSV au format européen (séparateur « ; », virgule décimale, BOM UTF-8 pour Excel). */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const format = (v: string | number) => (typeof v === "number" ? String(v).replace(".", ",") : v);
  const lines = [
    headers.map(cell).join(";"),
    ...rows.map((r) => r.map((v) => cell(format(v))).join(";")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
