import {
  EMPTY_FILTER,
  type FieldDef,
  buildOrderBy,
  buildWhere,
  filterGroupSchema,
  slugify,
  sortSpecSchema,
} from "@quercy/core";
import { NextResponse } from "next/server";
import writeXlsxFile from "write-excel-file/node";
import { z } from "zod";

import { toCsv } from "@/server/export";
import { fileRequestContext, isEntityKey } from "@/server/files/access";
import { delegate, entityContext } from "@/server/records/context";
import { displayValue } from "@/server/records/format";
import { searchWhere } from "@/server/records/search";
import { listInclude, serialize } from "@/server/records/serialize";

export const dynamic = "force-dynamic";

const MAX_ROWS = 100_000;

const stateSchema = z.object({
  filter: filterGroupSchema.default(EMPTY_FILTER),
  sort: z.array(sortSpecSchema).max(5).default([]),
  search: z.string().max(120).optional(),
  columns: z.array(z.string().max(80)).max(100).default([]),
  ids: z.array(z.string()).max(1000).optional(),
});

/** Export de la vue courante (filtres, tri, colonnes visibles) en CSV ou Excel. */
export async function GET(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (!isEntityKey(entity))
    return NextResponse.json({ error: "Type de fiche inconnu." }, { status: 404 });
  const ctx = await fileRequestContext();
  if (!ctx) return NextResponse.json({ error: "Session expirée." }, { status: 401 });

  let state: z.infer<typeof stateSchema>;
  try {
    state = stateSchema.parse(
      JSON.parse(Buffer.from(url.searchParams.get("state") ?? "e30", "base64url").toString("utf8")),
    );
  } catch {
    return NextResponse.json({ error: "Paramètres d'export invalides." }, { status: 400 });
  }

  let context;
  try {
    context = await entityContext(ctx, entity, "export");
  } catch {
    return NextResponse.json(
      { error: "Votre rôle ne permet pas d'exporter ces données." },
      { status: 403 },
    );
  }
  const { def, fields, scopeWhere } = context;
  const columns: FieldDef[] = state.columns.length
    ? state.columns
        .map((k) => fields.find((f) => f.key === k))
        .filter((f): f is FieldDef => Boolean(f))
    : fields.filter((f) => f.defaultVisible);

  const where = {
    AND: [
      scopeWhere,
      buildWhere(fields, state.filter),
      searchWhere(def, state.search),
      state.ids ? { id: { in: state.ids } } : {},
    ],
  };
  const rows: Record<string, string>[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += 1000) {
    const batch = await delegate(ctx, entity).findMany({
      where,
      orderBy: buildOrderBy(fields, state.sort, def.defaultSort) as never,
      skip: offset,
      take: 1000,
      include: listInclude(entity) as never,
    });
    for (const record of batch) {
      const row = serialize(entity, record as never);
      rows.push(Object.fromEntries(columns.map((c) => [c.label, displayValue(c, row)])));
    }
    if (batch.length < 1000) break;
  }

  await ctx.db.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorId: ctx.user.id,
      action: "record.export",
      entityType: entity,
      metadata: { count: rows.length, format },
    },
  });

  const filename = `${slugify(def.labelPlural)}-${new Date().toISOString().slice(0, 10)}`;
  if (format === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const sheet = [
    columns.map((c) => ({ value: c.label, fontWeight: "bold" as const })),
    ...rows.map((r) => columns.map((c) => ({ value: r[c.label] ?? "" }))),
  ];
  const buffer = await writeXlsxFile(sheet, {
    sheet: def.labelPlural,
    stickyRowsCount: 1,
  }).toBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
