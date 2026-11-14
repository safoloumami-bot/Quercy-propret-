import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { renderReportPdf } from "../report-pdf";

// Plus petite image PNG valide (1 × 1 pixel).
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  ),
);

describe("rapport PDF", () => {
  it("pagine un long tableau et répète l'en-tête, avec vignettes", async () => {
    const bytes = await renderReportPdf({
      title: "Rapport d'activité",
      subtitle: "Syndic fictif — septembre 2026",
      issuer: "Net'Éclat Services",
      accent: "#0f766e",
      generatedAt: new Date("2026-10-01T08:00:00Z"),
      summary: [
        { label: "Passages prévus", value: "120" },
        { label: "Réalisés", value: "117", hint: "97 %" },
      ],
      sections: [
        {
          title: "Détail des passages",
          columns: [
            { label: "Date", width: 1 },
            { label: "Résidence", width: 3 },
            { label: "Observation", width: 4 },
          ],
          rows: Array.from({ length: 150 }, (_, i) => ({
            cells: [
              `0${i % 9}/09`,
              `Cage ${i}`,
              i % 7 === 0 ? "Observation longue ".repeat(12) : "",
            ],
          })),
        },
        {
          title: "Anomalies",
          columns: [
            { label: "Type", width: 2 },
            { label: "Photo", width: 1 },
          ],
          rows: [
            { cells: ["Fuite / eau", ""], image: PNG },
            { cells: ["Image illisible", ""], image: new Uint8Array([1, 2, 3]) },
          ],
        },
        { title: "Vide", columns: [{ label: "x", width: 1 }], rows: [], empty: "Aucune anomalie." },
      ],
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(3);
    expect(doc.getTitle()).toBe("Rapport d'activité");
    expect(doc.getPage(0).getSize().width).toBeGreaterThan(doc.getPage(0).getSize().height);
  });
});
