import fontkit from "@pdf-lib/fontkit";
import {
  DEFAULT_LATE_PENALTY_TEXT,
  DOCUMENT_TITLES,
  PRODUCT_UNITS,
  VAT_EXEMPT_MENTION,
} from "@quercy/core";
import {
  AFRelationship,
  PDFDocument,
  type PDFFont,
  PDFName,
  type PDFPage,
  PDFString,
  rgb,
} from "pdf-lib";

import { FACTURX_FILENAME, buildFacturXml, facturXmp } from "./facturx";
import { GEIST_REGULAR, GEIST_SEMIBOLD } from "./fonts.generated";
import type { DocumentData } from "./types";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const INK = rgb(0.09, 0.1, 0.12);
const MUTED = rgb(0.42, 0.44, 0.48);
const RULE = rgb(0.86, 0.87, 0.89);
const BAND = rgb(0.96, 0.96, 0.97);

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const qty = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/** Les formats français utilisent des espaces fines insécables : on les normalise. */
function clean(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, " ");
}

function euros(cents: number): string {
  return clean(money.format(cents / 100));
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

/** Découpe un texte en lignes tenant dans `width`. */
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of clean(text).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      // Mot plus long que la colonne : coupé au caractère.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
}

function text(
  ctx: Ctx,
  value: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    align?: "left" | "right";
    width?: number;
  } = {},
) {
  const size = opts.size ?? 9;
  const font = opts.bold ? ctx.bold : ctx.regular;
  const v = clean(value);
  const w = font.widthOfTextAtSize(v, size);
  const drawX = opts.align === "right" ? x + (opts.width ?? 0) - w : x;
  ctx.page.drawText(v, { x: drawX, y, size, font, color: opts.color ?? INK });
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.pdf.addPage([A4.width, A4.height]);
  ctx.y = A4.height - MARGIN;
}

function ensureSpace(ctx: Ctx, needed: number, onBreak?: () => void) {
  if (ctx.y - needed < MARGIN + 40) {
    newPage(ctx);
    onBreak?.();
  }
}

const COLUMNS = [
  { key: "description", label: "Désignation", width: 227 },
  { key: "quantity", label: "Qté", width: 50 },
  { key: "unitPrice", label: "PU HT", width: 70 },
  { key: "discount", label: "Remise", width: 42 },
  { key: "vat", label: "TVA", width: 38 },
  { key: "total", label: "Total HT", width: 72 },
] as const;

function tableHeader(ctx: Ctx) {
  const height = 20;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - height,
    width: A4.width - MARGIN * 2,
    height,
    color: BAND,
  });
  let x = MARGIN + 6;
  for (const col of COLUMNS) {
    text(ctx, col.label, x, ctx.y - 13, {
      size: 8,
      bold: true,
      color: MUTED,
      align: col.key === "description" ? "left" : "right",
      width: col.width - 12,
    });
    x += col.width;
  }
  ctx.y -= height + 4;
}

/**
 * PDF d'un document commercial (devis, commande, facture, avoir). Pour une facture ou un avoir
 * émis, le XML Factur-X est joint au PDF (fichier « factur-x.xml », relation « Data »).
 */
export async function renderDocumentPdf(
  doc: DocumentData,
  options: { facturX?: boolean; now?: Date } = {},
): Promise<Uint8Array> {
  const now = options.now ?? new Date();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(base64ToBytes(GEIST_REGULAR), { subset: true });
  const bold = await pdf.embedFont(base64ToBytes(GEIST_SEMIBOLD), { subset: true });
  const title = DOCUMENT_TITLES[doc.kind];
  const heading = doc.number ? `${title} ${doc.number}` : `${title} (brouillon)`;
  pdf.setTitle(heading);
  pdf.setAuthor(doc.seller.name);
  pdf.setCreator("Quercy");
  pdf.setProducer("Quercy");
  pdf.setLanguage("fr-FR");
  pdf.setCreationDate(now);
  pdf.setModificationDate(now);

  const ctx: Ctx = {
    pdf,
    page: pdf.addPage([A4.width, A4.height]),
    y: A4.height - MARGIN,
    regular,
    bold,
  };
  const right = A4.width - MARGIN;

  // ── Émetteur (gauche) et titre (droite)
  text(ctx, doc.seller.name, MARGIN, ctx.y - 14, { size: 15, bold: true });
  let sy = ctx.y - 32;
  const sellerLines = [
    doc.seller.address,
    [doc.seller.postalCode, doc.seller.city].filter(Boolean).join(" "),
    doc.seller.country && doc.seller.country !== "France" ? doc.seller.country : null,
    doc.seller.phone,
    doc.seller.email,
    doc.seller.registration ? `SIRET ${doc.seller.registration}` : null,
    doc.seller.vatNumber ? `TVA intracommunautaire ${doc.seller.vatNumber}` : null,
  ].filter((l): l is string => Boolean(l));
  for (const line of sellerLines) {
    text(ctx, line, MARGIN, sy, { size: 8.5, color: MUTED });
    sy -= 12;
  }

  text(ctx, title.toUpperCase(), right - 220, ctx.y - 14, {
    size: 15,
    bold: true,
    align: "right",
    width: 220,
  });
  let ty = ctx.y - 32;
  const meta: [string, string][] = [
    ["Numéro", doc.number ?? "Brouillon — sans valeur légale"],
    ["Date", doc.issueDate ? dateFmt.format(doc.issueDate) : "—"],
  ];
  if (doc.dueDate) {
    const label =
      doc.kind === "QUOTE"
        ? "Valable jusqu'au"
        : doc.kind === "ORDER"
          ? "Livraison prévue"
          : "Échéance";
    meta.push([label, dateFmt.format(doc.dueDate)]);
  }
  if (doc.creditedInvoiceNumber) meta.push(["Facture d'origine", doc.creditedInvoiceNumber]);
  for (const [label, value] of meta) {
    text(ctx, label, right - 220, ty, { size: 8.5, color: MUTED });
    text(ctx, value, right - 140, ty, { size: 8.5, bold: true, align: "right", width: 140 });
    ty -= 12;
  }

  // ── Client
  ctx.y = Math.min(sy, ty) - 18;
  const boxX = right - 240;
  const buyerLines = [
    doc.buyer.contactName ? `À l'attention de ${doc.buyer.contactName}` : null,
    doc.buyer.address,
    [doc.buyer.postalCode, doc.buyer.city].filter(Boolean).join(" "),
    doc.buyer.country && doc.buyer.country !== "France" ? doc.buyer.country : null,
    doc.buyer.registration ? `SIREN ${doc.buyer.registration}` : null,
    doc.buyer.vatNumber ? `TVA ${doc.buyer.vatNumber}` : null,
  ].filter((l): l is string => Boolean(l));
  const boxHeight = 36 + buyerLines.length * 12;
  ctx.page.drawRectangle({
    x: boxX,
    y: ctx.y - boxHeight,
    width: 240,
    height: boxHeight,
    borderColor: RULE,
    borderWidth: 1,
  });
  text(ctx, "CLIENT", boxX + 12, ctx.y - 14, { size: 7.5, bold: true, color: MUTED });
  text(ctx, doc.buyer.name, boxX + 12, ctx.y - 27, { size: 10, bold: true });
  let by = ctx.y - 40;
  for (const line of buyerLines) {
    text(ctx, line, boxX + 12, by, { size: 8.5 });
    by -= 12;
  }
  ctx.y -= boxHeight + 22;

  if (doc.subject) {
    for (const line of wrap(`Objet : ${doc.subject}`, bold, 10, A4.width - MARGIN * 2)) {
      text(ctx, line, MARGIN, ctx.y, { size: 10, bold: true });
      ctx.y -= 14;
    }
    ctx.y -= 6;
  }

  // ── Lignes
  tableHeader(ctx);
  for (const line of doc.lines) {
    const descLines = wrap(line.description, regular, 9, COLUMNS[0].width - 12);
    const rowHeight = Math.max(1, descLines.length) * 12 + 8;
    ensureSpace(ctx, rowHeight, () => tableHeader(ctx));
    let x = MARGIN + 6;
    descLines.forEach((d, i) => text(ctx, d, x, ctx.y - 10 - i * 12, { size: 9 }));
    x += COLUMNS[0].width;
    const cells = [
      `${qty.format(line.quantity)}${line.unit ? ` ${PRODUCT_UNITS.find((u) => u.value === line.unit)?.label ?? line.unit}` : ""}`,
      euros(line.unitPriceCents),
      line.discountPercent ? `${qty.format(line.discountPercent)} %` : "—",
      doc.seller.vatExempt ? "—" : `${qty.format(line.vatRate)} %`,
      euros(line.totalExclCents),
    ];
    cells.forEach((cell, i) => {
      const col = COLUMNS[i + 1]!;
      text(ctx, cell, x, ctx.y - 10, { size: 9, align: "right", width: col.width - 12 });
      x += col.width;
    });
    ctx.y -= rowHeight;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y + 2 },
      end: { x: right, y: ctx.y + 2 },
      thickness: 0.5,
      color: RULE,
    });
  }

  // ── Totaux
  const totals: [string, string, boolean][] = [
    ["Total HT", euros(doc.totals.totalExclCents), false],
  ];
  if (doc.seller.vatExempt) totals.push(["TVA", euros(0), false]);
  else
    for (const v of doc.totals.vat)
      totals.push([
        `TVA ${qty.format(v.rate)} % sur ${euros(v.baseCents)}`,
        euros(v.taxCents),
        false,
      ]);
  totals.push(["Total TTC", euros(doc.totals.totalCents), true]);
  if (doc.kind === "INVOICE" && doc.paidCents > 0) {
    totals.push(["Déjà réglé", euros(doc.paidCents), false]);
    totals.push(["Reste à payer", euros(Math.max(0, doc.dueCents)), true]);
  }
  ensureSpace(ctx, totals.length * 16 + 20);
  ctx.y -= 10;
  for (const [label, value, strong] of totals) {
    if (strong) {
      ctx.page.drawRectangle({ x: right - 250, y: ctx.y - 6, width: 250, height: 18, color: BAND });
    }
    text(ctx, label, right - 244, ctx.y, { size: 9, bold: strong, color: strong ? INK : MUTED });
    text(ctx, value, right - 120, ctx.y, { size: 9.5, bold: strong, align: "right", width: 114 });
    ctx.y -= 18;
  }
  ctx.y -= 8;

  // ── Notes, paiement, mentions
  const blocks: { title: string; body: string }[] = [];
  if (doc.notes) blocks.push({ title: "Conditions", body: doc.notes });
  if (doc.kind === "INVOICE") {
    const pay: string[] = [];
    if (doc.dueDate) pay.push(`Paiement attendu au plus tard le ${dateFmt.format(doc.dueDate)}.`);
    if (doc.seller.iban)
      pay.push(
        `Virement : IBAN ${doc.seller.iban}${doc.seller.bic ? ` — BIC ${doc.seller.bic}` : ""}.`,
      );
    if (doc.paymentUrl) pay.push(`Paiement en ligne : ${doc.paymentUrl}`);
    if (pay.length) blocks.push({ title: "Règlement", body: pay.join("\n") });
  }
  if (doc.kind === "QUOTE")
    blocks.push({
      title: "Bon pour accord",
      body: "Date, signature et mention « Bon pour accord » :",
    });
  const legal: string[] = [];
  if (doc.seller.vatExempt) legal.push(VAT_EXEMPT_MENTION);
  if (doc.kind === "INVOICE") legal.push(doc.seller.latePenaltyText || DEFAULT_LATE_PENALTY_TEXT);
  if (legal.length) blocks.push({ title: "Mentions légales", body: legal.join("\n") });

  for (const block of blocks) {
    const lines = wrap(block.body, regular, 8.5, A4.width - MARGIN * 2);
    ensureSpace(ctx, 16 + lines.length * 11);
    text(ctx, block.title, MARGIN, ctx.y, { size: 8.5, bold: true });
    ctx.y -= 13;
    for (const line of lines) {
      text(ctx, line, MARGIN, ctx.y, { size: 8.5, color: MUTED });
      ctx.y -= 11;
    }
    ctx.y -= 8;
  }

  // ── Pied de page et numéros de page
  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    const footer = [doc.seller.footer, `${heading} — page ${index + 1}/${pages.length}`]
      .filter(Boolean)
      .join(" · ");
    const size = 7.5;
    const lines = wrap(footer, regular, size, A4.width - MARGIN * 2);
    lines.forEach((line, i) => {
      const w = regular.widthOfTextAtSize(line, size);
      page.drawText(line, {
        x: (A4.width - w) / 2,
        y: MARGIN - 18 - i * 10 + (lines.length - 1) * 10,
        size,
        font: regular,
        color: MUTED,
      });
    });
  });

  // ── Factur-X
  if (options.facturX && (doc.kind === "INVOICE" || doc.kind === "CREDIT_NOTE") && doc.number) {
    const xml = buildFacturXml(doc);
    await pdf.attach(new TextEncoder().encode(xml), FACTURX_FILENAME, {
      mimeType: "text/xml",
      description: "Factur-X",
      creationDate: now,
      modificationDate: now,
      afRelationship: AFRelationship.Data,
    });
    const metadata = pdf.context.stream(new TextEncoder().encode(facturXmp(doc, now)), {
      Type: "Metadata",
      Subtype: "XML",
    });
    pdf.catalog.set(PDFName.of("Metadata"), pdf.context.register(metadata));
    pdf.catalog.set(PDFName.of("Lang"), PDFString.of("fr-FR"));
  }

  return pdf.save({ useObjectStreams: false });
}
