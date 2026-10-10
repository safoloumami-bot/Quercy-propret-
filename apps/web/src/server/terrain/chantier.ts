import {
  FIELD_ANOMALY_TYPES,
  SITE_INFO_CATEGORIES,
  INTERVENTION_EVENT_TYPES,
  anomalyTypeLabel,
  dayKey,
} from "@quercy/core";

import type { PlannedTask } from "../cleaning/missions";
import { CHECKLISTS, type Checklist, checklistFor } from "./checklists";

/** Point de contrôle tel que l'application terrain l'affiche. */
export interface FieldItem {
  l: string;
  crit: boolean;
  /** Photo obligatoire (fiche mission). */
  photo?: boolean;
  ok: boolean;
  nc: string;
  ts: number;
}
export interface FieldRoom {
  n: string;
  items: FieldItem[];
}
export interface FieldConsumable {
  l: string;
  u: string;
  q: number;
}
export interface FieldClosure {
  ts: number;
  duree: number;
  ok: number;
  tot: number;
  res: number;
  bon: string;
  par: string;
  mail?: { envoye: boolean; raison: string };
}

/**
 * État propre à l'application, rangé dans `intervention.fieldData`. Le relevé lui-même
 * (points de contrôle, consommables, photos, journal) est dans ses tables.
 */
export interface FieldData {
  ref?: string;
  grille?: string;
  client?: { nom?: string; contact?: string; tel?: string; email?: string };
  signataire?: string;
  signatureTs?: number;
  arriveeDifferee?: boolean;
  departDiffere?: boolean;
  corrige?: boolean;
  cloture?: FieldClosure;
  /** Saisies du planificateur de l'application (v15). */
  consignes?: string;
  taux?: number;
  siren?: string;
  annule?: { ts: number; par: string; motif: string } | false;
  /** Réserves laissées au passage précédent chez ce client, à reprendre. */
  reprises?: { piece: string; point: string; motif: string; date: string }[];
  exemple?: boolean;
  demo?: boolean;
  /** Pointé depuis l'application : la clôture s'y fait aussi (sinon réalisée dans le logiciel). */
  terrain?: boolean;
}

const SITE_INFO_LABEL: Record<string, string> = Object.fromEntries(
  SITE_INFO_CATEGORIES.map((c) => [c.value, c.label]),
);

interface ContactRow {
  name: string;
  email: string | null;
  phone: string | null;
  siren?: string | null;
}

/** Ligne de tournée : de quoi afficher l'arrêt, sans le relevé. */
export interface StopRow {
  id: string;
  title: string;
  date: Date;
  startTime: string | null;
  durationMinutes: number | null;
  status: string;
  ownerId: string | null;
  replacementAgentId: string | null;
  siteId: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  workedMinutes: number | null;
  companyId: string | null;
  invoiceId: string | null;
  fieldData: unknown;
  site: {
    name: string;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    companyId: string | null;
    company: ContactRow | null;
  } | null;
  company: ContactRow | null;
  review: { rating: number | null } | null;
}

/** Fiche mission affichée à l'agent (procédure, produits, consignes, infos du site). */
export interface MissionInfo {
  id: string;
  title: string;
  version: number;
  procedure: string | null;
  products: string | null;
  equipment: string | null;
  instructions: string | null;
  durationMinutes: number | null;
}

export interface InterventionRow extends StopRow {
  serviceLineId: string | null;
  missionSheetId: string | null;
  /** Ajoutés au chargement : fiche mission, tâches dues (si pas encore de points), infos. */
  mission?: MissionInfo | null;
  planned?: PlannedTask[];
  siteInfos?: { category: string; label: string; content: string }[];
  reportNumber: string | null;
  signatureUrl: string | null;
  signedBy: string | null;
  notes: string | null;
  updatedAt: Date;
  site:
    | (NonNullable<StopRow["site"]> & {
        surfaceM2: number | null;
        instructions: string | null;
      })
    | null;
  review: {
    token: string;
    rating: number | null;
    comment: string | null;
    ratedAt: Date | null;
    requestedAt: Date | null;
  } | null;
  invoice: { id: string; number: string | null } | null;
  series: { timezone: string } | null;
  tasks: {
    id: string;
    area: string;
    label: string;
    critical: boolean;
    done: boolean;
    doneAt: Date | null;
    reason: string | null;
    photoRequired: boolean;
    sortOrder: number;
  }[];
  consumables: {
    id: string;
    label: string;
    unit: string | null;
    quantity: number;
    sortOrder: number;
  }[];
  proofs: {
    id: string;
    type: string;
    area: string | null;
    clientRef: string | null;
    fileId: string | null;
    takenAt: Date;
  }[];
  events: { type: string; at: Date; metadata: unknown; user: { name: string } | null }[];
  anomalies: {
    id: string;
    type: string;
    location: string | null;
    comment: string | null;
    status: string;
    reportedAt: Date;
  }[];
}

const CONTACT = { select: { name: true, email: true, phone: true, siren: true } } as const;

export const STOP_INCLUDE = {
  site: {
    select: {
      name: true,
      city: true,
      address: true,
      postalCode: true,
      companyId: true,
      company: CONTACT,
    },
  },
  company: CONTACT,
  review: { select: { rating: true } },
} as const;

/** Journal affiché dans l'application : les 200 derniers évènements. */
export const JOURNAL_LIMIT = 200;
export const PHOTO_TYPES = ["photo_before", "photo_after"];

export const INTERVENTION_INCLUDE = {
  site: {
    select: {
      name: true,
      address: true,
      postalCode: true,
      city: true,
      surfaceM2: true,
      instructions: true,
      companyId: true,
      company: CONTACT,
    },
  },
  company: CONTACT,
  review: {
    select: { token: true, rating: true, comment: true, ratedAt: true, requestedAt: true },
  },
  invoice: { select: { id: true, number: true } },
  series: { select: { timezone: true } },
  tasks: { orderBy: { sortOrder: "asc" } },
  consumables: { orderBy: { sortOrder: "asc" } },
  proofs: {
    where: { type: { in: PHOTO_TYPES } },
    orderBy: { takenAt: "asc" },
    select: { id: true, type: true, area: true, clientRef: true, fileId: true, takenAt: true },
  },
  events: {
    orderBy: { at: "desc" },
    take: JOURNAL_LIMIT,
    select: { type: true, at: true, metadata: true, user: { select: { name: true } } },
  },
  // L'agent revoit ce qui a été signalé du terrain ; les détections automatiques
  // (hors créneau, durée…) restent l'affaire des responsables.
  anomalies: {
    where: { archivedAt: null, source: "agent" },
    orderBy: { reportedAt: "asc" },
    select: { id: true, type: true, location: true, comment: true, status: true, reportedAt: true },
  },
} as const;

export function readFieldData(value: unknown): FieldData {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as FieldData) : {};
}

/** Grille de l'intervention : celle déjà commencée, sinon celle de sa prestation. */
export function checklistOf(row: Pick<StopRow, "title" | "site">, data: FieldData): Checklist {
  return CHECKLISTS.find((c) => c.key === data.grille) ?? checklistFor(row.title, row.site?.name);
}

/** Points de contrôle à créer pour une intervention qui n'en a pas encore. */
export function freshTasks(list: Checklist) {
  return list.pieces.flatMap((p) =>
    p.items.map((i) => ({ area: p.n, label: i.l, critical: i.crit })),
  );
}

/** Points de contrôle regroupés par pièce, au format de l'application. */
export function roomsOf(
  row: Pick<InterventionRow, "title" | "site" | "tasks" | "planned">,
  data: FieldData,
): FieldRoom[] {
  // Pas encore de points enregistrés : tâches dues de la fiche mission, sinon grille type.
  const tasks = row.tasks.length
    ? row.tasks
    : row.planned?.map((t) => ({ ...t, done: false, reason: null, doneAt: null }));
  if (!tasks)
    return checklistOf(row, data).pieces.map((p) => ({
      n: p.n,
      items: p.items.map((i) => ({ ...i, ok: false, nc: "", ts: 0 })),
    }));
  const rooms: FieldRoom[] = [];
  for (const t of tasks) {
    let room = rooms.at(-1);
    if (!room || room.n !== t.area) {
      room = { n: t.area, items: [] };
      rooms.push(room);
    }
    room.items.push({
      l: t.label,
      crit: t.critical,
      ...(t.photoRequired ? { photo: true } : {}),
      ok: t.done,
      nc: t.reason ?? "",
      ts: t.doneAt?.getTime() ?? 0,
    });
  }
  return rooms;
}

export function consumablesOf(
  row: Pick<InterventionRow, "title" | "site" | "consumables">,
  data: FieldData,
): FieldConsumable[] {
  if (row.consumables.length)
    return row.consumables.map((c) => ({ l: c.label, u: c.unit ?? "", q: c.quantity }));
  return checklistOf(row, data).consommables.map((c) => ({ ...c, q: 0 }));
}

export function plannedHours(row: Pick<StopRow, "durationMinutes">): number {
  return row.durationMinutes ? row.durationMinutes / 60 : 2;
}

export function shortRef(row: Pick<StopRow, "id">, data: FieldData): string {
  return data.ref ?? `INT-${row.id.slice(-6).toUpperCase()}`;
}

export function clientName(row: StopRow, data: FieldData): string {
  return (
    data.client?.nom || row.site?.name || row.site?.company?.name || row.company?.name || row.title
  );
}

/** Intervention réalisée dans le logiciel, sans passer par l'application. */
export function doneInSoftware(row: Pick<StopRow, "status">, data: FieldData) {
  return row.status === "done" && !data.cloture && !data.terrain;
}

export function statusOf(row: StopRow, data: FieldData) {
  return row.status === "cancelled"
    ? "annule"
    : data.cloture || doneInSoftware(row, data)
      ? "cloture"
      : row.checkOutAt
        ? "a-cloturer"
        : row.checkInAt
          ? "en-cours"
          : "prevu";
}

/** Ligne de la tournée. */
/** Heures réellement pointées (clôture, sinon minutes travaillées), ou null. */
export function realHours(row: StopRow, data: FieldData): number | null {
  if (data.cloture) return data.cloture.duree / 3_600_000;
  if (row.workedMinutes) return row.workedMinutes / 60;
  if (row.status === "done" && row.checkInAt && row.checkOutAt)
    return (row.checkOutAt.getTime() - row.checkInAt.getTime()) / 3_600_000;
  return null;
}

/**
 * Clôture affichée par l'application : celle du terrain, sinon (intervention marquée
 * réalisée dans le logiciel) un résumé tiré de l'intervention elle-même.
 */
export function closureOf(row: InterventionRow, data: FieldData): FieldClosure | null {
  if (data.cloture) return data.cloture;
  if (!doneInSoftware(row, data)) return null;
  const hours = realHours(row, data) ?? (row.durationMinutes ?? 0) / 60;
  return {
    ts: row.updatedAt.getTime(),
    duree: Math.round(hours * 3_600_000),
    ok: row.tasks.filter((t) => t.done).length,
    tot: row.tasks.length,
    res: row.tasks.filter((t) => !t.done).length,
    bon: row.reportNumber ?? "",
    par: "logiciel",
    mail: { envoye: false, raison: "réalisée dans le logiciel" },
  };
}

export function toStop(row: StopRow) {
  const data = readFieldData(row.fieldData);
  return {
    id: row.id,
    date: dayKey(row.date),
    heure: row.startTime ?? "",
    client: clientName(row, data),
    ville: row.site?.city ?? "",
    adresse: row.site?.address ?? "",
    cp: row.site?.postalCode ?? "",
    prestation: row.title,
    modele: checklistOf(row, data).label,
    agentId: row.replacementAgentId ?? row.ownerId ?? "",
    devise: plannedHours(row),
    taux: data.taux ?? 0,
    arrivee: row.checkInAt?.getTime() ?? null,
    reel: realHours(row, data),
    note: row.review?.rating ?? null,
    exemple: Boolean(data.exemple),
    demo: Boolean(data.demo),
    statut: statusOf(row, data),
  };
}
export type Stop = ReturnType<typeof toStop>;

interface JournalMeta {
  label?: string;
  detail?: string;
  by?: string;
  source?: string;
}

/** Journal du chantier, du plus ancien au plus récent, tiré des évènements. */
export function journalOf(row: Pick<InterventionRow, "events">) {
  return (
    [...row.events]
      .reverse()
      .map((e) => ({ e, meta: (e.metadata ?? {}) as JournalMeta }))
      // Le récapitulatif « contrôle mis à jour » double les lignes point par point.
      .filter(({ e, meta }) => e.type !== "checklist_updated" || meta.label)
      // Les détections automatiques ne s'affichent qu'aux responsables, dans le logiciel.
      .filter(({ e, meta }) => e.type !== "anomaly_reported" || meta.source === "agent")
      .map(({ e, meta }) => ({
        ts: e.at.getTime(),
        a:
          meta.label ??
          INTERVENTION_EVENT_TYPES[e.type as keyof typeof INTERVENTION_EVENT_TYPES] ??
          e.type,
        d: meta.detail ?? "",
        par: meta.by ?? e.user?.name ?? "",
      }))
  );
}

/** Anomalie signalée, telle que l'agent la voit (sans le circuit de validation). */
export function toAnomalyLine(a: InterventionRow["anomalies"][number]) {
  return {
    id: a.id,
    libelle: anomalyTypeLabel(a.type),
    lieu: a.location ?? "",
    commentaire: a.comment ?? "",
    ts: a.reportedAt.getTime(),
  };
}

/** Points de contrôle regroupés par pièce, dans l'ordre. */
export function tasksByRoom<T extends { area: string }>(tasks: T[]): T[][] {
  const rooms: T[][] = [];
  for (const t of tasks) {
    const last = rooms.at(-1);
    if (last && last[0]!.area === t.area) last.push(t);
    else rooms.push([t]);
  }
  return rooms;
}

/** Fiche complète, au format attendu par l'application terrain. */
export function toChantier(row: InterventionRow) {
  const data = readFieldData(row.fieldData);
  const company = row.site?.company ?? row.company;
  return {
    id: row.id,
    ref: shortRef(row, data),
    client: clientName(row, data),
    modele: checklistOf(row, data).label,
    consignes: data.consignes ?? row.site?.instructions ?? "",
    taux: data.taux ?? 0,
    siren: data.siren || company?.siren || "",
    annule: row.status === "cancelled" ? data.annule || { ts: 0, par: "", motif: "" } : false,
    reprises: data.reprises ?? [],
    exemple: Boolean(data.exemple),
    demo: Boolean(data.demo),
    avis: row.review
      ? {
          jeton: row.review.token,
          note: row.review.rating,
          commentaire: row.review.comment ?? "",
          ts: row.review.ratedAt?.getTime() ?? null,
          demande: row.review.requestedAt?.getTime() ?? null,
        }
      : null,
    facture: row.invoice ? { id: row.invoice.id, numero: row.invoice.number ?? "brouillon" } : null,
    contact: data.client?.contact ?? "",
    tel: data.client?.tel || company?.phone || "",
    email: data.client?.email || company?.email || "",
    adresse: row.site?.address ?? "",
    cp: row.site?.postalCode ?? "",
    ville: row.site?.city ?? "",
    prestation: row.title,
    surface: row.site?.surfaceM2 ?? 0,
    date: dayKey(row.date),
    heure: row.startTime ?? "",
    devise: plannedHours(row),
    agentId: row.replacementAgentId ?? row.ownerId ?? "",
    pieces: roomsOf(row, data),
    cons: consumablesOf(row, data),
    obs: row.notes ?? "",
    signature: row.signatureUrl,
    signataire: row.signedBy ?? data.signataire ?? "",
    signatureTs: data.signatureTs ?? null,
    photos: row.proofs.map((p) => ({
      id: p.clientRef ?? p.id,
      piece: p.area ?? "",
      slot: p.type === "photo_after" ? "apres" : "avant",
      ts: p.takenAt.getTime(),
    })),
    journal: journalOf(row),
    anomalies: row.anomalies.map(toAnomalyLine),
    typesAnomalie: FIELD_ANOMALY_TYPES,
    mission: row.mission
      ? {
          titre: row.mission.title,
          version: row.mission.version,
          procedure: row.mission.procedure ?? "",
          produits: row.mission.products ?? "",
          materiel: row.mission.equipment ?? "",
          consignes: row.mission.instructions ?? "",
          duree: row.mission.durationMinutes,
        }
      : null,
    infos: (row.siteInfos ?? []).map((i) => ({
      categorie: SITE_INFO_LABEL[i.category] ?? i.category,
      titre: i.label,
      contenu: i.content,
    })),
    arrivee: row.checkInAt?.getTime() ?? null,
    depart: row.checkOutAt?.getTime() ?? null,
    arriveeDifferee: data.arriveeDifferee ?? false,
    departDiffere: data.departDiffere ?? false,
    corrige: data.corrige ?? false,
    cloture: closureOf(row, data),
    maj: row.updatedAt.getTime(),
  };
}

/**
 * Points du contrôle qualité du logiciel déduits du relevé pièce par pièce : un point est
 * conforme quand tous les éléments qui s'y rapportent sont validés.
 */
const CHECK_PATTERNS = {
  floors: /\bsols?\b|marches|paliers/i,
  sanitary: /sanitaire|salle de bain|cuvette|urinoir|lavabo/i,
  dusting: /poussi|d[ée]poussi|surfaces/i,
  windows: /vitre|miroir/i,
  bins: /poubelle|corbeille|d[ée]chet|\bbacs?\b|gravats/i,
} as const;

export function inspectionChecks(rooms: FieldRoom[]): Record<keyof typeof CHECK_PATTERNS, boolean> {
  const items = rooms.flatMap((r) => r.items.map((i) => ({ ...i, text: `${r.n} ${i.l}` })));
  return Object.fromEntries(
    Object.entries(CHECK_PATTERNS).map(([key, re]) => {
      const related = items.filter((i) => re.test(i.text));
      return [key, related.length ? related.every((i) => i.ok) : items.every((i) => i.ok)];
    }),
  ) as Record<keyof typeof CHECK_PATTERNS, boolean>;
}
