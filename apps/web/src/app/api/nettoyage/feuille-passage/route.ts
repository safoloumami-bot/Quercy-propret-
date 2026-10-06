import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";

import { passageSheet, passageSheetPdf } from "@/server/cleaning/passage-sheet";
import { fileRequestContext } from "@/server/files/access";

export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Feuille de passage d'un site en PDF, imprimable. */
export async function GET(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const siteId = params.get("siteId") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!siteId || !DAY.test(from) || !DAY.test(to) || from > to)
    return NextResponse.json({ error: "Site et période attendus." }, { status: 400 });
  try {
    const sheet = await passageSheet(ctx, { siteId, from, to });
    const pdf = await passageSheetPdf(ctx, sheet, { from, to });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="feuille-de-passage-${sheet.site.code ?? "site"}-${from}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TRPCError)
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "NOT_FOUND" ? 404 : 403 },
      );
    throw error;
  }
}
