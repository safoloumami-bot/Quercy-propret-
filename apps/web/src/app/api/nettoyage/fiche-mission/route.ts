import { MISSION_TASK_COLUMNS, taskFrequencyLabel } from "@quercy/core";
import { NextResponse } from "next/server";
import writeXlsxFile from "write-excel-file/node";

import { fileRequestContext } from "@/server/files/access";
import { isCleaningManager } from "@/server/trpc/routers/sites";

export const dynamic = "force-dynamic";

/** Tâches d'une fiche mission en Excel (à retoucher puis réimporter dans la fiche). */
export async function GET(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (!isCleaningManager(ctx))
    return NextResponse.json({ error: "Réservé aux responsables." }, { status: 403 });
  const sheetId = new URL(request.url).searchParams.get("sheetId") ?? "";
  const sheet = await ctx.db.missionSheet.findFirst({
    where: { id: sheetId },
    include: { tasks: { orderBy: { sortOrder: "asc" } }, site: { select: { name: true } } },
  });
  if (!sheet) return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
  const rows = [
    MISSION_TASK_COLUMNS.map((value) => ({ value, fontWeight: "bold" as const })),
    ...sheet.tasks.map((t) => [
      { value: t.zone },
      { value: t.label },
      { value: taskFrequencyLabel(t.frequency) },
      { value: t.critical ? "oui" : "non" },
      { value: t.photoRequired ? "oui" : "non" },
    ]),
  ];
  const buffer = await writeXlsxFile(rows, {
    sheet: "Tâches",
    stickyRowsCount: 1,
    columns: [{ width: 22 }, { width: 60 }, { width: 24 }, { width: 10 }, { width: 18 }],
  }).toBuffer();
  const slug = `${sheet.site.name}-${sheet.title}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fiche-mission-${slug || "taches"}-v${sheet.version}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
