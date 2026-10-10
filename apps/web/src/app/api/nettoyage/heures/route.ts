import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";

import { cleaningHours, hoursCsv } from "@/server/cleaning/hours";
import { fileRequestContext } from "@/server/files/access";
import { entityContext } from "@/server/records/context";

export const dynamic = "force-dynamic";

/** Export CSV des heures du mois par agent (paie), avec le droit d'export du module. */
export async function GET(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month))
    return NextResponse.json({ error: "Mois attendu (AAAA-MM)." }, { status: 400 });
  try {
    await entityContext(ctx, "intervention", "export");
    const csv = hoursCsv(await cleaningHours(ctx, month));
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="heures-${month}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof TRPCError)
      return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }
}
