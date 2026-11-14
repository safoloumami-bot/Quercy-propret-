/**
 * Chiffrage d'une prestation : coût de revient, prix minimum et conseillé, marge.
 * Toutes les sommes sont en centimes ; les saisies sont « par passage ».
 *
 * Prix de vente = coût total / (1 − taux de marge). Ex. : coût 190 €, marge 32 % → 279,41 € HT.
 */

export interface EstimateInput {
  people: number;
  hoursPerPerson: number;
  hourlyCostCents: number;
  km: number;
  kmCostCents: number;
  /** Temps de trajet aller-retour, payé à chaque personne au coût horaire. */
  travelMinutes: number;
  productsCents: number;
  equipmentCents: number;
  rentalCents: number;
  subcontractCents: number;
  otherCents: number;
  /** Marge souhaitée, en % du prix de vente (0 à 95). */
  targetMarginPct: number;
  /** Prix retenu par passage ; à défaut, le prix conseillé. */
  priceCents?: number | null;
  /** Récurrent : passages par mois (pour le prix mensuel). */
  visitsPerMonth?: number | null;
}

export interface EstimateCosts {
  laborCents: number;
  travelCents: number;
  suppliesCents: number;
  subcontractCents: number;
  otherCents: number;
  costCents: number;
  minPriceCents: number;
  advisedPriceCents: number;
  priceCents: number;
  marginCents: number;
  marginPct: number;
  /** Prix mensuel (récurrent) : prix retenu × passages par mois. */
  monthlyPriceCents: number | null;
  /** La marge du prix retenu passe sous la marge minimale : validation du patron. */
  belowMinimum: boolean;
}

const clampMargin = (pct: number) => Math.min(95, Math.max(0, Number.isFinite(pct) ? pct : 0));

/** Prix de vente pour obtenir une marge donnée sur un coût : coût / (1 − marge). */
export function priceForMargin(costCents: number, marginPct: number): number {
  return Math.round(costCents / (1 - clampMargin(marginPct) / 100));
}

/** Marge en % du prix de vente (0 si le prix est nul). */
export function marginPctOf(priceCents: number, costCents: number): number {
  if (priceCents <= 0) return 0;
  return Math.round(((priceCents - costCents) / priceCents) * 10_000) / 100;
}

export function computeEstimate(input: EstimateInput, minMarginPct: number): EstimateCosts {
  const n = (v: number | null | undefined) => (Number.isFinite(v) ? Number(v) : 0);
  const people = Math.max(0, n(input.people));
  const laborCents = Math.round(people * n(input.hoursPerPerson) * n(input.hourlyCostCents));
  const travelCents = Math.round(
    n(input.km) * n(input.kmCostCents) +
      ((people * n(input.travelMinutes)) / 60) * n(input.hourlyCostCents),
  );
  const suppliesCents = n(input.productsCents) + n(input.equipmentCents) + n(input.rentalCents);
  const subcontractCents = n(input.subcontractCents);
  const otherCents = n(input.otherCents);
  const costCents = laborCents + travelCents + suppliesCents + subcontractCents + otherCents;
  const minPriceCents = priceForMargin(costCents, minMarginPct);
  const advisedPriceCents = priceForMargin(costCents, input.targetMarginPct);
  const priceCents =
    input.priceCents !== null && input.priceCents !== undefined && input.priceCents > 0
      ? Math.round(input.priceCents)
      : advisedPriceCents;
  const marginCents = priceCents - costCents;
  const marginPct = marginPctOf(priceCents, costCents);
  const visits = n(input.visitsPerMonth);
  return {
    laborCents,
    travelCents,
    suppliesCents,
    subcontractCents,
    otherCents,
    costCents,
    minPriceCents,
    advisedPriceCents,
    priceCents,
    marginCents,
    marginPct,
    monthlyPriceCents: visits > 0 ? Math.round(priceCents * visits) : null,
    belowMinimum: costCents > 0 && marginPct < clampMargin(minMarginPct),
  };
}

/** Passages par mois d'après les jours de la semaine (52 semaines / 12 mois). */
export function visitsPerMonthOf(weekdays: readonly string[]): number {
  return Math.round(((weekdays.length * 52) / 12) * 100) / 100;
}

/* ------------------------------------------------- facturation récurrente */

export interface BillableVisit {
  title: string;
  date: Date;
  siteId: string | null;
  siteName: string;
  serviceLineId: string | null;
  serviceLineName: string | null;
  status: string;
  extraPriceCents: number | null;
  extraStatus: string | null;
  contractId: string | null;
}

export interface BillableContract {
  id: string;
  name: string;
  billingMode: string;
  monthlyPriceCents: number | null;
  visitPriceCents: number | null;
}

export interface BillingLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
  /** Groupe d'affichage : le site (ou la cage). */
  group: string;
}

/**
 * Lignes de facture d'un client pour un mois, depuis les passages :
 * - forfait mensuel : le forfait, moins les passages manqués (au prorata du forfait) ;
 * - au passage : les passages réalisés × prix du passage ;
 * - extras validés ajoutés, chacun à son prix.
 * Les passages annulés ne comptent pas.
 */
export function billingLines(
  contracts: BillableContract[],
  visits: BillableVisit[],
  periodLabel: string,
): BillingLine[] {
  const lines: BillingLine[] = [];
  for (const c of contracts) {
    const own = visits.filter((v) => v.contractId === c.id && v.status !== "cancelled");
    const groups = new Map<string, BillableVisit[]>();
    for (const v of own) {
      const key = v.serviceLineName ? `${v.siteName} — ${v.serviceLineName}` : v.siteName;
      groups.set(key, [...(groups.get(key) ?? []), v]);
    }
    if (c.billingMode === "per_visit") {
      const price = c.visitPriceCents ?? 0;
      for (const [group, list] of groups) {
        const done = list.filter((v) => v.status === "done").length;
        if (done)
          lines.push({
            group,
            description: `${c.name} — ${group} : passages réalisés en ${periodLabel}`,
            quantity: done,
            unitPriceCents: price,
          });
      }
      continue;
    }
    const monthly = c.monthlyPriceCents ?? 0;
    if (!monthly) continue;
    const group = [...groups.keys()][0] ?? c.name;
    lines.push({
      group,
      description: `${c.name} — forfait ${periodLabel}`,
      quantity: 1,
      unitPriceCents: monthly,
    });
    const planned = own.length;
    const missed = own.filter((v) => v.status === "missed").length;
    if (planned && missed)
      lines.push({
        group,
        description: `${c.name} — passage${missed > 1 ? "s" : ""} non réalisé${missed > 1 ? "s" : ""} (${missed} sur ${planned}) déduit${missed > 1 ? "s" : ""}`,
        quantity: missed,
        unitPriceCents: -Math.round(monthly / planned),
      });
  }
  for (const v of visits)
    if (v.extraStatus === "approved" && v.extraPriceCents && v.status === "done")
      lines.push({
        group: v.siteName,
        description: `Supplément du ${v.date.toLocaleDateString("fr-FR", { timeZone: "UTC" })} — ${v.title}`,
        quantity: 1,
        unitPriceCents: v.extraPriceCents,
      });
  return lines.sort((a, b) => a.group.localeCompare(b.group, "fr", { numeric: true }));
}
