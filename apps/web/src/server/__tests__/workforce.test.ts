import { addDays, dayKey, isoWeekday, parseDay, todayIn } from "@quercy/core";
import { prisma } from "@quercy/db";
import { alertWorkerDocuments } from "@quercy/jobs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const { handleTerrainApi } = await import("../terrain/api");
const { terrainOrg } = await import("../terrain/org");
const { newPin } = await import("../terrain/session");

const fx = testFixtures("equipe");
type Api = Awaited<ReturnType<typeof fx.caller>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
let orgId: string;
let slug: string;
let owner: Api;
let alice: Api;
let bruno: Api;
const ids: Record<string, string> = {};
let siteA: string;
let siteB: string;
// Lundi de la semaine prochaine.
const monday = (() => {
  const today = parseDay(todayIn());
  return addDays(today, 8 - isoWeekday(today));
})();

function phone() {
  let cookie = "";
  return async (route: string, body?: unknown) => {
    const org = (await terrainOrg(slug))!;
    const response = await handleTerrainApi(
      new Request(`http://localhost/terrain/${slug}/api/${route}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": `ip-${Math.random()}`,
          ...(cookie ? { cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      org,
      route.split("?")[0]!,
    );
    const set = response.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0]!;
    return { status: response.status, data: (await response.json()) as Json };
  };
}

beforeAll(async () => {
  const org = await fx.org("a");
  orgId = org.id;
  slug = org.slug;
  for (const [key, role] of [
    ["owner", "owner"],
    ["alice", "worker"],
    ["bruno", "worker"],
    ["chloe", "worker"],
    ["denis", "worker"],
    ["sous", "worker"],
  ] as const) {
    const created = await fx.user(key);
    const u = await prisma.user.update({ where: { id: created.id }, data: { name: key } });
    ids[key] = u.id;
    await fx.member(orgId, u.id, role);
    if (key === "owner") owner = await fx.caller(u, orgId);
    if (key === "alice") alice = await fx.caller(u, orgId);
    if (key === "bruno") bruno = await fx.caller(u, orgId);
  }
  siteA = (await prisma.site.create({ data: { organizationId: orgId, name: "Cage A", code: "A" } }))
    .id;
  siteB = (await prisma.site.create({ data: { organizationId: orgId, name: "Cage B", code: "B" } }))
    .id;
  await prisma.fieldAccess.create({
    data: {
      organizationId: orgId,
      userId: ids.alice!,
      code: "alice",
      role: "agent",
      ...newPin("135791"),
    },
  });
});

afterAll(async () => {
  await prisma.interventionEvent.deleteMany({ where: { organizationId: orgId } });
  await prisma.intervention.deleteMany({ where: { organizationId: orgId } });
  await prisma.route.deleteMany({ where: { organizationId: orgId } });
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("fiches intervenants", () => {
  it("le responsable renseigne statut, remplaçants et attestations ; pas un agent", async () => {
    await expectCode(alice.workers.list(), "FORBIDDEN");
    await expectCode(
      owner.workers.save({ userId: ids.alice!, kind: "employee", replacement1Id: ids.alice! }),
      "BAD_REQUEST",
    );
    await owner.workers.save({
      userId: ids.alice!,
      kind: "employee",
      activities: ["copropriété"],
      hourlyCost: 21.5,
      replacement1Id: ids.bruno!,
      replacement2Id: ids.chloe!,
      canDriveCompanyVehicles: true,
    });
    await owner.workers.save({ userId: ids.denis!, kind: "employee", activities: ["bureaux"] });
    await expectCode(
      owner.workers.save({ userId: ids.sous!, kind: "subcontractor", siret: "123" }),
      "BAD_REQUEST",
    );
    await owner.workers.save({
      userId: ids.sous!,
      kind: "subcontractor",
      companyName: "Net Express",
      siret: "123 456 789 00012",
    });
    await owner.workers.saveDocument({
      userId: ids.sous!,
      kind: "urssaf",
      expiresAt: dayKey(addDays(parseDay(todayIn()), 10)),
    });
    const list = await owner.workers.list();
    const a = list.workers.find((w) => w.id === ids.alice)!;
    expect(a).toMatchObject({ hourlyCost: 21.5, replacement1: "bruno", replacement2: "chloe" });
    const s = list.workers.find((w) => w.id === ids.sous)!;
    expect(s).toMatchObject({ kindLabel: "Sous-traitant", siret: "12345678900012" });
    expect(s.documents[0]).toMatchObject({ kindLabel: "Attestation URSSAF", alert: "soon" });
  });

  it("alerte d'attestation : une fois par niveau", async () => {
    const before = await prisma.notification.count({
      where: { organizationId: orgId, type: "worker.document_expiring" },
    });
    expect(await alertWorkerDocuments()).toBeGreaterThanOrEqual(1);
    await alertWorkerDocuments();
    const notes = await prisma.notification.findMany({
      where: { organizationId: orgId, type: "worker.document_expiring" },
    });
    expect(notes.length - before).toBe(1);
    expect(notes.at(-1)).toMatchObject({
      userId: ids.owner,
      title: "Attestation URSSAF de sous : expire bientôt",
    });
  });
});

describe("absence et remplacement", () => {
  it("demandée depuis l'application, validée, puis remplacée dans l'ordre", async () => {
    const visit = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien",
        siteId: siteA,
        ownerId: ids.alice,
        date: monday,
        startTime: "08:00",
        durationMinutes: 60,
      },
    });
    // Bruno (remplaçant n°1) est déjà pris à la même heure ailleurs.
    await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien",
        siteId: siteB,
        ownerId: ids.bruno,
        date: monday,
        startTime: "08:30",
        durationMinutes: 60,
      },
    });
    const app = phone();
    await app("connexion", { code: "alice", pin: "135791" });
    expect((await app("absence", { type: "inconnu", debut: dayKey(monday) })).status).toBe(400);
    const sent = await app("absence", {
      type: "leave",
      debut: dayKey(monday),
      fin: dayKey(addDays(monday, 2)),
      commentaire: "Mariage",
    });
    expect(sent.status).toBe(200);
    expect(sent.data.absences[0]).toMatchObject({
      statut: "requested",
      statutLibelle: "À valider",
    });
    const tour = (await app(`tournee?d=${dayKey(monday)}`)).data;
    expect(tour.absences).toHaveLength(1);
    expect(tour.typesAbsence.map((t: Json) => t.value)).toContain("sick");

    const absence = (await owner.absences.list({ status: "open" })).absences[0]!;
    expect(absence).toMatchObject({ user: { id: ids.alice }, source: "app", comment: "Mariage" });
    expect(
      await prisma.notification.count({ where: { userId: ids.owner, type: "absence.requested" } }),
    ).toBe(1);
    await expectCode(alice.absences.decide({ id: absence.id, approve: true }), "FORBIDDEN");
    await owner.absences.decide({ id: absence.id, approve: true });
    await expectCode(owner.absences.decide({ id: absence.id, approve: true }), "CONFLICT");

    const impact = await owner.absences.impact({ id: absence.id });
    expect(impact.visits).toHaveLength(1);
    expect(impact.visits[0]!.proposals.map((p) => [p.name, p.rank, p.conflict])).toEqual([
      ["bruno", "replacement1", true],
      ["chloe", "replacement2", false],
      ["denis", "qualified", false],
      ["owner", "qualified", false],
      ["sous", "subcontractor", false],
    ]);

    // Avant : Chloé ne voit pas la fiche de la cage A.
    const chloe = await fx.caller({ id: ids.chloe!, name: "chloe", email: "c@x.invalid" }, orgId);
    await expectCode(chloe.sites.sheet({ siteId: siteA }), "FORBIDDEN");
    await owner.absences.assign({
      absenceId: absence.id,
      assignments: [{ interventionId: visit.id, agentId: ids.chloe! }],
    });
    const after = await prisma.intervention.findUniqueOrThrow({ where: { id: visit.id } });
    expect(after).toMatchObject({ ownerId: ids.alice, replacementAgentId: ids.chloe });
    // Après : Chloé a la fiche de ce site, et seulement de celui-là.
    expect((await chloe.sites.sheet({ siteId: siteA })).site.code).toBe("A");
    await expectCode(chloe.sites.sheet({ siteId: siteB }), "FORBIDDEN");
    expect((await chloe.cleaning.myDay({ day: dayKey(monday) })).map((i) => i.id)).toEqual([
      visit.id,
    ]);
    expect(
      await prisma.notification.count({
        where: { userId: ids.chloe, type: "absence.replacement" },
      }),
    ).toBe(1);

    // Planning : le passage est sur la ligne de Chloé, Alice est marquée absente.
    const planning = await owner.cleaning.planning({ week: dayKey(monday) });
    expect(planning.interventions.find((i) => i.id === visit.id)).toMatchObject({
      agentId: ids.chloe,
      replacing: "alice",
    });
    expect(planning.absences.filter((a) => a.agentId === ids.alice).map((a) => a.day)).toEqual([
      dayKey(monday),
      dayKey(addDays(monday, 1)),
      dayKey(addDays(monday, 2)),
    ]);
    // Plus rien à remplacer.
    expect((await owner.absences.impact({ id: absence.id })).visits).toHaveLength(0);
  });

  it("un agent ne déclare que ses absences ; il peut annuler une demande", async () => {
    await expectCode(
      bruno.absences.create({
        userId: ids.alice,
        kind: "sick",
        start: dayKey(monday),
        end: dayKey(monday),
      }),
      "FORBIDDEN",
    );
    const { id, status } = await bruno.absences.create({
      kind: "training",
      start: dayKey(monday),
      end: dayKey(monday),
    });
    expect(status).toBe("requested");
    expect((await bruno.absences.list({ status: "all" })).absences.map((a) => a.id)).toEqual([id]);
    await bruno.absences.cancel({ id });
    const recorded = await owner.absences.create({
      userId: ids.denis,
      kind: "sick",
      start: dayKey(monday),
      end: dayKey(monday),
    });
    expect(recorded.status).toBe("approved");
  });
});

describe("propositions sur plusieurs passages", () => {
  it("deux passages qui se chevauchent ne sont pas proposés à la même personne", async () => {
    const day = addDays(monday, 14);
    for (const [siteId, startTime] of [
      [siteA, "08:00"],
      [siteB, "08:30"],
    ] as const)
      await prisma.intervention.create({
        data: {
          organizationId: orgId,
          title: "Entretien",
          siteId,
          ownerId: ids.denis,
          date: day,
          startTime,
          durationMinutes: 60,
        },
      });
    const { id } = await owner.absences.create({
      userId: ids.denis,
      kind: "sick",
      start: dayKey(day),
      end: dayKey(day),
    });
    const impact = await owner.absences.impact({ id });
    expect(impact.visits).toHaveLength(2);
    const [first, second] = impact.visits;
    expect(first!.suggestedAgentId).toBeTruthy();
    expect(second!.suggestedAgentId).toBeTruthy();
    expect(first!.suggestedAgentId).not.toBe(second!.suggestedAgentId);
    // Celui qui a reçu le premier passage est signalé « déjà pris » pour le second.
    expect(second!.proposals.find((p) => p.agentId === first!.suggestedAgentId)?.conflict).toBe(
      true,
    );
  });
});

describe("tournées", () => {
  it("sites dans l'ordre, trajets et totaux", async () => {
    await expectCode(
      owner.routes.save({ name: "Doublon", stops: [{ siteId: siteA }, { siteId: siteA }] }),
      "BAD_REQUEST",
    );
    await owner.routes.save({
      name: "Tournée nord",
      mainAgentId: ids.alice,
      replacementAgentId: ids.bruno,
      weekdays: [3, 1, 1],
      startTime: "06:00",
      endTime: "12:00",
      stops: [
        { siteId: siteB, travelMinutes: 15, travelKm: 8.5 },
        { siteId: siteA, travelMinutes: 5, travelKm: 1.2 },
      ],
    });
    const [route] = await owner.routes.list();
    expect(route).toMatchObject({
      name: "Tournée nord",
      weekdays: [1, 3],
      mainAgent: { name: "alice" },
      totals: { stops: 2, travelMinutes: 20, travelKm: 9.7 },
    });
    expect(route!.stops.map((s) => s.site.code)).toEqual(["B", "A"]);
    await expectCode(alice.routes.list(), "FORBIDDEN");
  });
});
