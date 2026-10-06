import "server-only";

import { randomBytes } from "node:crypto";

import {
  FIELD_ANOMALY_TYPES,
  type InterventionEventType,
  dayKey,
  detectPointageAnomalies,
  inspectionOutcome,
  siteInfoVisible,
  utcDay,
} from "@quercy/core";
import type { Prisma } from "@quercy/db";
import { prisma } from "@quercy/db";
import {
  type AnomalyInput,
  type InterventionEventInput,
  recordInterventionEvent,
  recordInterventionEvents,
  reportAnomalies,
} from "@quercy/jobs";
import { MailNotConfiguredError, mailConfigured, sendMail } from "@quercy/mailer";
import { TRPCError } from "@trpc/server";

import { auth } from "../auth";
import { AgentMemberError, ensureAgentMember } from "../cleaning/agents";
import { loadBillingState } from "../billing/state";
import { publish } from "../realtime";
import { applyBusinessRules } from "../records/hooks";
import { deleteObject, newStorageKey, putObject, readObject } from "../storage";
import { dueMissionTasks, missionSheetFor } from "../cleaning/missions";
import { CHECKLISTS } from "./checklists";
import {
  type FieldData,
  INTERVENTION_INCLUDE,
  type InterventionRow,
  STOP_INCLUDE,
  type StopRow,
  checklistOf,
  clientName,
  freshTasks,
  inspectionChecks,
  readFieldData,
  roomsOf,
  tasksByRoom,
  toAnomalyLine,
  toChantier,
  toStop,
} from "./chantier";
import { type TerrainOrgRow, terrainBrandOf } from "./org";
import {
  SESSION_MS,
  clearAttempts,
  clearCookie,
  newPin,
  noteFailure,
  pinMatches,
  readCookie,
  sessionCookie,
  signToken,
  tooManyAttempts,
  verifyToken,
} from "./session";

type Me = { id: string; nom: string; code: string; role: "patron" | "agent"; accessId: string };
type Body = Record<string, unknown>;

class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}
const fail = (message: string, status = 400) => json({ erreur: message }, status);
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);

/* ------------------------------------------------------------ identité */

async function currentAgent(request: Request, org: TerrainOrgRow): Promise<Me | null> {
  const token = verifyToken(readCookie(request), org.id);
  if (!token) return null;
  const access = await prisma.fieldAccess.findFirst({
    where: { id: token.id, organizationId: org.id, active: true },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!access) return null;
  const member = await prisma.membership.count({
    where: { organizationId: org.id, userId: access.userId, deletedAt: null },
  });
  if (!member) return null;
  return {
    id: access.userId,
    nom: access.user.name,
    code: access.code,
    role: access.role === "patron" ? "patron" : "agent",
    accessId: access.id,
  };
}

const publicMe = (me: Me) => ({ id: me.id, nom: me.nom, code: me.code, role: me.role });

function loginResponse(org: TerrainOrgRow, me: Me): Response {
  const token = signToken({ id: me.accessId, org: org.id, exp: Date.now() + SESSION_MS });
  return json({ moi: publicMe(me) }, 200, {
    "set-cookie": sessionCookie(token, terrainBrandOf(org).base),
  });
}

/* ------------------------------------------------------------ chantiers */

async function loadIntervention(org: TerrainOrgRow, me: Me, id: unknown) {
  const row = (await prisma.intervention.findFirst({
    where: { id: String(id ?? ""), organizationId: org.id, deletedAt: null },
    include: INTERVENTION_INCLUDE,
  })) as InterventionRow | null;
  if (!row) throw new HttpError("Chantier introuvable.", 404);
  if (me.role !== "patron" && row.ownerId !== me.id && row.replacementAgentId !== me.id)
    throw new HttpError("Ce chantier n'est pas le vôtre.", 403);
  // Fiche mission en vigueur, tâches dues ce jour-là, informations du site visibles par l'agent.
  const sheet = row.missionSheetId
    ? await prisma.missionSheet.findFirst({
        where: { id: row.missionSheetId, organizationId: org.id },
        include: { tasks: { orderBy: { sortOrder: "asc" } } },
      })
    : await missionSheetFor(org.id, row);
  row.mission = sheet;
  if (!row.tasks.length && sheet?.tasks.length)
    row.planned = await dueMissionTasks(org.id, sheet, row);
  row.siteInfos = row.siteId
    ? (
        await prisma.siteInfo.findMany({
          where: { organizationId: org.id, siteId: row.siteId, archivedAt: null },
          orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        })
      ).filter((i) =>
        siteInfoVisible(i, { userId: me.id, manager: me.role === "patron", siteAgent: true }),
      )
    : [];
  return row;
}

/** Garde la fiche mission et les infos chargées sur la ligne mise à jour. */
function keepExtras(updated: InterventionRow, row: InterventionRow): InterventionRow {
  return Object.assign(updated, {
    mission: row.mission,
    planned: updated.tasks.length ? undefined : row.planned,
    siteInfos: row.siteInfos,
  });
}

/**
 * Crée les points de contrôle s'il n'y en a pas encore : tâches dues de la fiche mission (dont
 * la version est notée sur l'intervention), sinon la grille type de la prestation.
 */
async function ensureTasks(org: TerrainOrgRow, row: InterventionRow, data: FieldData) {
  if (row.tasks.length) return row.tasks;
  let tasks: {
    area: string;
    label: string;
    critical: boolean;
    frequency?: string | null;
    photoRequired?: boolean;
  }[];
  if (row.planned && row.mission) {
    tasks = row.planned;
    await prisma.intervention.update({
      where: { id: row.id },
      data: { missionSheetId: row.mission.id, missionVersion: row.mission.version },
    });
  } else {
    const list = checklistOf(row, data);
    data.grille ??= list.key;
    tasks = freshTasks(list);
  }
  await prisma.interventionTask.createMany({
    data: tasks.map((t, i) => ({
      organizationId: org.id,
      interventionId: row.id,
      ...t,
      sortOrder: i,
    })),
    skipDuplicates: true,
  });
  return prisma.interventionTask.findMany({
    where: { interventionId: row.id },
    orderBy: { sortOrder: "asc" },
  });
}

async function ensureConsumables(org: TerrainOrgRow, row: InterventionRow, data: FieldData) {
  if (row.consumables.length) return row.consumables;
  const list = checklistOf(row, data);
  data.grille ??= list.key;
  await prisma.interventionConsumable.createMany({
    data: list.consommables.map((c, i) => ({
      organizationId: org.id,
      interventionId: row.id,
      label: c.l,
      unit: c.u || null,
      sortOrder: i,
    })),
    skipDuplicates: true,
  });
  return prisma.interventionConsumable.findMany({
    where: { interventionId: row.id },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Anomalies (signalées ou détectées) : enregistrées « à valider » et envoyées aux
 * responsables. Une détection automatique ne fait jamais échouer l'action de l'agent.
 */
async function raiseAnomalies(org: TerrainOrgRow, inputs: AnomalyInput[], strict = false) {
  if (inputs.length === 0) return;
  try {
    const reported = await reportAnomalies(inputs);
    for (const userId of new Set(reported.flatMap((r) => r.notified)))
      await publish(org.id, { type: "notification", userId });
  } catch (error) {
    if (strict) throw error;
    console.error(
      JSON.stringify({ level: "error", msg: "terrain.anomaly_failed", error: String(error) }),
    );
  }
}

function pointageAnomalies(org: TerrainOrgRow, row: InterventionRow) {
  return raiseAnomalies(
    org,
    detectPointageAnomalies(row, row.series?.timezone ?? "Europe/Paris").map((found) => ({
      organizationId: org.id,
      source: "system" as const,
      siteId: row.siteId,
      interventionId: row.id,
      ...found,
    })),
  );
}

/** Évènement du journal correspondant à chaque action de l'application terrain. */
const EVENT_OF_ACTION: Record<string, InterventionEventType> = {
  "intervention.check_in": "started",
  "intervention.check_out": "finished",
  "intervention.check_out_corrected": "time_corrected",
  "intervention.signature": "signed",
  "intervention.signature_cleared": "signature_cleared",
  "intervention.photo": "photo_added",
  "intervention.photo_deleted": "photo_removed",
  "intervention.closed": "completed",
};

async function saveIntervention(
  org: TerrainOrgRow,
  me: Me,
  row: InterventionRow,
  data: Record<string, unknown>,
  action: string,
  journal: { label?: string; detail?: string; metadata?: Record<string, unknown> } = {},
): Promise<InterventionRow> {
  let next: Record<string, unknown>;
  try {
    next = applyBusinessRules("intervention", data, row as unknown as Record<string, unknown>);
  } catch (error) {
    if (error instanceof TRPCError) throw new HttpError(error.message, 400);
    throw error;
  }
  const updated = keepExtras(
    (await prisma.intervention.update({
      where: { id: row.id },
      data: next as Prisma.InterventionUncheckedUpdateInput,
      include: INTERVENTION_INCLUDE,
    })) as InterventionRow,
    row,
  );
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      actorId: me.id,
      action,
      entityType: "intervention",
      entityId: row.id,
      metadata: { name: row.title, source: "application terrain" },
    },
  });
  const event = EVENT_OF_ACTION[action];
  if (event)
    await recordInterventionEvent({
      organizationId: org.id,
      interventionId: row.id,
      userId: me.id,
      type: event,
      metadata: {
        source: "application terrain",
        ...(journal.label
          ? { label: journal.label, detail: journal.detail ?? "", by: me.nom }
          : {}),
        ...journal.metadata,
      },
    });
  await publish(org.id, {
    type: "record.changed",
    entity: "intervention",
    ids: [row.id],
    actorId: me.id,
  });
  return updated;
}

/** Range une photo du terrain dans le stockage et l'inscrit aux fichiers de l'intervention. */
async function storePhoto(
  org: TerrainOrgRow,
  me: Me,
  row: InterventionRow,
  name: string,
  bytes: Uint8Array,
) {
  const key = newStorageKey(org.id, name);
  try {
    await putObject(key, bytes, "image/jpeg");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Stockage des photos indisponible.", 503);
  }
  return prisma.storedFile.create({
    data: {
      organizationId: org.id,
      storageKey: key,
      name,
      mimeType: "image/jpeg",
      size: bytes.byteLength,
      uploadedById: me.id,
      entityType: "intervention",
      entityId: row.id,
    },
  });
}

async function discardFile(file: { id: string; storageKey: string }) {
  await prisma.storedFile.delete({ where: { id: file.id } });
  await deleteObject(file.storageKey).catch(() => {});
}

async function nextNumber(organizationId: string, key: string): Promise<number> {
  const seq = await prisma.numberSequence.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return seq.value;
}

const timeFr = (ms: number) =>
  new Date(ms).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" });

/* ----------------------------------------------------------------- mail */

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

async function sendReport(
  org: TerrainOrgRow,
  chantier: ReturnType<typeof toChantier>,
): Promise<{ envoye: boolean; raison: string }> {
  const closure = chantier.cloture!;
  if (!chantier.email) return { envoye: false, raison: "pas d'adresse client" };
  if (!mailConfigured()) return { envoye: false, raison: "envoi non configuré" };
  const hours = (closure.duree / 3_600_000).toFixed(2).replace(".", ",");
  const reserves = chantier.pieces.flatMap((p) =>
    p.items.filter((i) => !i.ok).map((i) => `${p.n} — ${i.l}${i.nc ? ` : ${i.nc}` : ""}`),
  );
  const day = new Date(closure.ts).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  const html = `<div style="font-family:system-ui,sans-serif;color:#10221f;max-width:560px">
      <h2 style="font-weight:600">Intervention terminée — ${escapeHtml(chantier.client)}</h2>
      <p>Bonjour,</p>
      <p>L'intervention du ${day} est terminée.</p>
      <p><strong>Bon n° ${escapeHtml(closure.bon)}</strong><br>
      Durée : ${hours} h · Points validés : ${closure.ok}/${closure.tot}</p>
      ${chantier.obs ? `<p><strong>Observations</strong><br>${escapeHtml(chantier.obs).replace(/\n/g, "<br>")}</p>` : ""}
      ${reserves.length ? `<p><strong>Réserves</strong><br>${reserves.map(escapeHtml).join("<br>")}</p>` : "<p>Aucune réserve.</p>"}
      <p style="color:#4b605c;font-size:13px;margin-top:24px">${escapeHtml(org.name)}</p>
    </div>`;
  const text = [
    `Intervention terminée — ${chantier.client}`,
    `L'intervention du ${day} est terminée.`,
    `Bon n° ${closure.bon} · Durée : ${hours} h · Points validés : ${closure.ok}/${closure.tot}`,
    chantier.obs ? `Observations : ${chantier.obs}` : "",
    reserves.length ? `Réserves :\n${reserves.join("\n")}` : "Aucune réserve.",
    org.name,
  ]
    .filter(Boolean)
    .join("\n\n");
  try {
    await sendMail({
      to: chantier.email,
      subject: `Bon d'intervention ${closure.bon} — ${chantier.client}`,
      html,
      text,
    });
    return { envoye: true, raison: "" };
  } catch (error) {
    if (error instanceof MailNotConfiguredError)
      return { envoye: false, raison: "envoi non configuré" };
    console.error(
      JSON.stringify({ level: "error", msg: "terrain.mail_failed", error: String(error) }),
    );
    return { envoye: false, raison: "service d'envoi injoignable" };
  }
}

/* --------------------------------------------------------------- routes */

const READ_ROUTES = new Set([
  "ping",
  "etat",
  "tournee",
  "chantier",
  "photo-fichier",
  "agents",
  "historique",
]);

/**
 * Serveur de l'application terrain, branché sur le logiciel : mêmes routes et mêmes réponses
 * que le serveur d'origine, mais les chantiers sont les interventions du module Nettoyage,
 * les agents sont les membres de l'espace et les photos des pièces jointes.
 */
export async function handleTerrainApi(
  request: Request,
  org: TerrainOrgRow,
  route: string,
): Promise<Response> {
  const url = new URL(request.url);
  const body: Body =
    request.method === "POST" ? ((await request.json().catch(() => ({}))) as Body) : {};
  try {
    if (route === "ping")
      return json({ ok: true, serveur: "en ligne", heure: new Date().toISOString() });

    const me = await currentAgent(request, org);

    if (route === "etat") {
      const accesses = await prisma.fieldAccess.count({ where: { organizationId: org.id } });
      const list = CHECKLISTS[0]!;
      return json({
        moi: me ? publicMe(me) : null,
        installation: accesses === 0,
        pieces: list.pieces,
        consommables: list.consommables,
      });
    }

    if (route === "deconnexion")
      return json({ ok: true }, 200, { "set-cookie": clearCookie(terrainBrandOf(org).base) });

    if (route === "connexion" && request.method === "POST") {
      const ip = `${org.id}:${request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "?"}`;
      if (tooManyAttempts(ip)) return fail("Trop d'essais. Réessayez dans un quart d'heure.", 429);
      const code = str(body.code, 40).trim().toLowerCase();
      const access = await prisma.fieldAccess.findFirst({
        where: { organizationId: org.id, code, active: true },
        include: { user: { select: { name: true } } },
      });
      const member =
        access &&
        (await prisma.membership.count({
          where: { organizationId: org.id, userId: access.userId, deletedAt: null },
        }));
      if (!access || !member || !pinMatches(str(body.pin, 12), access)) {
        noteFailure(ip);
        await new Promise((r) => setTimeout(r, 450));
        return fail("Identifiant ou code incorrect.", 401);
      }
      clearAttempts(ip);
      return loginResponse(org, {
        id: access.userId,
        nom: access.user.name,
        code: access.code,
        role: access.role === "patron" ? "patron" : "agent",
        accessId: access.id,
      });
    }

    if (route === "installation" && request.method === "POST") {
      if (await prisma.fieldAccess.count({ where: { organizationId: org.id } }))
        return fail("L'application est déjà installée.", 409);
      const pin = str(body.pin, 12);
      if (!/^\d{6}$/.test(pin)) return fail("Le code doit comporter exactement 6 chiffres.", 400);
      // Le premier accès est réservé à un administrateur de l'entreprise, connecté au logiciel.
      const session = await auth()
        .api.getSession({ headers: request.headers })
        .catch(() => null);
      const membership =
        session &&
        (await prisma.membership.findFirst({
          where: { organizationId: org.id, userId: session.user.id, deletedAt: null },
          include: { role: { select: { systemKey: true } } },
        }));
      if (!membership || !["owner", "admin"].includes(membership.role.systemKey ?? ""))
        return fail(
          "Pour la première mise en service, connectez-vous d'abord au logiciel avec un compte administrateur de l'entreprise, sur ce même appareil, puis rouvrez cette page.",
          403,
        );
      const access = await prisma.fieldAccess.create({
        data: {
          organizationId: org.id,
          userId: membership.userId,
          code: "patron",
          role: "patron",
          ...newPin(pin),
        },
      });
      return loginResponse(org, {
        id: membership.userId,
        nom: session!.user.name,
        code: "patron",
        role: "patron",
        accessId: access.id,
      });
    }

    if (!me) return fail("Connexion requise.", 401);
    const patronOnly = () => {
      if (me.role !== "patron") throw new HttpError("Réservé au responsable.", 403);
    };
    if (!READ_ROUTES.has(route)) {
      const billing = await loadBillingState(org);
      if (billing.readOnly)
        return fail(
          "L'espace est en lecture seule : abonnement à régulariser dans le logiciel.",
          403,
        );
    }

    /* ---------- tournée ---------- */
    if (route === "tournee") {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("d") ?? "")
        ? url.searchParams.get("d")!
        : dayKey(new Date());
      const rows = (await prisma.intervention.findMany({
        where: {
          organizationId: org.id,
          deletedAt: null,
          date: utcDay(new Date(`${d}T00:00:00.000Z`)),
          status: { not: "cancelled" },
          ...(me.role === "patron"
            ? {}
            : { OR: [{ ownerId: me.id }, { replacementAgentId: me.id }] }),
        },
        include: STOP_INCLUDE,
      })) as StopRow[];
      const stops = rows.map(toStop).sort((a, b) => a.heure.localeCompare(b.heure));
      return json({ date: d, chantiers: stops });
    }

    if (route === "chantier") {
      const row = await loadIntervention(org, me, url.searchParams.get("id"));
      return json({ chantier: toChantier(row) });
    }

    /* ---------- pointage : l'heure vient du serveur ---------- */
    if (route === "pointage" && request.method === "POST") {
      const row = await loadIntervention(org, me, body.id);
      const data = readFieldData(row.fieldData);
      if (data.cloture) return fail("Chantier déjà clôturé.", 409);
      const server = Date.now();
      const declared = Number(body.declareA) || 0;
      // Pointage fait hors réseau : on garde l'heure déclarée et on signale l'écart.
      const offline = declared > 0 && Math.abs(server - declared) > 120_000;
      const at = new Date(offline ? declared : server);
      const note = offline ? `heure déclarée hors réseau, reçue à ${timeFr(server)}` : "";
      let changes: Record<string, unknown>;
      let action: string;
      let label: string;
      let detail = note;
      if (body.type === "arrivee") {
        if (row.checkInAt) return fail("Arrivée déjà pointée.", 409);
        data.arriveeDifferee = offline;
        label = "Arrivée sur site";
        // Intervenant réel : celui qui pointe l'arrivée (il peut remplacer l'agent prévu).
        changes = { checkInAt: at, actualAgentId: me.id };
        action = "intervention.check_in";
      } else if (body.type === "depart") {
        if (!row.checkInAt) return fail("Pointez d'abord l'arrivée.", 409);
        if (row.checkOutAt) return fail("Départ déjà pointé.", 409);
        data.departDiffere = offline;
        label = "Départ du site";
        changes = { checkOutAt: at };
        action = "intervention.check_out";
      } else if (body.type === "correction") {
        if (!row.checkInAt) return fail("Correction impossible.", 409);
        const value = Number(body.valeur);
        if (!value || value < row.checkInAt.getTime())
          return fail("Heure de départ invalide.", 400);
        data.corrige = true;
        label = "Pointage corrigé";
        detail = `départ fixé à ${timeFr(value)}`;
        changes = { checkOutAt: new Date(value) };
        action = "intervention.check_out_corrected";
      } else return fail("Type de pointage inconnu.", 400);
      // Hors réseau : l'heure déclarée et l'heure de réception sont gardées au journal.
      const updated = await saveIntervention(
        org,
        me,
        row,
        { ...changes, fieldData: data },
        action,
        {
          label,
          detail,
          metadata: offline
            ? {
                offline: true,
                declaredAt: at.toISOString(),
                receivedAt: new Date(server).toISOString(),
              }
            : {},
        },
      );
      await pointageAnomalies(org, updated);
      return json({ chantier: toChantier(updated) });
    }

    /* ---------- relevé : contrôle, consommables, observations ---------- */
    if (route === "releve" && request.method === "POST") {
      const row = await loadIntervention(org, me, body.id);
      const data = readFieldData(row.fieldData);
      if (data.cloture) return fail("Chantier clôturé, plus modifiable.", 409);
      const changes: Record<string, unknown> = {};
      const events: InterventionEventInput[] = [];
      const journal = (type: InterventionEventType, label: string, detail: string) =>
        events.push({
          organizationId: org.id,
          interventionId: row.id,
          userId: me.id,
          type,
          metadata: { source: "application terrain", label, detail, by: me.nom },
        });
      const updates: Prisma.PrismaPromise<unknown>[] = [];
      if (Array.isArray(body.pieces)) {
        const rooms = tasksByRoom(await ensureTasks(org, row, data));
        const now = new Date();
        rooms.forEach((tasks, ri) => {
          const src = (body.pieces as { items?: { ok?: unknown; nc?: unknown }[] }[])[ri];
          if (!src || !Array.isArray(src.items)) return;
          tasks.forEach((task, ii) => {
            const s = src.items![ii];
            if (!s) return;
            const change: Prisma.InterventionTaskUpdateInput = {};
            const where = `${task.area} — ${task.label}`;
            if (typeof s.ok === "boolean" && s.ok !== task.done) {
              change.done = s.ok;
              change.doneAt = s.ok ? now : null;
              change.doneBy = s.ok ? { connect: { id: me.id } } : { disconnect: true };
              journal(
                s.ok ? "task_done" : "task_undone",
                s.ok ? "Point validé" : "Point décoché",
                where,
              );
            }
            if (typeof s.nc === "string" && s.nc.slice(0, 600) !== (task.reason ?? "")) {
              const reason = s.nc.slice(0, 600);
              change.reason = reason || null;
              if (reason.trim()) journal("task_reason", "Réserve", where);
            }
            if (Object.keys(change).length)
              updates.push(
                prisma.interventionTask.update({ where: { id: task.id }, data: change }),
              );
          });
        });
      }
      if (Array.isArray(body.cons)) {
        const consumables = await ensureConsumables(org, row, data);
        consumables.forEach((c, i) => {
          const q = Number((body.cons as unknown[])[i]);
          if (!(q >= 0)) return;
          const quantity = Math.min(99, Math.round(q));
          if (quantity !== c.quantity)
            updates.push(
              prisma.interventionConsumable.update({ where: { id: c.id }, data: { quantity } }),
            );
        });
      }
      if (updates.length) await prisma.$transaction(updates);
      if (typeof body.obs === "string") changes.notes = body.obs.slice(0, 3000);
      if (typeof body.signataire === "string") {
        data.signataire = body.signataire.slice(0, 120);
        changes.signedBy = data.signataire || null;
      }
      const updated = await saveIntervention(
        org,
        me,
        row,
        { ...changes, fieldData: data },
        "intervention.field_report",
      );
      await recordInterventionEvents(events);
      return json({ ok: true, maj: updated.updatedAt.getTime() });
    }

    /* ---------- signature ---------- */
    if (route === "signature" && request.method === "POST") {
      const row = await loadIntervention(org, me, body.id);
      const data = readFieldData(row.fieldData);
      if (data.cloture) return fail("Chantier clôturé.", 409);
      const changes: Record<string, unknown> = {};
      if (body.data === null) {
        changes.signatureUrl = null;
        delete data.signatureTs;
      } else {
        if (
          typeof body.data !== "string" ||
          !body.data.startsWith("data:image/png;base64,") ||
          body.data.length > 400_000
        )
          return fail("Signature invalide.", 400);
        changes.signatureUrl = body.data;
        data.signatureTs = Date.now();
        if (typeof body.nom === "string") {
          data.signataire = body.nom.slice(0, 120);
          changes.signedBy = data.signataire || null;
        }
      }
      await saveIntervention(
        org,
        me,
        row,
        { ...changes, fieldData: data },
        body.data === null ? "intervention.signature_cleared" : "intervention.signature",
        body.data === null
          ? { label: "Signature effacée" }
          : {
              label: "Signature du client",
              detail: data.signataire ?? "",
              metadata: { signedBy: data.signataire ?? null },
            },
      );
      return json({ ok: true, signatureTs: data.signatureTs ?? null });
    }

    /* ---------- photos : preuves de l'intervention ---------- */
    if (route === "photo" && request.method === "POST") {
      const row = await loadIntervention(org, me, body.id);
      const data = readFieldData(row.fieldData);
      if (data.cloture) return fail("Chantier clôturé.", 409);
      const raw = String(body.data ?? "");
      const prefix = "data:image/jpeg;base64,";
      if (!raw.startsWith(prefix) || raw.length > 600_000)
        return fail("Photo invalide ou trop lourde.", 400);
      const pid =
        typeof body.pid === "string" && /^[\w-]{4,40}$/.test(body.pid)
          ? body.pid
          : randomBytes(9).toString("base64url");
      // Renvoi d'une photo déjà reçue (file d'attente hors réseau).
      if (row.proofs.some((p) => p.clientRef === pid)) return json({ ok: true, id: pid });
      if (row.proofs.length >= 30) return fail("30 photos maximum par chantier.", 409);
      const piece = str(body.piece, 60);
      const slot = body.slot === "apres" ? "apres" : "avant";
      const bytes = new Uint8Array(Buffer.from(raw.slice(prefix.length), "base64"));
      const name = `${piece || "photo"} - ${slot === "apres" ? "après" : "avant"}.jpg`;
      const file = await storePhoto(org, me, row, name, bytes);
      if (file instanceof Response) return file;
      try {
        await prisma.interventionProof.create({
          data: {
            organizationId: org.id,
            interventionId: row.id,
            siteId: row.siteId,
            type: slot === "apres" ? "photo_after" : "photo_before",
            fileId: file.id,
            area: piece || null,
            clientRef: pid,
            authorId: me.id,
          },
        });
      } catch (error) {
        // Deux envois simultanés de la même photo : la première fait foi.
        if ((error as { code?: string }).code === "P2002") {
          await discardFile(file);
          return json({ ok: true, id: pid });
        }
        throw error;
      }
      await saveIntervention(org, me, row, { updatedAt: new Date() }, "intervention.photo", {
        label: "Photo ajoutée",
        detail: `${piece} · ${slot === "apres" ? "après" : "avant"}`,
        metadata: { area: piece, slot, fileId: file.id },
      });
      return json({ ok: true, id: pid });
    }

    if (route === "photo-suppr" && request.method === "POST") {
      const row = await loadIntervention(org, me, body.id);
      const data = readFieldData(row.fieldData);
      if (data.cloture) return fail("Suppression impossible.", 409);
      const proof = row.proofs.find((p) => p.clientRef === body.pid);
      if (proof) {
        await prisma.interventionProof.delete({ where: { id: proof.id } });
        const file =
          proof.fileId &&
          (await prisma.storedFile.findFirst({
            where: { id: proof.fileId, organizationId: org.id },
          }));
        if (file) await discardFile(file);
      }
      await saveIntervention(
        org,
        me,
        row,
        { updatedAt: new Date() },
        "intervention.photo_deleted",
        { label: "Photo supprimée" },
      );
      return json({ ok: true });
    }

    if (route === "photo-fichier") {
      const row = await loadIntervention(org, me, url.searchParams.get("c"));
      const proof = row.proofs.find((p) => p.clientRef === url.searchParams.get("p"));
      const file =
        proof?.fileId &&
        (await prisma.storedFile.findFirst({
          where: { id: proof.fileId, organizationId: org.id, deletedAt: null },
        }));
      if (!file) return fail("Photo introuvable.", 404);
      const bytes = await readObject(file.storageKey).catch(() => null);
      if (!bytes) return fail("Photo introuvable.", 404);
      return new Response(Buffer.from(bytes), {
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "private, max-age=86400",
          "x-content-type-options": "nosniff",
        },
      });
    }

    /* ---------- anomalie : transmise aux responsables, jamais au client ---------- */
    if (route === "anomalie" && request.method === "POST") {
      const row = await loadIntervention(org, me, body.id);
      const type = String(body.type ?? "");
      if (!FIELD_ANOMALY_TYPES.some((t) => t.value === type))
        return fail("Type d'anomalie inconnu.", 400);
      const location = str(body.lieu, 120).trim();
      const comment = str(body.commentaire, 1000).trim();
      if (type === "other" && !comment) return fail("Décrivez l'anomalie en quelques mots.", 400);
      const ref = typeof body.ref === "string" && /^[\w-]{4,40}$/.test(body.ref) ? body.ref : null;
      const dedupeKey = ref ? `terrain:${row.id}:${ref}` : null;
      const already =
        dedupeKey && (await prisma.anomaly.count({ where: { organizationId: org.id, dedupeKey } }));
      if (!already) {
        let photoFileId: string | null = null;
        if (body.photo) {
          const raw = String(body.photo);
          const prefix = "data:image/jpeg;base64,";
          if (!raw.startsWith(prefix) || raw.length > 600_000)
            return fail("Photo invalide ou trop lourde.", 400);
          const bytes = new Uint8Array(Buffer.from(raw.slice(prefix.length), "base64"));
          const file = await storePhoto(org, me, row, "Anomalie.jpg", bytes);
          if (file instanceof Response) return file;
          photoFileId = file.id;
        }
        await raiseAnomalies(
          org,
          [
            {
              organizationId: org.id,
              type,
              source: "agent",
              siteId: row.siteId,
              interventionId: row.id,
              location,
              comment,
              photoFileId,
              reportedById: me.id,
              dedupeKey,
            },
          ],
          true,
        );
        await prisma.auditLog.create({
          data: {
            organizationId: org.id,
            actorId: me.id,
            action: "anomaly.reported",
            entityType: "intervention",
            entityId: row.id,
            metadata: { name: row.title, type, source: "application terrain" },
          },
        });
      }
      const anomalies = await prisma.anomaly.findMany({
        where: { interventionId: row.id, archivedAt: null, source: "agent" },
        orderBy: { reportedAt: "asc" },
        select: {
          id: true,
          type: true,
          location: true,
          comment: true,
          status: true,
          reportedAt: true,
        },
      });
      return json({ ok: true, anomalies: anomalies.map(toAnomalyLine) });
    }

    /* ---------- clôture ---------- */
    if (route === "cloture" && request.method === "POST") {
      const row = await loadIntervention(org, me, body.id);
      const data = readFieldData(row.fieldData);
      if (data.cloture) return fail("Déjà clôturé.", 409);
      if (!row.checkOutAt || !row.checkInAt)
        return fail("Pointez le départ avant de clôturer.", 409);
      const signer = row.signedBy ?? data.signataire ?? "";
      if (!row.signatureUrl || !signer.trim())
        return fail("Signature et nom du client requis.", 409);
      const tasks = await ensureTasks(org, row, data);
      const blocking = tasks.filter((t) => t.critical && !t.done && !(t.reason ?? "").trim());
      if (blocking.length) return fail(`${blocking.length} point(s) critique(s) sans motif.`, 409);

      const year = new Date().getFullYear();
      const number = await nextNumber(org.id, `bon-intervention-${year}`);
      const bon = `BI-${year}-${String(number).padStart(4, "0")}`;
      data.cloture = {
        ts: Date.now(),
        duree: row.checkOutAt.getTime() - row.checkInAt.getTime(),
        ok: tasks.filter((t) => t.done).length,
        tot: tasks.length,
        res: tasks.filter((t) => !t.done).length,
        bon,
        par: me.nom,
      };
      const closed = await saveIntervention(
        org,
        me,
        row,
        { status: "done", reportNumber: bon, fieldData: data },
        "intervention.closed",
        {
          label: "Intervention clôturée",
          detail: bon,
          metadata: { reportNumber: bon, ok: data.cloture.ok, total: data.cloture.tot },
        },
      );
      // Le contrôle qualité rejoint ceux du logiciel (note et résultat).
      const checks = inspectionChecks(roomsOf(closed, data));
      const outcome = inspectionOutcome(tasks.map((t) => t.done));
      const reserves = tasks
        .filter((t) => !t.done)
        .map((t) => `${t.area} — ${t.label}${t.reason ? ` : ${t.reason}` : ""}`);
      const inspection = await prisma.inspection.create({
        data: {
          organizationId: org.id,
          title: `Contrôle ${bon} — ${clientName(row, data)}`,
          siteId: row.siteId,
          date: row.date,
          ownerId: me.id,
          ...checks,
          ...outcome,
          comments: reserves.length ? `Réserves :\n${reserves.join("\n")}` : "Aucune réserve.",
        },
      });
      // Points critiques non faits et contrôle non conforme : au chef, pas au client.
      const detected: AnomalyInput[] = tasks
        .filter((t) => t.critical && !t.done)
        .map((t) => ({
          organizationId: org.id,
          type: "critical_point",
          source: "system",
          siteId: row.siteId,
          interventionId: row.id,
          location: t.area,
          comment: `${t.label}${t.reason ? ` : ${t.reason}` : ""}`,
          severity: "high",
          dedupeKey: `critique:${t.id}`,
        }));
      // Fiche mission : une zone dont une tâche exige une photo, sans aucune photo prise.
      const photographed = new Set(row.proofs.map((p) => p.area ?? ""));
      for (const area of new Set(tasks.filter((t) => t.photoRequired).map((t) => t.area)))
        if (!photographed.has(area))
          detected.push({
            organizationId: org.id,
            type: "missing_proof",
            source: "system",
            siteId: row.siteId,
            interventionId: row.id,
            location: area,
            comment: "Aucune photo pour une zone où la fiche mission en exige une.",
            dedupeKey: `preuve:${row.id}:${area}`,
          });
      if (outcome.result === "non_compliant")
        detected.push({
          organizationId: org.id,
          type: "inspection_failed",
          source: "inspection",
          siteId: row.siteId,
          interventionId: row.id,
          comment: `${inspection.title} — note ${outcome.score} %.`,
          severity: "high",
          dedupeKey: `controle:${inspection.id}`,
        });
      await raiseAnomalies(org, detected);
      const chantier = toChantier(closed);
      const mail = await sendReport(org, chantier);
      data.cloture.mail = mail;
      const final = (await prisma.intervention.update({
        where: { id: row.id },
        data: { fieldData: data as unknown as Prisma.InputJsonValue },
        include: INTERVENTION_INCLUDE,
      })) as InterventionRow;
      return json({ chantier: toChantier(keepExtras(final, row)), mail });
    }

    /* ---------- espace responsable ---------- */
    if (route === "agents") {
      patronOnly();
      const accesses = await prisma.fieldAccess.findMany({
        where: { organizationId: org.id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      });
      return json({
        agents: accesses.map((a) => ({
          id: a.userId,
          nom: a.user.name,
          code: a.code,
          role: a.role,
          actif: a.active,
        })),
      });
    }

    if (route === "agent" && request.method === "POST") {
      patronOnly();
      if (body.supprimer) {
        if (body.supprimer === me.id)
          return fail("Vous ne pouvez pas désactiver votre propre compte.", 400);
        await prisma.fieldAccess.updateMany({
          where: { organizationId: org.id, userId: String(body.supprimer) },
          data: { active: false },
        });
        return json({ ok: true });
      }
      const code = str(body.code, 40).trim().toLowerCase();
      const pin = str(body.pin, 12);
      const name = str(body.nom, 60).trim();
      if (!/^[a-z0-9._-]{3,24}$/.test(code))
        return fail("Identifiant : 3 à 24 caractères, lettres et chiffres.", 400);
      if (!/^\d{6}$/.test(pin)) return fail("Le code doit comporter 6 chiffres.", 400);
      const existing = await prisma.fieldAccess.findFirst({
        where: { organizationId: org.id, code },
      });
      if (existing) {
        await prisma.fieldAccess.update({
          where: { id: existing.id },
          data: { ...newPin(pin), active: true },
        });
        return json({ ok: true });
      }
      const withAccess = new Set(
        (
          await prisma.fieldAccess.findMany({
            where: { organizationId: org.id },
            select: { userId: true },
          })
        ).map((a) => a.userId),
      );
      let userId: string;
      try {
        ({ userId } = await ensureAgentMember(org, name || code, { code, exclude: withAccess }));
      } catch (error) {
        if (error instanceof AgentMemberError) return fail(error.message, error.status);
        throw error;
      }
      await prisma.fieldAccess.upsert({
        where: { organizationId_userId: { organizationId: org.id, userId } },
        create: { organizationId: org.id, userId, code, role: "agent", ...newPin(pin) },
        update: { code, active: true, ...newPin(pin) },
      });
      return json({ ok: true });
    }

    if (route === "chantier-nouveau" && request.method === "POST") {
      patronOnly();
      const client = str(body.client, 120).trim();
      if (!client) return fail("Le nom du client est obligatoire.", 400);
      const agentId = str(body.agentId, 40);
      if (
        agentId &&
        !(await prisma.fieldAccess.count({
          where: { organizationId: org.id, userId: agentId, active: true },
        }))
      )
        return fail("Agent inconnu.", 400);
      const address = str(body.adresse, 160).trim() || null;
      const site =
        (await prisma.site.findFirst({
          where: { organizationId: org.id, deletedAt: null, name: client, address },
        })) ??
        (await prisma.site.create({
          data: {
            organizationId: org.id,
            name: client,
            address,
            postalCode: str(body.cp, 8).trim() || null,
            city: str(body.ville, 60).trim() || null,
            surfaceM2: Number(body.surface) || null,
          },
        }));
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date))
        ? String(body.date)
        : dayKey(new Date());
      const year = day.slice(0, 4);
      const ref = `CHT-${year}-${String(await nextNumber(org.id, `chantier-${year}`)).padStart(4, "0")}`;
      const data: FieldData = {
        ref,
        client: {
          nom: client,
          contact: str(body.contact, 80).trim(),
          tel: str(body.tel, 25).trim(),
          email: str(body.email, 120).trim(),
        },
      };
      const created = (await prisma.intervention.create({
        data: {
          organizationId: org.id,
          title: str(body.prestation, 120).trim() || "Intervention",
          siteId: site.id,
          ownerId: agentId || null,
          date: utcDay(new Date(`${day}T00:00:00.000Z`)),
          startTime: /^\d{2}:\d{2}$/.test(String(body.heure)) ? String(body.heure) : "09:00",
          durationMinutes: Math.round(Math.max(0.25, Number(body.devise) || 2) * 60),
          fieldData: data as unknown as Prisma.InputJsonValue,
        },
        include: INTERVENTION_INCLUDE,
      })) as InterventionRow;
      await prisma.auditLog.create({
        data: {
          organizationId: org.id,
          actorId: me.id,
          action: "intervention.created",
          entityType: "intervention",
          entityId: created.id,
          metadata: { name: created.title, source: "application terrain" },
        },
      });
      await recordInterventionEvent({
        organizationId: org.id,
        interventionId: created.id,
        userId: me.id,
        type: "created",
        metadata: {
          source: "application terrain",
          ref,
          label: "Chantier créé",
          detail: "",
          by: me.nom,
        },
      });
      return json({ chantier: toChantier(created) });
    }

    if (route === "historique") {
      patronOnly();
      const rows = (await prisma.intervention.findMany({
        where: {
          organizationId: org.id,
          deletedAt: null,
          date: { lte: utcDay(new Date()) },
        },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: 120,
        include: STOP_INCLUDE,
      })) as StopRow[];
      return json({ chantiers: rows.map(toStop) });
    }

    return fail("Route inconnue.", 404);
  } catch (error) {
    if (error instanceof HttpError) return fail(error.message, error.status);
    console.error(
      JSON.stringify({ level: "error", msg: "terrain.failed", route, error: String(error) }),
    );
    return json({ erreur: "Erreur serveur" }, 500);
  }
}
