import { describe, expect, it } from "vitest";

import {
  aggregateReport,
  bucketOf,
  changeRatio,
  defaultDashboard,
  PRESET_REPORTS,
  resolvePeriod,
  scheduleDue,
  validateReport,
  type ReportDefinition,
} from "../analytics";
import { MODULE_KEYS } from "../modules";

const TZ = "Europe/Paris";

describe("périodes", () => {
  it("calcule le mois en cours et le mois précédent à l'heure de Paris", () => {
    const p = resolvePeriod({ preset: "month" }, new Date("2026-03-15T10:00:00Z"), TZ);
    expect(p.from.toISOString()).toBe("2026-02-28T23:00:00.000Z");
    expect(p.to.toISOString()).toBe("2026-03-31T22:00:00.000Z"); // passage à l'heure d'été
    expect(p.previous.from.toISOString()).toBe("2026-01-31T23:00:00.000Z");
  });

  it("gère les 7 derniers jours, aujourd'hui compris, et une période personnalisée", () => {
    const p = resolvePeriod({ preset: "7d" }, new Date("2026-06-10T08:00:00Z"), TZ);
    expect(p.from.toISOString()).toBe("2026-06-03T22:00:00.000Z");
    expect(p.to.toISOString()).toBe("2026-06-10T22:00:00.000Z");
    expect(p.previous.to.toISOString()).toBe(p.from.toISOString());
    const c = resolvePeriod(
      { preset: "custom", from: "2026-01-01", to: "2026-01-10" },
      new Date(),
      TZ,
    );
    expect(c.previous.from.toISOString()).toBe("2025-12-21T23:00:00.000Z");
  });

  it("exprime l'évolution en ratio", () => {
    expect(changeRatio(120, 100)).toBeCloseTo(0.2);
    expect(changeRatio(0, 0)).toBe(0);
    expect(changeRatio(10, 0)).toBeNull();
  });
});

describe("agrégation des rapports", () => {
  const def: ReportDefinition = {
    entity: "invoice",
    measure: { op: "sum", field: "totalExclCents" },
    groupBy: "companyId",
    dateField: "issueDate",
    filter: { combinator: "and", rules: [] },
    chart: "bar",
    limit: 2,
    sort: "value_desc",
  };
  const rows = [
    { companyId: "a", totalExclCents: 100, issueDate: "2026-01-05T00:00:00Z" },
    { companyId: "b", totalExclCents: 300, issueDate: "2026-01-20T00:00:00Z" },
    { companyId: "a", totalExclCents: 50, issueDate: "2026-03-02T00:00:00Z" },
    { companyId: "c", totalExclCents: 10, issueDate: "2026-03-03T00:00:00Z" },
    { companyId: null, totalExclCents: 5, issueDate: "2026-03-04T00:00:00Z" },
  ];

  it("regroupe, trie, limite et libelle", () => {
    const r = aggregateReport(rows, def, {
      labels: new Map([
        ["a", "Alpha"],
        ["b", "Bêta"],
      ]),
    });
    expect(r.points).toEqual([
      { key: "b", label: "Bêta", value: 300, count: 1 },
      { key: "__autres__", label: "Autres (3)", value: 165, count: 4 },
    ]);
    expect(r.total).toBe(465);
    expect(r.truncated).toBe(3);
  });

  it("regroupe par mois en affichant les mois vides", () => {
    const r = aggregateReport(
      rows,
      { ...def, groupBy: "issueDate", dateBucket: "month", limit: 12 },
      {
        range: { from: new Date("2025-12-31T23:00:00Z"), to: new Date("2026-03-31T22:00:00Z") },
      },
    );
    expect(r.points.map((p) => [p.key, p.value])).toEqual([
      ["2026-01", 400],
      ["2026-02", 0],
      ["2026-03", 65],
    ]);
  });

  it("compte et moyenne", () => {
    expect(
      aggregateReport(rows, { ...def, measure: { op: "count" }, groupBy: null, chart: "number" })
        .total,
    ).toBe(5);
    expect(
      aggregateReport(rows, {
        ...def,
        measure: { op: "avg", field: "totalExclCents" },
        groupBy: null,
        chart: "number",
      }).total,
    ).toBe(93);
  });

  it("libelle les dates par intervalle", () => {
    const d = new Date("2026-09-27T12:00:00Z");
    expect(bucketOf(d, "week", TZ).key).toBe("2026-S39");
    expect(bucketOf(d, "quarter", TZ).label).toBe("T3 2026");
    expect(bucketOf(d, "day", TZ).label).toBe("27 sept. 2026");
  });

  it("les rapports prédéfinis sont valides", () => {
    for (const r of PRESET_REPORTS) expect(validateReport(r.definition), r.key).toBeNull();
    expect(validateReport({ ...def, measure: { op: "sum", field: "subject" } })).toMatch(
      /numérique/,
    );
  });
});

describe("tableaux de bord et envois", () => {
  it("compose un tableau par défaut selon le rôle, sans module désactivé", () => {
    const all = defaultDashboard("owner", MODULE_KEYS);
    expect(all.some((i) => i.widget === "revenue")).toBe(true);
    const noSales = defaultDashboard("owner", ["crm", "projects"]);
    expect(noSales.some((i) => i.widget === "revenue")).toBe(false);
    for (const item of all) expect(item.x + item.w).toBeLessThanOrEqual(12);
    expect(defaultDashboard("accountant", MODULE_KEYS).map((i) => i.widget)).toContain("overdue");
  });

  it("programme les envois le lundi ou le 1er, une fois par jour", () => {
    const monday = new Date("2026-09-28T06:00:00Z");
    expect(scheduleDue("weekly", null, monday, TZ)).toBe(true);
    expect(scheduleDue("weekly", new Date("2026-09-28T05:00:00Z"), monday, TZ)).toBe(false);
    expect(scheduleDue("monthly", null, monday, TZ)).toBe(false);
    expect(scheduleDue("monthly", null, new Date("2026-10-01T06:00:00Z"), TZ)).toBe(true);
  });
});

describe("accès aux listes filtrées", () => {
  it("traduit un point en filtre de liste", async () => {
    const { bucketRange, drillDownFilter, PRESET_REPORTS: presets } = await import("../analytics");
    expect(bucketRange("2026-02", "month")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(bucketRange("2026-T4", "quarter")).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(bucketRange("2026-S01", "week")).toEqual({ from: "2025-12-29", to: "2026-01-04" });
    const byCustomer = presets.find((p) => p.key === "revenue-by-customer")!.definition;
    expect(
      drillDownFilter(byCustomer, { key: "c1" }, { from: "2026-01-01", to: "2026-01-31" }),
    ).toEqual({
      combinator: "and",
      rules: [
        { field: "status", operator: "not_in", value: ["draft"] },
        { field: "issueDate", operator: "between", value: ["2026-01-01", "2026-01-31"] },
        { field: "companyId", operator: "in", value: ["c1"] },
      ],
    });
    const byMonth = presets.find((p) => p.key === "revenue-by-month")!.definition;
    expect(drillDownFilter(byMonth, { key: "2026-03" }, null)?.rules.at(-1)).toEqual({
      field: "issueDate",
      operator: "between",
      value: ["2026-03-01", "2026-03-31"],
    });
  });
});
