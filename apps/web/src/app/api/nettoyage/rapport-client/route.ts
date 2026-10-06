import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";

import { clientReport, clientReportPdf } from "@/server/cleaning/client-report";
import { fileRequestContext } from "@/server/files/access";

export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HTTP: Partial<Record<TRPCError["code"], number>> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
};

/** Rapport client (syndic) en PDF : toutes ses résidences et cages, sur une période. */
export async function GET(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const companyId = params.get("companyId") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!companyId || !DAY.test(from) || !DAY.test(to))
    return NextResponse.json({ error: "Client et période attendus." }, { status: 400 });
  try {
    const report = await clientReport(ctx, { companyId, from, to });
    const pdf = await clientReportPdf(ctx, report);
    await ctx.db.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        action: "client_report.generated",
        entityType: "company",
        entityId: companyId,
        metadata: { from, to, anomalies: report.totals.anomalies },
      },
    });
    const slug = report.company.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rapport-${slug || "client"}-${from}-${to}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TRPCError)
      return NextResponse.json({ error: error.message }, { status: HTTP[error.code] ?? 400 });
    throw error;
  }
}
