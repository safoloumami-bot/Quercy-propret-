import { describe, expect, it } from "vitest";

import {
  computeTotals,
  documentLineSchema,
  formatDocumentNumber,
  invoiceStatus,
  lineTotalCents,
  nextRunDate,
  reminderDue,
} from "../sales";

describe("totaux des documents", () => {
  it("calcule le HT d'une ligne avec remise, arrondi au centime", () => {
    expect(lineTotalCents({ quantity: 3, unitPriceCents: 1999, discountPercent: 10 })).toBe(5397);
    expect(lineTotalCents({ quantity: 1.5, unitPriceCents: 4500 })).toBe(6750);
  });

  it("ventile la TVA par taux, sur la somme des bases", () => {
    const totals = computeTotals([
      { quantity: 1, unitPriceCents: 10_000, vatRate: 20 },
      { quantity: 2, unitPriceCents: 3_333, vatRate: 20 },
      { quantity: 1, unitPriceCents: 5_000, vatRate: 5.5 },
    ]);
    expect(totals.totalExclCents).toBe(21_666);
    expect(totals.vat).toEqual([
      { rate: 20, baseCents: 16_666, taxCents: 3_333 },
      { rate: 5.5, baseCents: 5_000, taxCents: 275 },
    ]);
    expect(totals.taxCents).toBe(3_608);
    expect(totals.totalCents).toBe(25_274);
  });

  it("ne facture pas de TVA en franchise", () => {
    const totals = computeTotals([{ quantity: 2, unitPriceCents: 5_000, vatRate: 20 }], {
      vatExempt: true,
    });
    expect(totals.taxCents).toBe(0);
    expect(totals.totalCents).toBe(10_000);
  });

  it("refuse une ligne sans désignation ou de quantité nulle", () => {
    expect(
      documentLineSchema.safeParse({ description: "", quantity: 1, unitPriceCents: 0, vatRate: 20 })
        .success,
    ).toBe(false);
    expect(
      documentLineSchema.safeParse({
        description: "x",
        quantity: 0,
        unitPriceCents: 0,
        vatRate: 20,
      }).success,
    ).toBe(false);
  });
});

describe("numérotation, échéances et relances", () => {
  it("formate un numéro continu par année", () => {
    expect(formatDocumentNumber("FA", 2026, 42)).toBe("FA-2026-0042");
  });

  it("calcule la prochaine facture récurrente en restant dans le mois", () => {
    expect(nextRunDate(new Date("2026-01-31T00:00:00Z"), "monthly").toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
    expect(nextRunDate(new Date("2026-03-15T00:00:00Z"), "quarterly").toISOString()).toBe(
      "2026-06-15T00:00:00.000Z",
    );
    expect(nextRunDate(new Date("2026-03-15T00:00:00Z"), "yearly").toISOString()).toBe(
      "2027-03-15T00:00:00.000Z",
    );
  });

  it("détermine le statut d'une facture émise", () => {
    const now = new Date("2026-06-20T10:00:00Z");
    const due = new Date("2026-06-15T00:00:00Z");
    expect(invoiceStatus({ totalCents: 1000, paidCents: 0, dueDate: due }, now)).toBe("overdue");
    expect(invoiceStatus({ totalCents: 1000, paidCents: 400, dueDate: null }, now)).toBe("partial");
    expect(invoiceStatus({ totalCents: 1000, paidCents: 1000, dueDate: due }, now)).toBe("paid");
    expect(
      invoiceStatus({ totalCents: 1000, paidCents: 0, creditedCents: 1000, dueDate: due }, now),
    ).toBe("credited");
    expect(
      invoiceStatus({ totalCents: 1000, paidCents: 600, creditedCents: 400, dueDate: due }, now),
    ).toBe("paid");
  });

  it("déclenche une relance par palier, jamais deux fois le même jour", () => {
    const invoice = {
      dueDate: new Date("2026-06-01T00:00:00Z"),
      reminderCount: 0,
      lastReminderAt: null,
    };
    expect(reminderDue(invoice, [7, 15, 30], new Date("2026-06-05T09:00:00Z"))).toBe(false);
    expect(reminderDue(invoice, [7, 15, 30], new Date("2026-06-08T09:00:00Z"))).toBe(true);
    expect(
      reminderDue(
        { ...invoice, reminderCount: 1, lastReminderAt: new Date("2026-06-08T09:00:00Z") },
        [7, 15, 30],
        new Date("2026-06-10T09:00:00Z"),
      ),
    ).toBe(false);
    expect(
      reminderDue(
        { ...invoice, reminderCount: 3, lastReminderAt: null },
        [7, 15, 30],
        new Date("2026-09-01"),
      ),
    ).toBe(false);
  });
});
