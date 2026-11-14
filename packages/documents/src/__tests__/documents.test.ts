import { computeTotals, lineTotalCents } from "@quercy/core";
import { PDFDocument, PDFName } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { buildFacturXml, renderDocumentPdf } from "../index";
import type { DocumentData } from "../types";

const rawLines = [
  {
    description: "Nettoyage bureaux — forfait mensuel\nPassage 3 fois par semaine",
    quantity: 1,
    unit: "flat",
    unitPriceCents: 125_000,
    discountPercent: 0,
    vatRate: 20,
  },
  {
    description: "Vitrerie & façades (accès nacelle)",
    quantity: 4.5,
    unit: "hour",
    unitPriceCents: 4_500,
    discountPercent: 10,
    vatRate: 20,
  },
  {
    description: "Produits d'entretien écolabellisés",
    quantity: 3,
    unit: "unit",
    unitPriceCents: 1_990,
    discountPercent: 0,
    vatRate: 5.5,
  },
];
const lines = rawLines.map((l) => ({ ...l, totalExclCents: lineTotalCents(l) }));
const totals = computeTotals(lines);

const invoice: DocumentData = {
  kind: "INVOICE",
  number: "FA-2026-0042",
  issueDate: new Date("2026-09-01T00:00:00Z"),
  dueDate: new Date("2026-10-01T00:00:00Z"),
  subject: "Prestations de septembre <site Cahors & Figeac>",
  notes: "Merci de rappeler le numéro de facture dans votre virement.",
  paymentTermsDays: 30,
  currency: "EUR",
  seller: {
    name: "Quercy Propreté",
    address: "12 rue Nationale",
    postalCode: "46000",
    city: "Cahors",
    country: "France",
    registration: "123 456 789 00012",
    vatNumber: "FR12123456789",
    email: "compta@quercy-proprete.fr",
    iban: "FR76 3000 6000 0112 3456 7890 189",
    bic: "AGRIFRPP",
    vatExempt: false,
    footer: "SAS au capital de 10 000 € — RCS Cahors 123 456 789",
  },
  buyer: {
    name: "Mairie de Figeac",
    address: "Place Vival",
    postalCode: "46100",
    city: "Figeac",
    country: "France",
  },
  lines,
  totals,
  paidCents: 50_000,
  dueCents: totals.totalCents - 50_000,
};

describe("Factur-X", () => {
  it("produit un XML CII BASIC cohérent et échappé", () => {
    const xml = buildFacturXml(invoice);
    expect(xml).toContain("<ram:TypeCode>380</ram:TypeCode>");
    expect(xml).toContain("urn:factur-x.eu:1p0:basic");
    expect(xml).toContain(
      `<ram:GrandTotalAmount>${(totals.totalCents / 100).toFixed(2)}</ram:GrandTotalAmount>`,
    );
    expect(xml).toContain("<ram:DuePayableAmount>");
    expect(xml).toContain("Vitrerie &amp; façades");
    expect(xml.match(/<ram:IncludedSupplyChainTradeLineItem>/g)).toHaveLength(3);
    expect(xml).toContain("<ram:IBANID>FR7630006000011234567890189</ram:IBANID>");
  });

  it("refuse un brouillon (sans numéro)", () => {
    expect(() => buildFacturXml({ ...invoice, number: null })).toThrow();
  });
});

describe("PDF", () => {
  it("génère un PDF lisible avec le XML Factur-X joint", async () => {
    const bytes = await renderDocumentPdf(invoice, { facturX: true });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe("Facture FA-2026-0042");
    const names = pdf.catalog.lookup(PDFName.of("Names"));
    expect(names).toBeDefined();
    expect(Buffer.from(bytes).includes(Buffer.from("factur-x.xml"))).toBe(true);
  });

  it("pagine les longs documents", async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      ...lines[1]!,
      description: `Intervention n° ${i + 1}`,
    }));
    const bytes = await renderDocumentPdf({ ...invoice, kind: "QUOTE", lines: many });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
