import { z } from "zod";

/**
 * Règles de récurrence d'une série (une version de règle = une de ces règles + sa date
 * d'effet). Jours de la semaine : 1 = lundi … 7 = dimanche. Semaines du mois : 1 à 5, ou -1
 * pour la dernière. Le moteur qui génère les dates s'appuie sur ces règles.
 */
const weekday = z.number().int().min(1).max(7);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue (AAAA-MM-JJ).");

export const recurrenceRuleSchema = z.discriminatedUnion("kind", [
  /** Chaque semaine, ou toutes les N semaines, les jours choisis. */
  z.object({
    kind: z.literal("weekly"),
    weekdays: z.array(weekday).min(1).max(7),
    everyWeeks: z.number().int().min(1).max(8).default(1),
  }),
  /** Semaine(s) du mois : « semaine 1 », « semaines 1 et 3 », « dernier vendredi »… */
  z.object({
    kind: z.literal("monthly_weeks"),
    weekdays: z.array(weekday).min(1).max(7),
    weeks: z
      .array(
        z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(-1),
        ]),
      )
      .min(1),
    everyMonths: z.number().int().min(1).max(12).default(1),
  }),
  /** Jours fixes du mois (le 5, le 20…) ; -1 = dernier jour du mois. */
  z.object({
    kind: z.literal("monthly_days"),
    days: z.array(z.union([z.number().int().min(1).max(31), z.literal(-1)])).min(1),
    everyMonths: z.number().int().min(1).max(12).default(1),
  }),
  /** Tous les N jours à partir de la date d'effet. */
  z.object({
    kind: z.literal("interval_days"),
    days: z.number().int().min(1).max(365),
  }),
  /** Dates précises (ponctuel, personnalisé). */
  z.object({
    kind: z.literal("dates"),
    dates: z.array(isoDay).min(1).max(366),
  }),
]);
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

/** Que faire d'un passage qui tombe un jour férié. */
export const HOLIDAY_POLICIES = [
  { value: "keep", label: "Maintenir le passage" },
  { value: "skip", label: "Ne pas passer" },
  { value: "before", label: "Avancer au jour ouvré précédent" },
  { value: "after", label: "Reporter au jour ouvré suivant" },
] as const;
export type HolidayPolicy = (typeof HOLIDAY_POLICIES)[number]["value"];

export const SERIES_STATUSES = [
  { value: "proposed", label: "Proposée (à valider)" },
  { value: "active", label: "Active" },
  { value: "paused", label: "En pause" },
  { value: "ended", label: "Terminée" },
] as const;

const WEEKDAY_NAMES = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function list(items: string[]): string {
  return items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

const weekdays = (days: number[]) => list([...days].sort().map((d) => WEEKDAY_NAMES[d]!));
const nth = (w: number) => (w === -1 ? "dernier" : w === 1 ? "1er" : `${w}e`);

/** Règle en français, pour l'écran de validation : « chaque lundi », « le 1er et 3e mardi du mois »… */
export function describeRule(rule: RecurrenceRule): string {
  switch (rule.kind) {
    case "weekly":
      return rule.everyWeeks === 1
        ? `chaque ${weekdays(rule.weekdays)}`
        : `${weekdays(rule.weekdays)}, toutes les ${rule.everyWeeks} semaines`;
    case "monthly_weeks": {
      const every = rule.everyMonths === 1 ? "du mois" : `tous les ${rule.everyMonths} mois`;
      return `le ${list(rule.weeks.map(nth))} ${weekdays(rule.weekdays)} ${every}`;
    }
    case "monthly_days": {
      const days = rule.days.map((d) => (d === -1 ? "dernier jour" : d === 1 ? "1er" : String(d)));
      const every = rule.everyMonths === 1 ? "de chaque mois" : `tous les ${rule.everyMonths} mois`;
      return `le ${list(days)} ${every}`;
    }
    case "interval_days":
      return rule.days === 1 ? "chaque jour" : `tous les ${rule.days} jours`;
    case "dates":
      return rule.dates.length === 1
        ? `le ${rule.dates[0]}`
        : `${rule.dates.length} dates précises`;
  }
}

/**
 * Types d'évènements du journal d'une intervention (audit, statistiques, IA). Liste ouverte :
 * un module métier peut en ajouter, le journal reste lisible avec les libellés connus.
 */
export const INTERVENTION_EVENT_TYPES = {
  created: "Intervention créée",
  started: "Arrivée sur site",
  finished: "Départ du site",
  time_corrected: "Pointage corrigé",
  checklist_updated: "Contrôle mis à jour",
  task_done: "Point validé",
  task_undone: "Point décoché",
  task_reason: "Réserve",
  consumables_updated: "Consommables mis à jour",
  photo_added: "Photo ajoutée",
  photo_removed: "Photo supprimée",
  signed: "Signature du client",
  signature_cleared: "Signature effacée",
  anomaly_reported: "Anomalie signalée",
  completed: "Intervention clôturée",
  reassigned: "Intervenant changé",
  rescheduled: "Intervention déplacée",
  status_changed: "Statut changé",
  missed: "Passage non réalisé",
  note: "Note",
} as const;
export type InterventionEventType = keyof typeof INTERVENTION_EVENT_TYPES;
