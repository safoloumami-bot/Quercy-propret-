import "server-only";

import { dayKey, parseDay } from "@quercy/core";
import { type Prisma, prisma } from "@quercy/db";
import { recordInterventionEvent } from "@quercy/jobs";
import { saveLines } from "@quercy/documents";

import { AgentMemberError, ensureAgentMember } from "../cleaning/agents";
import { publish } from "../realtime";
import { CHECKLISTS, type Checklist, checklistFor } from "./checklists";
import { type FieldData, INTERVENTION_INCLUDE, type InterventionRow, freshTasks } from "./chantier";
import { COULEURS, entrepriseConf } from "./config";
import { stopsBetween, token } from "./gestion";
import { type Body, HttpError, type Me, isDay, txt } from "./http";
import type { TerrainOrgRow } from "./org";
import { sendPush } from "./push";
import { SAMPLE_SIGNATURE } from "./sample-signature";
import { newPin } from "./session";

const DAY_MS = 86_400_000;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const shiftDay = (day: string, n: number) => dayKey(new Date(parseDay(day).getTime() + n * DAY_MS));
const parisToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

/** Instant correspondant à une heure de Paris un jour donné. */
export function parisAt(day: string, hhmm: string) {
  const guess = new Date(`${day}T${hhmm}:00.000Z`);
  const shown = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(guess);
  const [h, m] = shown.split(":").map(Number) as [number, number];
  const [gh, gm] = hhmm.split(":").map(Number) as [number, number];
  let diff = h * 60 + m - (gh * 60 + gm);
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  return new Date(guess.getTime() - diff * 60_000);
}

/** Grille de contrôle choisie dans l'application (libellé « Logement meublé »… ou clé). */
export function checklistOfModel(model: unknown, title: string, siteName?: string): Checklist {
  const m = String(model ?? "");
  return CHECKLISTS.find((c) => c.label === m || c.key === m) ?? checklistFor(title, siteName);
}

async function nextNumber(organizationId: string, key: string) {
  const seq = await prisma.numberSequence.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return seq.value;
}

interface NewChantier {
  client: string;
  contact?: string;
  tel?: string;
  email?: string;
  adresse?: string;
  cp?: string;
  ville?: string;
  siren?: string;
  surface?: number;
  prestation?: string;
  modele?: string;
  date: string;
  heure?: string;
  devise?: number;
  taux?: number;
  agentId?: string;
  consignes?: string;
}

function readNew(body: Body): NewChantier {
  return {
    client: txt(body.client, 120),
    contact: txt(body.contact, 80),
    tel: txt(body.tel, 25),
    email: txt(body.email, 120),
    adresse: txt(body.adresse, 160),
    cp: txt(body.cp, 8),
    ville: txt(body.ville, 60),
    siren: txt(body.siren, 20).replace(/[^\d ]/g, ""),
    surface: Number(body.surface) || 0,
    prestation: txt(body.prestation, 120),
    modele: txt(body.modele, 60),
    date: isDay(body.date) ? String(body.date) : parisToday(),
    heure: /^\d{2}:\d{2}$/.test(String(body.heure)) ? String(body.heure) : "09:00",
    devise: Math.max(0.25, Number(body.devise) || 2),
    taux: Math.max(0, Number(body.taux) || 0),
    agentId: txt(body.agentId, 40),
    consignes: txt(body.consignes, 600),
  };
}

/** Site du client : retrouvé par nom et adresse, sinon créé (étiqueté s'il s'agit d'un exemple). */
async function siteFor(organizationId: string, c: NewChantier, tag?: "exemple" | "demo") {
  const address = c.adresse || null;
  const found = await prisma.site.findFirst({
    where: { organizationId, deletedAt: null, name: c.client, address },
  });
  if (found) return found;
  const company = await prisma.company.findFirst({
    where: { organizationId, deletedAt: null, name: { equals: c.client, mode: "insensitive" } },
    select: { id: true },
  });
  return prisma.site.create({
    data: {
      organizationId,
      name: c.client,
      address,
      postalCode: c.cp || null,
      city: c.ville || null,
      surfaceM2: c.surface || null,
      companyId: company?.id ?? null,
      tags: tag ? [tag] : [],
    },
  });
}

/** Crée une intervention depuis l'application (même chose que le planning du logiciel). */
async function createOne(
  org: TerrainOrgRow,
  me: Me,
  c: NewChantier,
  extra: Partial<FieldData> = {},
  tag?: "exemple" | "demo",
) {
  const site = await siteFor(org.id, c, tag);
  const year = c.date.slice(0, 4);
  const ref = `CHT-${year}-${String(await nextNumber(org.id, `chantier-${year}`)).padStart(4, "0")}`;
  const title = c.prestation || "Intervention";
  const list = checklistOfModel(c.modele, title, c.client);
  const data: FieldData = {
    ref,
    grille: list.key,
    client: { nom: c.client, contact: c.contact ?? "", tel: c.tel ?? "", email: c.email ?? "" },
    ...(c.consignes ? { consignes: c.consignes } : {}),
    ...(c.taux ? { taux: c.taux } : {}),
    ...(c.siren ? { siren: c.siren } : {}),
    ...extra,
  };
  const created = await prisma.intervention.create({
    data: {
      organizationId: org.id,
      title,
      siteId: site.id,
      companyId: site.companyId,
      ownerId: c.agentId || null,
      date: parseDay(c.date),
      startTime: c.heure ?? "09:00",
      durationMinutes: Math.round((c.devise ?? 2) * 60),
      fieldData: data as unknown as Prisma.InputJsonValue,
    },
  });
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
  return { created, list };
}

/** Réserves du dernier passage clôturé chez ce client, à reprendre au prochain. */
async function lastReserves(organizationId: string, client: string) {
  const today = parseDay(parisToday());
  const past = (
    await stopsBetween(organizationId, new Date(today.getTime() - 730 * DAY_MS), today)
  ).filter((s) => s.statut === "cloture" && norm(s.client) === norm(client));
  const last = past[past.length - 1];
  if (!last) return [];
  const tasks = await prisma.interventionTask.findMany({
    where: { interventionId: last.id, done: false, reason: { not: null } },
    orderBy: { sortOrder: "asc" },
  });
  return tasks
    .filter((t) => (t.reason ?? "").trim())
    .map((t) => ({ piece: t.area, point: t.label, motif: t.reason!, date: last.date }))
    .slice(0, 12);
}

/**
 * « Nouveau chantier » de l'application : un passage ou une série (hebdomadaire, tous les
 * quinze jours, mensuelle, jusqu'à 26), avec les réserves du dernier passage à reprendre.
 */
export async function newChantiers(org: TerrainOrgRow, me: Me, body: Body) {
  const c = readNew(body);
  if (!c.client) throw new HttpError("Le nom du client est obligatoire.", 400);
  if (
    c.agentId &&
    !(await prisma.fieldAccess.count({
      where: { organizationId: org.id, userId: c.agentId, active: true },
    }))
  )
    throw new HttpError("Agent inconnu.", 400);
  const rec = ["hebdo", "quinzaine", "mensuel"].includes(String(body.recurrence))
    ? String(body.recurrence)
    : "aucune";
  const count =
    rec === "aucune"
      ? 1
      : Math.max(1, Math.min(26, Number.parseInt(String(body.occurrences), 10) || 4));
  const reprises = body.reprendre === false ? [] : await lastReserves(org.id, c.client);
  const first = c.date;
  const anchor = Number(first.slice(8, 10));
  const ids: string[] = [];
  let firstRow: InterventionRow | null = null;
  let day = first;
  for (let k = 0; k < count; k++) {
    const { created } = await createOne(
      org,
      me,
      { ...c, date: day },
      k === 0 && reprises.length ? { reprises } : {},
    );
    ids.push(created.id);
    if (k === 0)
      firstRow = (await prisma.intervention.findUnique({
        where: { id: created.id },
        include: INTERVENTION_INCLUDE,
      })) as InterventionRow;
    if (rec === "hebdo") day = shiftDay(day, 7);
    else if (rec === "quinzaine") day = shiftDay(day, 14);
    else if (rec === "mensuel") {
      const d = parseDay(day);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      day = dayKey(new Date(Date.UTC(y, m, Math.min(anchor, last))));
    }
  }
  await publish(org.id, { type: "record.changed", entity: "intervention", ids, actorId: me.id });
  if (c.agentId && c.agentId !== me.id)
    await sendPush(org.id, [c.agentId], {
      titre: count > 1 ? `${count} interventions planifiées` : "Nouvelle intervention",
      corps: `${c.client} · ${first}`,
      onglet: "tournee",
    });
  return { ok: true, crees: ids.length, id: ids[0], reprises: reprises.length, row: firstRow! };
}

/* ------------------------------------------------- passages clôturés fictifs */

interface ClosedSample {
  agentId: string;
  agentName: string;
  start: Date;
  minutes: number;
  reserve?: { area: string; index: number; reason: string };
  quantities: [number, number][];
  obs: string;
  signer: string;
}

/** Passage fictif déjà réalisé : pointages, contrôle, consommables, signature, bon. */
async function closeSample(organizationId: string, id: string, list: Checklist, s: ClosedSample) {
  const out = new Date(s.start.getTime() + s.minutes * 60_000);
  const tasks = freshTasks(list);
  const reserveAt = s.reserve
    ? tasks.findIndex(
        (t, i) =>
          t.area === s.reserve!.area &&
          i - tasks.findIndex((x) => x.area === s.reserve!.area) === s.reserve!.index,
      )
    : -1;
  await prisma.interventionTask.createMany({
    data: tasks.map((t, i) => ({
      organizationId,
      interventionId: id,
      ...t,
      sortOrder: i,
      done: i !== reserveAt,
      doneAt: i !== reserveAt ? new Date(s.start.getTime() + 30 * 60_000) : null,
      doneById: i !== reserveAt ? s.agentId : null,
      reason: i === reserveAt ? s.reserve!.reason : null,
    })),
  });
  await prisma.interventionConsumable.createMany({
    data: list.consommables.map((c, i) => ({
      organizationId,
      interventionId: id,
      label: c.l,
      unit: c.u || null,
      sortOrder: i,
      quantity: s.quantities.find(([k]) => k === i)?.[1] ?? 0,
    })),
  });
  const year = dayKey(s.start).slice(0, 4);
  const bon = `BI-${year}-${String(await nextNumber(organizationId, `bon-intervention-${year}`)).padStart(4, "0")}`;
  const row = await prisma.intervention.findUniqueOrThrow({ where: { id } });
  const data = (row.fieldData ?? {}) as FieldData;
  data.signataire = s.signer;
  data.signatureTs = out.getTime() + 60_000;
  data.cloture = {
    ts: out.getTime() + 120_000,
    duree: out.getTime() - s.start.getTime(),
    ok: tasks.length - (reserveAt >= 0 ? 1 : 0),
    tot: tasks.length,
    res: reserveAt >= 0 ? 1 : 0,
    bon,
    par: s.agentName,
    mail: { envoye: false, raison: "démonstration" },
  };
  await prisma.intervention.update({
    where: { id },
    data: {
      status: "done",
      checkInAt: s.start,
      checkOutAt: out,
      actualAgentId: s.agentId,
      workedMinutes: s.minutes,
      reportNumber: bon,
      signatureUrl: SAMPLE_SIGNATURE,
      signedBy: s.signer,
      notes: s.obs,
      fieldData: data as unknown as Prisma.InputJsonValue,
    },
  });
  const by = { source: "application terrain", by: s.agentName };
  for (const [type, label, detail] of [
    ["started", "Arrivée sur site", ""],
    ["finished", "Départ du site", ""],
    ["signed", "Signature du client", s.signer],
    ["completed", "Intervention clôturée", bon],
  ] as const)
    await recordInterventionEvent({
      organizationId,
      interventionId: id,
      userId: s.agentId,
      type,
      metadata: { ...by, label, detail },
    });
  return { bon, hours: s.minutes / 60 };
}

/* ------------------------------------------------------------- exemples */

const SAMPLE_AGENTS = [
  { nom: "Sandrine", code: "sandrine", pin: "245780", tel: "06 12 00 00 01" },
  { nom: "Karim", code: "karim", pin: "319642", tel: "06 12 00 00 02" },
  { nom: "Léa", code: "lea", pin: "670183", tel: "06 12 00 00 03" },
];

/** Agents d'exemple : un compte « Intervenant » chacun, marqué pour être effacé d'un geste. */
async function sampleAgents(org: TerrainOrgRow) {
  const ids: Record<string, string> = {};
  const taken = new Set(
    (
      await prisma.fieldAccess.findMany({
        where: { organizationId: org.id },
        select: { userId: true },
      })
    ).map((a) => a.userId),
  );
  for (const [i, a] of SAMPLE_AGENTS.entries()) {
    const existing = await prisma.fieldAccess.findFirst({
      where: { organizationId: org.id, code: a.code },
    });
    if (existing) {
      if (existing.sample) {
        await prisma.fieldAccess.update({ where: { id: existing.id }, data: { active: true } });
        await prisma.membership.updateMany({
          where: { organizationId: org.id, userId: existing.userId },
          data: { deletedAt: null },
        });
      }
      ids[a.code] = existing.userId;
      continue;
    }
    try {
      const { userId } = await ensureAgentMember(org, a.nom, { code: a.code, exclude: taken });
      taken.add(userId);
      await prisma.fieldAccess.create({
        data: {
          organizationId: org.id,
          userId,
          code: a.code,
          role: "agent",
          color: COULEURS[(i + 1) % COULEURS.length],
          phone: a.tel,
          sample: true,
          ...newPin(a.pin),
        },
      });
      ids[a.code] = userId;
    } catch (error) {
      // Limite de l'offre atteinte : les chantiers d'exemple restent sans agent.
      if (!(error instanceof AgentMemberError)) throw error;
    }
  }
  return ids;
}

/** « Charger les exemples » : trois agents et sept chantiers fictifs, dont un déjà clôturé. */
export async function seedExamples(org: TerrainOrgRow, me: Me) {
  const ids = await sampleAgents(org);
  // Déjà en place : on ne double pas les chantiers d'exemple.
  if (
    await prisma.intervention.count({
      where: {
        organizationId: org.id,
        deletedAt: null,
        fieldData: { path: ["exemple"], equals: true },
      },
    })
  )
    return { agents: Object.keys(ids).length, chantiers: 0 };
  const today = parisToday();
  const j = (n: number) => shiftDay(today, n);
  const models: (NewChantier & { agent: string })[] = [
    {
      client: "Gîte du Causse",
      contact: "Mme Vidal",
      tel: "06 12 34 56 78",
      adresse: "Lieu-dit Les Vignes",
      cp: "46090",
      ville: "Espère",
      surface: 92,
      prestation: "Changement de locataires",
      modele: "Logement meublé",
      devise: 3,
      taux: 30,
      consignes: "Boîte à clés à gauche du portail, code 4821. Draps dans le placard du couloir.",
      agent: "sandrine",
      date: j(0),
      heure: "10:00",
    },
    {
      client: "Cabinet Lafon",
      contact: "M. Lafon",
      tel: "05 65 11 22 33",
      adresse: "12 boulevard Gambetta",
      cp: "46000",
      ville: "Cahors",
      surface: 140,
      prestation: "Entretien de bureaux",
      modele: "Bureaux et locaux",
      devise: 2,
      taux: 28,
      consignes: "Passage après 18 h. Code alarme communiqué par le gérant.",
      agent: "karim",
      date: j(0),
      heure: "18:30",
    },
    {
      client: "Résidence Les Terrasses",
      contact: "Syndic Quercy Immo",
      adresse: "8 avenue Charles de Freycinet",
      cp: "46000",
      ville: "Cahors",
      prestation: "Parties communes",
      modele: "Parties communes",
      devise: 2,
      taux: 26,
      consignes: "Hall, trois cages d'escalier et local poubelles.",
      agent: "lea",
      date: j(0),
      heure: "14:30",
    },
    {
      client: "Mme Durand",
      tel: "06 98 76 54 32",
      adresse: "4 rue du Château du Roi",
      cp: "46000",
      ville: "Cahors",
      surface: 68,
      prestation: "Ménage récurrent",
      modele: "Logement meublé",
      devise: 1.5,
      taux: 28,
      consignes: "Chat à ne pas laisser sortir.",
      agent: "sandrine",
      date: j(1),
      heure: "09:00",
    },
    {
      client: "Studio Valentré",
      contact: "M. Pons",
      tel: "06 44 55 66 77",
      adresse: "3 quai de Regourd",
      cp: "46000",
      ville: "Cahors",
      surface: 34,
      prestation: "Changement de locataires",
      modele: "Logement meublé",
      devise: 1.5,
      taux: 30,
      consignes: "Arrivée des voyageurs à 16 h.",
      agent: "lea",
      date: j(1),
      heure: "11:00",
    },
    {
      client: "Villa des Pechs",
      contact: "Mme Rouquette",
      adresse: "Route de Pradines",
      cp: "46090",
      ville: "Pradines",
      surface: 180,
      prestation: "Remise en état",
      modele: "Remise en état",
      devise: 6,
      taux: 32,
      consignes: "Fin de bail, état des lieux le lendemain.",
      agent: "karim",
      date: j(2),
      heure: "08:30",
    },
  ];
  let added = 0;
  for (const m of models) {
    await createOne(org, me, { ...m, agentId: ids[m.agent] ?? "" }, { exemple: true }, "exemple");
    added++;
  }
  const sandrine = ids.sandrine ?? "";
  const { created, list } = await createOne(
    org,
    me,
    {
      client: "Maison du Barry",
      contact: "M. Delpech",
      tel: "06 21 43 65 87",
      adresse: "17 rue du Barry",
      cp: "46090",
      ville: "Mercuès",
      surface: 110,
      prestation: "Changement de locataires",
      modele: "Logement meublé",
      devise: 3,
      taux: 30,
      agentId: sandrine,
      date: j(-1),
      heure: "09:30",
    },
    { exemple: true },
    "exemple",
  );
  if (sandrine)
    await closeSample(org.id, created.id, list, {
      agentId: sandrine,
      agentName: "Sandrine",
      start: parisAt(j(-1), "09:34"),
      minutes: 167,
      reserve: {
        area: "Séjour",
        index: 1,
        reason:
          "Vitres extérieures inaccessibles, échafaudage du voisin. À reprendre au prochain passage.",
      },
      quantities: [
        [0, 3],
        [2, 4],
        [4, 1],
      ],
      obs: "Logement prêt pour l'arrivée de 16 h. Ampoule du couloir à remplacer, signalée au propriétaire.",
      signer: "M. Delpech",
    });
  added++;
  return { agents: Object.keys(ids).length, chantiers: added };
}

/** Rien ne disparaît : chantiers d'exemple en corbeille, agents d'exemple désactivés. */
export async function clearExamples(org: TerrainOrgRow) {
  const rows = await prisma.intervention.findMany({
    where: {
      organizationId: org.id,
      deletedAt: null,
      fieldData: { path: ["exemple"], equals: true },
    },
    select: { id: true },
  });
  const now = new Date();
  await prisma.intervention.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { deletedAt: now },
  });
  await trashTaggedSites(org.id, "exemple", now);
  const samples = await prisma.fieldAccess.findMany({
    where: { organizationId: org.id, sample: true },
    include: { user: { select: { email: true } } },
  });
  await prisma.fieldAccess.updateMany({
    where: { organizationId: org.id, sample: true },
    data: { active: false },
  });
  // Les comptes créés pour les exemples quittent l'espace (ils ne comptent plus dans l'offre).
  const made = samples
    .filter((s) => s.user.email.endsWith(`@terrain.${org.slug}.invalid`))
    .map((s) => s.userId);
  if (made.length)
    await prisma.membership.updateMany({
      where: { organizationId: org.id, userId: { in: made }, deletedAt: null },
      data: { deletedAt: now },
    });
  return { chantiers: rows.length };
}

/** Sites créés pour une démonstration, sans autre passage : en corbeille. */
async function trashTaggedSites(organizationId: string, tag: string, now: Date) {
  const sites = await prisma.site.findMany({
    where: { organizationId, deletedAt: null, tags: { has: tag } },
    select: { id: true, _count: { select: { interventions: { where: { deletedAt: null } } } } },
  });
  const empty = sites.filter((s) => s._count.interventions === 0).map((s) => s.id);
  if (empty.length)
    await prisma.site.updateMany({ where: { id: { in: empty } }, data: { deletedAt: now } });
}

/* ------------------------------------------------------------- démonstration */

const DEMO_SOURCE = "demo";

/**
 * Démonstration guidée : deux demandes du site, un passage réalisé ce matin avec avis du
 * client et une facture en brouillon (jamais numérotée : elle s'efface sans trace comptable).
 */
export async function seedDemo(org: TerrainOrgRow, me: Me) {
  const cfg = await entrepriseConf(org);
  const team = await prisma.fieldAccess.findMany({
    where: { organizationId: org.id, active: true },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const agent = team.find((a) => a.role !== "patron") ?? team[0];
  const agentId = agent?.userId ?? me.id;
  const agentName = agent?.user.name ?? me.nom;
  const today = parisToday();
  const now = Date.now();
  const first = await prisma.quoteRequest.create({
    data: {
      organizationId: org.id,
      receivedAt: new Date(now - 3 * 3_600_000),
      source: DEMO_SOURCE,
      firstName: "Sophie",
      lastName: "Lasserre",
      email: "boulangerie.lasserre@exemple.fr",
      phone: "05 65 22 18 40",
      service: "Nettoyage de locaux",
      address: "14 rue des Artisans",
      city: "Cahors",
      message:
        "Boulangerie de 85 m² à Cahors : laboratoire, boutique et sanitaires. Passage tous les lundis avant 7 h, dégraissage complet du labo une fois par mois. Pouvez-vous chiffrer ?",
    },
  });
  const second = await prisma.quoteRequest.create({
    data: {
      organizationId: org.id,
      receivedAt: new Date(now - 12 * 60_000),
      source: DEMO_SOURCE,
      firstName: "Hôtel",
      lastName: "Les Glycines",
      email: "reception@exemple.fr",
      phone: "05 65 00 00 42",
      service: "Ménage récurrent",
      address: "9 allée des Tilleuls",
      city: "Cahors",
      message:
        "Douze chambres et les parties communes, six jours sur sept, entre 9 h et 13 h. Nous cherchons un prestataire à l'année.",
    },
  });
  const rate = 30;
  const { created, list } = await createOne(
    org,
    me,
    {
      client: "Boulangerie Lasserre",
      contact: "Mme Sophie Lasserre",
      tel: "05 65 22 18 40",
      email: "boulangerie.lasserre@exemple.fr",
      adresse: "14 rue des Artisans",
      cp: "46000",
      ville: "Cahors",
      siren: "123 456 789",
      prestation: "Nettoyage de locaux",
      modele: "Bureaux et locaux",
      surface: 85,
      devise: 2.5,
      taux: rate,
      agentId,
      date: today,
      heure: "06:00",
      consignes:
        "Entrée par la cour, code portail 1974. Ne pas utiliser de produit parfumé dans le laboratoire.",
    },
    { demo: true },
    "demo",
  );
  const sanitaryIndex = list.pieces.find((p) => p.n === "Sanitaires")?.items.length ?? 0;
  const { bon, hours } = await closeSample(org.id, created.id, list, {
    agentId,
    agentName,
    start: parisAt(today, "06:02"),
    minutes: 161,
    reserve:
      sanitaryIndex > 3
        ? {
            area: "Sanitaires",
            index: 3,
            reason:
              "Siphon du lavabo bouché, produit inefficace. Plombier à prévoir, signalé à Mme Lasserre.",
          }
        : undefined,
    quantities: [
      [2, 6],
      [4, 2],
      [6, 3],
    ],
    obs: "Laboratoire dégraissé au complet, plan de travail et pétrin désinfectés. Sol de la boutique relavé après la livraison de farine. Prochain passage lundi, même horaire.",
    signer: "S. Lasserre",
  });
  const closedAt = Date.now();
  await prisma.clientReview.create({
    data: {
      organizationId: org.id,
      interventionId: created.id,
      token: token(),
      requestedAt: new Date(closedAt),
      rating: 5,
      comment: `Laboratoire impeccable et très bon contact avec ${agentName}. Merci pour le signalement du siphon.`,
      ratedAt: new Date(closedAt + 60_000),
      demo: true,
    },
  });
  await prisma.quoteRequest.update({
    where: { id: first.id },
    data: {
      status: "planifiee",
      interventionId: created.id,
      handledById: me.id,
      handledAt: new Date(),
    },
  });
  const company = await prisma.company.findFirst({
    where: { organizationId: org.id, deletedAt: null, name: "Boulangerie Lasserre" },
  });
  const client =
    company ??
    (await prisma.company.create({
      data: {
        organizationId: org.id,
        name: "Boulangerie Lasserre",
        email: "boulangerie.lasserre@exemple.fr",
        address: "14 rue des Artisans",
        postalCode: "46000",
        city: "Cahors",
        tags: ["demo"],
      },
    }));
  const doc = await prisma.salesDocument.create({
    data: {
      organizationId: org.id,
      kind: "INVOICE",
      status: "draft",
      companyId: client.id,
      ownerId: me.id,
      subject: "Prestations de nettoyage",
      notes: "Démonstration de l'application terrain",
      dueDate: new Date(parseDay(today).getTime() + 30 * DAY_MS),
    },
  });
  await saveLines(org.id, doc.id, [
    {
      description: `Nettoyage de locaux — ${today.slice(8)}/${today.slice(5, 7)}`,
      quantity: Math.round(hours * 100) / 100,
      unit: "hour",
      unitPriceCents: rate * 100,
      discountPercent: 0,
      vatRate: cfg.tva,
    },
  ]);
  await prisma.intervention.update({ where: { id: created.id }, data: { invoiceId: doc.id } });
  const sent = await sendPush(org.id, [me.id], {
    titre: "Démonstration — nouvelle demande de devis",
    corps: "Sophie Lasserre · Nettoyage de locaux à Cahors",
    onglet: "demandes",
  });
  return {
    ok: true,
    demandeId: first.id,
    demandeNouvelle: second.id,
    chantierId: created.id,
    factureId: doc.id,
    bon,
    facture: "Brouillon",
    agent: agentName,
    notifs: sent,
  };
}

/** Efface la démonstration : rien de réel n'est touché, les chantiers vont en corbeille. */
export async function clearDemo(org: TerrainOrgRow) {
  const now = new Date();
  const rows = await prisma.intervention.findMany({
    where: { organizationId: org.id, deletedAt: null, fieldData: { path: ["demo"], equals: true } },
    select: { id: true, invoiceId: true },
  });
  const ids = rows.map((r) => r.id);
  const invoices = rows.map((r) => r.invoiceId).filter((x): x is string => Boolean(x));
  if (invoices.length) {
    // Seules les factures encore en brouillon de la démonstration partent en corbeille.
    await prisma.salesDocument.updateMany({
      where: {
        organizationId: org.id,
        id: { in: invoices },
        status: "draft",
        notes: "Démonstration de l'application terrain",
      },
      data: { deletedAt: now },
    });
    await prisma.intervention.updateMany({ where: { id: { in: ids } }, data: { invoiceId: null } });
  }
  await prisma.intervention.updateMany({ where: { id: { in: ids } }, data: { deletedAt: now } });
  await prisma.clientReview.deleteMany({ where: { organizationId: org.id, demo: true } });
  await prisma.quoteRequest.deleteMany({ where: { organizationId: org.id, source: DEMO_SOURCE } });
  await trashTaggedSites(org.id, "demo", now);
  await prisma.company.updateMany({
    where: {
      organizationId: org.id,
      deletedAt: null,
      tags: { has: "demo" },
      documents: { none: { deletedAt: null } },
    },
    data: { deletedAt: now },
  });
  return { ok: true, chantiers: rows.length };
}
