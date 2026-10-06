import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { dayKey } from "@quercy/core";
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
const { terrainOrg, terrainBrandOf } = await import("../terrain/org");
const { renderTerrainPage, terrainManifest, initials } = await import("../terrain/brand");
const { checklistFor } = await import("../terrain/checklists");

const fx = testFixtures("terrain");
let storageDir: string;
let slug: string;
let orgId: string;
let ownerId: string;
let memberId: string;

// Réponses JSON lues librement dans les assertions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

/** Petit client de l'application terrain, qui garde son cookie comme le téléphone. */
function phone(extraHeaders: Record<string, string> = {}) {
  let cookie = "";
  return async (route: string, body?: unknown) => {
    const org = (await terrainOrg(slug))!;
    const request = new Request(`http://localhost/terrain/${slug}/api/${route}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `ip-${Math.random()}`,
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

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const JPEG = `data:image/jpeg;base64,${Buffer.from("fausse photo").toString("base64")}`;

beforeAll(async () => {
  storageDir = mkdtempSync(path.join(os.tmpdir(), "quercy-terrain-"));
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = storageDir;
  const owner = await fx.user("owner");
  const member = await fx.user("membre");
  ownerId = owner.id;
  memberId = member.id;
  const org = await fx.org("a", { name: "Net'Éclat Services" });
  orgId = org.id;
  slug = org.slug;
  await fx.member(orgId, owner.id, "owner");
  await fx.member(orgId, member.id, "member");
  await prisma.user.update({ where: { id: member.id }, data: { name: "Sandrine Lacombe" } });
});

afterAll(async () => {
  await prisma.interventionEvent.deleteMany({ where: { organizationId: orgId } });
  // Preuves et anomalies tiennent leurs fichiers : on les retire avant les auteurs.
  await prisma.interventionProof.deleteMany({ where: { organizationId: orgId } });
  await prisma.anomaly.deleteMany({ where: { organizationId: orgId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `@terrain.${slug}.invalid` } } });
  await fx.cleanup();
  await prisma.$disconnect();
  rmSync(storageDir, { recursive: true, force: true });
});

describe("marque convertible", () => {
  it("sert la page du dossier apps/terrain (fichier généré à jour)", async () => {
    const { TERRAIN_TEMPLATE } = await import("../terrain/template.generated");
    const source = readFileSync(
      new URL("../../../../terrain/public/index.html", import.meta.url),
      "utf8",
    );
    expect(TERRAIN_TEMPLATE, "lancez « pnpm terrain:generer »").toBe(source);
  });

  it("met le nom, les initiales et l'adresse de l'entreprise dans la page", async () => {
    const brand = terrainBrandOf((await terrainOrg(slug))!);
    const html = renderTerrainPage(brand);
    expect(html).toContain("<title>Net&#39;Éclat Services — Terrain</title>");
    expect(html).not.toContain("%%");
    expect(html).not.toMatch(/Quercy|Cahors/);
    expect(html).toContain(`fetch(T.base+"api/"+route`);
    expect(html).toContain(`"base":"/terrain/${slug}/"`);
    expect(initials("Quercy Propreté")).toBe("QP");
    expect(initials("Net'Éclat Services")).toBe("NE");
    const manifest = terrainManifest(brand);
    expect(manifest.start_url).toBe(`/terrain/${slug}/`);
    expect(manifest.icons[0]!.src).toBe(`/terrain/${slug}/icone/192`);
  });

  it("garde le vert d'origine, ou prend la couleur choisie par l'entreprise", async () => {
    const before = terrainBrandOf((await terrainOrg(slug))!);
    expect(before.accent).toBe("#009C84");
    expect(renderTerrainPage(before)).not.toContain("<style>\n:root{--acc:");
    await prisma.organization.update({
      where: { id: orgId },
      data: { preferences: { accentColor: "#7C3AED" } },
    });
    const after = terrainBrandOf((await terrainOrg(slug))!);
    expect(after.customAccent).toBe(true);
    expect(renderTerrainPage(after)).toContain(`--acc:${after.accent}`);
    await prisma.organization.update({ where: { id: orgId }, data: { preferences: {} } });
  });

  it("choisit la grille de contrôle d'après la prestation", () => {
    expect(checklistFor("Entretien des bureaux").key).toBe("bureaux");
    expect(checklistFor("Ménage", "Résidence Les Tilleuls").key).toBe("parties-communes");
    expect(checklistFor("Remise en état après travaux").key).toBe("remise-en-etat");
    expect(checklistFor("Ménage récurrent", "Gîte du Causse").key).toBe("logement");
  });
});

describe("mise en service et comptes", () => {
  it("réserve la première mise en service à un administrateur connecté au logiciel", async () => {
    const anon = phone();
    expect((await anon("etat")).data).toMatchObject({ installation: true, moi: null });
    const refused = await anon("installation", { nom: "X", pin: "123456" });
    expect(refused.status).toBe(403);
    const asMember = phone({ "x-test-user": memberId });
    expect((await asMember("installation", { nom: "X", pin: "123456" })).status).toBe(403);

    const boss = phone({ "x-test-user": ownerId });
    const done = await boss("installation", { nom: "Patron", pin: "246810" });
    expect(done.status).toBe(200);
    expect(done.data!.moi).toMatchObject({ id: ownerId, code: "patron", role: "patron" });
    expect((await boss("etat")).data).toMatchObject({ installation: false });
    expect((await boss("installation", { pin: "111111" })).status).toBe(409);
  });

  it("connexion par identifiant et code, cookie valable pour cette seule entreprise", async () => {
    const p = phone();
    expect((await p("connexion", { code: "patron", pin: "000000" })).status).toBe(401);
    const ok = await p("connexion", { code: "PATRON", pin: "246810" });
    expect(ok.status).toBe(200);
    expect(ok.response.headers.get("set-cookie")).toContain(`Path=/terrain/${slug}/`);
    expect((await p("tournee")).status).toBe(200);
  });

  it("le responsable crée un agent relié au membre du même nom, puis un agent sans compte", async () => {
    const boss = phone();
    await boss("connexion", { code: "patron", pin: "246810" });
    expect(
      (await boss("agent", { nom: "Sandrine Lacombe", code: "sandrine", pin: "135791" })).status,
    ).toBe(200);
    const access = await prisma.fieldAccess.findFirstOrThrow({
      where: { organizationId: orgId, code: "sandrine" },
    });
    expect(access.userId).toBe(memberId);

    expect((await boss("agent", { nom: "Karim", code: "karim", pin: "975310" })).status).toBe(200);
    const karim = await prisma.fieldAccess.findFirstOrThrow({
      where: { organizationId: orgId, code: "karim" },
      include: { user: { include: { memberships: true, accounts: true } } },
    });
    expect(karim.user.name).toBe("Karim");
    expect(karim.user.memberships.map((m) => m.organizationId)).toEqual([orgId]);
    expect(karim.user.accounts).toHaveLength(0);
    const karimRole = await prisma.role.findUniqueOrThrow({
      where: { id: karim.user.memberships[0]!.roleId },
    });
    expect(karimRole.systemKey).toBe("worker");

    const agents = (await boss("agents")).data!.agents as { code: string }[];
    expect(agents.map((a) => a.code)).toEqual(["patron", "sandrine", "karim"]);
    expect((await boss("agent", { code: "a", pin: "1" })).status).toBe(400);

    const agent = phone();
    await agent("connexion", { code: "sandrine", pin: "135791" });
    expect((await agent("agents")).status).toBe(403);
  });
});

describe("chantier de bout en bout", () => {
  it("planifie, pointe, relève, photographie, fait signer et clôture", async () => {
    const boss = phone();
    await boss("connexion", { code: "patron", pin: "246810" });
    const today = dayKey(new Date());
    const created = await boss("chantier-nouveau", {
      client: "Cabinet Delmas",
      contact: "M. Delmas",
      tel: "05 65 00 00 00",
      email: "delmas@example.com",
      adresse: "12 rue Clemenceau",
      cp: "46000",
      ville: "Cahors",
      prestation: "Entretien des bureaux",
      date: today,
      heure: "18:30",
      devise: 1.5,
      surface: "120",
      agentId: memberId,
    });
    expect(created.status).toBe(200);
    const ch = created.data!.chantier;
    expect(ch).toMatchObject({ client: "Cabinet Delmas", devise: 1.5, agentId: memberId });
    expect(ch.ref).toMatch(/^CHT-\d{4}-0001$/);
    expect(ch.pieces[0].n).toBe("Postes de travail");

    // Le chantier est une intervention du logiciel, sur un site créé pour l'occasion.
    const row = await prisma.intervention.findUniqueOrThrow({
      where: { id: ch.id },
      include: { site: true },
    });
    expect(row).toMatchObject({ ownerId: memberId, startTime: "18:30", durationMinutes: 90 });
    expect(row.site).toMatchObject({ name: "Cabinet Delmas", city: "Cahors", surfaceM2: 120 });

    const agent = phone();
    await agent("connexion", { code: "sandrine", pin: "135791" });
    const tour = (await agent(`tournee?d=${today}`)).data!;
    expect(tour.chantiers).toHaveLength(1);
    expect(tour.chantiers[0]).toMatchObject({ id: ch.id, statut: "prevu", ville: "Cahors" });

    // Karim ne voit pas le chantier de Sandrine.
    const other = phone();
    await other("connexion", { code: "karim", pin: "975310" });
    expect((await other(`chantier?id=${ch.id}`)).status).toBe(403);

    // Pointage : l'heure vient du serveur ; un pointage hors réseau est signalé.
    const arrival = await agent("pointage", { id: ch.id, type: "arrivee", declareA: Date.now() });
    expect(arrival.data!.chantier.arrivee).toBeGreaterThan(Date.now() - 5000);
    expect((await agent("pointage", { id: ch.id, type: "arrivee" })).status).toBe(409);
    expect((await prisma.intervention.findUniqueOrThrow({ where: { id: ch.id } })).status).toBe(
      "in_progress",
    );

    // Relevé : tout validé sauf un point critique, qui bloque la clôture sans motif.
    const pieces = ch.pieces.map((p: { items: unknown[] }) => ({
      items: p.items.map(() => ({ ok: true, nc: "" })),
    }));
    pieces[1].items[0] = { ok: false, nc: "" };
    expect(
      (
        await agent("releve", {
          id: ch.id,
          pieces,
          cons: [2, 1],
          obs: "RAS",
          signataire: "M. Delmas",
        })
      ).status,
    ).toBe(200);

    const photo = await agent("photo", {
      id: ch.id,
      pid: "photo-1",
      piece: "Sanitaires",
      slot: "avant",
      data: JPEG,
    });
    expect(photo.data).toMatchObject({ ok: true, id: "photo-1" });
    // Renvoi depuis la file hors réseau : pas de doublon.
    await agent("photo", { id: ch.id, pid: "photo-1", piece: "Sanitaires", data: JPEG });
    const files = await prisma.storedFile.findMany({
      where: { organizationId: orgId, entityType: "intervention", entityId: ch.id },
    });
    expect(files).toHaveLength(1);
    const image = await agent(`photo-fichier?c=${ch.id}&p=photo-1`);
    expect(image.response.headers.get("content-type")).toBe("image/jpeg");
    expect(Buffer.from(await image.response.arrayBuffer()).toString()).toBe("fausse photo");

    expect((await agent("signature", { id: ch.id, data: "javascript:alert(1)" })).status).toBe(400);
    expect((await agent("signature", { id: ch.id, data: PNG, nom: "M. Delmas" })).status).toBe(200);

    expect((await agent("cloture", { id: ch.id })).data!.erreur).toBe(
      "Pointez le départ avant de clôturer.",
    );
    // Horloge du téléphone en avance : l'heure déclarée est gardée, mais signalée.
    await agent("pointage", { id: ch.id, type: "depart", declareA: Date.now() + 5 * 60_000 });
    expect((await agent("cloture", { id: ch.id })).data!.erreur).toBe(
      "1 point(s) critique(s) sans motif.",
    );
    pieces[1].items[0] = { ok: false, nc: "Distributeur de savon cassé, signalé au client." };
    await agent("releve", { id: ch.id, pieces });

    const closed = await agent("cloture", { id: ch.id });
    expect(closed.status).toBe(200);
    const bon = closed.data!.chantier.cloture.bon as string;
    expect(bon).toMatch(/^BI-\d{4}-0001$/);
    expect(closed.data!.chantier.departDiffere).toBe(true);
    expect(closed.data!.chantier.journal.map((j: { a: string }) => j.a)).toContain(
      "Intervention clôturée",
    );

    // Tout est dans le logiciel : intervention réalisée, bon, compte rendu, signature.
    const saved = await prisma.intervention.findUniqueOrThrow({ where: { id: ch.id } });
    expect(saved).toMatchObject({
      status: "done",
      reportNumber: bon,
      notes: "RAS",
      signedBy: "M. Delmas",
      signatureUrl: PNG,
    });
    expect(saved.workedMinutes).toBeGreaterThanOrEqual(0);
    const inspection = await prisma.inspection.findFirstOrThrow({
      where: { organizationId: orgId, title: { contains: bon } },
    });
    expect(inspection.sanitary).toBe(false);
    expect(inspection.floors).toBe(true);
    expect(inspection.score).toBeGreaterThan(80);
    expect(inspection.comments).toContain("Distributeur de savon cassé");

    // Clôturé : plus rien ne bouge.
    expect((await agent("releve", { id: ch.id, obs: "x" })).status).toBe(409);
    expect((await agent("cloture", { id: ch.id })).status).toBe(409);
    // Journal d'évènements : création, arrivée, photo, signature, départ, clôture.
    const events = await prisma.interventionEvent.findMany({
      where: { interventionId: ch.id },
      orderBy: { at: "asc" },
    });
    const types = events.map((e) => e.type);
    for (const t of ["created", "started", "photo_added", "signed", "finished", "completed"])
      expect(types).toContain(t);
    expect(events.find((e) => e.type === "finished")!.metadata).toMatchObject({ offline: true });
    expect(saved.actualAgentId).toBe(memberId);
    const audit = await prisma.auditLog.count({
      where: { organizationId: orgId, entityId: ch.id, action: "intervention.closed" },
    });
    expect(audit).toBe(1);

    // Le relevé est dans ses tables, plus dans le JSON de l'intervention.
    expect(Object.keys(saved.fieldData as object).sort()).not.toEqual(
      expect.arrayContaining(["pieces"]),
    );
    for (const key of ["pieces", "cons", "photos", "journal"])
      expect(saved.fieldData as object).not.toHaveProperty(key);
    const tasks = await prisma.interventionTask.findMany({
      where: { interventionId: ch.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(tasks).toHaveLength(
      ch.pieces.reduce((n: number, p: { items: unknown[] }) => n + p.items.length, 0),
    );
    const failedTask = tasks.find((t) => !t.done)!;
    expect(failedTask).toMatchObject({
      critical: true,
      reason: "Distributeur de savon cassé, signalé au client.",
    });
    expect(tasks.find((t) => t.done)).toMatchObject({ doneById: memberId });
    const consumables = await prisma.interventionConsumable.findMany({
      where: { interventionId: ch.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(consumables.map((c) => c.quantity).slice(0, 3)).toEqual([2, 1, 0]);
    const proofs = await prisma.interventionProof.findMany({ where: { interventionId: ch.id } });
    expect(proofs).toEqual([
      expect.objectContaining({
        type: "photo_before",
        clientRef: "photo-1",
        area: "Sanitaires",
        authorId: memberId,
        fileId: files[0]!.id,
      }),
    ]);
    // Détections automatiques : au responsable seulement, pas dans la fiche de l'agent.
    expect(closed.data!.chantier.anomalies).toEqual([]);
    expect(closed.data!.chantier.journal.map((j: { a: string }) => j.a)).not.toContain(
      "Anomalie signalée",
    );
    const journal = closed.data!.chantier.journal as { a: string; d: string; par: string }[];
    expect(journal.find((j) => j.a === "Réserve")).toMatchObject({ par: "Sandrine Lacombe" });
    expect(journal.filter((j) => j.a === "Point validé").length).toBeGreaterThan(3);
    expect(closed.data!.chantier.photos).toEqual([
      expect.objectContaining({ id: "photo-1", piece: "Sanitaires", slot: "avant" }),
    ]);

    // Point critique non fait et durée anormale : anomalies au responsable, pas au client.
    const anomalies = await prisma.anomaly.findMany({ where: { interventionId: ch.id } });
    expect(anomalies.map((a) => a.type)).toEqual(
      expect.arrayContaining(["critical_point", "abnormal_duration"]),
    );
    expect(anomalies.every((a) => a.status === "reported" && !a.visibleToClient)).toBe(true);
    const notified = await prisma.notification.findMany({
      where: { organizationId: orgId, type: "anomaly.reported" },
    });
    expect(notified.some((n) => n.userId === ownerId)).toBe(true);
    expect(notified.some((n) => n.userId === memberId)).toBe(false);
  });

  it("l'agent signale une anomalie, sans doublon en cas de renvoi hors réseau", async () => {
    const site = await prisma.site.create({
      data: { organizationId: orgId, name: "Résidence du Lot", city: "Cahors" },
    });
    const day = new Date(`${dayKey(new Date())}T00:00:00.000Z`);
    const karim = await prisma.fieldAccess.findFirstOrThrow({
      where: { organizationId: orgId, code: "karim" },
    });
    // Sandrine est prévue, Karim la remplace : il voit et traite le passage.
    const visit = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien des parties communes",
        siteId: site.id,
        ownerId: memberId,
        replacementAgentId: karim.userId,
        date: day,
        startTime: "08:00",
        durationMinutes: 60,
      },
    });
    const agent = phone();
    await agent("connexion", { code: "karim", pin: "975310" });
    const tour = (await agent(`tournee?d=${dayKey(day)}`)).data!.chantiers as { id: string }[];
    expect(tour.map((t) => t.id)).toContain(visit.id);
    const fiche = (await agent(`chantier?id=${visit.id}`)).data!.chantier;
    expect(fiche.typesAnomalie.map((t: { value: string }) => t.value)).toContain("leak");
    expect(fiche.anomalies).toEqual([]);

    expect((await agent("anomalie", { id: visit.id, type: "inconnu" })).status).toBe(400);
    expect((await agent("anomalie", { id: visit.id, type: "other" })).status).toBe(400);
    const report = {
      id: visit.id,
      ref: "anom-1",
      type: "leak",
      lieu: "Local poubelles",
      commentaire: "Fuite sous l'évier",
      photo: JPEG,
    };
    const sent = await agent("anomalie", report);
    expect(sent.status).toBe(200);
    expect(sent.data!.anomalies).toEqual([
      expect.objectContaining({ libelle: "Fuite / eau", lieu: "Local poubelles" }),
    ]);
    await agent("anomalie", report);
    const rows = await prisma.anomaly.findMany({ where: { interventionId: visit.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: "agent",
      status: "reported",
      siteId: site.id,
      reportedById: karim.userId,
      visibleToClient: false,
    });
    expect(rows[0]!.photoFileId).toBeTruthy();
    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: ownerId, url: `/nettoyage/anomalies?id=${rows[0]!.id}` },
    });
    expect(notification.title).toBe("Anomalie à valider : Fuite / eau");
    const journal = (await agent(`chantier?id=${visit.id}`)).data!.chantier.journal;
    expect(journal.map((j: { a: string }) => j.a)).toContain("Anomalie signalée");
  });

  it("montre aussi les interventions planifiées dans le logiciel", async () => {
    const site = await prisma.site.create({
      data: { organizationId: orgId, name: "Résidence Les Tilleuls", city: "Pradines" },
    });
    const today = new Date(`${dayKey(new Date())}T00:00:00.000Z`);
    const planned = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien des parties communes",
        siteId: site.id,
        ownerId: memberId,
        date: today,
        startTime: "07:00",
        durationMinutes: 60,
      },
    });
    const agent = phone();
    await agent("connexion", { code: "sandrine", pin: "135791" });
    const tour = (await agent(`tournee?d=${dayKey(today)}`)).data!.chantiers as { id: string }[];
    expect(tour[0]!.id).toBe(planned.id);
    const fiche = (await agent(`chantier?id=${planned.id}`)).data!.chantier;
    expect(fiche).toMatchObject({ client: "Résidence Les Tilleuls", ville: "Pradines", devise: 1 });
    expect(fiche.pieces[0].n).toBe("Hall d'entrée");
  });

  it("refuse une entreprise sans module Nettoyage et un agent désactivé", async () => {
    const boss = phone();
    await boss("connexion", { code: "patron", pin: "246810" });
    expect((await boss("agent", { supprimer: ownerId })).status).toBe(400);
    await boss("agent", { supprimer: memberId });
    const agent = phone();
    expect((await agent("connexion", { code: "sandrine", pin: "135791" })).status).toBe(401);

    await prisma.organization.update({ where: { id: orgId }, data: { modules: ["crm"] } });
    expect(await terrainOrg(slug)).toBeNull();
  });
});
