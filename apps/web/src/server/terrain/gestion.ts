import "server-only";

import { randomBytes } from "node:crypto";

import { addDays, dayKey, parseDay, utcDay } from "@quercy/core";
import { type Prisma, prisma } from "@quercy/db";
import { SalesError, addPayment, finalizeDocument, saveLines } from "@quercy/documents";

import {
  type FieldData,
  INTERVENTION_INCLUDE,
  type InterventionRow,
  STOP_INCLUDE,
  type Stop,
  type StopRow,
  readFieldData,
  toChantier,
  toStop,
} from "./chantier";
import { entrepriseConf } from "./config";
import { type Body, HttpError, type Me, isDay, isMonth, json, txt } from "./http";
import type { TerrainOrgRow } from "./org";
import { patronIds, sendPush } from "./push";

export const token = () => randomBytes(18).toString("base64url");
const DAY_MS = 86_400_000;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;
const euros = (n: number) =>
  `${(Math.round(n * 100) / 100)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/* ------------------------------------------------------------- passages */

/** Passages de l'entreprise sur une période (jours inclus), au format de la tournée. */
export async function stopsBetween(
  organizationId: string,
  from: Date | null,
  to: Date | null,
  extra: Prisma.InterventionWhereInput = {},
): Promise<(Stop & { companyId: string | null; invoiceId: string | null })[]> {
  const rows = (await prisma.intervention.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(from || to
        ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
      ...extra,
    },
    include: STOP_INCLUDE,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 5000,
  })) as StopRow[];
  return rows.map((r) => ({
    ...toStop(r),
    companyId: r.companyId ?? r.site?.companyId ?? null,
    invoiceId: r.invoiceId,
  }));
}

const monthBounds = (m: string) => {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  return { from: new Date(Date.UTC(y, mo - 1, 1)), to: new Date(Date.UTC(y, mo, 0)) };
};

/** Valeur estimée d'un passage clôturé : heures réelles × tarif (du chantier ou par défaut). */
export const valueOf = (s: Stop, rate: number) => (s.reel ?? 0) * (s.taux || rate);

/* ------------------------------------------------------------- demandes */

function toDemande(d: Prisma.QuoteRequestGetPayload<object>) {
  return {
    id: d.id,
    recu: d.receivedAt.getTime(),
    statut: d.status,
    source: d.source,
    prenom: d.firstName ?? "",
    nom: d.lastName ?? "",
    email: d.email ?? "",
    tel: d.phone ?? "",
    prestation: d.service ?? "",
    message: d.message ?? "",
    adresse: d.address ?? "",
    ville: d.city ?? "",
    chantierId: d.interventionId ?? undefined,
    maj: d.updatedAt.getTime(),
  };
}

function field(body: Body, ...names: string[]) {
  for (const n of names)
    if (body[n] !== undefined && String(body[n]).trim()) return String(body[n]);
  return "";
}

/** Demande de devis envoyée par le formulaire du site (route publique). */
export async function receiveQuoteRequest(org: TerrainOrgRow, body: Body, ip: string) {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
  if (field(body, "_honey", "site_web")) return json({ ok: true }, 200, cors);
  const recent = await prisma.quoteRequest.count({
    where: {
      organizationId: org.id,
      receivedAt: { gte: new Date(Date.now() - 10 * 60_000) },
      source: `site:${ip}`.slice(0, 60),
    },
  });
  if (recent >= 5) return json({ erreur: "Trop de demandes, réessayez plus tard." }, 429, cors);
  const d = {
    firstName: txt(field(body, "prenom", "fname", "Prénom", "Prenom"), 60),
    lastName: txt(field(body, "nom", "lname", "Nom"), 60),
    email: txt(field(body, "email", "Email", "mail"), 120),
    phone: txt(field(body, "tel", "phone", "telephone", "Téléphone", "Telephone"), 25),
    service: txt(field(body, "prestation", "service", "Prestation", "Type de prestation"), 80),
    message: txt(field(body, "message", "besoin", "Message", "Votre besoin"), 2000),
    address: txt(field(body, "adresse"), 160),
    city: txt(field(body, "ville"), 60),
  };
  if (!d.firstName && !d.lastName && !d.phone && !d.email)
    return json({ erreur: "Demande vide." }, 400, cors);
  await prisma.quoteRequest.create({
    data: { organizationId: org.id, ...d, source: `site:${ip}`.slice(0, 60) },
  });
  await notifyNewRequest(org.id, d);
  return json({ ok: true }, 200, cors);
}

async function notifyNewRequest(
  organizationId: string,
  d: { firstName: string; lastName: string; service: string },
) {
  const who = `${d.firstName} ${d.lastName}`.trim() || "Sans nom";
  const patrons = await patronIds(organizationId);
  // Aussi dans les notifications du logiciel : la demande est la même pour les deux.
  if (patrons.length)
    await prisma.notification.createMany({
      data: patrons.map((userId) => ({
        organizationId,
        userId,
        type: "quote_request.received",
        title: `Nouvelle demande de devis : ${who}`,
        body: d.service || null,
        url: null,
      })),
    });
  await sendPush(organizationId, patrons, {
    titre: "Nouvelle demande de devis",
    corps: who + (d.service ? ` — ${d.service}` : ""),
    onglet: "demandes",
  });
}

const SAMPLE_REQUESTS = [
  {
    firstName: "Claire",
    lastName: "Bessières",
    phone: "06 11 22 33 44",
    email: "claire.b@exemple.fr",
    city: "Cahors",
    service: "Ménage Airbnb",
    message:
      "Bonjour, j'ai un T2 de 45 m² à Cahors en location courte durée. Il me faudrait un ménage entre chaque locataire, environ 6 fois par mois.",
  },
  {
    firstName: "Thomas",
    lastName: "Lacombe",
    phone: "05 65 22 33 44",
    email: "t.lacombe@exemple.fr",
    city: "Pradines",
    service: "Nettoyage de bureaux",
    message:
      "Cabinet comptable de 120 m² à Pradines, 2 passages par semaine en fin de journée. Pouvez-vous me faire un devis ?",
  },
  {
    firstName: "Syndic",
    lastName: "Quercy Immo",
    phone: "05 65 35 12 90",
    email: "gestion@exemple.fr",
    city: "Cahors",
    service: "Parties communes",
    message:
      "Copropriété de 18 lots : hall, deux cages d'escalier, local poubelles. Passage hebdomadaire souhaité, devis pour l'année.",
  },
  {
    firstName: "Élodie",
    lastName: "Vaysse",
    phone: "06 78 90 12 34",
    email: "elodie.vaysse@exemple.fr",
    city: "Luzech",
    service: "Ménage récurrent",
    message:
      "Maison de 110 m² à Luzech, 3 heures tous les quinze jours, le vendredi de préférence. Je suis éligible au crédit d'impôt, est-ce que vous le proposez ?",
  },
  {
    firstName: "Julien",
    lastName: "Delsol",
    phone: "06 22 44 66 88",
    email: "j.delsol@exemple.fr",
    city: "Espère",
    service: "Nettoyage de vitres",
    message: "Véranda et grandes baies vitrées d'une maison à Espère, deux fois par an.",
  },
];

/* ------------------------------------------------------------- clients */

/** Client (entreprise du logiciel) retrouvé par son nom, sinon créé. */
export async function companyByName(
  organizationId: string,
  name: string,
  fill: {
    email?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    siren?: string;
  } = {},
) {
  const existing = await prisma.company.findFirst({
    where: { organizationId, deletedAt: null, name: { equals: name, mode: "insensitive" } },
  });
  const clean = Object.fromEntries(Object.entries(fill).filter(([, v]) => v && v.trim())) as Record<
    string,
    string
  >;
  if (existing) {
    const missing = Object.fromEntries(
      Object.entries(clean).filter(([k]) => !(existing as Record<string, unknown>)[k]),
    );
    if (Object.keys(missing).length)
      await prisma.company.update({ where: { id: existing.id }, data: missing });
    return existing;
  }
  return prisma.company.create({ data: { organizationId, name, ...clean } });
}

/* ------------------------------------------------------------- factures */

const UNIT = (u: string) => (u === "h" ? "hour" : u === "jour" ? "day" : "unit");
const UNIT_BACK: Record<string, string> = { hour: "h", day: "jour", unit: "u", flat: "forfait" };

type DocWithParts = Prisma.SalesDocumentGetPayload<{
  include: {
    company: true;
    lines: true;
    billedInterventions: { select: { id: true; date: true } };
  };
}>;

function docStatus(d: { kind: string; status: string }) {
  if (d.kind === "QUOTE")
    return (
      {
        draft: "brouillon",
        sent: "envoye",
        accepted: "accepte",
        invoiced: "accepte",
        declined: "refuse",
        expired: "expire",
      }[d.status] ?? d.status
    );
  return (
    { draft: "brouillon", paid: "payee", credited: "annule" }[d.status] ??
    (["sent", "partial", "overdue"].includes(d.status) ? "a-payer" : d.status)
  );
}

export function toFacture(d: DocWithParts) {
  const dates = d.billedInterventions.map((i) => dayKey(i.date)).sort();
  return {
    id: d.id,
    type: d.kind === "QUOTE" ? "devis" : "facture",
    numero: d.number ?? "Brouillon",
    date: dayKey(d.issueDate ?? d.createdAt),
    echeance: d.dueDate ? dayKey(d.dueDate) : dayKey(d.issueDate ?? d.createdAt),
    client: d.company?.name ?? "",
    contact: "",
    email: d.company?.email ?? "",
    tel: d.company?.phone ?? "",
    adresse: d.company?.address ?? "",
    cp: d.company?.postalCode ?? "",
    ville: d.company?.city ?? "",
    siren: d.company?.siren ?? "",
    categorie: "Prestation de services",
    lignes: d.lines
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        libelle: l.description,
        quantite: l.quantity,
        unite: UNIT_BACK[l.unit ?? "unit"] ?? l.unit ?? "u",
        prix: l.unitPriceCents / 100,
      })),
    ht: d.totalExclCents / 100,
    tva: d.lines[0]?.vatRate ?? 20,
    ttc: d.totalCents / 100,
    statut: docStatus(d),
    chantiers: d.billedInterventions.map((i) => i.id),
    periode: dates.length ? { du: dates[0], au: dates[dates.length - 1] } : undefined,
    payeeLe: d.paidAt ? dayKey(d.paidAt) : undefined,
    note: d.notes ?? "",
    maj: d.updatedAt.getTime(),
  };
}
export type Facture = ReturnType<typeof toFacture>;

const DOC_INCLUDE = {
  company: true,
  lines: true,
  billedInterventions: { select: { id: true, date: true } },
} as const;

export async function listFactures(organizationId: string): Promise<Facture[]> {
  const docs = await prisma.salesDocument.findMany({
    where: { organizationId, deletedAt: null, kind: { in: ["INVOICE", "QUOTE"] } },
    include: DOC_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return docs.map(toFacture);
}

/* ------------------------------------------------------------- routes */

export interface GestionCtx {
  org: TerrainOrgRow;
  me: Me;
  url: URL;
  body: Body;
  request: Request;
}

/** Réservé au responsable. */
function patronOnly(me: Me) {
  if (me.role !== "patron") throw new HttpError("Réservé au responsable.", 403);
}

/**
 * Routes de gestion de l'application (v15) : demandes, calendrier, équipe, clients, factures,
 * pilotage, recherche, avis, QR, démonstration. Renvoie null si la route n'est pas ici.
 */
export async function handleGestion(route: string, ctx: GestionCtx): Promise<Response | null> {
  const { org, me, url, body, request } = ctx;
  const post = request.method === "POST";
  const conf = () => entrepriseConf(org);

  /* ---------- demandes de devis ---------- */
  if (route === "demandes") {
    patronOnly(me);
    const rows = await prisma.quoteRequest.findMany({
      where: { organizationId: org.id },
      orderBy: { receivedAt: "desc" },
      take: 500,
    });
    return json({ demandes: rows.map(toDemande) });
  }
  if (route === "demande-maj" && post) {
    patronOnly(me);
    const statuses = ["nouvelle", "vue", "planifiee", "sans-suite"];
    const found = await prisma.quoteRequest.findFirst({
      where: { id: txt(body.id, 40), organizationId: org.id },
    });
    if (!found) return json({ erreur: "Demande introuvable." }, 404);
    const updated = await prisma.quoteRequest.update({
      where: { id: found.id },
      data: {
        ...(statuses.includes(String(body.statut)) ? { status: String(body.statut) } : {}),
        ...(body.chantierId ? { interventionId: txt(body.chantierId, 40) } : {}),
        handledById: me.id,
        handledAt: new Date(),
      },
    });
    return json({ demande: toDemande(updated) });
  }
  if (route === "demande-test" && post) {
    patronOnly(me);
    const e = SAMPLE_REQUESTS[Math.floor(Math.random() * SAMPLE_REQUESTS.length)]!;
    const d = await prisma.quoteRequest.create({
      data: { organizationId: org.id, source: "essai", ...e },
    });
    return json({ demande: toDemande(d) });
  }

  /* ---------- calendrier, historique, activité ---------- */
  if (route === "calendrier") {
    const m = isMonth(url.searchParams.get("m"))
      ? url.searchParams.get("m")!
      : dayKey(new Date()).slice(0, 7);
    const { from, to } = monthBounds(m);
    const stops = await stopsBetween(org.id, from, to, {
      status: { not: "cancelled" },
      ...(me.role === "patron" ? {} : { OR: [{ ownerId: me.id }, { replacementAgentId: me.id }] }),
    });
    const jours: Record<string, { n: number; faits: number }> = {};
    for (const s of stops) {
      const j = (jours[s.date] ??= { n: 0, faits: 0 });
      j.n++;
      if (s.statut === "cloture") j.faits++;
    }
    return json({ mois: m, jours });
  }
  if (route === "historique-agent") {
    const target = me.role === "patron" ? url.searchParams.get("id") || me.id : me.id;
    const stops = (
      await stopsBetween(org.id, addDays(utcDay(new Date()), -730), null, {
        status: { not: "cancelled" },
        OR: [{ ownerId: target }, { replacementAgentId: target }],
      })
    ).filter((s) => s.agentId === target);
    stops.sort((a, b) => (b.date + b.heure).localeCompare(a.date + a.heure));
    const list = stops.slice(0, 200);
    const access = await prisma.fieldAccess.findFirst({
      where: { organizationId: org.id, userId: target },
      include: { user: { select: { name: true } } },
    });
    const closed = list.filter((s) => s.statut === "cloture");
    return json({
      agent: access
        ? {
            id: target,
            nom: access.user.name,
            couleur: access.color ?? "",
            photo: await hasAgentPhoto(org.id, target),
            tel: access.phone ?? "",
          }
        : null,
      chantiers: list,
      reelles: closed.reduce((n, s) => n + (s.reel ?? 0), 0),
      prevues: closed.reduce((n, s) => n + s.devise, 0),
    });
  }
  if (route === "activite") {
    patronOnly(me);
    const m = isMonth(url.searchParams.get("m"))
      ? url.searchParams.get("m")!
      : dayKey(new Date()).slice(0, 7);
    const { from, to } = monthBounds(m);
    const c = await conf();
    const stops = await stopsBetween(org.id, from, to, { status: { not: "cancelled" } });
    const byAgent: Record<
      string,
      { prevues: number; reelles: number; n: number; clotures: number; prevuesClot: number }
    > = {};
    let prevues = 0;
    let reelles = 0;
    let clotures = 0;
    let ca = 0;
    let prevuesClot = 0;
    for (const s of stops) {
      prevues += s.devise;
      const a = (byAgent[s.agentId] ??= {
        prevues: 0,
        reelles: 0,
        n: 0,
        clotures: 0,
        prevuesClot: 0,
      });
      a.n++;
      a.prevues += s.devise;
      if (s.statut === "cloture") {
        clotures++;
        reelles += s.reel ?? 0;
        prevuesClot += s.devise;
        ca += valueOf(s, c.taux);
        a.clotures++;
        a.reelles += s.reel ?? 0;
        a.prevuesClot += s.devise;
      }
    }
    const team = await teamOf(org.id);
    const seen = new Set(stops.map((s) => s.agentId));
    return json({
      mois: m,
      total: stops.length,
      clotures,
      prevues,
      reelles,
      prevuesClot,
      ca,
      taux: c.taux,
      agents: team
        .filter((a) => a.actif || seen.has(a.id))
        .map((a) => ({
          id: a.id,
          nom: a.nom,
          couleur: a.couleur,
          photo: a.photo,
          actif: a.actif,
          ...(byAgent[a.id] ?? { prevues: 0, reelles: 0, n: 0, clotures: 0, prevuesClot: 0 }),
        })),
    });
  }

  /* ---------- notifications du téléphone ---------- */
  if (route === "push-cle") {
    const { vapidKeys } = await import("./push");
    return json({ cle: (await vapidKeys(org.id)).publicKey });
  }
  if (route === "push-abo" && post) {
    if (body.retirer) {
      await prisma.pushSubscription.deleteMany({
        where: { organizationId: org.id, endpoint: txt(body.pt, 600) },
      });
      return json({ ok: true });
    }
    const abo = body.abo as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
    if (!abo?.endpoint || !abo.keys?.p256dh || !abo.keys.auth || !/^https:\/\//.test(abo.endpoint))
      return json({ erreur: "Abonnement invalide." }, 400);
    await prisma.pushSubscription.upsert({
      where: { endpoint: abo.endpoint.slice(0, 600) },
      create: {
        organizationId: org.id,
        userId: me.id,
        endpoint: abo.endpoint.slice(0, 600),
        keys: { p256dh: abo.keys.p256dh, auth: abo.keys.auth },
      },
      update: {
        organizationId: org.id,
        userId: me.id,
        keys: { p256dh: abo.keys.p256dh, auth: abo.keys.auth },
      },
    });
    return json({ ok: true });
  }
  if (route === "push-essai" && post) {
    const envoyes = await sendPush(org.id, [me.id], {
      titre: (await conf()).nom,
      corps: "Les notifications fonctionnent.",
      onglet: "tournee",
    });
    return json({ ok: true, envoyes });
  }

  /* ---------- modifier, annuler, retirer un chantier ---------- */
  if (route === "chantier-modif" && post) {
    patronOnly(me);
    const row = await loadRow(org.id, body.id);
    const data = readFieldData(row.fieldData);
    if (data.cloture) return json({ erreur: "Chantier clôturé, plus modifiable." }, 409);
    const started = Boolean(row.checkInAt);
    const change: Prisma.InterventionUpdateInput = {};
    const before = row.replacementAgentId ?? row.ownerId;
    if (!started) {
      if (isDay(body.date)) change.date = parseDay(String(body.date));
      if (/^\d{2}:\d{2}$/.test(String(body.heure ?? ""))) change.startTime = String(body.heure);
      if (body.agentId !== undefined) {
        const agent = txt(body.agentId, 40);
        if (
          agent &&
          !(await prisma.fieldAccess.count({
            where: { organizationId: org.id, userId: agent, active: true },
          }))
        )
          return json({ erreur: "Agent inconnu." }, 400);
        change.owner = agent ? { connect: { id: agent } } : { disconnect: true };
        change.replacementAgent = { disconnect: true };
      }
    }
    if (body.devise !== undefined)
      change.durationMinutes = Math.round(Math.max(0.25, Number(body.devise) || 2) * 60);
    if (body.prestation !== undefined) change.title = txt(body.prestation, 120) || row.title;
    data.client = {
      ...(data.client ?? {}),
      ...(body.client !== undefined ? { nom: txt(body.client, 120) } : {}),
      ...(body.contact !== undefined ? { contact: txt(body.contact, 80) } : {}),
      ...(body.tel !== undefined ? { tel: txt(body.tel, 25) } : {}),
      ...(body.email !== undefined ? { email: txt(body.email, 120) } : {}),
    };
    if (body.consignes !== undefined) data.consignes = txt(body.consignes, 600);
    if (body.siren !== undefined) data.siren = txt(body.siren, 20).replace(/[^\d ]/g, "");
    if (body.taux !== undefined) data.taux = Number(body.taux) || 0;
    change.fieldData = data as unknown as Prisma.InputJsonValue;
    await prisma.intervention.update({ where: { id: row.id }, data: change });
    await journal(org.id, row.id, me, "Chantier modifié", "");
    const after = await loadRow(org.id, row.id);
    const agent = after.replacementAgentId ?? after.ownerId;
    if (agent && agent !== before && agent !== me.id)
      await sendPush(org.id, [agent], {
        titre: "Intervention qui vous est confiée",
        corps: `${toChantier(after).client} · ${dayKey(after.date)} à ${after.startTime ?? ""}`,
        onglet: "tournee",
      });
    return json({ chantier: toChantier(after) });
  }
  if (route === "chantier-annule" && post) {
    patronOnly(me);
    const row = await loadRow(org.id, body.id);
    const data = readFieldData(row.fieldData);
    if (data.cloture)
      return json({ erreur: "Chantier clôturé : il ne peut plus être annulé." }, 409);
    const cancel = body.annule !== false;
    data.annule = cancel ? { ts: Date.now(), par: me.nom, motif: txt(body.motif, 200) } : false;
    await prisma.intervention.update({
      where: { id: row.id },
      data: {
        status: cancel ? "cancelled" : row.checkInAt ? "in_progress" : "planned",
        fieldData: data as unknown as Prisma.InputJsonValue,
      },
    });
    await journal(
      org.id,
      row.id,
      me,
      cancel ? "Chantier annulé" : "Annulation levée",
      cancel ? txt(body.motif, 200) : "",
    );
    return json({ chantier: toChantier(await loadRow(org.id, row.id)) });
  }
  if (route === "chantier-suppr" && post) {
    patronOnly(me);
    const row = await loadRow(org.id, body.id);
    // Rien ne disparaît : un chantier commencé reste ; sinon il passe en corbeille du logiciel.
    if (row.checkInAt) return json({ erreur: "Chantier commencé : annulez-le plutôt." }, 409);
    await prisma.intervention.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
    return json({ ok: true });
  }

  /* ---------- absences et remplacements (responsable) ---------- */
  if (route === "absence" && post && body.de) {
    patronOnly(me);
    const de = txt(body.de, 40);
    const vers = txt(body.vers, 40);
    const du = isDay(body.du) ? String(body.du) : dayKey(new Date());
    const au = isDay(body.au) ? String(body.au) : du;
    if (!de || !vers || de === vers)
      return json({ erreur: "Indiquez l'agent absent et son remplaçant." }, 400);
    if (
      !(await prisma.fieldAccess.count({
        where: { organizationId: org.id, userId: vers, active: true },
      }))
    )
      return json({ erreur: "Remplaçant introuvable." }, 404);
    const rows = (await prisma.intervention.findMany({
      where: {
        organizationId: org.id,
        deletedAt: null,
        date: { gte: parseDay(du), lte: parseDay(au) },
        status: { notIn: ["cancelled", "done"] },
        OR: [{ replacementAgentId: de }, { ownerId: de, replacementAgentId: null }],
      },
      include: STOP_INCLUDE,
    })) as StopRow[];
    const open = rows.filter((r) => !readFieldData(r.fieldData).cloture);
    if (open.length)
      await prisma.intervention.updateMany({
        where: { id: { in: open.map((r) => r.id) } },
        data: { replacementAgentId: vers },
      });
    for (const r of open)
      await journal(org.id, r.id, me, "Chantier réattribué", `absence du ${du} au ${au}`);
    // L'absence rejoint celles du logiciel (validée d'office par le responsable).
    await prisma.absence.create({
      data: {
        organizationId: org.id,
        userId: de,
        kind: "unavailable",
        startDate: parseDay(du),
        endDate: parseDay(au),
        status: "approved",
        source: "app",
        requestedById: me.id,
        decidedById: me.id,
        decidedAt: new Date(),
        comment: `Remplacé par ${(await prisma.user.findUnique({ where: { id: vers }, select: { name: true } }))?.name ?? ""} (${open.length} chantier(s))`,
      },
    });
    const touches = open.map((r) => `${toStop(r).client} · ${dayKey(r.date)}`);
    if (touches.length)
      await sendPush(org.id, [vers], {
        titre: "Chantiers réattribués",
        corps: `${touches.length} intervention(s) vous ont été confiées.`,
        onglet: "tournee",
      });
    return json({ ok: true, repris: touches.length, chantiers: touches });
  }
  if (route === "absences") {
    patronOnly(me);
    const rows = await prisma.absence.findMany({
      where: { organizationId: org.id, status: { in: ["requested", "approved"] } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    // Remplaçant et chantiers repris : lus sur les interventions de la période (une seule source).
    const absences = await Promise.all(
      rows.map(async (a) => {
        const moved = await prisma.intervention.findMany({
          where: {
            organizationId: org.id,
            deletedAt: null,
            ownerId: a.userId,
            replacementAgentId: { not: null },
            date: { gte: a.startDate, lte: a.endDate },
          },
          select: { replacementAgent: { select: { id: true, name: true } } },
        });
        const vers = moved[0]?.replacementAgent ?? null;
        return {
          id: a.id,
          de: a.userId,
          deNom: a.user.name,
          vers: vers?.id ?? "",
          versNom: vers?.name ?? "",
          du: dayKey(a.startDate),
          au: dayKey(a.endDate),
          n: moved.length,
          statut: a.status,
          motif: a.comment ?? "",
          ts: a.createdAt.getTime(),
        };
      }),
    );
    return json({ absences });
  }

  /* ---------- QR de pointage ---------- */
  if (route === "qr-creer" && post) {
    patronOnly(me);
    const client = txt(body.client, 120);
    if (!client) return json({ erreur: "Client obligatoire." }, 400);
    const existing = await prisma.terrainToken.findFirst({
      where: { organizationId: org.id, kind: "qr", label: { equals: client, mode: "insensitive" } },
    });
    if (existing) return json({ jeton: existing.token, client: existing.label });
    const company = await prisma.company.findFirst({
      where: {
        organizationId: org.id,
        deletedAt: null,
        name: { equals: client, mode: "insensitive" },
      },
      select: { id: true },
    });
    const t = await prisma.terrainToken.create({
      data: {
        organizationId: org.id,
        token: token(),
        kind: "qr",
        label: client,
        companyId: company?.id ?? null,
        createdById: me.id,
      },
    });
    return json({ jeton: t.token, client });
  }

  /* ---------- carnet clients ---------- */
  if (route === "clients") {
    patronOnly(me);
    const c = await conf();
    const stops = await stopsBetween(
      org.id,
      addDays(utcDay(new Date()), -730),
      addDays(utcDay(new Date()), 365),
      {
        status: { not: "cancelled" },
      },
    );
    const today = dayKey(new Date());
    const by = new Map<
      string,
      {
        nom: string;
        ville: string;
        n: number;
        heures: number;
        ca: number;
        dernier: string;
        prochain: string;
        id: string;
      }
    >();
    for (const s of stops) {
      const k = norm(s.client);
      if (!k) continue;
      const e = by.get(k) ?? {
        nom: s.client,
        ville: s.ville,
        n: 0,
        heures: 0,
        ca: 0,
        dernier: "",
        prochain: "",
        id: s.id,
      };
      e.n++;
      if (s.statut === "cloture") {
        e.heures += s.reel ?? 0;
        e.ca += valueOf(s, c.taux);
      }
      if (s.date <= today && s.date > e.dernier) {
        e.dernier = s.date;
        e.id = s.id;
      }
      if (s.date > today && (!e.prochain || s.date < e.prochain)) e.prochain = s.date;
      by.set(k, e);
    }
    return json({
      clients: [...by.values()].sort((a, b) => (b.dernier || "").localeCompare(a.dernier || "")),
    });
  }
  if (route === "client") {
    patronOnly(me);
    const name = norm(txt(url.searchParams.get("nom"), 120));
    const stops = (
      await stopsBetween(
        org.id,
        addDays(utcDay(new Date()), -1095),
        addDays(utcDay(new Date()), 365),
        {},
      )
    ).filter((s) => norm(s.client) === name);
    let fiche = null;
    const last = stops.at(-1);
    if (last) {
      const ch = toChantier(await loadRow(org.id, last.id));
      fiche = {
        client: ch.client,
        contact: ch.contact,
        tel: ch.tel,
        email: ch.email,
        adresse: ch.adresse,
        cp: ch.cp,
        ville: ch.ville,
        prestation: ch.prestation,
        modele: ch.modele,
        devise: ch.devise,
        taux: ch.taux,
        consignes: ch.consignes,
        surface: ch.surface,
        siren: ch.siren,
      };
    }
    return json({ fiche, chantiers: stops.slice().reverse() });
  }
  if (route === "attestation") {
    patronOnly(me);
    return json(await attestation(org, url));
  }

  /* ---------- devis et factures ---------- */
  if (route === "factures") {
    patronOnly(me);
    return json({ factures: await listFactures(org.id) });
  }
  if (route === "facture-nouvelle" && post) {
    patronOnly(me);
    return json(await newFacture(org, me, body));
  }
  if (route === "facture-maj" && post) {
    patronOnly(me);
    const doc = await prisma.salesDocument.findFirst({
      where: { id: txt(body.id, 40), organizationId: org.id, deletedAt: null },
      include: DOC_INCLUDE,
    });
    if (!doc) return json({ erreur: "Document introuvable." }, 404);
    const statut = String(body.statut);
    try {
      if (doc.kind === "INVOICE" && statut === "payee" && doc.status !== "paid") {
        if (doc.status === "draft") await finalizeDocument(org.id, doc.id);
        const fresh = await prisma.salesDocument.findUniqueOrThrow({ where: { id: doc.id } });
        if (fresh.dueCents > 0)
          await addPayment(
            org.id,
            doc.id,
            {
              amountCents: fresh.dueCents,
              date: new Date(),
              method: "transfer",
              reference: "Application terrain",
            },
            me.id,
          );
      } else if (doc.kind === "INVOICE" && statut === "annule") {
        return json(
          { erreur: "Une facture émise s'annule par un avoir, depuis le logiciel." },
          409,
        );
      } else if (doc.kind === "QUOTE") {
        const map: Record<string, string> = {
          envoye: "sent",
          accepte: "accepted",
          refuse: "declined",
          annule: "declined",
        };
        if (map[statut]) {
          if (doc.status === "draft") await finalizeDocument(org.id, doc.id);
          await prisma.salesDocument.update({
            where: { id: doc.id },
            data: {
              status: map[statut],
              ...(statut === "accepte" ? { acceptedAt: new Date() } : {}),
            },
          });
        }
      }
    } catch (error) {
      if (error instanceof SalesError) return json({ erreur: error.message }, 400);
      throw error;
    }
    const after = await prisma.salesDocument.findUniqueOrThrow({
      where: { id: doc.id },
      include: DOC_INCLUDE,
    });
    return json({ facture: toFacture(after) });
  }
  if (route === "a-facturer") {
    patronOnly(me);
    const c = await conf();
    const m = isMonth(url.searchParams.get("m"))
      ? url.searchParams.get("m")!
      : dayKey(new Date()).slice(0, 7);
    const { from, to } = monthBounds(m);
    const stops = (await stopsBetween(org.id, from, to, { invoiceId: null })).filter(
      (s) => s.statut === "cloture" && !s.exemple,
    );
    const out = [];
    for (const s of stops) {
      const ch = toChantier(await loadRow(org.id, s.id));
      out.push({
        id: s.id,
        date: s.date,
        client: s.client,
        prestation: s.prestation,
        heures: s.reel ?? 0,
        taux: s.taux || c.taux,
        email: ch.email,
        adresse: ch.adresse,
        cp: ch.cp,
        ville: ch.ville,
        contact: ch.contact,
        siren: ch.siren,
      });
    }
    return json({ mois: m, chantiers: out });
  }

  /* ---------- pilotage, recherche, alertes ---------- */
  if (route === "pilotage") {
    patronOnly(me);
    return json(await pilotage(org));
  }
  if (route === "recherche") {
    patronOnly(me);
    return json(await recherche(org, txt(url.searchParams.get("q"), 60)));
  }
  if (route === "alertes-verifier" && post) {
    patronOnly(me);
    const { runTerrainAlerts } = await import("./alerts");
    return json({ ok: true, ...(await runTerrainAlerts(org.id, true)) });
  }

  /* ---------- avis client ---------- */
  if (route === "avis-lien" && post) {
    const row = await loadRow(org.id, body.id);
    if (me.role !== "patron" && (row.replacementAgentId ?? row.ownerId) !== me.id)
      return json({ erreur: "Ce chantier n'est pas le vôtre." }, 403);
    if (!readFieldData(row.fieldData).cloture)
      return json({ erreur: "Clôturez d'abord l'intervention." }, 409);
    const review =
      (await prisma.clientReview.findUnique({ where: { interventionId: row.id } })) ??
      (await prisma.clientReview.create({
        data: { organizationId: org.id, interventionId: row.id, token: token() },
      }));
    if (body.envoi) {
      await prisma.clientReview.update({
        where: { id: review.id },
        data: { requestedAt: new Date() },
      });
      await journal(org.id, row.id, me, "Avis demandé au client", "");
    }
    return json({ jeton: review.token });
  }

  /* ---------- sauvegarde ---------- */
  if (route === "export") {
    patronOnly(me);
    const stops = await stopsBetween(org.id, null, null, {});
    return json(
      {
        genere: new Date().toISOString(),
        version: 3,
        entreprise: await conf(),
        agents: await teamOf(org.id),
        chantiers: stops,
        demandes: (await prisma.quoteRequest.findMany({ where: { organizationId: org.id } })).map(
          toDemande,
        ),
        factures: await listFactures(org.id),
        avis: (
          await prisma.clientReview.findMany({
            where: { organizationId: org.id, rating: { not: null } },
          })
        ).map((r) => ({
          id: r.interventionId,
          note: r.rating,
          commentaire: r.comment,
          ts: r.ratedAt?.getTime(),
        })),
      },
      200,
      { "content-disposition": 'attachment; filename="sauvegarde-terrain.json"' },
    );
  }

  return null;
}

/* ------------------------------------------------------------- outils */

export async function loadRow(organizationId: string, id: unknown) {
  const row = (await prisma.intervention.findFirst({
    where: { id: String(id ?? ""), organizationId, deletedAt: null },
    include: INTERVENTION_INCLUDE,
  })) as InterventionRow | null;
  if (!row) throw new HttpError("Chantier introuvable.", 404);
  return row;
}

export async function journal(
  organizationId: string,
  interventionId: string,
  me: Me,
  label: string,
  detail: string,
) {
  await prisma.interventionEvent.create({
    data: {
      organizationId,
      interventionId,
      userId: me.id,
      type: "note",
      metadata: { source: "application terrain", label, detail, by: me.nom },
    },
  });
}

export async function hasAgentPhoto(organizationId: string, userId: string) {
  return (
    (await prisma.storedFile.count({
      where: { organizationId, entityType: "agent-photo", entityId: userId, deletedAt: null },
    })) > 0
  );
}

/** Équipe de l'application : accès terrain avec nom, couleur, téléphone et photo. */
export async function teamOf(organizationId: string) {
  const [accesses, photos] = await Promise.all([
    prisma.fieldAccess.findMany({
      where: { organizationId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.storedFile.findMany({
      where: { organizationId, entityType: "agent-photo", deletedAt: null },
      select: { entityId: true },
    }),
  ]);
  const withPhoto = new Set(photos.map((p) => p.entityId));
  return accesses.map((a, i) => ({
    id: a.userId,
    nom: a.user.name,
    code: a.code,
    role: a.role === "patron" ? "patron" : "agent",
    actif: a.active,
    couleur: a.color ?? ["#009C84", "#B07B2A", "#3C6E9F", "#8A5B9E", "#B8553C", "#4C8C4A"][i % 6]!,
    tel: a.phone ?? "",
    photo: withPhoto.has(a.userId),
    exemple: a.sample,
  }));
}

/* ------------------------------------------------------------- factures */

async function newFacture(org: TerrainOrgRow, me: Me, body: Body) {
  const c = await entrepriseConf(org);
  const type = body.type === "devis" ? "QUOTE" : "INVOICE";
  const client = txt(body.client, 120);
  if (!client) throw new HttpError("Client obligatoire.", 400);
  const tva = [0, 5.5, 10, 20].includes(Number(body.tva)) ? Number(body.tva) : c.tva;
  const lines = (Array.isArray(body.lignes) ? body.lignes : [])
    .map((l: Record<string, unknown>) => ({
      description: txt(l.libelle, 160),
      quantity: Math.max(0, Number(l.quantite) || 0),
      unit: UNIT(txt(l.unite, 16) || "h"),
      unitPriceCents: Math.round(Math.max(0, Number(l.prix) || 0) * 100),
      discountPercent: 0,
      vatRate: tva,
    }))
    .filter((l) => l.description && l.quantity > 0);
  if (!lines.length) throw new HttpError("Au moins une ligne est nécessaire.", 400);
  const company = await companyByName(org.id, client, {
    email: txt(body.email, 120),
    address: txt(body.adresse, 160),
    postalCode: txt(body.cp, 8),
    city: txt(body.ville, 60),
    siren: txt(body.siren, 20).replace(/[^\d]/g, ""),
  });
  const ids = (Array.isArray(body.chantiers) ? body.chantiers : [])
    .map((x) => txt(x, 40))
    .slice(0, 60);
  const doc = await prisma.salesDocument.create({
    data: {
      organizationId: org.id,
      kind: type,
      status: "draft",
      companyId: company.id,
      ownerId: me.id,
      subject: type === "QUOTE" ? "Devis" : "Prestations de nettoyage",
      notes: txt(body.note, 400) || null,
      ...(isDay(body.echeance) ? { dueDate: parseDay(String(body.echeance)) } : {}),
    },
  });
  try {
    await saveLines(org.id, doc.id, lines);
    await finalizeDocument(org.id, doc.id);
  } catch (error) {
    if (error instanceof SalesError) throw new HttpError(error.message, 400);
    throw error;
  }
  if (type === "INVOICE" && ids.length)
    await prisma.intervention.updateMany({
      where: { organizationId: org.id, id: { in: ids }, invoiceId: null },
      data: { invoiceId: doc.id },
    });
  const full = await prisma.salesDocument.findUniqueOrThrow({
    where: { id: doc.id },
    include: DOC_INCLUDE,
  });
  return { facture: toFacture(full) };
}

/* ------------------------------------------------------------- attestation fiscale */

async function attestation(org: TerrainOrgRow, url: URL) {
  const year = /^\d{4}$/.test(url.searchParams.get("a") ?? "")
    ? url.searchParams.get("a")!
    : String(new Date().getFullYear());
  const name = norm(txt(url.searchParams.get("nom"), 120));
  const c = await entrepriseConf(org);
  const team = await teamOf(org.id);
  const who = (id: string) => {
    const a = team.find((x) => x.id === id);
    return { intervenant: a?.nom ?? "", code: a?.code ?? "" };
  };
  const stops = (
    await stopsBetween(
      org.id,
      new Date(Date.UTC(+year, 0, 1)),
      new Date(Date.UTC(+year, 11, 31)),
      {},
    )
  ).filter((s) => s.statut === "cloture" && norm(s.client) === name);
  const invoices = (await listFactures(org.id)).filter(
    (f) => f.type === "facture" && norm(f.client) === name,
  );
  const paid = invoices.filter(
    (f) => f.statut === "payee" && String(f.payeeLe || f.date).slice(0, 4) === year,
  );
  const vat = 1 + c.tva / 100;
  let detail: {
    date: string;
    prestation: string;
    heures: number;
    montant: number;
    intervenant: string;
    code: string;
    facture?: string;
  }[] = [];
  let estime = false;
  if (paid.length) {
    for (const f of paid) {
      const linked = stops.filter((s) => f.chantiers.includes(s.id));
      if (!linked.length) {
        const h = f.lignes.filter((l) => l.unite === "h").reduce((n, l) => n + l.quantite, 0);
        detail.push({
          date: f.date,
          prestation: f.lignes[0]?.libelle ?? "Prestation",
          heures: h,
          montant: f.ttc,
          intervenant: "",
          code: "",
          facture: f.numero,
        });
        continue;
      }
      const weights = linked.map((s) => valueOf(s, c.taux));
      const sum = weights.reduce((a, b) => a + b, 0);
      linked.forEach((s, i) =>
        detail.push({
          date: s.date,
          prestation: s.prestation,
          heures: s.reel ?? 0,
          montant: sum ? (f.ttc * weights[i]!) / sum : f.ttc / linked.length,
          ...who(s.agentId),
          facture: f.numero,
        }),
      );
    }
  } else if (!invoices.length) {
    estime = true;
    detail = stops.map((s) => ({
      date: s.date,
      prestation: s.prestation,
      heures: s.reel ?? 0,
      montant: valueOf(s, c.taux) * vat,
      ...who(s.agentId),
    }));
  }
  detail.sort((a, b) => a.date.localeCompare(b.date));
  const last = stops.at(-1);
  let fiche: Record<string, string> = {};
  if (last) {
    const ch = toChantier(await loadRow(org.id, last.id));
    fiche = { contact: ch.contact, adresse: ch.adresse, cp: ch.cp, ville: ch.ville };
  } else if (paid[0])
    fiche = { contact: "", adresse: paid[0].adresse, cp: paid[0].cp, ville: paid[0].ville };
  return {
    annee: year,
    client: last?.client ?? paid[0]?.client ?? "",
    ...fiche,
    heures: detail.reduce((n, x) => n + x.heures, 0),
    total: detail.reduce((n, x) => n + x.montant, 0),
    detail,
    estime,
    enAttente: invoices.filter((f) => f.statut === "a-payer").length,
    entreprise: c,
  };
}

/* ------------------------------------------------------------- pilotage */

async function pilotage(org: TerrainOrgRow) {
  const c = await entrepriseConf(org);
  const now = new Date();
  const today = dayKey(now);
  const months: string[] = [];
  for (let k = 5; k >= 0; k--)
    months.push(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)).toISOString().slice(0, 7),
    );
  const pos = Object.fromEntries(months.map((m, i) => [m, i]));
  const serie = months.map((m) => ({ mois: m, ca: 0, heures: 0, n: 0, encaisse: 0, prevues: 0 }));
  const stops = await stopsBetween(
    org.id,
    monthBounds(months[0]!).from,
    monthBounds(months[5]!).to,
    {},
  );
  let aFacturer = 0;
  let montantAFacturer = 0;
  const aCloturer: { id: string; client: string; date: string }[] = [];
  const nonFaits: { id: string; client: string; date: string }[] = [];
  const nowMin = parisMinutes(now);
  const jour = { total: 0, surSite: 0, aVenir: 0, termines: 0, retard: 0, agents: 0 };
  const agentsToday = new Set<string>();
  const monthAgo = dayKey(addDays(utcDay(now), -30));
  for (const s of stops) {
    if (s.statut === "annule") continue;
    const i = pos[s.date.slice(0, 7)];
    const value = valueOf(s, c.taux);
    if (s.statut === "cloture") {
      if (i !== undefined) {
        serie[i]!.ca += value;
        serie[i]!.heures += s.reel ?? 0;
        serie[i]!.n++;
        serie[i]!.prevues += s.devise;
      }
      if (!s.invoiceId && !s.exemple) {
        aFacturer++;
        montantAFacturer += value;
      }
    }
    if (s.statut === "a-cloturer" || (s.statut === "en-cours" && s.date < today))
      aCloturer.push({ id: s.id, client: s.client, date: s.date });
    if (s.statut === "prevu" && s.date < today && s.date >= monthAgo && !s.exemple)
      nonFaits.push({ id: s.id, client: s.client, date: s.date });
    if (s.date === today) {
      jour.total++;
      if (s.agentId) agentsToday.add(s.agentId);
      if (s.statut === "en-cours") jour.surSite++;
      else if (s.statut === "cloture" || s.statut === "a-cloturer") jour.termines++;
      else {
        const h = minutesOf(s.heure);
        if (h !== null && nowMin >= h + 15) jour.retard++;
        else jour.aVenir++;
      }
    }
  }
  jour.agents = agentsToday.size;
  const invoices = (await listFactures(org.id)).filter((f) => f.type === "facture");
  for (const f of invoices) {
    if (f.statut !== "payee") continue;
    const i = pos[String(f.payeeLe || f.date).slice(0, 7)];
    if (i !== undefined) serie[i]!.encaisse += f.ttc;
  }
  const unpaid = invoices.filter((f) => f.statut === "a-payer");
  const late = unpaid.filter((f) => f.echeance < today);
  const demandes = await prisma.quoteRequest.findMany({
    where: { organizationId: org.id, status: { in: ["nouvelle", "vue"] } },
    select: { receivedAt: true },
  });
  const reviews = await reviewsOf(org.id);
  const avg = (l: { note: number }[]) =>
    l.length ? l.reduce((n, x) => n + x.note, 0) / l.length : null;
  const thisMonth = reviews.filter((r) => dayKey(new Date(r.ts)).slice(0, 7) === today.slice(0, 7));
  return {
    auj: today,
    jour,
    serie,
    aFacturer: { n: aFacturer, montant: montantAFacturer },
    aCloturer: aCloturer.slice(-20),
    nonFaits: nonFaits.slice(-20),
    impayes: { n: unpaid.length, montant: unpaid.reduce((n, f) => n + f.ttc, 0) },
    retard: { n: late.length, montant: late.reduce((n, f) => n + f.ttc, 0) },
    demandes: {
      n: demandes.length,
      plusAncienne: demandes.reduce((m, d) => Math.min(m, d.receivedAt.getTime()), Date.now()),
    },
    avis: {
      n: reviews.length,
      moyenne: avg(reviews),
      nMois: thisMonth.length,
      moyenneMois: avg(thisMonth),
      derniers: reviews.slice(0, 5),
    },
  };
}

export async function reviewsOf(organizationId: string) {
  const rows = await prisma.clientReview.findMany({
    where: { organizationId, rating: { not: null } },
    orderBy: { ratedAt: "desc" },
    take: 200,
    include: { intervention: { include: STOP_INCLUDE } },
  });
  return rows.map((r) => {
    const s = toStop(r.intervention as unknown as StopRow);
    return {
      id: r.interventionId,
      client: s.client,
      agentId: s.agentId,
      date: s.date,
      note: r.rating!,
      commentaire: r.comment ?? "",
      ts: r.ratedAt?.getTime() ?? 0,
      demo: r.demo,
    };
  });
}

const PARIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function parisMinutes(d: Date) {
  const [h, m] = PARIS.format(d).split(":").map(Number) as [number, number];
  return (h % 24) * 60 + m;
}
export function minutesOf(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  return m ? +m[1]! * 60 + +m[2]! : null;
}

/* ------------------------------------------------------------- recherche */

async function recherche(org: TerrainOrgRow, query: string) {
  const q = norm(query);
  if (q.length < 2) return { q, resultats: [] };
  const words = q.split(/\s+/).filter(Boolean);
  const found = (...fields: (string | null | undefined)[]) => {
    const t = norm(fields.filter(Boolean).join(" "));
    return words.every((w) => t.includes(w));
  };
  const out: { type: string; id?: string; titre: string; sous: string; statut?: string }[] = [];
  const stops = await stopsBetween(
    org.id,
    addDays(utcDay(new Date()), -365),
    addDays(utcDay(new Date()), 120),
    {
      status: { not: "cancelled" },
    },
  );
  const clients = new Map<string, { titre: string; ville: string; n: number }>();
  for (const s of stops) {
    if (!found(s.client, s.ville)) continue;
    const e = clients.get(norm(s.client)) ?? { titre: s.client, ville: s.ville, n: 0 };
    e.n++;
    clients.set(norm(s.client), e);
  }
  for (const c of [...clients.values()].slice(0, 6))
    out.push({
      type: "client",
      titre: c.titre,
      sous: plural(c.n, "intervention") + (c.ville ? ` · ${c.ville}` : ""),
    });
  for (const a of (await teamOf(org.id)).filter((x) => x.actif && found(x.nom, x.code)).slice(0, 4))
    out.push({
      type: "agent",
      id: a.id,
      titre: a.nom,
      sous: a.role === "patron" ? "Responsable" : `Agent · ${a.code}`,
    });
  const labels: Record<string, string> = {
    "a-payer": "à payer",
    payee: "payée",
    envoye: "envoyé",
    accepte: "accepté",
    refuse: "refusé",
    annule: "annulé",
    brouillon: "brouillon",
  };
  for (const f of (await listFactures(org.id)).filter((x) => found(x.numero, x.client)).slice(0, 8))
    out.push({
      type: "facture",
      id: f.id,
      titre: `${f.numero} · ${f.client}`,
      sous: `${euros(f.ttc)} · ${labels[f.statut] ?? f.statut}`,
    });
  const demandes = await prisma.quoteRequest.findMany({
    where: { organizationId: org.id },
    orderBy: { receivedAt: "desc" },
    take: 500,
  });
  for (const d of demandes
    .filter((x) => found(x.firstName, x.lastName, x.email, x.phone, x.city, x.service))
    .slice(0, 6))
    out.push({
      type: "demande",
      id: d.id,
      titre: `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || "Sans nom",
      sous: `${d.service || "Demande de devis"} · reçue le ${shortDate(dayKey(d.receivedAt))}`,
    });
  for (const s of stops
    .filter((x) => found(x.client, x.ville, x.prestation, x.adresse))
    .slice(-8)
    .reverse())
    out.push({
      type: "chantier",
      id: s.id,
      titre: s.client,
      sous: `${shortDate(s.date)} · ${s.heure} · ${s.prestation}`,
      statut: s.statut,
    });
  return { q, resultats: out.slice(0, 40) };
}

/* ------------------------------------------------------------- jeu de démonstration */

export const DAY = DAY_MS;
export type { FieldData };
