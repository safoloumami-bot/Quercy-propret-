/**
 * Anomalies : signalées par l'agent ou détectées par le système, elles partent au chef et au
 * patron, jamais au client. Le chef valide, rejette ou corrige ; seule une anomalie validée
 * peut figurer dans un rapport client.
 */

/** Types signalables depuis le terrain. */
export const FIELD_ANOMALY_TYPES = [
  { value: "lighting", label: "Ampoule HS / éclairage" },
  { value: "bulky_items", label: "Encombrants" },
  { value: "leak", label: "Fuite / eau" },
  { value: "door_lock", label: "Porte / serrure" },
  { value: "intercom", label: "Interphone" },
  { value: "pests", label: "Nuisibles" },
  { value: "damage", label: "Dégradation" },
  { value: "unusual_dirt", label: "Salissure inhabituelle" },
  { value: "other", label: "Autre" },
] as const;

/** Types détectés automatiquement. */
export const SYSTEM_ANOMALY_TYPES = [
  { value: "missed_visit", label: "Passage non réalisé" },
  { value: "off_schedule", label: "Arrivée hors créneau" },
  { value: "abnormal_duration", label: "Durée anormale" },
  { value: "critical_point", label: "Point critique non fait" },
  { value: "missing_proof", label: "Photo obligatoire manquante" },
  { value: "inspection_failed", label: "Contrôle qualité non conforme" },
] as const;

export type FieldAnomalyType = (typeof FIELD_ANOMALY_TYPES)[number]["value"];
export type SystemAnomalyType = (typeof SYSTEM_ANOMALY_TYPES)[number]["value"];
export type AnomalyType = FieldAnomalyType | SystemAnomalyType;

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  [...FIELD_ANOMALY_TYPES, ...SYSTEM_ANOMALY_TYPES].map((t) => [t.value, t.label]),
);

export function anomalyTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export const ANOMALY_STATUSES = [
  { value: "reported", label: "À valider" },
  { value: "validated", label: "Validée" },
  { value: "in_progress", label: "En cours" },
  { value: "resolved", label: "Résolue" },
  { value: "rejected", label: "Rejetée" },
] as const;
export type AnomalyStatus = (typeof ANOMALY_STATUSES)[number]["value"];

export const ANOMALY_SEVERITIES = [
  { value: "low", label: "Faible" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
  { value: "critical", label: "Critique" },
] as const;
export type AnomalySeverity = (typeof ANOMALY_SEVERITIES)[number]["value"];

export const ANOMALY_SOURCES = {
  agent: "Agent",
  system: "Détection automatique",
  inspection: "Contrôle qualité",
  client: "Client",
} as const;

export type AnomalyAction = "validate" | "reject" | "start" | "resolve" | "reopen";

const TRANSITIONS: Record<AnomalyAction, { from: readonly AnomalyStatus[]; to: AnomalyStatus }> = {
  validate: { from: ["reported"], to: "validated" },
  reject: { from: ["reported", "validated"], to: "rejected" },
  start: { from: ["validated"], to: "in_progress" },
  resolve: { from: ["validated", "in_progress"], to: "resolved" },
  reopen: { from: ["rejected", "resolved"], to: "reported" },
};

/** Statut suivant, ou `null` si l'action n'est pas permise depuis ce statut. */
export function anomalyTransition(status: string, action: AnomalyAction): AnomalyStatus | null {
  const t = TRANSITIONS[action];
  return (t.from as readonly string[]).includes(status) ? t.to : null;
}

/** Une anomalie n'est montrable au client qu'une fois validée par un responsable. */
export function anomalyClientEligible(status: string): boolean {
  return status === "validated" || status === "in_progress" || status === "resolved";
}

/** Anomalie qu'il reste à traiter (compteurs, alertes). */
export function anomalyOpen(status: string): boolean {
  return status === "reported" || status === "validated" || status === "in_progress";
}

/* --------------------------------------------------------- détection automatique */

export interface DetectedAnomaly {
  type: SystemAnomalyType;
  /** Clé anti-doublon : une anomalie automatique n'est créée qu'une fois. */
  dedupeKey: string;
  comment: string;
  severity: AnomalySeverity;
}

export interface PointageFacts {
  id: string;
  /** Jour prévu (minuit UTC). */
  date: Date;
  startTime: string | null;
  durationMinutes: number | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}

/** Écart toléré entre l'heure prévue et l'arrivée. */
export const OFF_SCHEDULE_MINUTES = 120;

function localParts(at: Date, timezone: string): { day: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}h${String(minutes % 60).padStart(2, "0")}`;

/**
 * Anomalies déduites des pointages : arrivée hors créneau (autre jour ou plus de deux heures
 * d'écart avec l'heure prévue) et durée anormale (plus du double ou moins de la moitié du
 * temps prévu, quand il est d'au moins 30 minutes).
 */
export function detectPointageAnomalies(
  i: PointageFacts,
  timezone = "Europe/Paris",
): DetectedAnomaly[] {
  const found: DetectedAnomaly[] = [];
  if (i.checkInAt) {
    const planned = i.date.toISOString().slice(0, 10);
    const local = localParts(i.checkInAt, timezone);
    const start = /^(\d{2}):(\d{2})$/.exec(i.startTime ?? "");
    const startMinutes = start ? Number(start[1]) * 60 + Number(start[2]) : null;
    if (local.day !== planned)
      found.push({
        type: "off_schedule",
        dedupeKey: `creneau:${i.id}`,
        comment: `Arrivée pointée le ${local.day} pour un passage prévu le ${planned}.`,
        severity: "normal",
      });
    else if (startMinutes !== null && Math.abs(local.minutes - startMinutes) > OFF_SCHEDULE_MINUTES)
      found.push({
        type: "off_schedule",
        dedupeKey: `creneau:${i.id}`,
        comment: `Arrivée à ${hhmm(local.minutes)} pour un passage prévu à ${hhmm(startMinutes)}.`,
        severity: "low",
      });
  }
  if (i.checkInAt && i.checkOutAt && i.durationMinutes && i.durationMinutes >= 30) {
    const worked = Math.round((i.checkOutAt.getTime() - i.checkInAt.getTime()) / 60_000);
    if (worked > i.durationMinutes * 2 || worked < i.durationMinutes / 2)
      found.push({
        type: "abnormal_duration",
        dedupeKey: `duree:${i.id}`,
        comment: `${worked} min sur place pour ${i.durationMinutes} min prévues.`,
        severity: worked < i.durationMinutes / 2 ? "high" : "normal",
      });
  }
  return found;
}
