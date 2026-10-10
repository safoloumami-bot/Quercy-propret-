import { formatCents, formatDuration } from "@quercy/core";

export type Unit = "cents" | "euros" | "minutes" | "count";

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Valeur d'un indicateur dans son unité. */
export function formatUnit(value: number, unit: Unit): string {
  switch (unit) {
    case "cents":
      return formatCents(Math.round(value));
    case "euros":
      return formatCents(Math.round(value * 100));
    case "minutes":
      return formatDuration(value);
    case "count":
      return integer.format(value);
  }
}

/** Graduation d'axe compacte (« 12 k€ »). */
export function formatAxis(value: number, unit: Unit): string {
  if (unit === "cents") return `${compact.format(value / 100)} €`;
  if (unit === "euros") return `${compact.format(value)} €`;
  if (unit === "minutes") return `${compact.format(value / 60)} h`;
  return compact.format(value);
}

/** Évolution affichée (« +12,4 % »). */
export function formatChange(ratio: number): string {
  const pct = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(ratio * 100);
  return `${pct} %`;
}
