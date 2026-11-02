import { computeTotals, lineTotalCents } from "@quercy/core";
import { describe, expect, it } from "vitest";

import {
  EInvoiceParseError,
  buildFacturXml,
  einvoiceStatus,
  isFinalStatus,
  parseEInvoiceXml,
  readEInvoiceFile,
  renderDocumentPdf,
  sandboxProvider,
} from "../index";
import type { DocumentData } from "../types";

function invoice(): DocumentData {
  const lines = [
    {
      description: "Entretien des parties communes — octobre",
      quantity: 1,
      unit: "flat",
      unitPriceCents: 120_000,
      discountPercent: 0,
      vatRate: 20,
    },
  ].map((l) => ({ ...l, totalExclCents: lineTotalCents(l) }));
  const totals = computeTotals(lines);
  return {
    kind: "INVOICE",
    number: "FA-2026-0042",
    issueDate: new Date("2026-11-02T00:00:00Z"),
    dueDate: new Date("2026-12-02T00:00:00Z"),
    subject: "Entretien",
    notes: null,
    paymentTermsDays: 30,
    currency: "EUR",
    seller: {
      name: "Quercy Propreté & Fils",
      vatExempt: false,
      registration: "123 456 789 00012",
      vatNumber: "FR12123456789",
      address: "1 rue du Lot",
      city: "Cahors",
      country: "France",
    },
    buyer: { name: "Syndic Delmas", registration: "987654321", country: "France" },
    lines,
    totals,
    paidCents: 0,
    dueCents: totals.totalCents,
  };
}

describe("Facture électronique — lecture", () => {
  it("relit le XML Factur-X produit par Quercy", () => {
    const parsed = parseEInvoiceXml(buildFacturXml(invoice()));
    expect(parsed).toMatchObject({
      format: "CII",
      typeCode: "380",
      isCreditNote: false,
      number: "FA-2026-0042",
      currency: "EUR",
      seller: { name: "Quercy Propreté & Fils", siren: "123456789", vatNumber: "FR12123456789" },
      buyer: { name: "Syndic Delmas", siren: "987654321" },
      totalExclCents: 120_000,
      taxCents: 24_000,
      totalCents: 144_000,
      dueCents: 144_000,
    });
    expect(parsed.issueDate?.toISOString().slice(0, 10)).toBe("2026-11-02");
  });

  it("extrait le XML d'un PDF Factur-X", async () => {
    const pdf = await renderDocumentPdf(invoice(), { facturX: true });
    const xml = await readEInvoiceFile(pdf);
    expect(parseEInvoiceXml(xml).number).toBe("FA-2026-0042");
  });

  it("refuse un PDF ordinaire et un fichier qui n'est pas une facture", async () => {
    const pdf = await renderDocumentPdf({ ...invoice(), kind: "QUOTE" }, { facturX: false });
    await expect(readEInvoiceFile(pdf)).rejects.toBeInstanceOf(EInvoiceParseError);
    expect(() => parseEInvoiceXml("<html></html>")).toThrow(EInvoiceParseError);
  });

  it("lit une facture UBL", () => {
    const ubl = `<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cbc="urn:cbc" xmlns:cac="urn:cac">
  <cbc:ID>F-778</cbc:ID>
  <cbc:IssueDate>2026-10-15</cbc:IssueDate>
  <cbc:DueDate>2026-11-14</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyTaxScheme><cbc:CompanyID>FR55552222333</cbc:CompanyID></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>Produits d'Entretien du Sud</cbc:RegistrationName><cbc:CompanyID>552222333</cbc:CompanyID></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyLegalEntity><cbc:RegistrationName>Quercy Propreté</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="EUR">50.00</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="EUR">250.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">300.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">300.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
    expect(parseEInvoiceXml(ubl)).toMatchObject({
      format: "UBL",
      number: "F-778",
      seller: {
        name: "Produits d'Entretien du Sud",
        siren: "552222333",
        vatNumber: "FR55552222333",
      },
      totalExclCents: 25_000,
      taxCents: 5_000,
      totalCents: 30_000,
    });
  });
});

describe("Facture électronique — cycle de vie", () => {
  it("statuts obligatoires présents, finaux reconnus", () => {
    for (const key of ["deposited", "rejected", "refused", "cashed"]) {
      expect(einvoiceStatus(key).key).toBe(key);
    }
    expect(isFinalStatus("cashed")).toBe(true);
    expect(isFinalStatus("deposited")).toBe(false);
  });

  it("le bac à sable avance d'un statut par jour, sans revenir en arrière", async () => {
    const sentAt = new Date("2026-11-01T10:00:00Z");
    const [day0] = await sandboxProvider.statuses(
      [{ ref: "r", status: "deposited", sentAt }],
      new Date("2026-11-01T12:00:00Z"),
    );
    const [day2] = await sandboxProvider.statuses(
      [{ ref: "r", status: "deposited", sentAt }],
      new Date("2026-11-03T12:00:00Z"),
    );
    const [late] = await sandboxProvider.statuses(
      [{ ref: "r", status: "made_available", sentAt }],
      new Date("2026-11-02T12:00:00Z"),
    );
    expect(day0?.status).toBe("deposited");
    expect(day2?.status).toBe("received");
    expect(late?.status).toBe("made_available");
  });
});
