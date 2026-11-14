import { describe, expect, it } from "vitest";

import { FEC_COLUMNS, buildFec } from "../index";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("FEC", () => {
  const fec = buildFec({
    sales: [
      {
        kind: "INVOICE",
        number: "FA-2026-0001",
        issueDate: d("2026-03-02"),
        customerId: "cmcompany0001",
        customerName: "Dupont\tRénovation",
        totalExclCents: 100_000,
        taxCents: 20_000,
        totalCents: 120_000,
      },
      {
        kind: "CREDIT_NOTE",
        number: "AV-2026-0001",
        issueDate: d("2026-03-10"),
        customerId: "cmcompany0001",
        customerName: "Dupont Rénovation",
        totalExclCents: 10_000,
        taxCents: 2_000,
        totalCents: 12_000,
      },
    ],
    purchases: [
      {
        id: "cmbill000001",
        number: "F-88",
        issueDate: d("2026-03-05"),
        supplierId: "cmsupplier01",
        supplierName: "Hygiène Pro",
        totalExclCents: 5_000,
        vatCents: 1_000,
        totalCents: 6_000,
      },
    ],
    payments: [
      {
        date: d("2026-03-20"),
        amountCents: 108_000,
        documentNumber: "FA-2026-0001",
        customerId: "cmcompany0001",
        customerName: "Dupont Rénovation",
        method: "transfer",
      },
    ],
  });
  const rows = fec
    .replace(/\r\n$/, "")
    .split("\r\n")
    .map((l) => l.split("\t"));
  const col = (name: (typeof FEC_COLUMNS)[number]) => FEC_COLUMNS.indexOf(name);
  const cents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100);

  it("a l'en-tête réglementaire et 18 colonnes par ligne", () => {
    expect(rows[0]).toEqual([...FEC_COLUMNS]);
    expect(rows.every((r) => r.length === 18)).toBe(true);
  });

  it("équilibre chaque écriture (débit = crédit)", () => {
    const byNum = new Map<string, number>();
    for (const r of rows.slice(1))
      byNum.set(
        r[col("EcritureNum")]!,
        (byNum.get(r[col("EcritureNum")]!) ?? 0) +
          cents(r[col("Debit")]!) -
          cents(r[col("Credit")]!),
      );
    expect(byNum.size).toBe(4);
    expect([...byNum.values()].every((v) => v === 0)).toBe(true);
  });

  it("passe la facture au débit client et l'avoir au crédit, sans tabulation parasite", () => {
    const invoice = rows.find(
      (r) => r[col("PieceRef")] === "FA-2026-0001" && r[col("CompteNum")] === "411000",
    )!;
    expect(invoice[col("Debit")]).toBe("1200,00");
    expect(invoice[col("CompAuxLib")]).toBe("Dupont Rénovation");
    expect(invoice[col("EcritureDate")]).toBe("20260302");
    const credit = rows.find(
      (r) => r[col("PieceRef")] === "AV-2026-0001" && r[col("CompteNum")] === "411000",
    )!;
    expect(credit[col("Credit")]).toBe("120,00");
  });
});
