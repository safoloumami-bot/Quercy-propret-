import { RENOVATION_VAT_MENTION, computeTotals, lineTotalCents } from "@quercy/core";
import { describe, expect, it } from "vitest";

import { renderDocumentPdf, tradeMentions } from "../index";
import type { DocumentData } from "../types";

function quote(vatRate: number, seller: Partial<DocumentData["seller"]> = {}): DocumentData {
  const raw = [
    {
      description: "Remplacement de mitigeur",
      quantity: 1,
      unit: "flat",
      unitPriceCents: 18_000,
      discountPercent: 0,
      vatRate,
    },
  ];
  const lines = raw.map((l) => ({ ...l, totalExclCents: lineTotalCents(l) }));
  const totals = computeTotals(lines);
  return {
    kind: "QUOTE",
    number: "DV-2026-0001",
    issueDate: new Date("2026-11-02T00:00:00Z"),
    dueDate: null,
    subject: "Salle de bain",
    notes: null,
    paymentTermsDays: 30,
    currency: "EUR",
    seller: { name: "Durand Plomberie", vatExempt: false, ...seller },
    buyer: { name: "M. Martin" },
    lines,
    totals,
    paidCents: 0,
    dueCents: totals.totalCents,
  };
}

const assurance =
  "Assurance professionnelle : décennale souscrite auprès de Mutuelle Exemple, couverture : France métropolitaine.";

describe("Mentions des métiers du bâtiment", () => {
  it("imprime l'assurance décennale sur les devis et factures", () => {
    expect(tradeMentions(quote(20, { insuranceMention: assurance }))).toEqual([assurance]);
    expect(
      tradeMentions({ ...quote(20, { insuranceMention: assurance }), kind: "INVOICE" }),
    ).toEqual([assurance]);
  });

  it("ne l'imprime pas sur un bon de commande ni un avoir", () => {
    expect(tradeMentions({ ...quote(20, { insuranceMention: assurance }), kind: "ORDER" })).toEqual(
      [],
    );
    expect(
      tradeMentions({ ...quote(20, { insuranceMention: assurance }), kind: "CREDIT_NOTE" }),
    ).toEqual([]);
  });

  it("ajoute la certification TVA seulement pour une ligne à 10 % ou 5,5 %", () => {
    expect(tradeMentions(quote(10, { renovationVatMention: true }))).toEqual([
      RENOVATION_VAT_MENTION,
    ]);
    expect(tradeMentions(quote(5.5, { renovationVatMention: true }))).toEqual([
      RENOVATION_VAT_MENTION,
    ]);
    expect(tradeMentions(quote(20, { renovationVatMention: true }))).toEqual([]);
  });

  it("n'ajoute rien si l'option est désactivée ou en franchise de TVA", () => {
    expect(tradeMentions(quote(10))).toEqual([]);
    expect(tradeMentions(quote(10, { renovationVatMention: true, vatExempt: true }))).toEqual([]);
  });

  it("produit un PDF avec ces mentions", async () => {
    const bytes = await renderDocumentPdf(
      quote(10, { insuranceMention: assurance, renovationVatMention: true }),
    );
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
