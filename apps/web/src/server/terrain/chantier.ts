import { dayKey } from "@quercy/core";

import { CHECKLISTS, type Checklist, checklistFor } from "./checklists";

/** Point de contrôle tel que relevé sur le téléphone. */
export interface FieldItem {
  l: string;
  crit: boolean;
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
export interface FieldPhoto {
  id: string;
  piece: string;
  slot: "avant" | "apres";
  ts: number;
  fileId: string;
}
export interface FieldJournal {
  ts: number;
  a: string;
  d: string;
  par: string;
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

/** Relevé de l'application terrain, rangé dans `intervention.fieldData`. */
export interface FieldData {
  ref?: string;
  grille?: string;
  client?: { nom?: string; contact?: string; tel?: string; email?: string };
  pieces?: FieldRoom[];
  cons?: FieldConsumable[];
  signataire?: string;
  signatureTs?: number;
  photos?: FieldPhoto[];
  journal?: FieldJournal[];
  arriveeDifferee?: boolean;
  departDiffere?: boolean;
  corrige?: boolean;
  cloture?: FieldClosure;
}

export interface InterventionRow {
  id: string;
  title: string;
  date: Date;
  startTime: string | null;
  durationMinutes: number | null;
  status: string;
  ownerId: string | null;
  siteId: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  signatureUrl: string | null;
  signedBy: string | null;
  notes: string | null;
  fieldData: unknown;
  updatedAt: Date;
  site: {
    name: string;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    surfaceM2: number | null;
    company: { name: string; email: string | null; phone: string | null } | null;
  } | null;
  company: { name: string; email: string | null; phone: string | null } | null;
}

export const INTERVENTION_INCLUDE = {
  site: {
    select: {
      name: true,
      address: true,
      postalCode: true,
      city: true,
      surfaceM2: true,
      company: { select: { name: true, email: true, phone: true } },
    },
  },
  company: { select: { name: true, email: true, phone: true } },
} as const;

export function readFieldData(value: unknown): FieldData {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as FieldData) : {};
}

/** Grille de l'intervention : celle déjà commencée, sinon celle de sa prestation. */
export function checklistOf(row: Pick<InterventionRow, "title" | "site">, data: FieldData) {
  return CHECKLISTS.find((c) => c.key === data.grille) ?? checklistFor(row.title, row.site?.name);
}

export function freshRooms(list: Checklist): FieldRoom[] {
  return list.pieces.map((p) => ({
    n: p.n,
    items: p.items.map((i) => ({ ...i, ok: false, nc: "", ts: 0 })),
  }));
}

/** Complète le relevé (grille et consommables) s'il n'a pas encore été commencé. */
export function withDefaults(row: Pick<InterventionRow, "title" | "site">, data: FieldData) {
  const list = checklistOf(row, data);
  return {
    ...data,
    grille: data.grille ?? list.key,
    pieces: data.pieces ?? freshRooms(list),
    cons: data.cons ?? list.consommables.map((c) => ({ ...c, q: 0 })),
  } satisfies FieldData;
}

export function plannedHours(row: Pick<InterventionRow, "durationMinutes">): number {
  return row.durationMinutes ? row.durationMinutes / 60 : 2;
}

export function shortRef(row: Pick<InterventionRow, "id">, data: FieldData): string {
  return data.ref ?? `INT-${row.id.slice(-6).toUpperCase()}`;
}

export function clientName(row: InterventionRow, data: FieldData): string {
  return (
    data.client?.nom || row.site?.name || row.site?.company?.name || row.company?.name || row.title
  );
}

export function statusOf(row: InterventionRow, data: FieldData) {
  return data.cloture
    ? "cloture"
    : row.checkOutAt
      ? "a-cloturer"
      : row.checkInAt
        ? "en-cours"
        : "prevu";
}

/** Ligne de la tournée. */
export function toStop(row: InterventionRow) {
  const data = readFieldData(row.fieldData);
  return {
    id: row.id,
    date: dayKey(row.date),
    heure: row.startTime ?? "",
    client: clientName(row, data),
    ville: row.site?.city ?? "",
    prestation: row.title,
    agentId: row.ownerId ?? "",
    devise: plannedHours(row),
    statut: statusOf(row, data),
  };
}

/** Fiche complète, au format attendu par l'application terrain. */
export function toChantier(row: InterventionRow) {
  const data = withDefaults(row, readFieldData(row.fieldData));
  const company = row.site?.company ?? row.company;
  return {
    id: row.id,
    ref: shortRef(row, data),
    client: clientName(row, data),
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
    agentId: row.ownerId ?? "",
    pieces: data.pieces,
    cons: data.cons,
    obs: row.notes ?? "",
    signature: row.signatureUrl,
    signataire: row.signedBy ?? data.signataire ?? "",
    signatureTs: data.signatureTs ?? null,
    photos: (data.photos ?? []).map(({ id, piece, slot, ts }) => ({ id, piece, slot, ts })),
    journal: data.journal ?? [],
    arrivee: row.checkInAt?.getTime() ?? null,
    depart: row.checkOutAt?.getTime() ?? null,
    arriveeDifferee: data.arriveeDifferee ?? false,
    departDiffere: data.departDiffere ?? false,
    corrige: data.corrige ?? false,
    cloture: data.cloture ?? null,
    maj: row.updatedAt.getTime(),
  };
}

export function addJournal(data: FieldData, a: string, d: string, par: string): void {
  data.journal = [...(data.journal ?? []), { ts: Date.now(), a, d, par }].slice(-200);
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
