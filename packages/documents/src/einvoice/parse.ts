/**
 * Lecture d'une facture électronique reçue : XML CII (Factur-X, profils MINIMUM à EXTENDED)
 * ou UBL 2.1. On n'extrait que ce qu'il faut pour créer la facture fournisseur.
 */
export interface ParsedEInvoice {
  format: "CII" | "UBL";
  /** 380 facture, 381 avoir, 384 facture rectificative, 386 acompte… */
  typeCode: string;
  isCreditNote: boolean;
  number: string;
  issueDate: Date | null;
  dueDate: Date | null;
  currency: string;
  seller: { name: string; siren: string | null; vatNumber: string | null };
  buyer: { name: string; siren: string | null; vatNumber: string | null };
  totalExclCents: number;
  taxCents: number;
  totalCents: number;
  dueCents: number;
}

export class EInvoiceParseError extends Error {}

const unescape = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

/** Contenu du premier élément `local` (préfixe d'espace de noms quelconque) dans `xml`. */
function block(xml: string, local: string): string | null {
  const re = new RegExp(
    `<(?:[\\w.-]+:)?${local}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${local}>`,
  );
  return re.exec(xml)?.[1] ?? null;
}

function text(xml: string | null, ...path: string[]): string | null {
  let current: string | null = xml;
  for (const p of path) {
    if (current === null) return null;
    current = block(current, p);
  }
  return current === null ? null : unescape(current.replace(/<[^>]+>/g, ""));
}

/** Valeur d'un identifiant dont l'attribut schemeID vaut `scheme`. */
function schemeId(xml: string | null, local: string, scheme: string): string | null {
  if (!xml) return null;
  const re = new RegExp(
    `<(?:[\\w.-]+:)?${local}[^>]*schemeID="${scheme}"[^>]*>([^<]*)</(?:[\\w.-]+:)?${local}>`,
  );
  const m = re.exec(xml);
  return m ? unescape(m[1]!) : null;
}

function cents(value: string | null): number {
  if (!value) return 0;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Date CII au format 102 (AAAAMMJJ) ou ISO (UBL). */
function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const v = value.trim();
  const m102 = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  const m = m102 ?? iso;
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

const sirenOf = (id: string | null) => {
  const digits = (id ?? "").replace(/\s/g, "");
  return /^\d{9,14}$/.test(digits) ? digits.slice(0, 9) : null;
};

function parseCii(xml: string): ParsedEInvoice {
  const doc = block(xml, "ExchangedDocument") ?? "";
  const agreement = block(xml, "ApplicableHeaderTradeAgreement") ?? "";
  const settlement = block(xml, "ApplicableHeaderTradeSettlement") ?? "";
  const sums = block(settlement, "SpecifiedTradeSettlementHeaderMonetarySummation") ?? "";
  const party = (tag: string) => {
    const p = block(agreement, tag);
    const legal = block(p ?? "", "SpecifiedLegalOrganization");
    return {
      name: text(p, "Name") ?? "",
      siren: sirenOf(schemeId(legal, "ID", "0002") ?? text(legal, "ID")),
      vatNumber: schemeId(p, "ID", "VA"),
    };
  };
  const typeCode = text(doc, "TypeCode") ?? "380";
  const total = cents(text(sums, "GrandTotalAmount"));
  return {
    format: "CII",
    typeCode,
    isCreditNote: typeCode === "381",
    number: text(doc, "ID") ?? "",
    issueDate: parseDate(text(doc, "IssueDateTime", "DateTimeString")),
    dueDate: parseDate(
      text(block(settlement, "SpecifiedTradePaymentTerms"), "DueDateDateTime", "DateTimeString"),
    ),
    currency: text(settlement, "InvoiceCurrencyCode") ?? "EUR",
    seller: party("SellerTradeParty"),
    buyer: party("BuyerTradeParty"),
    totalExclCents: cents(text(sums, "TaxBasisTotalAmount")),
    taxCents: cents(text(sums, "TaxTotalAmount")),
    totalCents: total,
    dueCents: text(sums, "DuePayableAmount") ? cents(text(sums, "DuePayableAmount")) : total,
  };
}

function parseUbl(xml: string, creditNote: boolean): ParsedEInvoice {
  const party = (tag: string) => {
    const p = block(xml, tag);
    const legal = block(p ?? "", "PartyLegalEntity");
    return {
      name: text(legal, "RegistrationName") ?? text(p, "PartyName", "Name") ?? "",
      siren: sirenOf(text(legal, "CompanyID")),
      vatNumber: text(block(p ?? "", "PartyTaxScheme"), "CompanyID"),
    };
  };
  const totals = block(xml, "LegalMonetaryTotal") ?? "";
  const total = cents(text(totals, "TaxInclusiveAmount"));
  const typeCode =
    text(xml, creditNote ? "CreditNoteTypeCode" : "InvoiceTypeCode") ??
    (creditNote ? "381" : "380");
  // Les identifiants d'en-tête (ID, IssueDate) précèdent les blocs « cac: ».
  const header = xml.split(/<(?:[\w.-]+:)?AccountingSupplierParty/)[0] ?? xml;
  return {
    format: "UBL",
    typeCode,
    isCreditNote: creditNote || typeCode === "381",
    number: text(header, "ID") ?? "",
    issueDate: parseDate(text(header, "IssueDate")),
    dueDate: parseDate(
      text(header, "DueDate") ?? text(block(xml, "PaymentMeans"), "PaymentDueDate"),
    ),
    currency: text(header, "DocumentCurrencyCode") ?? "EUR",
    seller: party("AccountingSupplierParty"),
    buyer: party("AccountingCustomerParty"),
    totalExclCents: cents(text(totals, "TaxExclusiveAmount")),
    taxCents: cents(text(block(xml, "TaxTotal"), "TaxAmount")),
    totalCents: total,
    dueCents: text(totals, "PayableAmount") ? cents(text(totals, "PayableAmount")) : total,
  };
}

export function parseEInvoiceXml(xml: string): ParsedEInvoice {
  const head = xml.slice(0, 2000);
  let parsed: ParsedEInvoice;
  if (/CrossIndustryInvoice/.test(head)) parsed = parseCii(xml);
  else if (/<(?:[\w.-]+:)?Invoice[\s>]/.test(head)) parsed = parseUbl(xml, false);
  else if (/<(?:[\w.-]+:)?CreditNote[\s>]/.test(head)) parsed = parseUbl(xml, true);
  else throw new EInvoiceParseError("Ce fichier n'est pas une facture électronique (CII ou UBL).");
  if (!parsed.number)
    throw new EInvoiceParseError("Numéro de facture introuvable dans le fichier.");
  if (!parsed.seller.name) throw new EInvoiceParseError("Fournisseur introuvable dans le fichier.");
  return parsed;
}
