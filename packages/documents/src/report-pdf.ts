import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";

import { GEIST_REGULAR, GEIST_SEMIBOLD } from "./fonts.generated";
import { wrap } from "./pdf";

/** A4 paysage : les tableaux de passages ont beaucoup de colonnes. */
const PAGE = { width: 841.89, height: 595.28 };
const MARGIN = 36;
const INK = rgb(0.09, 0.1, 0.12);
const MUTED = rgb(0.42, 0.44, 0.48);
const RULE = rgb(0.86, 0.87, 0.89);
const BAND = rgb(0.96, 0.96, 0.97);
const SIZE = 8;
const LINE = 10.5;
const THUMB = { width: 64, height: 48 };

export interface ReportColumn {
  label: string;
  /** Largeur relative ; les colonnes se partagent la largeur utile. */
  width: number;
  align?: "left" | "right";
}

export interface ReportRow {
  cells: string[];
  /** Photo (JPEG ou PNG) affichée en vignette dans la dernière colonne. */
  image?: Uint8Array | null;
}

export interface ReportSection {
  title: string;
  intro?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Texte affiché quand la section est vide. */
  empty?: string;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  /** Nom de l'entreprise qui émet le rapport (marque blanche). */
  issuer: string;
  /** Couleur de l'entreprise (#rrggbb), pour le filet de titre. */
  accent?: string | null;
  generatedAt: Date;
  summary: { label: string; value: string; hint?: string }[];
  sections: ReportSection[];
  footer?: string;
}

interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
}

const clean = (text: string) => text.replace(/[\u202F\u00A0]/g, " ");

function hexColor(hex: string | null | undefined) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? "");
  return m
    ? rgb(parseInt(m[1]!, 16) / 255, parseInt(m[2]!, 16) / 255, parseInt(m[3]!, 16) / 255)
    : rgb(0.07, 0.45, 0.4);
}

function draw(
  ctx: Ctx,
  value: string,
  x: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {},
) {
  ctx.page.drawText(clean(value), {
    x,
    y,
    size: opts.size ?? SIZE,
    font: opts.bold ? ctx.bold : ctx.regular,
    color: opts.color ?? INK,
  });
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.pdf.addPage([PAGE.width, PAGE.height]);
  ctx.y = PAGE.height - MARGIN;
}

async function embedImage(pdf: PDFDocument, bytes: Uint8Array): Promise<PDFImage | null> {
  try {
    return await pdf.embedJpg(bytes);
  } catch {
    try {
      return await pdf.embedPng(bytes);
    } catch {
      return null;
    }
  }
}

/**
 * Rapport tabulaire en PDF (rapport client, feuille de passage) : en-tête de l'entreprise,
 * chiffres clés, puis des sections en tableaux paginés (en-têtes répétés), avec vignettes.
 */
export async function renderReportPdf(data: ReportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(Buffer.from(GEIST_REGULAR, "base64"), { subset: true });
  const bold = await pdf.embedFont(Buffer.from(GEIST_SEMIBOLD, "base64"), { subset: true });
  pdf.setTitle(data.title);
  pdf.setAuthor(data.issuer);
  pdf.setCreator("Quercy");
  pdf.setProducer("Quercy");
  pdf.setLanguage("fr-FR");
  pdf.setCreationDate(data.generatedAt);
  const ctx: Ctx = { pdf, page: pdf.addPage([PAGE.width, PAGE.height]), y: 0, regular, bold };
  ctx.y = PAGE.height - MARGIN;
  const usable = PAGE.width - MARGIN * 2;
  const accent = hexColor(data.accent);

  // ── En-tête
  draw(ctx, data.issuer, MARGIN, ctx.y - 12, { size: 10, bold: true, color: MUTED });
  draw(ctx, data.title, MARGIN, ctx.y - 34, { size: 18, bold: true });
  if (data.subtitle) draw(ctx, data.subtitle, MARGIN, ctx.y - 52, { size: 10, color: MUTED });
  ctx.y -= data.subtitle ? 64 : 46;
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y, width: 48, height: 2.5, color: accent });
  ctx.y -= 18;

  // ── Chiffres clés
  if (data.summary.length) {
    const tile = usable / data.summary.length;
    for (const [i, s] of data.summary.entries()) {
      const x = MARGIN + i * tile;
      ctx.page.drawRectangle({
        x: x + 2,
        y: ctx.y - 46,
        width: tile - 8,
        height: 46,
        color: BAND,
      });
      draw(ctx, s.label, x + 10, ctx.y - 14, { size: 7.5, color: MUTED });
      draw(ctx, s.value, x + 10, ctx.y - 32, { size: 15, bold: true });
      if (s.hint) draw(ctx, s.hint, x + 10, ctx.y - 42, { size: 6.5, color: MUTED });
    }
    ctx.y -= 66;
  }

  // ── Sections
  for (const section of data.sections) {
    const total = section.columns.reduce((n, c) => n + c.width, 0);
    const widths = section.columns.map((c) => (c.width / total) * usable);
    const header = () => {
      ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 16, width: usable, height: 16, color: BAND });
      let x = MARGIN;
      for (const [i, col] of section.columns.entries()) {
        draw(ctx, col.label, x + 4, ctx.y - 11, { size: 7, bold: true, color: MUTED });
        x += widths[i]!;
      }
      ctx.y -= 18;
    };
    if (ctx.y < MARGIN + 90) newPage(ctx);
    draw(ctx, section.title, MARGIN, ctx.y - 12, { size: 12, bold: true });
    ctx.y -= 20;
    if (section.intro) {
      for (const line of wrap(section.intro, regular, SIZE, usable)) {
        draw(ctx, line, MARGIN, ctx.y - 8, { color: MUTED });
        ctx.y -= LINE;
      }
      ctx.y -= 4;
    }
    if (section.rows.length === 0) {
      draw(ctx, section.empty ?? "Rien à signaler sur la période.", MARGIN, ctx.y - 10, {
        color: MUTED,
      });
      ctx.y -= 28;
      continue;
    }
    header();
    for (const row of section.rows) {
      const lines = section.columns.map((_, i) =>
        wrap(row.cells[i] ?? "", regular, SIZE, Math.max(10, widths[i]! - 8)).slice(0, 8),
      );
      const textHeight = Math.max(...lines.map((l) => l.length)) * LINE + 6;
      const image = row.image ? await embedImage(pdf, row.image) : null;
      const height = Math.max(textHeight, image ? THUMB.height + 8 : 0);
      if (ctx.y - height < MARGIN + 16) {
        newPage(ctx);
        header();
      }
      let x = MARGIN;
      for (const [i, cell] of lines.entries()) {
        const width = widths[i]!;
        cell.forEach((line, li) => {
          const w = regular.widthOfTextAtSize(clean(line), SIZE);
          const lx = section.columns[i]!.align === "right" ? x + width - 4 - w : x + 4;
          draw(ctx, line, lx, ctx.y - 9 - li * LINE);
        });
        x += width;
      }
      if (image) {
        const scale = Math.min(THUMB.width / image.width, THUMB.height / image.height);
        const lastX = MARGIN + usable - widths.at(-1)!;
        ctx.page.drawImage(image, {
          x: lastX + 4,
          y: ctx.y - 4 - image.height * scale,
          width: image.width * scale,
          height: image.height * scale,
        });
      }
      ctx.y -= height;
      ctx.page.drawLine({
        start: { x: MARGIN, y: ctx.y + 2 },
        end: { x: MARGIN + usable, y: ctx.y + 2 },
        thickness: 0.5,
        color: RULE,
      });
    }
    ctx.y -= 16;
  }

  // ── Pied de page sur chaque page
  const pages = pdf.getPages();
  const stamp = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(data.generatedAt);
  for (const [i, page] of pages.entries()) {
    const left = clean(data.footer ?? `${data.issuer} — édité le ${stamp}`);
    page.drawText(left, { x: MARGIN, y: 18, size: 7, font: regular, color: MUTED });
    const right = `Page ${i + 1} / ${pages.length}`;
    page.drawText(right, {
      x: PAGE.width - MARGIN - regular.widthOfTextAtSize(right, 7),
      y: 18,
      size: 7,
      font: regular,
      color: MUTED,
    });
  }
  return pdf.save();
}
