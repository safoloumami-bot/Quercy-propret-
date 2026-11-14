import { addDays, dayKey, isoWeekday, parseDay, todayIn } from "@quercy/core";
import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const { handleTerrainApi } = await import("../terrain/api");
const { terrainOrg } = await import("../terrain/org");
const { newPin } = await import("../terrain/session");

const fx = testFixtures("missions");
type Api = Awaited<ReturnType<typeof fx.caller>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
let orgId: string;
let slug: string;
let owner: Api;
let agent: Api;
let agentId: string;
let siteId: string;
// Un mercredi à venir, et le lundi de la même semaine.
const wednesday = (() => {
  const today = parseDay(todayIn());
  return addDays(today, ((3 - isoWeekday(today) + 7) % 7) + 7);
})();
const monday = addDays(wednesday, -2);

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

const TASKS = [
  {
    zone: "Hall",
    label: "Laver le sol",
    frequency: "each_visit" as const,
    critical: true,
    photoRequired: true,
  },
  {
    zone: "Hall",
    label: "Vitres de la porte",
    frequency: "weekly" as const,
    critical: false,
    photoRequired: false,
  },
  {
    zone: "Escaliers",
    label: "Rampes",
    frequency: "each_visit" as const,
    critical: false,
    photoRequired: false,
  },
];

beforeAll(async () => {
  const o = await fx.user("owner");
  const a = await fx.user("agent");
  agentId = a.id;
  const org = await fx.org("a");
  orgId = org.id;
  slug = org.slug;
  await fx.member(orgId, o.id, "owner");
  await fx.member(orgId, a.id, "worker");
  owner = await fx.caller(o, orgId);
  agent = await fx.caller(a, orgId);
  siteId = (
    await prisma.site.create({
      data: { organizationId: orgId, name: "Résidence fictive", code: "M01" },
    })
  ).id;
  await prisma.siteInfo.createMany({
    data: [
      {
        organizationId: orgId,
        siteId,
        label: "Local poubelles",
        content: "Fond de cour",
        category: "access",
      },
      {
        organizationId: orgId,
        siteId,
        label: "Tarif",
        content: "45 €",
        category: "other",
        visibility: "managers",
      },
    ],
  });
  await prisma.fieldAccess.create({
    data: {
      organizationId: orgId,
      userId: a.id,
      code: "agent",
      role: "agent",
      ...newPin("135791"),
    },
  });
});

afterAll(async () => {
  await prisma.interventionEvent.deleteMany({ where: { organizationId: orgId } });
  await prisma.interventionTask.deleteMany({ where: { organizationId: orgId } });
  await prisma.intervention.deleteMany({ where: { organizationId: orgId } });
  await prisma.missionSheet.deleteMany({ where: { organizationId: orgId } });
  await prisma.siteInfo.deleteMany({ where: { organizationId: orgId } });
  await fx.cleanup();
  await prisma.$disconnect();
});

const visit = (date: Date, extra: Record<string, unknown> = {}) =>
  prisma.intervention.create({
    data: {
      organizationId: orgId,
      title: "Entretien",
      siteId,
      ownerId: agentId,
      date,
      startTime: "08:00",
      durationMinutes: 60,
      ...extra,
    },
  });

describe("fiches mission", () => {
  it("le responsable crée la fiche ; un agent ne peut pas ; une seule par prestation", async () => {
    const input = {
      siteId,
      title: "Entretien courant",
      instructions: "Pas de javel sur le marbre.",
      products: "Détergent neutre",
      tasks: TASKS,
    };
    await expectCode(agent.missions.save(input), "FORBIDDEN");
    const saved = await owner.missions.save(input);
    expect(saved.version).toBe(1);
    await expectCode(owner.missions.save(input), "CONFLICT");
    const list = await owner.missions.list({ siteId });
    expect(list.sheets[0]).toMatchObject({ title: "Entretien courant", version: 1 });
    expect(list.sheets[0]!.tasks.map((t) => t.label)).toEqual([
      "Laver le sol",
      "Vitres de la porte",
      "Rampes",
    ]);
  });

  it("l'agent ne reçoit que les tâches dues ce jour-là, avec la fiche et ses infos", async () => {
    const first = await visit(monday);
    const second = await visit(wednesday);
    const app = phone();
    expect((await app("connexion", { code: "agent", pin: "135791" })).status).toBe(200);
    const lundi = (await app(`chantier?id=${first.id}`)).data.chantier;
    expect(lundi.pieces.map((p: Json) => p.n)).toEqual(["Hall", "Escaliers"]);
    expect(lundi.pieces[0].items.map((i: Json) => i.l)).toEqual([
      "Laver le sol",
      "Vitres de la porte",
    ]);
    expect(lundi.pieces[0].items[0]).toMatchObject({ crit: true, photo: true });
    expect(lundi.mission).toMatchObject({
      titre: "Entretien courant",
      version: 1,
      consignes: "Pas de javel sur le marbre.",
      produits: "Détergent neutre",
    });
    expect(lundi.infos.map((i: Json) => i.titre)).toEqual(["Local poubelles"]);
    // Mercredi : les vitres (hebdomadaires) ont déjà été prévues lundi.
    const mercredi = (await app(`chantier?id=${second.id}`)).data.chantier;
    expect(mercredi.pieces[0].items.map((i: Json) => i.l)).toEqual(["Laver le sol"]);

    // Le relevé enregistre les points de la fiche, avec sa version.
    await app("releve", {
      id: first.id,
      pieces: [{ items: [{ ok: true }, { ok: false }] }, { items: [{ ok: true }] }],
    });
    const saved = await prisma.intervention.findUniqueOrThrow({
      where: { id: first.id },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });
    expect(saved).toMatchObject({ missionVersion: 1 });
    expect(saved.tasks.map((t) => [t.label, t.done, t.frequency, t.photoRequired])).toEqual([
      ["Laver le sol", true, "each_visit", true],
      ["Vitres de la porte", false, "weekly", false],
      ["Rampes", true, "each_visit", false],
    ]);
  });

  it("une nouvelle version part sur les passages pas commencés ; les autres gardent la leur", async () => {
    const started = await prisma.intervention.findFirstOrThrow({
      where: { organizationId: orgId, date: monday },
    });
    const untouched = await visit(addDays(wednesday, 7));
    // Points déjà créés mais intacts (ouverture de la fiche puis rien) : ils seront refaits.
    await prisma.interventionTask.create({
      data: {
        organizationId: orgId,
        interventionId: untouched.id,
        area: "Hall",
        label: "Ancien",
        sortOrder: 0,
      },
    });
    const sheet = (await owner.missions.list({ siteId })).sheets[0]!;
    const result = await owner.missions.save({
      id: sheet.id,
      siteId,
      title: "Entretien courant",
      tasks: [
        ...TASKS,
        {
          zone: "Ascenseur",
          label: "Miroir",
          frequency: "each_visit",
          critical: false,
          photoRequired: false,
        },
      ],
      note: "Ajout de l'ascenseur",
    });
    expect(result).toMatchObject({ version: 2, refreshed: 1 });
    expect(await prisma.interventionTask.count({ where: { interventionId: untouched.id } })).toBe(
      0,
    );
    expect(await prisma.interventionTask.count({ where: { interventionId: started.id } })).toBe(3);
    const app = phone();
    await app("connexion", { code: "agent", pin: "135791" });
    const next = (await app(`chantier?id=${untouched.id}`)).data.chantier;
    expect(next.mission.version).toBe(2);
    expect(next.pieces.map((p: Json) => p.n)).toContain("Ascenseur");
    const versions = await owner.missions.versions({ id: sheet.id });
    expect(versions.map((v) => [v.version, v.note])).toEqual([
      [2, "Ajout de l'ascenseur"],
      [1, null],
    ]);
  });

  it("le chef corrige un relevé clôturé, avec historique", async () => {
    const done = await visit(addDays(monday, -7), {
      status: "done",
      reportNumber: "BI-TEST-1",
      fieldData: {
        cloture: { ok: 0, tot: 1, res: 1, ts: 0, duree: 0, bon: "BI-TEST-1", par: "x" },
      },
    });
    const task = await prisma.interventionTask.create({
      data: {
        organizationId: orgId,
        interventionId: done.id,
        area: "Hall",
        label: "Laver le sol",
        reason: "Seau oublié",
      },
    });
    await expectCode(
      agent.fieldRecord.correctTask({ taskId: task.id, done: true, reason: "" }),
      "FORBIDDEN",
    );
    await owner.fieldRecord.correctTask({
      taskId: task.id,
      done: true,
      reason: "",
      note: "Vérifié le lendemain",
    });
    const after = await prisma.intervention.findUniqueOrThrow({
      where: { id: done.id },
      include: { tasks: true, events: true },
    });
    expect(after.tasks[0]).toMatchObject({ done: true, reason: null });
    expect((after.fieldData as Json).cloture).toMatchObject({ ok: 1, res: 0 });
    expect(after.events[0]).toMatchObject({ type: "record_corrected" });
    expect((after.events[0]!.metadata as Json).detail).toContain("non fait (Seau oublié) → fait");
    const record = await owner.fieldRecord.get({ interventionId: done.id });
    expect(record.canCorrect).toBe(true);
    expect(record.journal.map((j) => j.label)).toContain("Relevé corrigé");
  });

  it("feuille de passage du site", async () => {
    const { passageSheet } = await import("../cleaning/passage-sheet");
    const { resolveWorkspace } = await import("../workspace");
    const { forTenant } = await import("@quercy/db");
    const o = await prisma.user.findFirstOrThrow({
      where: { memberships: { some: { organizationId: orgId, role: { systemKey: "owner" } } } },
    });
    const sheet = await passageSheet(
      {
        db: forTenant(orgId),
        user: o,
        organizationId: orgId,
        workspace: (await resolveWorkspace(o.id, orgId))!,
        headers: new Headers(),
      },
      { siteId, from: dayKey(addDays(monday, -7)), to: dayKey(addDays(wednesday, 7)) },
    );
    expect(sheet.rows).toHaveLength(4);
    expect(sheet.rows[0]).toMatchObject({
      status: "Réalisée",
      conformity: "1/1 points",
      report: "BI-TEST-1",
    });
    expect(sheet.rows[1]!.conformity).toBe("2/3 points");
  });
});
