import fontkit from "@pdf-lib/fontkit";
import { GEIST_REGULAR, GEIST_SEMIBOLD, wrap } from "@quercy/documents";
import { PDFDocument, rgb } from "pdf-lib";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const INK = rgb(0.09, 0.1, 0.12);
const MUTED = rgb(0.42, 0.44, 0.48);
const BAND = rgb(0.96, 0.96, 0.97);
const BAR = rgb(0.18, 0.45, 0.4);

function clean(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, " ");
}

/**
 * PDF d'un rapport : titre, période, tableau (groupe, valeur, nombre) avec barres
 * proportionnelles, et total. Polices embarquées, lisible à l'impression.
 */
export async function renderReportPdf(input: {
  title: string;
  subtitle: string;
  organization: string;
  columns: [string, string, string];
  rows: { label: string; value: string; ratio: number; count: number }[];
  total: string;
  generatedAt?: Date;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(Buffer.from(GEIST_REGULAR, "base64"), { subset: true });
  const bold = await pdf.embedFont(Buffer.from(GEIST_SEMIBOLD, "base64"), { subset: true });
  pdf.setTitle(input.title);
  pdf.setCreator("Quercy");
  pdf.setProducer("Quercy");
  pdf.setLanguage("fr-FR");
  const at = input.generatedAt ?? new Date();

  let page = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;
  const draw = (text: string, x: number, yy: number, size = 9, font = regular, color = INK) =>
    page.drawText(clean(text), { x, y: yy, size, font, color });
  const right = (text: string, xRight: number, yy: number, size = 9, font = regular) => {
    const t = clean(text);
    page.drawText(t, {
      x: xRight - font.widthOfTextAtSize(t, size),
      y: yy,
      size,
      font,
      color: INK,
    });
  };

  draw(input.organization, MARGIN, y - 10, 9, regular, MUTED);
  for (const line of wrap(input.title, bold, 16, A4.width - MARGIN * 2)) {
    y -= 22;
    draw(line, MARGIN, y - 10, 16, bold);
  }
  y -= 28;
  draw(input.subtitle, MARGIN, y, 9, regular, MUTED);
  y -= 24;

  const labelWidth = 230;
  const barX = MARGIN + labelWidth + 10;
  const barMax = 140;
  const valueRight = A4.width - MARGIN - 50;
  const countRight = A4.width - MARGIN;
  const header = () => {
    page.drawRectangle({
      x: MARGIN,
      y: y - 6,
      width: A4.width - MARGIN * 2,
      height: 20,
      color: BAND,
    });
    draw(input.columns[0], MARGIN + 6, y, 8, bold, MUTED);
    right(input.columns[1], valueRight, y, 8, bold);
    right(input.columns[2], countRight - 4, y, 8, bold);
    y -= 22;
  };
  header();
  for (const row of input.rows) {
    const lines = wrap(row.label, regular, 9, labelWidth - 6);
    const height = Math.max(1, lines.length) * 12 + 6;
    if (y - height < MARGIN + 30) {
      page = pdf.addPage([A4.width, A4.height]);
      y = A4.height - MARGIN;
      header();
    }
    lines.forEach((l, i) => draw(l, MARGIN + 6, y - i * 12, 9));
    const width = Math.max(0, Math.min(1, row.ratio)) * barMax;
    if (width > 0) page.drawRectangle({ x: barX, y: y - 2, width, height: 9, color: BAR });
    right(row.value, valueRight, y, 9, bold);
    right(String(row.count), countRight - 4, y, 9);
    y -= height;
  }
  y -= 8;
  draw("Total", MARGIN + 6, y, 10, bold);
  right(input.total, valueRight, y, 10, bold);

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const text = clean(
      `${input.title} — généré le ${at.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })} — page ${i + 1}/${pages.length}`,
    );
    const size = 7.5;
    p.drawText(text, {
      x: (A4.width - regular.widthOfTextAtSize(text, size)) / 2,
      y: MARGIN - 20,
      size,
      font: regular,
      color: MUTED,
    });
  });
  return pdf.save();
}
