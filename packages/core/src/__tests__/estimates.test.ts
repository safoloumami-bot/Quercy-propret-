import { describe, expect, it } from "vitest";

import {
  type BillableVisit,
  billingLines,
  computeEstimate,
  marginPctOf,
  priceForMargin,
  visitsPerMonthOf,
} from "../estimates";

const empty = {
  people: 0,
  hoursPerPerson: 0,
  hourlyCostCents: 0,
  km: 0,
  kmCostCents: 0,
  travelMinutes: 0,
  productsCents: 0,
  equipmentCents: 0,
  rentalCents: 0,
  subcontractCents: 0,
  otherCents: 0,
  targetMarginPct: 30,
};

describe("chiffrage", () => {
  it("prix de vente = coût / (1 − marge) : 190 € à 32 % → 279,41 € HT", () => {
    expect(priceForMargin(19_000, 32)).toBe(27_941);
    expect(marginPctOf(27_941, 19_000)).toBe(32);
  });

  it("coût de revient : main-d'œuvre, trajet, fournitures, sous-traitance, autres", () => {
    const r = computeEstimate(
      {
        ...empty,
        people: 2,
        hoursPerPerson: 3,
        hourlyCostCents: 2_200,
        km: 30,
        kmCostCents: 50,
        travelMinutes: 30,
        productsCents: 800,
        equipmentCents: 500,
        rentalCents: 0,
        subcontractCents: 0,
        otherCents: 300,
        targetMarginPct: 32,
        visitsPerMonth: 4,
      },
      20,
    );
    // 2 × 3 h × 22 € = 132 € ; trajet 30 km × 0,50 + 2 × 0,5 h × 22 = 37 € ; 13 € ; 3 €.
    expect(r).toMatchObject({
      laborCents: 13_200,
      travelCents: 3_700,
      suppliesCents: 1_300,
      otherCents: 300,
      costCents: 18_500,
      minPriceCents: 23_125,
      advisedPriceCents: 27_206,
      priceCents: 27_206,
      monthlyPriceCents: 108_824,
      belowMinimum: false,
    });
  });

  it("un prix retenu sous la marge minimale demande la validation du patron", () => {
    const r = computeEstimate(
      { ...empty, otherCents: 19_000, targetMarginPct: 32, priceCents: 21_000 },
      20,
    );
    expect(r.marginPct).toBe(9.52);
    expect(r.belowMinimum).toBe(true);
    expect(computeEstimate({ ...empty }, 20).belowMinimum).toBe(false);
  });

  it("passages par mois depuis les jours de la semaine", () => {
    expect(visitsPerMonthOf(["mon", "thu"])).toBe(8.67);
    expect(visitsPerMonthOf([])).toBe(0);
  });
});

describe("facturation récurrente", () => {
  const visit = (over: Partial<BillableVisit>): BillableVisit => ({
    title: "Entretien",
    date: new Date("2026-10-05T00:00:00Z"),
    siteId: "s1",
    siteName: "Résidence Les Tilleuls",
    serviceLineId: null,
    serviceLineName: null,
    status: "done",
    extraPriceCents: null,
    extraStatus: null,
    contractId: "c1",
    ...over,
  });

  it("forfait : manqués déduits au prorata ; au passage : réalisés × prix ; extras validés", () => {
    const lines = billingLines(
      [
        {
          id: "c1",
          name: "Entretien",
          billingMode: "monthly",
          monthlyPriceCents: 40_000,
          visitPriceCents: null,
        },
        {
          id: "c2",
          name: "Vitres",
          billingMode: "per_visit",
          monthlyPriceCents: null,
          visitPriceCents: 6_000,
        },
      ],
      [
        visit({}),
        visit({}),
        visit({ status: "missed" }),
        visit({}),
        visit({ status: "cancelled" }),
        visit({ contractId: "c2", siteName: "Résidence Les Tilleuls", serviceLineName: "Cage B" }),
        visit({ contractId: "c2", serviceLineName: "Cage A" }),
        visit({ contractId: "c2", serviceLineName: "Cage A", status: "missed" }),
        visit({
          contractId: null,
          title: "Vitrerie extra",
          extraPriceCents: 9_000,
          extraStatus: "approved",
        }),
        visit({ contractId: null, extraPriceCents: 5_000, extraStatus: "pending" }),
      ],
      "octobre 2026",
    );
    expect(lines.map((l) => [l.description, l.quantity, l.unitPriceCents])).toEqual([
      ["Entretien — forfait octobre 2026", 1, 40_000],
      ["Entretien — passage non réalisé (1 sur 4) déduit", 1, -10_000],
      ["Supplément du 05/10/2026 — Vitrerie extra", 1, 9_000],
      ["Vitres — Résidence Les Tilleuls — Cage A : passages réalisés en octobre 2026", 1, 6_000],
      ["Vitres — Résidence Les Tilleuls — Cage B : passages réalisés en octobre 2026", 1, 6_000],
    ]);
  });
});
