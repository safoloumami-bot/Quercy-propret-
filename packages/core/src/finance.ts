/**
 * Pilotage financier : chiffre d'affaires produit par les passages, coûts directs et marge
 * contributive. Règles pures, en centimes.
 */

export interface FinanceVisit {
  status: string;
  /** « 2026-10 » : mois du passage. */
  month: string;
  contractId: string | null;
  extraPriceCents: number | null;
  extraStatus: string | null;
}

export interface FinanceContract {
  id: string;
  kind: string;
  billingMode: string;
  monthlyPriceCents: number | null;
  visitPriceCents: number | null;
}

/**
 * CA d'un contrat sur ses passages, mois par mois (comme la facture) : forfait au prorata
 * des passages faits ou prévus (les manqués sont déduits), ou passages réalisés × prix.
 */
export function contractRevenueCents(contract: FinanceContract, visits: FinanceVisit[]): number {
  const own = visits.filter((v) => v.contractId === contract.id && v.status !== "cancelled");
  if (contract.billingMode === "per_visit")
    return own.filter((v) => v.status === "done").length * (contract.visitPriceCents ?? 0);
  const monthly = contract.monthlyPriceCents ?? 0;
  if (!monthly) return 0;
  const byMonth = new Map<string, FinanceVisit[]>();
  for (const v of own) byMonth.set(v.month, [...(byMonth.get(v.month) ?? []), v]);
  let total = 0;
  for (const list of byMonth.values()) {
    const missed = list.filter((v) => v.status === "missed").length;
    total += Math.round((monthly * (list.length - missed)) / list.length);
  }
  return total;
}

/** Supplément validé et réalisé : CA ponctuel. */
export function extraRevenueCents(v: FinanceVisit): number {
  return v.extraStatus === "approved" && v.status === "done" ? (v.extraPriceCents ?? 0) : 0;
}

/** Coût de main-d'œuvre d'un passage (minutes × coût horaire). */
export function laborCostCents(minutes: number, hourlyCostCents: number): number {
  return Math.round((Math.max(0, minutes) / 60) * hourlyCostCents);
}

/** Coût mensuel ramené à une période (jours / 30,4375). */
export function prorateMonthly(monthlyCents: number, from: Date, to: Date): number {
  const days = Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
  return Math.round((monthlyCents * days) / 30.4375);
}

export interface MarginLine {
  revenueCents: number;
  costCents: number;
}

/** Marge contributive en € et en % du CA (null sans CA). */
export function marginOf(line: MarginLine): { marginCents: number; marginPct: number | null } {
  const marginCents = line.revenueCents - line.costCents;
  return {
    marginCents,
    marginPct:
      line.revenueCents > 0 ? Math.round((marginCents / line.revenueCents) * 1000) / 10 : null,
  };
}

/** Mois couverts par une période, « 2026-01 » … « 2026-03 ». */
export function monthsBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (d <= to) {
    out.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

export type FinancePreset = "month" | "last_month" | "quarter" | "12m" | "year";

export const FINANCE_PRESETS: { value: FinancePreset; label: string }[] = [
  { value: "month", label: "Ce mois-ci" },
  { value: "last_month", label: "Mois dernier" },
  { value: "quarter", label: "3 derniers mois" },
  { value: "12m", label: "12 derniers mois" },
  { value: "year", label: "Depuis le 1er janvier" },
];

/** Bornes (jours UTC, incluses) d'une période prédéfinie, à partir d'aujourd'hui. */
export function financeRange(preset: FinancePreset, today: Date): { from: Date; to: Date } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const day = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd));
  switch (preset) {
    case "last_month":
      return { from: day(y, m - 1, 1), to: day(y, m, 0) };
    case "quarter":
      return { from: day(y, m - 2, 1), to: day(y, m + 1, 0) };
    case "12m":
      return { from: day(y, m - 11, 1), to: day(y, m + 1, 0) };
    case "year":
      return { from: day(y, 0, 1), to: day(y, m + 1, 0) };
    default:
      return { from: day(y, m, 1), to: day(y, m + 1, 0) };
  }
}
