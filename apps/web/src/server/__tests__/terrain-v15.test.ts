import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { addDays, dayKey, utcDay } from "@quercy/core";
import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { testFixtures } from "./helpers";

// Session du logiciel simulée : l'en-tête x-test-user désigne la personne connectée.
vi.mock("../auth", () => ({
  auth: () => ({
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const id = headers.get("x-test-user");
        return id ? { user: { id, name: "Responsable" }, session: {} } : null;
      },
    },
  }),
}));

const { handleTerrainApi } = await import("../terrain/api");
const { terrainOrg } = await import("../terrain/org");
const { parisAt } = await import("../terrain/planning");
const { runTerrainAlerts } = await import("../terrain/alerts");
const { parisMinutes } = await import("../terrain/gestion");

const fx = testFixtures("terrain15");
let storageDir: string;
let slug: string;
let otherSlug: string;
let orgId: string;
let ownerId: string;
let agentId: string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

/** Petit client de l'application terrain, qui garde son cookie comme le téléphone. */
function phone(extraHeaders: Record<string, string> = {}, space = () => slug) {
  let cookie = "";
  return async (route: string, body?: unknown) => {
    const org = (await terrainOrg(space()))!;
    const request = new Request(`http://localhost/terrain/${space()}/api/${route}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": extraHeaders["x-forwarded-for"] ?? `ip-${Math.random()}`,
        ...(cookie ? { cookie } : {}),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const response = await handleTerrainApi(request, org, route.split("?")[0]!);
    const set = response.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0]!;
    const type = response.headers.get("content-type") ?? "";
    return {
      status: response.status,
      data: type.includes("json") ? ((await response.json()) as Json) : null,
      response,
    };
  };
}

let boss: ReturnType<typeof phone>;
let agent: ReturnType<typeof phone>;
const today = () => dayKey(new Date());

beforeAll(async () => {
  storageDir = mkdtempSync(path.join(os.tmpdir(), "quercy-terrain15-"));
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = storageDir;
  const owner = await fx.user("owner");
  ownerId = owner.id;
  const org = await fx.org("a", { name: "Brillance du Lot" });
  orgId = org.id;
  slug = org.slug;
  await fx.member(orgId, owner.id, "owner");
  const other = await fx.org("b", { name: "Autre Entreprise" });
  otherSlug = other.slug;
  await fx.member(other.id, owner.id, "owner");

  const install = phone({ "x-test-user": ownerId });
  expect((await install("installation", { pin: "246810" })).status).toBe(200);
  boss = phone();
  await boss("connexion", { code: "patron", pin: "246810" });
  expect(
    (
      await boss("agent", {
        nom: "Julie Agent",
        code: "julie",
        pin: "135791",
        couleur: "#3C6E9F",
        tel: "06 00",
      })
    ).data,
  ).toMatchObject({ ok: true });
  agentId = (
    await prisma.fieldAccess.findFirstOrThrow({ where: { organizationId: orgId, code: "julie" } })
  ).userId;
  agent = phone();
  await agent("connexion", { code: "julie", pin: "135791" });
});

afterAll(async () => {
  for (const id of [orgId]) {
    await prisma.interventionEvent.deleteMany({ where: { organizationId: id } });
    await prisma.interventionProof.deleteMany({ where: { organizationId: id } });
    await prisma.anomaly.deleteMany({ where: { organizationId: id } });
  }
  await prisma.user.deleteMany({ where: { email: { endsWith: `@terrain.${slug}.invalid` } } });
  await fx.cleanup();
  await prisma.$disconnect();
  rmSync(storageDir, { recursive: true, force: true });
});

describe("état de l'application (v15)", () => {
  it("donne l'équipe, les modèles, les prestations et les réglages de l'entreprise", async () => {
    const etat = (await boss("etat")).data!;
    expect(etat).toMatchObject({ version: 3, installation: false, nouvelles: 0 });
    expect(etat.moi).toMatchObject({
      code: "patron",
      role: "patron",
      couleur: "#009C84",
      photo: false,
    });
    expect(etat.modeles).toEqual([
      "Logement meublé",
      "Bureaux et locaux",
      "Remise en état",
      "Parties communes",
    ]);
    expect(etat.prestations).toContain("Entretien de bureaux");
    expect(etat.agents.map((a: Json) => a.nom)).toContain("Julie Agent");
    expect(etat.entreprise).toMatchObject({ taux: 28, tva: 20 });
    // Un agent ne voit pas les nouvelles demandes.
    expect((await agent("etat")).data!.nouvelles).toBe(0);
  });

  it("les réglages de l'entreprise sont ceux du logiciel (paramètres de vente)", async () => {
    const saved = await boss("entreprise", {
      nom: "Brillance du Lot SARL",
      ville: "Figeac",
      siret: "123 456 789 00012",
      iban: "FR76 3000 6000 0112 3456 7890 189",
      taux: 31.5,
      tva: 10,
      avisGoogle: "javascript:alert(1)",
      alertes: { veille: false },
    });
    expect(saved.data!.entreprise).toMatchObject({
      nom: "Brillance du Lot SARL",
      ville: "Figeac",
      siret: "12345678900012",
      taux: 31.5,
      tva: 10,
      avisGoogle: "",
      alertes: { retard: true, veille: false, matin: true, factures: true },
    });
    const sales = await prisma.salesSettings.findUniqueOrThrow({
      where: { organizationId: orgId },
    });
    expect(sales).toMatchObject({
      legalName: "Brillance du Lot SARL",
      city: "Figeac",
      siret: "12345678900012",
    });
    expect(sales.iban).toBe("FR7630006000011234567890189");
    expect((await agent("entreprise", { nom: "Pirate" })).status).toBe(403);
  });
});

describe("demandes de devis du site", () => {
  it("reçoit le formulaire du site (CORS, champ piège, limite par adresse)", async () => {
    const site = phone({ "x-forwarded-for": "203.0.113.9" });
    const pre = await site("demande", undefined);
    expect(pre.status).toBe(401); // GET : rien de public
    const ok = await site("demande", {
      Prénom: "Léa",
      Nom: "Martin",
      email: "lea@exemple.fr",
      besoin: "Bureaux 80 m²",
    });
    expect(ok.status).toBe(200);
    expect(ok.response.headers.get("access-control-allow-origin")).toBe("*");
    expect((await site("demande", { nom: "Robot", _honey: "x" })).status).toBe(200);
    // Le bloc du site envoie en « no-cors » : texte brut, ou champs de formulaire.
    const org = (await terrainOrg(slug))!;
    const plain = await handleTerrainApi(
      new Request(`http://localhost/terrain/${slug}/api/demande`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-forwarded-for": "192.0.2.1",
        },
        body: "prenom=Paul&nom=Formulaire&tel=0600000000",
      }),
      org,
      "demande",
    );
    expect(plain.status).toBe(200);
    expect(
      await prisma.quoteRequest.count({ where: { organizationId: orgId, lastName: "Formulaire" } }),
    ).toBe(1);
    expect((await site("demande", { message: "vide" })).status).toBe(400);
    for (let i = 0; i < 4; i++) await site("demande", { nom: `N${i}` });
    expect((await site("demande", { nom: "Encore" })).status).toBe(429);
    expect(
      await prisma.quoteRequest.count({ where: { organizationId: orgId, lastName: "Robot" } }),
    ).toBe(0);

    const list = (await boss("demandes")).data!.demandes as Json[];
    const lea = list.find((d) => d.nom === "Martin")!;
    expect(lea).toMatchObject({
      prenom: "Léa",
      email: "lea@exemple.fr",
      message: "Bureaux 80 m²",
      statut: "nouvelle",
    });
    expect((await boss("etat")).data!.nouvelles).toBe(6);
    expect((await agent("demandes")).status).toBe(403);
    await boss("demande-maj", { id: lea.id, statut: "vue" });
    expect((await prisma.quoteRequest.findUniqueOrThrow({ where: { id: lea.id } })).status).toBe(
      "vue",
    );
  });
});

describe("planification et tournée", () => {
  it("crée une série hebdomadaire et reprend les réserves du dernier passage", async () => {
    // Dernier passage clôturé chez ce client, avec une réserve.
    const first = await boss("chantier-nouveau", {
      client: "Cabinet Roques",
      adresse: "3 rue du Lot",
      cp: "46100",
      ville: "Figeac",
      prestation: "Entretien de bureaux",
      modele: "Bureaux et locaux",
      date: dayKey(addDays(utcDay(new Date()), -7)),
      heure: "08:00",
      devise: 2,
      taux: 30,
      agentId,
      consignes: "Badge à l'accueil.",
    });
    expect(first.data).toMatchObject({ ok: true, crees: 1, reprises: 0 });
    const prev = first.data!.chantier;
    expect(prev).toMatchObject({
      modele: "Bureaux et locaux",
      consignes: "Badge à l'accueil.",
      taux: 30,
    });
    const task = await prisma.interventionTask.findMany({ where: { interventionId: prev.id } });
    expect(task).toHaveLength(0);
    await prisma.interventionTask.createMany({
      data: ["Bureaux dépoussiérés", "Vitres des portes"].map((label, i) => ({
        organizationId: orgId,
        interventionId: prev.id,
        area: "Bureaux",
        label,
        sortOrder: i,
      })),
    });
    const tasks = await prisma.interventionTask.findMany({
      where: { interventionId: prev.id },
      orderBy: { sortOrder: "asc" },
    });
    await prisma.interventionTask.updateMany({
      where: { interventionId: prev.id },
      data: { done: true },
    });
    await prisma.interventionTask.update({
      where: { id: tasks[1]!.id },
      data: { done: false, reason: "Vitre fêlée" },
    });
    await prisma.intervention.update({
      where: { id: prev.id },
      data: {
        status: "done",
        fieldData: {
          ...(prev.ref ? { ref: prev.ref } : {}),
          terrain: true,
          cloture: { ts: 1, duree: 7_200_000, ok: 1, tot: 2, res: 1, bon: "BI-X", par: "Julie" },
        },
      },
    });

    const serie = await boss("chantier-nouveau", {
      client: "cabinet roques",
      adresse: "3 rue du Lot",
      prestation: "Entretien de bureaux",
      date: today(),
      heure: "09:00",
      agentId,
      recurrence: "hebdo",
      occurrences: 3,
    });
    expect(serie.data).toMatchObject({ ok: true, crees: 3, reprises: 1 });
    expect(serie.data!.chantier.reprises[0]).toMatchObject({
      point: tasks[1]!.label,
      motif: "Vitre fêlée",
    });
    const dates = (
      await prisma.intervention.findMany({
        where: {
          organizationId: orgId,
          title: "Entretien de bureaux",
          date: { gte: utcDay(new Date()) },
        },
        orderBy: { date: "asc" },
      })
    ).map((r) => dayKey(r.date));
    expect(dates).toEqual([0, 7, 14].map((n) => dayKey(addDays(utcDay(new Date()), n))));

    const tournee = (await agent("tournee")).data!;
    expect(tournee.chantiers).toHaveLength(1);
    expect(tournee).toMatchObject({ heures: 2 });
    expect(typeof tournee.serveur).toBe("number");
    expect(tournee.chantiers[0]).toMatchObject({
      client: "cabinet roques",
      statut: "prevu",
      modele: "Bureaux et locaux",
    });
  });

  it("pointe par le QR affiché chez le client", async () => {
    const qr = (await boss("qr-creer", { client: "Cabinet Roques" })).data!;
    expect(qr.jeton).toBeTruthy();
    expect((await boss("qr-creer", { client: "cabinet roques" })).data!.jeton).toBe(qr.jeton);
    expect((await agent("pointage-qr", { jeton: "inconnu" })).status).toBe(404);
    const arrive = (await agent("pointage-qr", { jeton: qr.jeton })).data!;
    expect(arrive.message).toMatch(/^Arrivée pointée à/);
    expect(arrive.chantier.arrivee).toBeGreaterThan(Date.now() - 5000);
    const leave = (await agent("pointage-qr", { jeton: qr.jeton })).data!;
    expect(leave.message).toMatch(/^Départ pointé/);
    // Pointé depuis l'application : à clôturer dans l'application, pas « clôturé ».
    expect(leave.chantier.cloture).toBeNull();
    expect((await agent("tournee")).data!.chantiers[0].statut).toBe("a-cloturer");
    expect((await agent("pointage-qr", { jeton: qr.jeton })).data!.message).toBe(
      "Arrivée et départ déjà pointés.",
    );
  });

  it("une intervention réalisée dans le logiciel apparaît clôturée", async () => {
    const site = await prisma.site.create({ data: { organizationId: orgId, name: "Mairie" } });
    const row = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien",
        siteId: site.id,
        ownerId: agentId,
        date: utcDay(new Date()),
        status: "done",
        workedMinutes: 90,
      },
    });
    const fiche = (await agent(`chantier?id=${row.id}`)).data!.chantier;
    expect(fiche.cloture).toMatchObject({ duree: 5_400_000, par: "logiciel" });
    expect(fiche.statut ?? "cloture").toBe("cloture");
  });

  it("le responsable confie les chantiers d'un absent à un remplaçant", async () => {
    const other = await boss("agent", { nom: "Paul Remplaçant", code: "paul", pin: "112233" });
    const paulId = other.data!.id as string;
    expect((await agent("absence", { de: agentId, vers: paulId })).status).toBe(403);
    const moved = await boss("absence", {
      de: agentId,
      vers: paulId,
      du: dayKey(addDays(utcDay(new Date()), 6)),
      au: dayKey(addDays(utcDay(new Date()), 15)),
    });
    expect(moved.data).toMatchObject({ ok: true, repris: 2 });
    const absences = (await boss("absences")).data!.absences as Json[];
    expect(absences[0]).toMatchObject({
      de: agentId,
      deNom: "Julie Agent",
      vers: paulId,
      versNom: "Paul Remplaçant",
      n: 2,
    });
    // L'absence rejoint celles du logiciel.
    expect(
      await prisma.absence.count({
        where: { organizationId: orgId, userId: agentId, status: "approved" },
      }),
    ).toBe(1);
    // L'agent garde sa propre demande d'absence (validée par le chef).
    const own = await agent("absence", {
      type: "leave",
      debut: dayKey(addDays(utcDay(new Date()), 30)),
    });
    expect(own.data!.absences.some((a: Json) => a.statut === "requested")).toBe(true);
  });

  it("annule, rétablit, et ne supprime jamais un chantier commencé", async () => {
    const row = await prisma.intervention.findFirstOrThrow({
      where: { organizationId: orgId, checkInAt: { not: null }, deletedAt: null },
    });
    expect((await boss("chantier-suppr", { id: row.id })).status).toBe(409);
    const fresh = await boss("chantier-nouveau", { client: "À jeter", date: today() });
    expect((await boss("chantier-suppr", { id: fresh.data!.id })).data).toEqual({ ok: true });
    // Rien ne disparaît : il est dans la corbeille du logiciel.
    expect(
      (await prisma.intervention.findUniqueOrThrow({ where: { id: fresh.data!.id } })).deletedAt,
    ).not.toBeNull();

    const later = await boss("chantier-nouveau", { client: "Annulable", date: today() });
    const cancelled = await boss("chantier-annule", { id: later.data!.id, motif: "Client absent" });
    expect(cancelled.data!.chantier.annule).toMatchObject({ motif: "Client absent" });
    expect(
      (await prisma.intervention.findUniqueOrThrow({ where: { id: later.data!.id } })).status,
    ).toBe("cancelled");
    await boss("chantier-annule", { id: later.data!.id, annule: false });
    expect(
      (await prisma.intervention.findUniqueOrThrow({ where: { id: later.data!.id } })).status,
    ).toBe("planned");
  });
});

describe("factures et avis", () => {
  it("émet une facture du logiciel (numérotée) depuis l'application et l'encaisse", async () => {
    const stop = await prisma.intervention.findFirstOrThrow({
      where: { organizationId: orgId, checkOutAt: { not: null }, deletedAt: null },
    });
    const created = await boss("facture-nouvelle", {
      type: "facture",
      client: "Cabinet Roques",
      email: "compta@exemple.fr",
      lignes: [{ libelle: "Entretien des bureaux", quantite: 2, unite: "h", prix: 30 }],
      tva: 20,
      chantiers: [stop.id],
    });
    expect(created.status).toBe(200);
    const f = created.data!.facture;
    expect(f).toMatchObject({
      type: "facture",
      client: "Cabinet Roques",
      ht: 60,
      ttc: 72,
      statut: "a-payer",
    });
    expect(f.numero).toMatch(/^FA-\d{4}-\d{4}$/);
    const doc = await prisma.salesDocument.findUniqueOrThrow({
      where: { id: f.id },
      include: { company: true },
    });
    expect(doc.kind).toBe("INVOICE");
    expect(doc.company!.email).toBe("compta@exemple.fr");
    expect(
      (await prisma.intervention.findUniqueOrThrow({ where: { id: stop.id } })).invoiceId,
    ).toBe(f.id);
    // Une facture émise ne s'annule pas depuis l'application (avoir dans le logiciel).
    expect((await boss("facture-maj", { id: f.id, statut: "annule" })).status).toBe(409);
    await boss("facture-maj", { id: f.id, statut: "payee" });
    expect((await prisma.salesDocument.findUniqueOrThrow({ where: { id: f.id } })).status).toBe(
      "paid",
    );
    const list = (await boss("factures")).data!.factures as Json[];
    expect(list.find((x) => x.id === f.id)!.statut).toBe("payee");
    expect((await agent("factures")).status).toBe(403);
  });

  it("le client note l'intervention par un lien, sans compte", async () => {
    const stop = await prisma.intervention.findFirstOrThrow({
      where: {
        organizationId: orgId,
        status: "done",
        deletedAt: null,
        fieldData: { path: ["cloture", "bon"], equals: "BI-X" },
      },
    });
    const link = await boss("avis-lien", { id: stop.id, envoi: true });
    const j = link.data!.jeton as string;
    const pub = phone({ "x-forwarded-for": "198.51.100.7" });
    expect((await pub(`avis-info?j=${j}`)).data).toMatchObject({
      client: "Cabinet Roques",
      note: null,
      expire: false,
    });
    expect((await pub("avis", { j, note: 7 })).status).toBe(400);
    expect((await pub("avis", { j: "faux", note: 5 })).status).toBe(404);
    expect((await pub("avis", { j, note: 5, commentaire: "Parfait" })).data).toMatchObject({
      ok: true,
    });
    const review = await prisma.clientReview.findUniqueOrThrow({
      where: { interventionId: stop.id },
    });
    expect(review).toMatchObject({ rating: 5, comment: "Parfait" });
    expect((await boss(`chantier?id=${stop.id}`)).data!.chantier.avis).toMatchObject({
      note: 5,
      commentaire: "Parfait",
    });
    // Le lien ne vaut que pour cette entreprise.
    const elsewhere = phone({}, () => otherSlug);
    expect((await elsewhere(`avis-info?j=${j}`)).status).toBe(404);
  });

  it("le pilotage et la recherche répondent au responsable seulement", async () => {
    const pilot = await boss("pilotage");
    expect(pilot.status).toBe(200);
    expect((await agent("pilotage")).status).toBe(403);
    const found = (await boss("recherche?q=roques")).data!;
    expect(JSON.stringify(found)).toContain("Roques");
  });
});

describe("démonstration et exemples", () => {
  it("pose puis efface les exemples sans rien détruire", async () => {
    const put = await boss("exemples", {});
    expect(put.data).toMatchObject({ ok: true, chantiers: 7 });
    expect((await boss("exemples", {})).data).toMatchObject({ chantiers: 0 });
    const closed = await prisma.intervention.findFirstOrThrow({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: "done",
        fieldData: { path: ["exemple"], equals: true },
      },
    });
    expect(closed.checkInAt!.getTime()).toBe(parisAt(dayKey(closed.date), "09:34").getTime());
    const cleared = await boss("exemples", { effacer: true });
    expect(cleared.data).toMatchObject({ ok: true, chantiers: 7 });
    expect(
      await prisma.intervention.count({
        where: {
          organizationId: orgId,
          deletedAt: { not: null },
          fieldData: { path: ["exemple"], equals: true },
        },
      }),
    ).toBe(7);
    expect(
      await prisma.fieldAccess.count({
        where: { organizationId: orgId, sample: true, active: true },
      }),
    ).toBe(0);
  });

  it("joue la démonstration puis l'efface (facture restée brouillon)", async () => {
    const demo = (await boss("demo", {})).data!;
    expect(demo).toMatchObject({ ok: true, facture: "Brouillon" });
    const doc = await prisma.salesDocument.findUniqueOrThrow({ where: { id: demo.factureId } });
    expect(doc).toMatchObject({ status: "draft", number: null });
    expect((await boss("demandes")).data!.demandes.some((d: Json) => d.nom === "Lasserre")).toBe(
      true,
    );
    expect((await boss("demo-effacer", {})).data).toMatchObject({ ok: true, chantiers: 1 });
    expect(
      (await prisma.salesDocument.findUniqueOrThrow({ where: { id: demo.factureId } })).deletedAt,
    ).not.toBeNull();
    expect(
      await prisma.quoteRequest.count({ where: { organizationId: orgId, source: "demo" } }),
    ).toBe(0);
    expect((await agent("demo", {})).status).toBe(403);
  });
});

describe("alertes du téléphone", () => {
  it("signale un retard une seule fois et ne contrôle pas plus d'une fois toutes les 9 minutes", async () => {
    const now = parisMinutes(new Date());
    if (now < 60) return; // juste après minuit à Paris : pas de créneau « il y a 30 min » aujourd'hui
    const t = now - 30;
    const hhmm = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    const site = await prisma.site.create({ data: { organizationId: orgId, name: "En retard" } });
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    const late = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien",
        siteId: site.id,
        ownerId: agentId,
        date: new Date(`${day}T00:00:00.000Z`),
        startTime: hhmm,
        durationMinutes: 60,
      },
    });
    const first = await runTerrainAlerts(orgId, true);
    expect(first.alertes).toBeGreaterThanOrEqual(2); // responsable et agent
    expect(
      await prisma.terrainAlert.count({
        where: {
          organizationId: orgId,
          key: { in: [`retard:${late.id}`, `retard-agent:${late.id}`] },
        },
      }),
    ).toBe(2);
    const again = await runTerrainAlerts(orgId, true);
    expect(again.alertes ?? 0).toBeLessThan(first.alertes!);
    // Ouverture de l'application juste après : pas de nouveau contrôle.
    expect(await runTerrainAlerts(orgId)).toEqual({ envoyees: 0 });
  });
});

describe("accueil : congés, anomalies, véhicules", () => {
  it("le responsable valide des congés payés et confie les chantiers au remplaçant", async () => {
    const day = (n: number) => dayKey(addDays(utcDay(new Date()), n));
    const site = await prisma.site.create({ data: { organizationId: orgId, name: "Agence Lot" } });
    const visit = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien",
        siteId: site.id,
        ownerId: agentId,
        date: utcDay(addDays(new Date(), 40)),
        startTime: "08:00",
        durationMinutes: 60,
      },
    });
    const asked = await agent("absence", {
      type: "leave",
      debut: day(39),
      fin: day(41),
      commentaire: "Matin",
    });
    expect(asked.status).toBe(200);
    expect(asked.data!.typesAbsence.map((t: Json) => t.label)).toContain("Congés payés");
    const home = (await boss("accueil")).data!;
    const conge = (home.conges as Json[]).find((c) => c.agentId === agentId && c.du === day(39))!;
    expect(conge).toMatchObject({ chantiers: 1, jours: 3 });
    expect(conge.libelle).toMatch(/^Congés payés du/);
    expect((await agent("accueil")).data!.conges).toBeUndefined();
    expect((await agent("conge-decision", { id: conge.id, valider: true })).status).toBe(403);

    await boss("agent", { nom: "Paul Remplaçant", code: "paul", pin: "112233" });
    const detail = (await boss(`conge?id=${conge.id}`)).data!;
    expect(detail.chantiers).toHaveLength(1);
    const paul = detail.remplacants.find((r: Json) => r.nom === "Paul Remplaçant");
    expect(paul).toBeTruthy();
    expect(
      (await boss("conge-decision", { id: conge.id, valider: true, remplacant: "inconnu" })).status,
    ).toBe(400);
    const ok = await boss("conge-decision", { id: conge.id, valider: true, remplacant: paul.id });
    expect(ok.data).toEqual({ ok: true, confies: 1 });
    expect(
      (await prisma.intervention.findUniqueOrThrow({ where: { id: visit.id } })).replacementAgentId,
    ).toBe(paul.id);
    expect((await prisma.absence.findUniqueOrThrow({ where: { id: conge.id } })).status).toBe(
      "approved",
    );
    expect((await boss("conge-decision", { id: conge.id, valider: true })).status).toBe(409);
  });

  it("le responsable valide ou classe une anomalie signalée", async () => {
    const a = await prisma.anomaly.create({
      data: {
        organizationId: orgId,
        type: "leak",
        comment: "Fuite sous l'évier",
        reportedById: agentId,
      },
    });
    const home = (await boss("accueil")).data!;
    expect(
      (home.anomalies as Json[]).some(
        (x) => x.id === a.id && x.commentaire === "Fuite sous l'évier",
      ),
    ).toBe(true);
    expect((await boss("anomalie-decision", { id: a.id, action: "validate" })).data).toEqual({
      ok: true,
      statut: "validated",
    });
    expect((await prisma.anomaly.findUniqueOrThrow({ where: { id: a.id } })).validatedById).toBe(
      ownerId,
    );
    expect((await boss("anomalie-decision", { id: a.id, action: "validate" })).status).toBe(409);
    expect((await agent("anomalie-decision", { id: a.id, action: "reject" })).status).toBe(403);
  });

  it("signale les échéances des véhicules et liste la flotte", async () => {
    await prisma.vehicle.create({
      data: {
        organizationId: orgId,
        plate: "AB-123-CD",
        model: "Kangoo",
        assignedUserId: agentId,
        inspectionDueDate: utcDay(addDays(new Date(), 10)),
      },
    });
    const home = (await boss("accueil")).data!;
    expect((home.alertes as Json[])[0]).toMatchObject({
      type: "echeance",
      titre: "Contrôle technique dans 10 jours",
    });
    const flotte = (await boss("flotte")).data!;
    expect(flotte.vehicules[0]).toMatchObject({ immat: "AB-123-CD", agent: "Julie Agent", ct: 10 });
    expect((await agent("flotte")).status).toBe(403);
  });

  it("montre qui est sur site", async () => {
    const site = await prisma.site.create({ data: { organizationId: orgId, name: "Sur place" } });
    await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien",
        siteId: site.id,
        ownerId: agentId,
        actualAgentId: agentId,
        date: utcDay(new Date()),
        checkInAt: new Date(),
      },
    });
    const home = (await boss("accueil")).data!;
    expect(
      (home.surSite as Json[]).some((x) => x.client === "Sur place" && x.agent === "Julie Agent"),
    ).toBe(true);
  });
});

describe("cloisonnement", () => {
  it("un téléphone connecté ici ne lit rien d'une autre entreprise", async () => {
    const other = await prisma.organization.findFirstOrThrow({ where: { slug: otherSlug } });
    const site = await prisma.site.create({ data: { organizationId: other.id, name: "Ailleurs" } });
    const row = await prisma.intervention.create({
      data: {
        organizationId: other.id,
        title: "Secret",
        siteId: site.id,
        date: utcDay(new Date()),
      },
    });
    expect((await boss(`chantier?id=${row.id}`)).status).toBe(404);
    expect((await boss("chantier-suppr", { id: row.id })).status).toBe(404);
    const elsewhere = phone({}, () => otherSlug);
    expect((await elsewhere("tournee")).status).toBe(401);
  });
});
