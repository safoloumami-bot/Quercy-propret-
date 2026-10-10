import "server-only";

import {
  addDays,
  anomalyClientEligible,
  anomalyTransition,
  anomalyTypeLabel,
  dayKey,
  utcDay,
} from "@quercy/core";
import { prisma } from "@quercy/db";
import { recordInterventionEvent } from "@quercy/jobs";

import { absenceImpact, absenceSummary } from "../cleaning/absences";
import { notify } from "../notify";
import { publish } from "../realtime";
import { type Body, HttpError, type Me, json, txt } from "./http";
import type { TerrainOrgRow } from "./org";
import { sendPush } from "./push";

const DAY_MS = 86_400_000;
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS) + 1;

function patronOnly(me: Me) {
  if (me.role !== "patron") throw new HttpError("Réservé au responsable.", 403);
}

/**
 * Ce que l'écran d'accueil montre en plus de la tournée : qui est sur site, et pour le
 * responsable ce qui attend une décision (congés, anomalies, véhicules).
 */
async function accueil(org: TerrainOrgRow, me: Me) {
  const today = utcDay(new Date());
  const onsite = await prisma.intervention.findMany({
    where: {
      organizationId: org.id,
      deletedAt: null,
      date: today,
      checkInAt: { not: null },
      checkOutAt: null,
      ...(me.role === "patron"
        ? {}
        : { OR: [{ ownerId: me.id }, { replacementAgentId: me.id }, { actualAgentId: me.id }] }),
    },
    include: {
      site: { select: { name: true } },
      actualAgent: { select: { id: true, name: true } },
    },
    orderBy: { checkInAt: "asc" },
  });
  const base = {
    surSite: onsite.map((i) => ({
      id: i.id,
      agentId: i.actualAgent?.id ?? i.replacementAgentId ?? i.ownerId ?? "",
      agent: i.actualAgent?.name ?? "",
      client: i.site?.name ?? i.title,
      depuis: i.checkInAt!.getTime(),
    })),
  };
  if (me.role !== "patron") return base;

  const [absences, anomalies, vehicles, breakdowns] = await Promise.all([
    prisma.absence.findMany({
      where: { organizationId: org.id, status: "requested" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { startDate: "asc" },
      take: 20,
    }),
    prisma.anomaly.findMany({
      where: { organizationId: org.id, status: "reported", archivedAt: null },
      include: {
        site: { select: { name: true } },
        reportedBy: { select: { name: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 20,
    }),
    prisma.vehicle.findMany({
      where: {
        organizationId: org.id,
        deletedAt: null,
        OR: [
          { inspectionDueDate: { lte: addDays(today, 30) } },
          { insuranceDueDate: { lte: addDays(today, 30) } },
          { nextServiceDate: { lte: addDays(today, 30) } },
        ],
      },
      include: { assignedUser: { select: { name: true } } },
    }),
    prisma.assetReport.findMany({
      where: { organizationId: org.id, kind: "breakdown", status: "open" },
      include: {
        vehicle: { select: { plate: true, model: true } },
        equipment: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const conges = await Promise.all(
    absences.map(async (a) => ({
      id: a.id,
      agentId: a.userId,
      agent: a.user.name,
      libelle: absenceSummary(a),
      du: dayKey(a.startDate),
      au: dayKey(a.endDate),
      jours: daysBetween(a.startDate, a.endDate),
      commentaire: a.comment ?? "",
      chantiers: await prisma.intervention.count({
        where: {
          organizationId: org.id,
          deletedAt: null,
          date: { gte: a.startDate, lte: a.endDate },
          status: { in: ["planned", "rescheduled"] },
          OR: [{ replacementAgentId: a.userId }, { ownerId: a.userId, replacementAgentId: null }],
        },
      }),
    })),
  );
  const due = (d: Date | null, label: string) =>
    d && d <= addDays(today, 30)
      ? { label, jours: Math.round((d.getTime() - today.getTime()) / DAY_MS) }
      : null;
  const alertes = [
    ...vehicles.flatMap((v) =>
      [
        due(v.inspectionDueDate, "Contrôle technique"),
        due(v.insuranceDueDate, "Assurance"),
        due(v.nextServiceDate, "Entretien"),
      ]
        .filter((x): x is { label: string; jours: number } => Boolean(x))
        .map((x) => ({
          type: "echeance",
          titre: `${x.label} ${x.jours < 0 ? `dépassé de ${-x.jours} j` : x.jours === 0 ? "aujourd'hui" : `dans ${x.jours} jours`}`,
          detail: `${v.model ?? "Véhicule"} · ${v.plate}${v.assignedUser ? ` · conduit par ${v.assignedUser.name}` : ""}`,
          jours: x.jours,
        })),
    ),
    ...breakdowns.map((b) => ({
      type: "panne",
      titre: `Panne · ${b.vehicle ? `${b.vehicle.model ?? "Véhicule"} ${b.vehicle.plate}` : (b.equipment?.name ?? "Matériel")}`,
      detail: b.note ?? "",
      jours: -1,
    })),
  ].sort((a, b) => a.jours - b.jours);
  return {
    ...base,
    conges,
    anomalies: anomalies.map((a) => ({
      id: a.id,
      type: anomalyTypeLabel(a.type),
      lieu: a.location ?? "",
      commentaire: a.comment ?? "",
      site: a.site?.name ?? "",
      par: a.reportedBy?.name ?? (a.source === "system" ? "Détection automatique" : ""),
      ts: a.reportedAt.getTime(),
      photo: Boolean(a.photoFileId),
    })),
    alertes,
  };
}

/** Remplaçants possibles pour une absence : proposition du logiciel, puis chaque agent. */
async function congeDetail(org: TerrainOrgRow, id: string) {
  const absence = await prisma.absence.findFirst({
    where: { id, organizationId: org.id },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!absence) throw new HttpError("Demande introuvable.", 404);
  const visits = await absenceImpact(org.id, absence);
  const candidates = new Map<
    string,
    { id: string; nom: string; rang: string; conflits: number; chantiers: number }
  >();
  for (const v of visits)
    for (const p of v.proposals) {
      const c = candidates.get(p.agentId) ?? {
        id: p.agentId,
        nom: p.name,
        rang: p.rank,
        conflits: 0,
        chantiers: 0,
      };
      c.chantiers++;
      if (p.conflict) c.conflits++;
      candidates.set(p.agentId, c);
    }
  return {
    id: absence.id,
    agent: absence.user.name,
    libelle: absenceSummary(absence),
    statut: absence.status,
    chantiers: visits.map((v) => ({
      id: v.id,
      jour: v.day,
      heure: v.startTime ?? "",
      site: v.site?.name ?? v.title,
      propose: v.suggestedAgentId,
    })),
    remplacants: [...candidates.values()].sort((a, b) => a.conflits - b.conflits),
  };
}

/** Routes de l'accueil : null si la route n'est pas ici. */
export async function handleAccueil(
  route: string,
  ctx: { org: TerrainOrgRow; me: Me; url: URL; body: Body; request: Request },
): Promise<Response | null> {
  const { org, me, url, body, request } = ctx;
  const post = request.method === "POST";

  if (route === "accueil") return json(await accueil(org, me));

  if (route === "conge") {
    patronOnly(me);
    return json(await congeDetail(org, txt(url.searchParams.get("id"), 40)));
  }

  /* Le responsable valide (en confiant les chantiers) ou refuse une demande d'absence. */
  if (route === "conge-decision" && post) {
    patronOnly(me);
    const detail = await congeDetail(org, txt(body.id, 40));
    if (detail.statut !== "requested")
      throw new HttpError("Cette demande a déjà été traitée.", 409);
    const approve = body.valider === true;
    // « auto » : la proposition du logiciel pour chaque passage ; sinon un remplaçant choisi.
    const choice = txt(body.remplacant, 40);
    if (approve && choice && choice !== "auto" && !detail.remplacants.some((r) => r.id === choice))
      throw new HttpError("Remplaçant invalide.", 400);
    const absence = await prisma.absence.update({
      where: { id: detail.id },
      data: {
        status: approve ? "approved" : "rejected",
        decidedById: me.id,
        decidedAt: new Date(),
        decisionNote: txt(body.note, 500) || null,
      },
    });
    let confies = 0;
    if (approve && detail.chantiers.length) {
      const perAgent = new Map<string, string[]>();
      for (const v of detail.chantiers) {
        const to = choice && choice !== "auto" ? choice : v.propose;
        if (!to) continue;
        const before = await prisma.intervention.findUnique({
          where: { id: v.id },
          select: { ownerId: true, replacementAgentId: true },
        });
        await prisma.intervention.update({ where: { id: v.id }, data: { replacementAgentId: to } });
        await recordInterventionEvent({
          organizationId: org.id,
          interventionId: v.id,
          userId: me.id,
          type: "reassigned",
          metadata: {
            source: "application terrain",
            replacementFor: absence.userId,
            absenceId: absence.id,
            from: before?.replacementAgentId ?? before?.ownerId ?? null,
            to,
            label: "Chantier réattribué",
            detail: absenceSummary(absence),
            by: me.nom,
          },
        });
        perAgent.set(to, [
          ...(perAgent.get(to) ?? []),
          `${v.jour}${v.heure ? ` ${v.heure}` : ""} — ${v.site}`,
        ]);
        confies++;
      }
      for (const [agentId, lines] of perAgent) {
        await notify({
          organizationId: org.id,
          userIds: [agentId],
          actorId: me.id,
          type: "absence.replacement",
          title: `Remplacement de ${detail.agent} : ${lines.length} passage${lines.length > 1 ? "s" : ""}`,
          body: lines.slice(0, 10).join("\n"),
          url: "/nettoyage/ma-journee",
        });
        await sendPush(org.id, [agentId], {
          titre: "Chantiers confiés",
          corps: `${lines.length} passage${lines.length > 1 ? "s" : ""} pendant l'absence de ${detail.agent}.`,
          onglet: "tournee",
        });
      }
      await publish(org.id, {
        type: "record.changed",
        entity: "intervention",
        ids: detail.chantiers.map((c) => c.id),
        actorId: me.id,
      });
    }
    await notify({
      organizationId: org.id,
      userIds: [absence.userId],
      actorId: me.id,
      type: approve ? "absence.approved" : "absence.rejected",
      title: `${absenceSummary(absence)} : ${approve ? "validée" : "refusée"}`,
      url: "/nettoyage/absences",
    });
    await sendPush(org.id, [absence.userId], {
      titre: approve ? "Absence validée" : "Absence refusée",
      corps: absenceSummary(absence),
      onglet: "tournee",
    });
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: me.id,
        action: approve ? "absence.approved" : "absence.rejected",
        entityType: "absence",
        entityId: absence.id,
        metadata: {
          summary: absenceSummary(absence),
          agent: detail.agent,
          source: "application terrain",
          confies,
        },
      },
    });
    return json({ ok: true, confies });
  }

  /* Anomalie signalée : le responsable la valide (elle peut alors figurer au rapport client) ou la rejette. */
  if (route === "anomalie-decision" && post) {
    patronOnly(me);
    const anomaly = await prisma.anomaly.findFirst({
      where: { id: txt(body.id, 40), organizationId: org.id },
    });
    if (!anomaly) throw new HttpError("Anomalie introuvable.", 404);
    const action = body.action === "reject" ? "reject" : "validate";
    const next = anomalyTransition(anomaly.status, action);
    if (!next) throw new HttpError("Cette anomalie a déjà été traitée.", 409);
    await prisma.anomaly.update({
      where: { id: anomaly.id },
      data: {
        status: next,
        ...(action === "validate" ? { validatedById: me.id, validatedAt: new Date() } : {}),
        ...(!anomalyClientEligible(next) ? { visibleToClient: false } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: me.id,
        action: `anomaly.${action}`,
        entityType: "anomaly",
        entityId: anomaly.id,
        changes: { status: { before: anomaly.status, after: next } },
        metadata: { type: anomalyTypeLabel(anomaly.type), source: "application terrain" },
      },
    });
    return json({ ok: true, statut: next });
  }

  if (route === "anomalie-photo") {
    patronOnly(me);
    const anomaly = await prisma.anomaly.findFirst({
      where: { id: txt(url.searchParams.get("id"), 40), organizationId: org.id },
      include: { photo: true },
    });
    if (!anomaly?.photo) return json({ erreur: "Pas de photo." }, 404);
    const { readObject } = await import("../storage");
    const bytes = await readObject(anomaly.photo.storageKey).catch(() => null);
    if (!bytes) return json({ erreur: "Pas de photo." }, 404);
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": anomaly.photo.mimeType || "image/jpeg",
        "cache-control": "private, max-age=86400",
      },
    });
  }

  /* Véhicules et matériel : qui a quoi, échéances, pannes, locations. */
  if (route === "flotte") {
    patronOnly(me);
    const today = utcDay(new Date());
    const [vehicles, equipment, reports] = await Promise.all([
      prisma.vehicle.findMany({
        where: { organizationId: org.id, deletedAt: null },
        include: { assignedUser: { select: { name: true } } },
        orderBy: { plate: "asc" },
      }),
      prisma.equipment.findMany({
        where: { organizationId: org.id, deletedAt: null },
        include: {
          assignedUser: { select: { name: true } },
          rentals: {
            where: { status: { in: ["reserved", "out"] } },
            include: { company: { select: { name: true } } },
            orderBy: { startDate: "asc" },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.assetReport.findMany({
        where: { organizationId: org.id, status: "open" },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    const inspectedToday = new Set(
      reports
        .filter((r) => r.kind === "inspection" && r.createdAt >= today)
        .map((r) => r.vehicleId),
    );
    const days = (d: Date | null) =>
      d ? Math.round((d.getTime() - today.getTime()) / DAY_MS) : null;
    return json({
      vehicules: vehicles.map((v) => ({
        id: v.id,
        immat: v.plate,
        modele: v.model ?? "",
        km: v.mileage,
        agent: v.assignedUser?.name ?? "",
        ct: days(v.inspectionDueDate),
        assurance: days(v.insuranceDueDate),
        entretien: days(v.nextServiceDate),
        panne: reports.find((r) => r.kind === "breakdown" && r.vehicleId === v.id)?.note ?? null,
        etatDuJour: inspectedToday.has(v.id),
      })),
      materiel: equipment.map((e) => ({
        id: e.id,
        nom: e.name,
        agent: e.assignedUser?.name ?? "",
        statut: e.status,
        panne: reports.find((r) => r.kind === "breakdown" && r.equipmentId === e.id)?.note ?? null,
        location: e.rentals[0]
          ? { client: e.rentals[0].company?.name ?? "", fin: dayKey(e.rentals[0].endDate) }
          : null,
      })),
    });
  }

  return null;
}

export const ACCUEIL_READ_ROUTES = ["accueil", "conge", "anomalie-photo", "flotte"];
