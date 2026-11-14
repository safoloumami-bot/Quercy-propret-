import { periodSchema, reportDefinitionSchema, resolvePeriod } from "@quercy/core";
import {
  ReportError,
  exportMeasure,
  exportMeasureHeader,
  reportCsv,
  reportPdf,
  reportTable,
  runReport,
} from "@quercy/reports";
import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";
import writeXlsxFile from "write-excel-file/node";
import { z } from "zod";

import { fileRequestContext } from "@/server/files/access";
import { entityContext } from "@/server/records/context";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  format: z.enum(["csv", "xlsx", "pdf"]),
  name: z.string().trim().min(1).max(120),
  definition: z
    .string()
    .transform((v, c) => {
      try {
        return JSON.parse(v) as unknown;
      } catch {
        c.addIssue({ code: "custom", message: "Définition illisible." });
        return z.NEVER;
      }
    })
    .pipe(reportDefinitionSchema),
  period: z
    .string()
    .transform((v, c) => {
      try {
        return JSON.parse(v) as unknown;
      } catch {
        c.addIssue({ code: "custom", message: "Période illisible." });
        return z.NEVER;
      }
    })
    .pipe(periodSchema),
});

function slug(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "rapport"
  );
}

/** Export d'un rapport (CSV, Excel ou PDF), avec les droits d'export du module. */
export async function GET(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  const { format, name, definition: def } = parsed.data;
  let access;
  try {
    access = await entityContext(ctx, def.entity, "export");
  } catch (error) {
    const message = error instanceof TRPCError ? error.message : "Accès refusé.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
  const timeZone = ctx.workspace.organization.preferences.timezone;
  const period = resolvePeriod(parsed.data.period, new Date(), timeZone);
  let result;
  try {
    result = await runReport(ctx.db, {
      definition: def,
      fields: access.fields,
      scopeWhere: access.scopeWhere,
      range: def.dateField ? period : null,
      timeZone,
    });
  } catch (error) {
    if (error instanceof ReportError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
  const filename = slug(name);
  if (format === "csv") {
    return new NextResponse(reportCsv(def, result), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (format === "pdf") {
    const pdf = await reportPdf(
      name,
      def,
      result,
      def.dateField ? period : null,
      ctx.workspace.organization.name,
    );
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const table = reportTable(def, result);
  const header = [
    table.groupLabel,
    exportMeasureHeader(result.measureField, table.measure),
    "Nombre de fiches",
  ].map((value) => ({ value, fontWeight: "bold" as const }));
  const rows = [
    ...table.rows.map((r) => [r.label, exportMeasure(result.measureField, r.value), r.count]),
    ["Total", exportMeasure(result.measureField, result.total), result.count],
  ].map((row) => row.map((value) => ({ value })));
  const buffer = await writeXlsxFile([header, ...rows], {
    sheet: "Rapport",
    stickyRowsCount: 1,
    columns: [{ width: 40 }, { width: 22 }, { width: 18 }],
  }).toBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
