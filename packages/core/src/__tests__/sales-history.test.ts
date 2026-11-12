import { describe, expect, it } from "vitest";

import {
  guessHistoryMapping,
  normalizeHistoryRows,
  parseAmountCents,
  parseHistoryDate,
  parseVatRate,
  sebtSequence,
} from "../sales-history";

describe("parseAmountCents", () => {
  it("lit les formats français et anglais", () => {
    expect(parseAmountCents("1 234,56 €")).toBe(123456);
    expect(parseAmountCents("1.234,56")).toBe(123456);
    expect(parseAmountCents("1,234.56")).toBe(123456);
    expect(parseAmountCents("1234.5")).toBe(123450);
    expect(parseAmountCents("-45")).toBe(-4500);
    expect(parseAmountCents("(45,00)")).toBe(-4500);
    expect(parseAmountCents("1 000")).toBe(100000);
  });
  it("refuse ce qui n'est pas un montant", () => {
    expect(parseAmountCents("")).toBeNull();
    expect(parseAmountCents("abc")).toBeNull();
  });
});

describe("parseHistoryDate", () => {
  it("lit jj/mm/aaaa, AAAA-MM-JJ et les numéros Excel", () => {
    expect(parseHistoryDate("05/03/2025")).toBe("2025-03-05");
    expect(parseHistoryDate("5-3-25")).toBe("2025-03-05");
    expect(parseHistoryDate("2025-03-05T00:00:00Z")).toBe("2025-03-05");
    expect(parseHistoryDate("45721")).toBe("2025-03-05");
  });
  it("refuse une date impossible", () => {
    expect(parseHistoryDate("31/02/2025")).toBeNull();
  });
});

describe("parseVatRate", () => {
  it("accepte 20, 20 %, 0,2 et 5,5%", () => {
    expect(parseVatRate("20")).toBe(20);
    expect(parseVatRate("20 %")).toBe(20);
    expect(parseVatRate("0,2")).toBe(20);
    expect(parseVatRate("5,5%")).toBe(5.5);
  });
});

describe("guessHistoryMapping", () => {
  it("reconnaît un export de logiciel de facturation", () => {
    const headers = [
      "N° facture",
      "Date de facture",
      "Raison sociale",
      "N° TVA intracommunautaire",
      "Total HT (€)",
      "TVA",
      "Total TTC",
      "Reste à payer",
      "Statut",
    ];
    expect(guessHistoryMapping(headers, "INVOICE")).toEqual({
      0: "number",
      1: "issueDate",
      2: "client",
      4: "totalExcl",
      5: "tax",
      6: "total",
      7: "due",
      8: "status",
    });
  });
  it("propose la facture d'origine pour un avoir", () => {
    const mapping = guessHistoryMapping(
      ["Numéro", "Date", "Client", "Facture", "Montant TTC"],
      "CREDIT_NOTE",
    );
    expect(mapping[3]).toBe("invoiceNumber");
    expect(mapping[4]).toBe("total");
  });
});

describe("normalizeHistoryRows", () => {
  it("recalcule le montant manquant et déduit le taux", () => {
    const { rows, errors } = normalizeHistoryRows("INVOICE", [
      {
        number: "F-001",
        issueDate: "02/01/2025",
        client: "Dupont",
        totalExcl: "100",
        total: "120",
        status: "Payée",
      },
    ]);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      taxCents: 2000,
      totalCents: 12000,
      vatRate: 20,
      paidCents: 12000,
    });
  });
  it("prend les avoirs négatifs en valeur absolue", () => {
    const { rows } = normalizeHistoryRows("CREDIT_NOTE", [
      {
        number: "AV-1",
        issueDate: "2025-02-01",
        client: "Dupont",
        total: "-60",
        tax: "-10",
        invoiceNumber: "F-001",
      },
    ]);
    expect(rows[0]).toMatchObject({
      totalExclCents: 5000,
      totalCents: 6000,
      invoiceNumber: "F-001",
    });
  });
  it("signale les montants incomplets, les doublons et ignore les lignes vides et de total", () => {
    const { rows, errors } = normalizeHistoryRows("INVOICE", [
      { number: "F-1", issueDate: "01/01/2025", client: "A", total: "120" },
      { number: "F-2", issueDate: "01/01/2025", client: "A", totalExcl: "10", tax: "2" },
      { number: "F-2", issueDate: "01/01/2025", client: "A", totalExcl: "10", tax: "2" },
      { number: "", issueDate: "", client: "" },
      { number: "", client: "Total", total: "999" },
    ]);
    expect(rows.map((r) => r.number)).toEqual(["F-2"]);
    expect(errors.map((e) => e.row)).toEqual([0, 2]);
  });
  it("reste à payer → montant déjà payé", () => {
    const { rows } = normalizeHistoryRows("INVOICE", [
      {
        number: "F-3",
        issueDate: "01/01/2025",
        client: "A",
        totalExcl: "100",
        tax: "20",
        due: "20",
      },
    ]);
    expect(rows[0]!.paidCents).toBe(10000);
  });
  it("lit le statut d'un devis", () => {
    const { rows } = normalizeHistoryRows("QUOTE", [
      {
        number: "D-1",
        issueDate: "01/01/2025",
        client: "A",
        totalExcl: "1",
        tax: "0",
        status: "Signé",
      },
      {
        number: "D-2",
        issueDate: "01/01/2025",
        client: "A",
        totalExcl: "1",
        tax: "0",
        status: "Perdu",
      },
    ]);
    expect(rows.map((r) => r.quoteStatus)).toEqual(["accepted", "declined"]);
  });
});

describe("sebtSequence", () => {
  it("lit la séquence d'un numéro au format sebt", () => {
    expect(sebtSequence("FA-2025-0042", "FA")).toEqual({ year: 2025, sequence: 42 });
    expect(sebtSequence("F2025-42", "FA")).toBeNull();
  });
});
