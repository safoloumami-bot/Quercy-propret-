import { describe, expect, it } from "vitest";

import {
  type FinanceVisit,
  contractRevenueCents,
  extraRevenueCents,
  financeRange,
  laborCostCents,
  marginOf,
  monthsBetween,
  prorateMonthly,
} from "../finance";

const v = (over: Partial<FinanceVisit>): FinanceVisit => ({
  status: "done",
  month: "2026-09",
  contractId: "c1",
  extraPriceCents: null,
  extraStatus: null,
  ...over,
});

describe("pilotage financier", () => {
  it("forfait au prorata des passages, mois par mois ; au passage : réalisés × prix", () => {
    const monthly = {
      id: "c1",
      kind: "recurring",
      billingMode: "monthly",
      monthlyPriceCents: 40_000,
      visitPriceCents: null,
    };
    const visits = [
      v({}),
      v({}),
      v({ status: "missed" }),
      v({}),
      v({ status: "cancelled" }),
      v({ month: "2026-10" }),
      v({ month: "2026-10", status: "planned" }),
    ];
    expect(contractRevenueCents(monthly, visits)).toBe(30_000 + 40_000);
    expect(
      contractRevenueCents(
        { ...monthly, billingMode: "per_visit", visitPriceCents: 5_000 },
        visits,
      ),
    ).toBe(20_000);
    expect(extraRevenueCents(v({ extraPriceCents: 9_000, extraStatus: "approved" }))).toBe(9_000);
    expect(extraRevenueCents(v({ extraPriceCents: 9_000, extraStatus: "pending" }))).toBe(0);
  });

  it("coûts et marge", () => {
    expect(laborCostCents(90, 2_200)).toBe(3_300);
    expect(prorateMonthly(30_437, new Date("2026-09-01"), new Date("2026-09-30"))).toBe(30_000);
    expect(marginOf({ revenueCents: 10_000, costCents: 7_500 })).toEqual({
      marginCents: 2_500,
      marginPct: 25,
    });
    expect(marginOf({ revenueCents: 0, costCents: 100 }).marginPct).toBeNull();
  });

  it("périodes", () => {
    const today = new Date("2026-10-06T00:00:00Z");
    const q = financeRange("quarter", today);
    expect([q.from.toISOString().slice(0, 10), q.to.toISOString().slice(0, 10)]).toEqual([
      "2026-08-01",
      "2026-10-31",
    ]);
    expect(monthsBetween(q.from, q.to)).toEqual(["2026-08", "2026-09", "2026-10"]);
    const last = financeRange("last_month", new Date("2026-01-15T00:00:00Z"));
    expect(last.from.toISOString().slice(0, 10)).toBe("2025-12-01");
    expect(financeRange("12m", today).from.toISOString().slice(0, 10)).toBe("2025-11-01");
  });
});
