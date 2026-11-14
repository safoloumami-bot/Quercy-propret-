/**
 * Matériel, véhicules, location et stock par emplacement : règles pures (prix d'une location,
 * chevauchements, échéances des véhicules, clé d'emplacement de stock).
 */

const DAY_MS = 86_400_000;

/* ----------------------------------------------------------------- location */

export type RentalPeriod = "day" | "week" | "month";

/** Jours de location, bornes incluses (du lundi au lundi = 8 jours). */
export function rentalDays(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
}

/** Nombre de périodes facturées : toute période entamée est due. */
export function rentalPeriods(start: Date, end: Date, period: string): number {
  const days = rentalDays(start, end);
  if (period === "week") return Math.ceil(days / 7);
  if (period === "month") return Math.ceil(days / 30);
  return days;
}

export function rentalAmountCents(rental: {
  startDate: Date;
  endDate: Date;
  period: string;
  unitPriceCents: number;
}): number {
  return rentalPeriods(rental.startDate, rental.endDate, rental.period) * rental.unitPriceCents;
}

/** Deux locations du même matériel se chevauchent-elles (jours inclus) ? */
export function rentalsOverlap(
  a: { startDate: Date; endDate: Date },
  b: { startDate: Date; endDate: Date },
): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export const RENTAL_PERIOD_LABELS: Record<string, { one: string; many: string }> = {
  day: { one: "jour", many: "jours" },
  week: { one: "semaine", many: "semaines" },
  month: { one: "mois", many: "mois" },
};

/* --------------------------------------------------------------- véhicules */

export interface VehicleDue {
  /** Clé stable de l'échéance (pour ne prévenir qu'une fois). */
  key: string;
  label: string;
  date: Date | null;
  overdue: boolean;
}

export const VEHICLE_ALERT_DAYS = 30;

/**
 * Échéances d'un véhicule à surveiller : contrôle technique, entretien (date ou kilométrage),
 * assurance, fin de contrat — dans les 30 jours ou dépassées.
 */
export function vehicleDues(
  v: {
    inspectionDueDate: Date | null;
    nextServiceDate: Date | null;
    nextServiceMileage: number | null;
    mileage: number | null;
    insuranceDueDate: Date | null;
    contractEndDate: Date | null;
  },
  today: Date,
): VehicleDue[] {
  const out: VehicleDue[] = [];
  const check = (key: string, label: string, date: Date | null) => {
    if (!date) return;
    const days = Math.floor((date.getTime() - today.getTime()) / DAY_MS);
    if (days <= VEHICLE_ALERT_DAYS)
      out.push({
        key: `${key}:${date.toISOString().slice(0, 10)}`,
        label,
        date,
        overdue: days < 0,
      });
  };
  check("inspection", "Contrôle technique", v.inspectionDueDate);
  check("service", "Entretien", v.nextServiceDate);
  check("insurance", "Assurance", v.insuranceDueDate);
  check("contract", "Fin du contrat de financement", v.contractEndDate);
  if (v.nextServiceMileage && v.mileage !== null && v.mileage >= v.nextServiceMileage)
    out.push({
      key: `service-km:${v.nextServiceMileage}`,
      label: `Entretien des ${v.nextServiceMileage.toLocaleString("fr-FR")} km`,
      date: null,
      overdue: true,
    });
  return out;
}

/* ------------------------------------------------------- stock par emplacement */

export type StockLocationKind = "warehouse" | "vehicle" | "holder" | "site" | "none";

export interface StockLocationRef {
  warehouseId?: string | null;
  vehicleId?: string | null;
  holderId?: string | null;
  siteId?: string | null;
}

/** Emplacement d'un mouvement : un seul des quatre, sinon « non localisé ». */
export function stockLocation(m: StockLocationRef): { kind: StockLocationKind; id: string | null } {
  if (m.warehouseId) return { kind: "warehouse", id: m.warehouseId };
  if (m.vehicleId) return { kind: "vehicle", id: m.vehicleId };
  if (m.holderId) return { kind: "holder", id: m.holderId };
  if (m.siteId) return { kind: "site", id: m.siteId };
  return { kind: "none", id: null };
}

/** Effet d'un mouvement sur le stock (entrée +, sortie −, ajustement signé). */
export function stockDelta(m: { type: string; quantity: number }): number {
  return m.type === "out" ? -m.quantity : m.quantity;
}
