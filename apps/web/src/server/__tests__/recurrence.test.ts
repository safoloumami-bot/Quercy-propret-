import { addDays, dayKey, parseDay, todayIn } from "@quercy/core";
import { forTenant, prisma } from "@quercy/db";
import { generateSeriesInterventions } from "@quercy/jobs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type SheetData, analyzeV12 } from "../imports/v12-analyze";
import { importV12 } from "../imports/v12-import";
import { resolveWorkspace } from "../workspace";
import { expectCode, testFixtures } from "./helpers";

/**
 * Données **fictives** au format du fichier V12 (aucune donnée réelle dans le dépôt).
 * En-têtes identiques à ceux du fichier de pilotage.
 */
const T = (h: number, m = 0) => new Date(Date.UTC(1899, 11, 30, h, m));
const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
const SITE_HEADERS = [
  "Code site",
  "Activité",
  "Client",
  "Nom du site",
  "Adresse",
  "Fréquence",
  "Date prochain passage",
  "Heure habituelle",
  "Durée (min)",
  "Intervenant",
  "Tournée",
  "Remplaçant 1",
  "Remplaçant 2",
  "Preuve attendue",
  "Actif",
  "Eau",
  "Accès / clés",
  "Observations",
  "Type récurrence",
  "Passages / période",
  "Jour(s) prévu(s)",
  "Semaine(s) du mois",
  "Intervalle (jours)",
  "Date de début contrat",
  "Date de fin contrat",
];
const site = (values: Record<string, unknown>) => SITE_HEADERS.map((h) => values[h] ?? null);
const SHEETS: SheetData[] = [
  {
    sheet: "Sites",
    data: [
      ["REGISTRE MAÎTRE DES SITES (fictif)"],
      [],
      SITE_HEADERS,
      site({
        "Code site": "C01",
        Activité: "Cage",
        Client: "Syndic Fictif",
        "Nom du site": "Résidence des Tilleuls",
        Adresse: "Villeneuve",
        Fréquence: "1 x / mois",
        "Date prochain passage": D("2026-11-02"),
        "Heure habituelle": T(14),
        "Durée (min)": 30,
        Intervenant: "Agent Alpha",
        Tournée: "T01",
        "Remplaçant 1": "Agent Beta",
        "Preuve attendue": "Feuille + photos",
        Actif: "Oui",
        Eau: "À compléter",
        "Type récurrence": "Mensuelle",
        "Passages / période": 1,
        "Date de début contrat": D("2026-10-05"),
      }),
      site({
        "Code site": "B01",
        Activité: "Bureau",
        Client: "Cabinet Fictif",
        "Nom du site": "Bureaux du Moulin",
        Adresse: "Bourg-sur-Lot",
        Fréquence: "1 x / semaine",
        "Heure habituelle": T(8),
        "Durée (min)": 150,
        Intervenant: "Agent Beta",
        Tournée: "T03",
        Actif: "Oui",
        "Type récurrence": "Hebdomadaire",
        "Passages / période": 1,
        "Semaine(s) du mois": "Chaque semaine",
        "Intervalle (jours)": 7,
        "Date de début contrat": D("2026-10-05"),
      }),
      site({
        "Code site": "V01",
        Activité: "Vitre",
        Client: "Syndic Fictif",
        "Nom du site": "Boutique Fictive",
        Adresse: "12 rue des Fleurs, Villeneuve",
        Fréquence: "Variable",
        "Heure habituelle": T(10, 45),
        "Durée (min)": 25,
        Intervenant: "Dirigeant",
        Actif: "Oui",
        "Type récurrence": "Personnalisée",
      }),
    ],
  },
  {
    sheet: "Intervenants",
    data: [
      ["Intervenants"],
      [],
      ["Code agent", "Nom", "Statut", "Activités", "Zone", "Téléphone", "Disponible"],
      ["AG01", "Agent Alpha", "Sous-traitant", "Cages", "Villeneuve", null, "Oui"],
      ["AG02", "Agent Beta", "Salariée", "Bureaux", "Bourg", null, "Oui"],
      ["AG03", "Dirigeant", "Dirigeant", "Pilotage", null, null, "Oui"],
    ],
  },
  {
    sheet: "Tournées",
    data: [
      [],
      ["Code tournée", "Nom tournée", "Zone", "Agent principal", "Remplaçant"],
      ["T01", "Cages", "Villeneuve", "Agent Alpha", "Dirigeant"],
    ],
  },
  {
    sheet: "Suivi interventions",
    data: [
      ["Suivi"],
      [
        "Date prévue",
        "Code site",
        "Activité",
        "Site",
        "Intervenant prévu",
        "Tournée",
        "Heure prévue",
        "Durée min",
        "Occurrence",
        "Statut",
        "Début réel",
        "Fin réelle",
        "Intervenant réel",
      ],
      [D("2026-09-30"), "C01", "Cage", "x", "Agent Alpha", "T01", T(14), 30, 1, "Fait", 0, 0, null],
      [
        D("2026-09-29"),
        "B01",
        "Bureau",
        "x",
        "Agent Beta",
        "T03",
        T(8),
        150,
        1,
        "Fait",
        0,
        0,
        "Agent Alpha",
      ],
      [D("2026-10-30"), "C01", "Cage", "x", "Agent Alpha", "T01", T(14), 30, 2, null, 0, 0, null],
    ],
  },
];

describe("analyse du fichier V12", () => {
  const analysis = analyzeV12(SHEETS, "2026-10-06");

  it("lit les sites par « Nom du site », jamais par la ville", () => {
    expect(analysis.sites.map((s) => [s.code, s.name, s.city, s.address])).toEqual([
      ["C01", "Résidence des Tilleuls", "Villeneuve", null],
      ["B01", "Bureaux du Moulin", "Bourg-sur-Lot", null],
      ["V01", "Boutique Fictive", "Villeneuve", "12 rue des Fleurs"],
    ]);
    const c01 = analysis.sites[0]!;
    expect(c01).toMatchObject({ startTime: "14:00", durationMinutes: 30, tour: "T01" });
    expect(c01.toComplete).toEqual(["Eau"]);
    expect(c01.details).toMatchObject({ "Preuve attendue": "Feuille + photos" });
    expect(c01.details).not.toHaveProperty("Eau");
  });

  it("propose des règles signalées, sans les déduire des dates de passage", () => {
    const [c01, b01, v01] = analysis.sites;
    expect(c01!.proposal).toMatchObject({
      description: "le 1er lundi du mois",
      effectiveFrom: "2026-10-05",
    });
    expect(c01!.warnings.join(" ")).toMatch(/à confirmer/);
    expect(b01!.proposal!.description).toBe("chaque lundi");
    expect(v01!.proposal).toBeNull();
    expect(v01!.warnings.join(" ")).toMatch(/à définir/);
  });

  it("reprend les intervenants, les tournées et les seuls passages réalisés", () => {
    expect(analysis.agents.map((a) => [a.name, a.isLeader])).toEqual([
      ["Agent Alpha", false],
      ["Agent Beta", false],
      ["Dirigeant", true],
    ]);
    expect(analysis.tours.map((t) => t.code)).toEqual(["T01"]);
    expect(analysis.history).toEqual([
      expect.objectContaining({ siteCode: "C01", date: "2026-09-30", actualAgent: null }),
      expect.objectContaining({ siteCode: "B01", date: "2026-09-29", actualAgent: "Agent Alpha" }),
    ]);
  });

  it("signale un fichier qui n'est pas la V12", () => {
    expect(analyzeV12([{ sheet: "Feuil1", data: [["x"]] }], "2026-10-06").warnings[0]).toMatch(
      /Sites/,
    );
  });
});

const fx = testFixtures("recur");
let orgId: string;
let owner: { id: string; name: string; email: string };
let api: Awaited<ReturnType<typeof fx.caller>>;

beforeAll(async () => {
  owner = await fx.user("owner");
  orgId = (await fx.org("a")).id;
  await fx.member(orgId, owner.id, "owner");
  api = await fx.caller(owner, orgId);
});

afterAll(async () => {
  const where = { organizationId: orgId };
  await prisma.interventionEvent.deleteMany({ where });
  await prisma.intervention.deleteMany({ where });
  await prisma.recurrenceRuleVersion.deleteMany({ where });
  await prisma.recurrenceSeries.deleteMany({ where });
  await prisma.serviceLine.deleteMany({ where });
  await prisma.user.deleteMany({
    where: { email: { endsWith: `.invalid` }, memberships: { some: where } },
  });
  await fx.cleanup();
  await prisma.$disconnect();
});

async function ctx() {
  const workspace = (await resolveWorkspace(owner.id, orgId))!;
  return {
    db: forTenant(orgId),
    user: owner,
    organizationId: orgId,
    workspace,
    headers: new Headers(),
  };
}

describe("import de la V12 puis validation", () => {
  it("importe sans rien planifier, puis un second import ne crée aucun doublon", async () => {
    const analysis = analyzeV12(SHEETS, todayIn());
    const first = await importV12(await ctx(), analysis);
    expect(first).toMatchObject({
      sites: { created: 3, existing: 0 },
      clients: { created: 2 },
      agents: { created: 2 },
      series: { proposed: 3 },
      history: { created: 2 },
    });
    const sites = await prisma.site.findMany({
      where: { organizationId: orgId },
      orderBy: { code: "asc" },
    });
    expect(sites.find((s) => s.code === "B01")).toMatchObject({
      name: "Bureaux du Moulin",
      city: "Bourg-sur-Lot",
    });
    // Seuls les deux passages réalisés existent : rien de futur avant validation.
    const interventions = await prisma.intervention.findMany({ where: { organizationId: orgId } });
    expect(interventions).toHaveLength(2);
    expect(interventions.every((i) => i.status === "done" && i.checkInAt === null)).toBe(true);
    const b01 = interventions.find((i) => dayKey(i.date) === "2026-09-29")!;
    const alpha = await prisma.user.findFirstOrThrow({
      where: { name: "Agent Alpha", memberships: { some: { organizationId: orgId } } },
    });
    expect(b01.actualAgentId).toBe(alpha.id);
    const role = await prisma.membership.findFirstOrThrow({
      where: { organizationId: orgId, userId: alpha.id },
      include: { role: true },
    });
    expect(role.role.systemKey).toBe("worker");
    // Le dirigeant est la personne qui importe.
    const v01 = await prisma.serviceLine.findFirstOrThrow({
      where: { organizationId: orgId, externalRef: "v12:V01" },
    });
    expect(v01.plannedAgentId).toBe(owner.id);

    const second = await importV12(await ctx(), analysis);
    expect(second).toMatchObject({
      sites: { created: 0, existing: 3 },
      series: { proposed: 0, existing: 3 },
      history: { created: 0, existing: 2 },
      agents: { created: 0, matched: 2 },
    });
  });

  it("une règle à définir ne se valide pas ; les autres planifient leurs passages", async () => {
    const { series } = await api.recurrence.list({ status: "proposed" });
    expect(series).toHaveLength(3);
    const undefinedRule = series.find((s) => s.site.code === "V01")!;
    expect(undefinedRule.current.rule).toBeNull();
    const result = await api.recurrence.validate({ seriesIds: series.map((s) => s.id) });
    expect(result.validated).toBe(2);
    expect(result.created).toBeGreaterThan(3);
    const again = await generateSeriesInterventions({ organizationId: orgId });
    expect(again.created).toBe(0);
    const future = await prisma.intervention.findMany({
      where: { organizationId: orgId, date: { gte: parseDay(todayIn()) }, seriesId: { not: null } },
    });
    expect(future.every((i) => i.slotKey?.startsWith("serie:"))).toBe(true);
  });

  it("corriger la règle à définir, puis valider", async () => {
    const { series } = await api.recurrence.list({ status: "proposed" });
    const v01 = series[0]!;
    await api.recurrence.updateProposal({
      seriesId: v01.id,
      rule: { kind: "monthly_weeks", weekdays: [2], weeks: [1, 3], everyMonths: 1 },
      effectiveFrom: todayIn(),
      startTime: "10:45",
      durationMinutes: 25,
      plannedAgentId: owner.id,
      holidayPolicy: "after",
      holidayCalendar: "fr",
    });
    expect((await api.recurrence.validate({ seriesIds: [v01.id] })).validated).toBe(1);
    const active = await api.recurrence.list({ status: "active" });
    const fixed = active.series.find((s) => s.id === v01.id)!;
    expect(fixed.current.description).toBe("le 1er et 3e mardi du mois");
    expect(fixed.holidayPolicy).toBe("after");
  });

  it("nouvelle version : le passé reste, l'avenir intact est recalculé", async () => {
    const { series } = await api.recurrence.list({ status: "active" });
    const b01 = series.find((s) => s.site.code === "B01")!;
    const from = dayKey(addDays(parseDay(todayIn()), 14));
    await expectCode(
      api.recurrence.newVersion({
        seriesId: b01.id,
        rule: { kind: "weekly", weekdays: [2], everyWeeks: 1 },
        effectiveFrom: "2026-01-01",
      }),
      "BAD_REQUEST",
    );
    const result = await api.recurrence.newVersion({
      seriesId: b01.id,
      rule: { kind: "weekly", weekdays: [2], everyWeeks: 1 },
      effectiveFrom: from,
    });
    expect(result.version).toBe(2);
    const rows = await prisma.intervention.findMany({
      where: { seriesId: b01.id },
      include: { ruleVersion: true },
    });
    const isoDay = (d: Date) => ((d.getUTCDay() + 6) % 7) + 1;
    for (const r of rows) {
      if (dayKey(r.date) < from) expect(r.ruleVersion?.version ?? 1).toBe(1);
      else {
        expect(r.ruleVersion?.version).toBe(2);
        expect(isoDay(r.date)).toBe(2);
      }
    }
    // L'historique (passage réalisé du 29/09) n'a pas bougé.
    expect(rows.some((r) => dayKey(r.date) === "2026-09-29" && r.status === "done")).toBe(true);
  });

  it("pause : les passages futurs intacts sont retirés ; reprise : ils reviennent", async () => {
    const { series } = await api.recurrence.list({ status: "active" });
    const c01 = series.find((s) => s.site.code === "C01")!;
    const futureCount = () =>
      prisma.intervention.count({
        where: { seriesId: c01.id, date: { gte: parseDay(todayIn()) } },
      });
    expect(await futureCount()).toBeGreaterThan(0);
    await api.recurrence.setStatus({ seriesId: c01.id, status: "paused" });
    expect(await futureCount()).toBe(0);
    await api.recurrence.setStatus({ seriesId: c01.id, status: "active" });
    expect(await futureCount()).toBeGreaterThan(0);
  });
});
