/**
 * Intervenants, absences et remplacements : statuts, attestations, et ordre des propositions
 * de remplacement (remplaçant n°1, n°2, autre agent qualifié, puis sous-traitant).
 */

export const WORKER_KINDS = [
  { value: "employee", label: "Salarié" },
  { value: "subcontractor", label: "Sous-traitant" },
  { value: "manager", label: "Dirigeant" },
] as const;
export type WorkerKind = (typeof WORKER_KINDS)[number]["value"];

export const WORKER_DOCUMENT_KINDS = [
  { value: "urssaf", label: "Attestation URSSAF" },
  { value: "insurance", label: "Assurance responsabilité civile" },
  { value: "kbis", label: "Extrait Kbis" },
  { value: "other", label: "Autre document" },
] as const;

export const ABSENCE_KINDS = [
  { value: "leave", label: "Congés payés" },
  { value: "rtt", label: "RTT" },
  { value: "sick", label: "Maladie" },
  { value: "unavailable", label: "Indisponibilité" },
  { value: "training", label: "Formation" },
  { value: "other", label: "Autre" },
] as const;
export type AbsenceKind = (typeof ABSENCE_KINDS)[number]["value"];

export const ABSENCE_STATUSES = [
  { value: "requested", label: "À valider" },
  { value: "approved", label: "Validée" },
  { value: "rejected", label: "Refusée" },
  { value: "cancelled", label: "Annulée" },
] as const;

export const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((i) => i.value === value)?.label ?? value;

/** Alerte d'attestation : expirée, ou expirant dans les 30 jours. */
export const DOCUMENT_ALERT_DAYS = 30;
export function documentAlertLevel(expiresAt: Date | null, today: Date): "expired" | "soon" | null {
  if (!expiresAt) return null;
  const days = Math.floor((expiresAt.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= DOCUMENT_ALERT_DAYS) return "soon";
  return null;
}

/** Une absence (jours inclus) couvre-t-elle ce jour ? */
export function absenceCovers(absence: { startDate: Date; endDate: Date }, day: Date): boolean {
  return day >= absence.startDate && day <= absence.endDate;
}

/* ------------------------------------------------------------ remplacements */

export interface ReplacementSlot {
  day: string;
  startTime: string | null;
  durationMinutes: number | null;
  siteId: string | null;
  activity: string | null;
}

export interface CandidateAgent {
  id: string;
  name: string;
  kind: string;
  activities: string[];
  /** Jours d'absence validée (« AAAA-MM-JJ »). */
  absentDays: Set<string>;
  /** Passages déjà prévus (jour, heure, durée). */
  busy: { day: string; startTime: string | null; durationMinutes: number | null }[];
  /** A déjà travaillé sur ce site. */
  knowsSites: Set<string>;
}

export type ReplacementRank = "replacement1" | "replacement2" | "qualified" | "subcontractor";

export interface ReplacementProposal {
  agentId: string;
  name: string;
  rank: ReplacementRank;
  /** Déjà prévu ailleurs à la même heure (alerte, pas un refus). */
  conflict: boolean;
  knowsSite: boolean;
}

export const RANK_LABELS: Record<ReplacementRank, string> = {
  replacement1: "Remplaçant n°1",
  replacement2: "Remplaçant n°2",
  qualified: "Agent qualifié",
  subcontractor: "Sous-traitant",
};

const minutes = (t: string | null) => {
  const m = /^(\d{2}):(\d{2})$/.exec(t ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

function overlaps(slot: ReplacementSlot, busy: CandidateAgent["busy"][number]): boolean {
  if (busy.day !== slot.day) return false;
  const a = minutes(slot.startTime);
  const b = minutes(busy.startTime);
  if (a === null || b === null) return false;
  return a < b + (busy.durationMinutes ?? 60) && b < a + (slot.durationMinutes ?? 60);
}

/**
 * Propositions de remplacement pour un passage, dans l'ordre : remplaçant n°1, n°2, autre agent
 * qualifié (même activité, ou connaît le site), puis sous-traitant. Les absents sont exclus ;
 * un agent déjà pris à la même heure reste proposé mais signalé. Le chef confirme.
 */
export function rankReplacements(
  slot: ReplacementSlot,
  absent: { id: string; replacement1Id: string | null; replacement2Id: string | null },
  agents: CandidateAgent[],
): ReplacementProposal[] {
  const available = agents.filter((a) => a.id !== absent.id && !a.absentDays.has(slot.day));
  const byId = new Map(available.map((a) => [a.id, a]));
  const proposal = (a: CandidateAgent, rank: ReplacementRank): ReplacementProposal => ({
    agentId: a.id,
    name: a.name,
    rank,
    conflict: a.busy.some((b) => overlaps(slot, b)),
    knowsSite: slot.siteId ? a.knowsSites.has(slot.siteId) : false,
  });
  const out: ReplacementProposal[] = [];
  const seen = new Set<string>();
  const push = (a: CandidateAgent | undefined, rank: ReplacementRank) => {
    if (!a || seen.has(a.id)) return;
    seen.add(a.id);
    out.push(proposal(a, rank));
  };
  push(absent.replacement1Id ? byId.get(absent.replacement1Id) : undefined, "replacement1");
  push(absent.replacement2Id ? byId.get(absent.replacement2Id) : undefined, "replacement2");
  const qualified = available
    .filter((a) => a.kind !== "subcontractor" && !seen.has(a.id))
    .filter(
      (a) =>
        (slot.siteId && a.knowsSites.has(slot.siteId)) ||
        (slot.activity ? a.activities.length === 0 || a.activities.includes(slot.activity) : true),
    )
    .map((a) => proposal(a, "qualified"))
    // Libres d'abord, puis ceux qui connaissent le site, puis par nom.
    .sort(
      (x, y) =>
        Number(x.conflict) - Number(y.conflict) ||
        Number(y.knowsSite) - Number(x.knowsSite) ||
        x.name.localeCompare(y.name, "fr"),
    );
  for (const q of qualified) {
    seen.add(q.agentId);
    out.push(q);
  }
  for (const a of available
    .filter((a) => a.kind === "subcontractor")
    .sort((x, y) => x.name.localeCompare(y.name, "fr")))
    push(a, "subcontractor");
  return out;
}
