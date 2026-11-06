import { describe, expect, it } from "vitest";

import {
  rentalAmountCents,
  rentalPeriods,
  rentalsOverlap,
  stockDelta,
  stockLocation,
  vehicleDues,
} from "../equipment";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("location", () => {
  it("toute période entamée est due", () => {
    expect(rentalPeriods(d("2026-10-05"), d("2026-10-05"), "day")).toBe(1);
    expect(rentalPeriods(d("2026-10-05"), d("2026-10-11"), "day")).toBe(7);
    expect(rentalPeriods(d("2026-10-05"), d("2026-10-11"), "week")).toBe(1);
    expect(rentalPeriods(d("2026-10-05"), d("2026-10-12"), "week")).toBe(2);
    expect(rentalPeriods(d("2026-10-01"), d("2026-11-05"), "month")).toBe(2);
    expect(
      rentalAmountCents({
        startDate: d("2026-10-05"),
        endDate: d("2026-10-07"),
        period: "day",
        unitPriceCents: 4500,
      }),
    ).toBe(13500);
  });

  it("chevauchement, bornes incluses", () => {
    const a = { startDate: d("2026-10-05"), endDate: d("2026-10-07") };
    expect(rentalsOverlap(a, { startDate: d("2026-10-07"), endDate: d("2026-10-09") })).toBe(true);
    expect(rentalsOverlap(a, { startDate: d("2026-10-08"), endDate: d("2026-10-09") })).toBe(false);
  });
});

describe("véhicules", () => {
  it("échéances proches, dépassées, et entretien au kilométrage", () => {
    const dues = vehicleDues(
      {
        inspectionDueDate: d("2026-10-20"),
        nextServiceDate: d("2027-03-01"),
        nextServiceMileage: 60000,
        mileage: 61200,
        insuranceDueDate: d("2026-09-30"),
        contractEndDate: null,
      },
      d("2026-10-06"),
    );
    expect(dues.map((x) => [x.key, x.overdue])).toEqual([
      ["inspection:2026-10-20", false],
      ["insurance:2026-09-30", true],
      ["service-km:60000", true],
    ]);
  });
});

describe("stock par emplacement", () => {
  it("un seul emplacement, et le signe des mouvements", () => {
    expect(stockLocation({ vehicleId: "v1" })).toEqual({ kind: "vehicle", id: "v1" });
    expect(stockLocation({})).toEqual({ kind: "none", id: null });
    expect(stockDelta({ type: "out", quantity: 3 })).toBe(-3);
    expect(stockDelta({ type: "adjust", quantity: -2 })).toBe(-2);
  });
});
