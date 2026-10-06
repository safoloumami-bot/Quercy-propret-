import "server-only";

import { type Prisma, prisma } from "@quercy/db";
import { recordInterventionEvents } from "@quercy/jobs";
import { parseDay, seriesSlotKey, todayIn } from "@quercy/core";

import { ensureAgentMember, normalizeName } from "../cleaning/agents";
import type { RecordsCtx } from "../records/context";
import type { V12Analysis } from "./v12-analyze";

export interface V12ImportSummary {
  sites: { created: number; existing: number };
  clients: { created: number; existing: number };
  agents: { created: number; matched: number };
  series: { proposed: number; existing: number };
  history: { created: number; existing: number };
}

/**
 * Applique l'analyse de la V12 à l'espace. Idempotent : un site se reconnaît à son code, une
 * prestation à sa référence « v12:<code> », un passage historique à sa clé de créneau. Les
 * séries sont créées **proposées** : aucune intervention future n'est générée avant validation.
 */
export async function importV12(ctx: RecordsCtx, analysis: V12Analysis): Promise<V12ImportSummary> {
  const db = ctx.db;
  const summary: V12ImportSummary = {
    sites: { created: 0, existing: 0 },
    clients: { created: 0, existing: 0 },
    agents: { created: 0, matched: 0 },
    series: { proposed: 0, existing: 0 },
    history: { created: 0, existing: 0 },
  };
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });

  // Intervenants : le dirigeant est la personne qui importe ; les autres sont reliés au membre
  // du même nom, ou créés avec le rôle Intervenant.
  const agentIds = new Map<string, string>();
  for (const agent of analysis.agents) {
    if (agent.isLeader) {
      agentIds.set(normalizeName(agent.name), ctx.user.id);
      continue;
    }
    const { userId, created } = await ensureAgentMember(org, agent.name);
    agentIds.set(normalizeName(agent.name), userId);
    summary.agents[created ? "created" : "matched"] += 1;
  }
  const agentId = (name: string | null) =>
    name ? (agentIds.get(normalizeName(name)) ?? null) : null;

  // Clients (entreprises) : retrouvés par leur nom.
  const companies = await db.company.findMany({ select: { id: true, name: true } });
  const companyIds = new Map(companies.map((c) => [normalizeName(c.name), c.id]));
  const seenClients = new Set<string>();
  async function companyId(name: string | null): Promise<string | null> {
    if (!name) return null;
    const key = normalizeName(name);
    const known = companyIds.get(key);
    if (known) {
      if (!seenClients.has(key)) summary.clients.existing += 1;
      seenClients.add(key);
      return known;
    }
    seenClients.add(key);
    const created = await db.company.create({
      data: { organizationId: ctx.organizationId, name, type: "customer", ownerId: ctx.user.id },
    });
    companyIds.set(key, created.id);
    summary.clients.created += 1;
    return created.id;
  }

  const seriesBySite = new Map<string, { seriesId: string; versionId: string; lineId: string }>();
  for (const s of analysis.sites) {
    const clientId = await companyId(s.client);
    let site = await db.site.findFirst({ where: { code: s.code } });
    if (site) summary.sites.existing += 1;
    else {
      site = await db.site.create({
        data: {
          organizationId: ctx.organizationId,
          code: s.code,
          name: s.name,
          companyId: clientId,
          address: s.address,
          city: s.city,
          accessCode: s.accessKeys,
          instructions: s.instructions,
          openingHours: s.openingHours,
          status: s.active ? "active" : "paused",
          tags: [s.activityLabel, ...(s.tour ? [s.tour] : [])],
          customFields: {
            v12: {
              ...s.details,
              ...(s.replacement1 ? { "Remplaçant 1": s.replacement1 } : {}),
              ...(s.replacement2 ? { "Remplaçant 2": s.replacement2 } : {}),
              ...(s.frequency ? { "Fréquence (V12)": s.frequency } : {}),
              ...(s.toComplete.length ? { "À compléter": s.toComplete.join(", ") } : {}),
            },
          } as Prisma.InputJsonValue,
          ownerId: ctx.user.id,
        },
      });
      summary.sites.created += 1;
    }

    const externalRef = `v12:${s.code}`;
    const existingLine = await db.serviceLine.findFirst({
      where: { externalRef },
      include: { series: { include: { versions: { orderBy: { version: "asc" } } } } },
    });
    if (existingLine) {
      summary.series.existing += 1;
      const series = existingLine.series[0];
      if (series)
        seriesBySite.set(s.code, {
          seriesId: series.id,
          versionId: series.versions[0]!.id,
          lineId: existingLine.id,
        });
      continue;
    }
    const plannedAgentId = agentId(s.agent);
    const contract = await db.cleaningContract.create({
      data: {
        organizationId: ctx.organizationId,
        name: `${s.activityLabel} — ${s.name}`,
        siteId: site.id,
        companyId: clientId,
        status: s.active ? "active" : "suspended",
        startDate: s.contractStart ? parseDay(s.contractStart) : null,
        endDate: s.contractEnd ? parseDay(s.contractEnd) : null,
        startTime: s.startTime,
        durationMinutes: s.durationMinutes,
        agentId: plannedAgentId,
        description: "Importé depuis l'Excel V12.",
        ownerId: ctx.user.id,
      },
    });
    const line = await db.serviceLine.create({
      data: {
        organizationId: ctx.organizationId,
        contractId: contract.id,
        siteId: site.id,
        name: s.activityLabel,
        activity: s.activity,
        plannedAgentId,
        startTime: s.startTime,
        durationMinutes: s.durationMinutes,
        externalRef,
      },
    });
    const series = await db.recurrenceSeries.create({
      data: {
        organizationId: ctx.organizationId,
        serviceLineId: line.id,
        status: "proposed",
        source: "import_v12",
      },
    });
    // Sans règle exploitable, une date unique à la date d'effet : la série reste à définir.
    const effectiveFrom = s.proposal?.effectiveFrom ?? s.contractStart ?? null;
    const version = await db.recurrenceRuleVersion.create({
      data: {
        organizationId: ctx.organizationId,
        seriesId: series.id,
        version: 1,
        effectiveFrom: parseDay(effectiveFrom ?? todayIn("Europe/Paris")),
        rule: (s.proposal?.rule ?? { kind: "dates", dates: [] }) as Prisma.InputJsonValue,
        startTime: s.startTime,
        durationMinutes: s.durationMinutes,
        plannedAgentId,
        note: s.warnings.join(" ") || null,
        createdById: ctx.user.id,
      },
    });
    seriesBySite.set(s.code, { seriesId: series.id, versionId: version.id, lineId: line.id });
    summary.series.proposed += 1;
  }

  // Passages déjà réalisés : interventions historiques, sans heures inventées.
  const STATUS = { done: "done", cancelled: "cancelled", access_impossible: "access_impossible" };
  for (const h of analysis.history) {
    const link = seriesBySite.get(h.siteCode);
    const site = await db.site.findFirst({
      where: { code: h.siteCode },
      include: { contracts: { select: { id: true }, take: 1, orderBy: { createdAt: "asc" } } },
    });
    if (!link || !site) continue;
    const slotKey = seriesSlotKey(link.seriesId, h.date);
    if (await db.intervention.count({ where: { slotKey } })) {
      summary.history.existing += 1;
      continue;
    }
    const planned = agentId(h.plannedAgent);
    const actual = agentId(h.actualAgent) ?? (h.status === "done" ? planned : null);
    const line = analysis.sites.find((x) => x.code === h.siteCode)!;
    const created = await db.intervention.create({
      data: {
        organizationId: ctx.organizationId,
        title: `${line.activityLabel} — ${site.name}`,
        siteId: site.id,
        contractId: site.contracts[0]?.id ?? null,
        companyId: site.companyId,
        serviceLineId: link.lineId,
        seriesId: link.seriesId,
        ruleVersionId: link.versionId,
        slotKey,
        ownerId: planned,
        actualAgentId: actual,
        date: parseDay(h.date),
        startTime: h.startTime,
        durationMinutes: h.durationMinutes,
        status: STATUS[h.status],
        notes: h.observation,
      },
    });
    await recordInterventionEvents([
      {
        organizationId: ctx.organizationId,
        interventionId: created.id,
        userId: ctx.user.id,
        type: h.status === "done" ? "completed" : "status_changed",
        at: parseDay(h.date),
        metadata: {
          source: "import V12",
          status: h.status,
          ...(h.actualAgent
            ? {}
            : { note: "Intervenant réel non renseigné : intervenant prévu retenu." }),
          heures: "non renseignées dans la V12",
        },
      },
    ]);
    summary.history.created += 1;
  }

  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorId: ctx.user.id,
      action: "import.v12",
      entityType: "site",
      metadata: summary as unknown as Prisma.InputJsonValue,
    },
  });
  return summary;
}
