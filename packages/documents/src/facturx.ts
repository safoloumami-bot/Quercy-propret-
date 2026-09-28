import type { DocumentData } from "./types";

/** Profil Factur-X produit : BASIC (en-tête, lignes, TVA, totaux). */
export const FACTURX_PROFILE = "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic";
export const FACTURX_FILENAME = "factur-x.xml";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Date au format 102 (AAAAMMJJ). */
function date102(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

function amount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Code pays ISO 3166-1 alpha-2 à partir du nom saisi (France par défaut). */
export function countryCode(country: string | null | undefined): string {
  const c = (country ?? "").trim().toLowerCase();
  const known: Record<string, string> = {
    france: "FR",
    belgique: "BE",
    suisse: "CH",
    luxembourg: "LU",
    allemagne: "DE",
    espagne: "ES",
    italie: "IT",
    "royaume-uni": "GB",
    canada: "CA",
  };
  if (/^[a-z]{2}$/.test(c)) return c.toUpperCase();
  return known[c] ?? "FR";
}

/** Catégorie de TVA EN16931 : S (taux normal), Z (taux zéro), E (exonération). */
function vatCategory(rate: number, exempt: boolean): string {
  if (exempt) return "E";
  return rate === 0 ? "Z" : "S";
}

function party(tag: string, p: DocumentData["seller"] | DocumentData["buyer"], seller: boolean) {
  const vat = p.vatNumber
    ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(p.vatNumber)}</ram:ID></ram:SpecifiedTaxRegistration>`
    : "";
  const legal = p.registration
    ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(p.registration.replace(/\s/g, "").slice(0, 9))}</ram:ID></ram:SpecifiedLegalOrganization>`
    : "";
  return (
    `<ram:${tag}>` +
    `<ram:Name>${esc(p.name)}</ram:Name>` +
    legal +
    `<ram:PostalTradeAddress>` +
    (p.postalCode ? `<ram:PostcodeCode>${esc(p.postalCode)}</ram:PostcodeCode>` : "") +
    (p.address ? `<ram:LineOne>${esc(p.address)}</ram:LineOne>` : "") +
    (p.city ? `<ram:CityName>${esc(p.city)}</ram:CityName>` : "") +
    `<ram:CountryID>${countryCode(p.country)}</ram:CountryID>` +
    `</ram:PostalTradeAddress>` +
    (seller && p.email
      ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(p.email)}</ram:URIID></ram:URIUniversalCommunication>`
      : "") +
    vat +
    `</ram:${tag}>`
  );
}

/**
 * XML Cross Industry Invoice (CII D16B) au profil Factur-X BASIC, pour une facture (380) ou un
 * avoir (381). Les montants de l'avoir sont exprimés en positif, comme l'exige la norme.
 */
export function buildFacturXml(doc: DocumentData): string {
  if (doc.kind !== "INVOICE" && doc.kind !== "CREDIT_NOTE")
    throw new Error("Factur-X ne concerne que les factures et les avoirs.");
  if (!doc.number || !doc.issueDate)
    throw new Error("Document non émis : numéro ou date manquant.");
  const exempt = doc.seller.vatExempt;
  const typeCode = doc.kind === "INVOICE" ? "380" : "381";

  const lines = doc.lines
    .map(
      (line, index) =>
        `<ram:IncludedSupplyChainTradeLineItem>` +
        `<ram:AssociatedDocumentLineDocument><ram:LineID>${index + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>` +
        `<ram:SpecifiedTradeProduct><ram:Name>${esc(line.description.split("\n")[0]!.slice(0, 200))}</ram:Name></ram:SpecifiedTradeProduct>` +
        `<ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${amount(
          Math.round(line.unitPriceCents * (1 - line.discountPercent / 100)),
        )}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>` +
        `<ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">${line.quantity}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>` +
        `<ram:SpecifiedLineTradeSettlement>` +
        `<ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${vatCategory(
          line.vatRate,
          exempt,
        )}</ram:CategoryCode><ram:RateApplicablePercent>${exempt ? 0 : line.vatRate}</ram:RateApplicablePercent></ram:ApplicableTradeTax>` +
        `<ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${amount(
          line.totalExclCents,
        )}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>` +
        `</ram:SpecifiedLineTradeSettlement>` +
        `</ram:IncludedSupplyChainTradeLineItem>`,
    )
    .join("");

  const taxes = doc.totals.vat
    .map(
      (v) =>
        `<ram:ApplicableTradeTax>` +
        `<ram:CalculatedAmount>${amount(v.taxCents)}</ram:CalculatedAmount>` +
        `<ram:TypeCode>VAT</ram:TypeCode>` +
        (exempt
          ? `<ram:ExemptionReason>TVA non applicable, art. 293 B du CGI</ram:ExemptionReason>`
          : "") +
        `<ram:BasisAmount>${amount(v.baseCents)}</ram:BasisAmount>` +
        `<ram:CategoryCode>${vatCategory(v.rate, exempt)}</ram:CategoryCode>` +
        `<ram:RateApplicablePercent>${v.rate}</ram:RateApplicablePercent>` +
        `</ram:ApplicableTradeTax>`,
    )
    .join("");

  const payment = doc.seller.iban
    ? `<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode>` +
      `<ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${esc(doc.seller.iban.replace(/\s/g, ""))}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount>` +
      `</ram:SpecifiedTradeSettlementPaymentMeans>`
    : "";

  const terms = doc.dueDate
    ? `<ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">${date102(
        doc.dueDate,
      )}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>`
    : "";

  const reference = doc.creditedInvoiceNumber
    ? `<ram:InvoiceReferencedDocument><ram:IssuerAssignedID>${esc(doc.creditedInvoiceNumber)}</ram:IssuerAssignedID></ram:InvoiceReferencedDocument>`
    : "";

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" ` +
    `xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" ` +
    `xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" ` +
    `xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">` +
    `<rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${FACTURX_PROFILE}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>` +
    `<rsm:ExchangedDocument>` +
    `<ram:ID>${esc(doc.number)}</ram:ID>` +
    `<ram:TypeCode>${typeCode}</ram:TypeCode>` +
    `<ram:IssueDateTime><udt:DateTimeString format="102">${date102(doc.issueDate)}</udt:DateTimeString></ram:IssueDateTime>` +
    (exempt
      ? `<ram:IncludedNote><ram:Content>TVA non applicable, art. 293 B du CGI</ram:Content></ram:IncludedNote>`
      : "") +
    `</rsm:ExchangedDocument>` +
    `<rsm:SupplyChainTradeTransaction>` +
    lines +
    `<ram:ApplicableHeaderTradeAgreement>` +
    party("SellerTradeParty", doc.seller, true) +
    party("BuyerTradeParty", doc.buyer, false) +
    `</ram:ApplicableHeaderTradeAgreement>` +
    `<ram:ApplicableHeaderTradeDelivery/>` +
    `<ram:ApplicableHeaderTradeSettlement>` +
    `<ram:InvoiceCurrencyCode>${esc(doc.currency)}</ram:InvoiceCurrencyCode>` +
    payment +
    taxes +
    terms +
    `<ram:SpecifiedTradeSettlementHeaderMonetarySummation>` +
    `<ram:LineTotalAmount>${amount(doc.totals.totalExclCents)}</ram:LineTotalAmount>` +
    `<ram:TaxBasisTotalAmount>${amount(doc.totals.totalExclCents)}</ram:TaxBasisTotalAmount>` +
    `<ram:TaxTotalAmount currencyID="${esc(doc.currency)}">${amount(doc.totals.taxCents)}</ram:TaxTotalAmount>` +
    `<ram:GrandTotalAmount>${amount(doc.totals.totalCents)}</ram:GrandTotalAmount>` +
    `<ram:TotalPrepaidAmount>${amount(doc.paidCents)}</ram:TotalPrepaidAmount>` +
    `<ram:DuePayableAmount>${amount(Math.max(0, doc.dueCents))}</ram:DuePayableAmount>` +
    `</ram:SpecifiedTradeSettlementHeaderMonetarySummation>` +
    reference +
    `</ram:ApplicableHeaderTradeSettlement>` +
    `</rsm:SupplyChainTradeTransaction>` +
    `</rsm:CrossIndustryInvoice>`
  );
}

/** Métadonnées XMP déclarant le PDF comme PDF/A-3 porteur d'une facture Factur-X. */
export function facturXmp(doc: DocumentData, createdAt: Date): string {
  const iso = createdAt.toISOString();
  const title = `${doc.kind === "INVOICE" ? "Facture" : "Avoir"} ${doc.number ?? ""}`;
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
   <pdfaid:part>3</pdfaid:part>
   <pdfaid:conformance>B</pdfaid:conformance>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${esc(title)}</rdf:li></rdf:Alt></dc:title>
   <dc:creator><rdf:Seq><rdf:li>${esc(doc.seller.name)}</rdf:li></rdf:Seq></dc:creator>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
   <xmp:CreateDate>${iso}</xmp:CreateDate>
   <xmp:ModifyDate>${iso}</xmp:ModifyDate>
   <xmp:CreatorTool>Quercy</xmp:CreatorTool>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
   <pdf:Producer>Quercy</pdf:Producer>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
   <fx:DocumentType>INVOICE</fx:DocumentType>
   <fx:DocumentFileName>${FACTURX_FILENAME}</fx:DocumentFileName>
   <fx:Version>1.0</fx:Version>
   <fx:ConformanceLevel>BASIC</fx:ConformanceLevel>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
   <pdfaExtension:schemas>
    <rdf:Bag>
     <rdf:li rdf:parseType="Resource">
      <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
      <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
      <pdfaSchema:prefix>fx</pdfaSchema:prefix>
      <pdfaSchema:property>
       <rdf:Seq>
        <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentFileName</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Nom du fichier XML embarqué</pdfaProperty:description></rdf:li>
        <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentType</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>INVOICE</pdfaProperty:description></rdf:li>
        <rdf:li rdf:parseType="Resource"><pdfaProperty:name>Version</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Version du schéma</pdfaProperty:description></rdf:li>
        <rdf:li rdf:parseType="Resource"><pdfaProperty:name>ConformanceLevel</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Profil Factur-X</pdfaProperty:description></rdf:li>
       </rdf:Seq>
      </pdfaSchema:property>
     </rdf:li>
    </rdf:Bag>
   </pdfaExtension:schemas>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
