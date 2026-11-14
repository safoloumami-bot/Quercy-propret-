import "server-only";

import { dayKey, splitWorkedMinutes } from "@quercy/core";

import { type RecordsCtx, entityContext } from "../records/context";

/** Membres de l'espace (agents possibles), par ordre alphabétique. */
export async function workspaceAgents(ctx: RecordsCtx) {
  const memberships = await ctx.db.membership.findMany({
    select: { user: { select: { id: true, name: true } } },
  });
  return memberships.map((m) => m.user).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export interface AgentHours {
  agentId: string | null;
  name: string;
  interventions: number;
  days: number;
  totalMinutes: number;
  nightMinutes: number;
  sundayMinutes: number;
  holidayMinutes: number;
}

/**
 * Heures du mois (« AAAA-MM ») par agent pour la paie : temps pointé (ou prévu à défaut) des
 * interventions réalisées, dont nuit (21 h – 6 h), dimanche et jours fériés.
 */
export async function cleaningHours(
  ctx: RecordsCtx,
  month: string,
): Promise<{ month: string; rows: AgentHours[] }> {
  const { scopeWhere } = await entityContext(ctx, "intervention", "view");
  const [y, m] = month.split("-").map(Number) as [number, number];
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0));
  const rows = await ctx.db.intervention.findMany({
    where: { date: { gte: from, lte: to }, status: { in: ["done", "in_progress"] }, ...scopeWhere },
    select: {
      date: true,
      startTime: true,
      durationMinutes: true,
      workedMinutes: true,
      checkInAt: true,
      ownerId: true,
    },
  });
  const clock = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ctx.workspace.organization.preferences.timezone,
  });
  const byAgent = new Map<
    string,
    {
      interventions: number;
      days: Set<string>;
      total: number;
      night: number;
      sunday: number;
      holiday: number;
    }
  >();
  for (const r of rows) {
    const key = r.ownerId ?? "";
    const entry = byAgent.get(key) ?? {
      interventions: 0,
      days: new Set<string>(),
      total: 0,
      night: 0,
      sunday: 0,
      holiday: 0,
    };
    // Heure réelle d'arrivée si pointée (fuseau de l'espace), sinon heure prévue.
    const start = r.checkInAt ? clock.format(r.checkInAt) : r.startTime;
    const split = splitWorkedMinutes(r.date, start, r.workedMinutes ?? r.durationMinutes ?? 0);
    entry.interventions++;
    entry.days.add(dayKey(r.date));
    entry.total += split.total;
    entry.night += split.night;
    entry.sunday += split.sunday;
    entry.holiday += split.holiday;
    byAgent.set(key, entry);
  }
  const names = new Map((await workspaceAgents(ctx)).map((p) => [p.id, p.name]));
  return {
    month,
    rows: [...byAgent.entries()]
      .map(([agentId, e]) => ({
        agentId: agentId || null,
        name: names.get(agentId) ?? "Sans agent",
        interventions: e.interventions,
        days: e.days.size,
        totalMinutes: e.total,
        nightMinutes: e.night,
        sundayMinutes: e.sunday,
        holidayMinutes: e.holiday,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
  };
}

/** Heures en décimal à la française (« 7,50 »). */
export function hoursDecimal(minutes: number): string {
  return (minutes / 60).toFixed(2).replace(".", ",");
}

/** Export CSV (séparateur « ; », compatible Excel) pour le cabinet de paie. */
export function hoursCsv(result: { month: string; rows: AgentHours[] }): string {
  const header = [
    "Mois",
    "Agent",
    "Interventions",
    "Jours travaillés",
    "Heures totales",
    "dont heures de nuit (21h-6h)",
    "dont heures du dimanche",
    "dont heures fériées",
  ];
  const escape = (v: string) => (/[;"\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  const lines = result.rows.map((r) =>
    [
      result.month,
      escape(r.name),
      String(r.interventions),
      String(r.days),
      hoursDecimal(r.totalMinutes),
      hoursDecimal(r.nightMinutes),
      hoursDecimal(r.sundayMinutes),
      hoursDecimal(r.holidayMinutes),
    ].join(";"),
  );
  return `\uFEFF${[header.join(";"), ...lines].join("\r\n")}\r\n`;
}
