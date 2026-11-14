import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFString,
  decodePDFRawStream,
} from "pdf-lib";

import { EInvoiceParseError } from "./parse";

const XML_NAMES = ["factur-x.xml", "zugferd-invoice.xml", "xrechnung.xml", "order-x.xml"];

function nameOf(value: unknown): string | null {
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText();
  return null;
}

/** Extrait le XML embarqué d'un PDF Factur-X (pièce jointe « factur-x.xml »). */
export async function extractFacturXml(pdfBytes: Uint8Array): Promise<string> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new EInvoiceParseError("PDF illisible.");
  }
  const names = pdf.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  const embedded = names?.lookupMaybe(PDFName.of("EmbeddedFiles"), PDFDict);
  const found: { name: string; spec: PDFDict }[] = [];

  const walk = (node: PDFDict | undefined, depth = 0) => {
    if (!node || depth > 8) return;
    const pairs = node.lookupMaybe(PDFName.of("Names"), PDFArray);
    if (pairs) {
      for (let i = 0; i + 1 < pairs.size(); i += 2) {
        const name = nameOf(pairs.lookup(i));
        const spec = pairs.lookup(i + 1);
        if (name && spec instanceof PDFDict) found.push({ name, spec });
      }
    }
    const kids = node.lookupMaybe(PDFName.of("Kids"), PDFArray);
    if (kids) for (let i = 0; i < kids.size(); i++) walk(kids.lookup(i, PDFDict), depth + 1);
  };
  walk(embedded);

  const pick =
    found.find((f) => XML_NAMES.includes(f.name.toLowerCase())) ??
    found.find((f) => f.name.toLowerCase().endsWith(".xml"));
  if (!pick)
    throw new EInvoiceParseError("Ce PDF ne contient pas de facture électronique (Factur-X).");
  const ef = pick.spec.lookupMaybe(PDFName.of("EF"), PDFDict);
  const stream = ef?.lookup(PDFName.of("F"));
  if (!(stream instanceof PDFRawStream))
    throw new EInvoiceParseError("Pièce jointe Factur-X illisible.");
  const bytes = decodePDFRawStream(stream).decode();
  return new TextDecoder("utf-8").decode(bytes);
}

/** XML d'une facture reçue, qu'on ait un PDF Factur-X ou directement le fichier XML. */
export async function readEInvoiceFile(bytes: Uint8Array): Promise<string> {
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 5));
  if (head === "%PDF-") return extractFacturXml(bytes);
  const xml = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
  if (!xml.trimStart().startsWith("<"))
    throw new EInvoiceParseError("Fichier non reconnu : envoyez un PDF Factur-X ou un XML.");
  return xml;
}
