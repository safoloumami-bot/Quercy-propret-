import { DOCUMENT_ENTITY, type DocumentKind } from "@quercy/core";
import {
  documentData,
  documentFilename,
  publicDocumentUrl,
  renderDocumentPdf,
} from "@quercy/documents";
import { NextResponse } from "next/server";

import { env } from "@/server/env";
import { canAccessRecord, fileRequestContext } from "@/server/files/access";

export const dynamic = "force-dynamic";

/** PDF d'un document commercial (Factur-X pour une facture ou un avoir émis). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await fileRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const found = await ctx.db.salesDocument.findFirst({
    where: { id },
    select: { kind: true, publicToken: true },
  });
  if (!found) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const entity = DOCUMENT_ENTITY[found.kind as DocumentKind];
  if (!(await canAccessRecord(ctx, entity, id, "view")))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { doc, data } = await documentData(ctx.organizationId, id, {
    paymentUrl:
      found.kind === "INVOICE" ? publicDocumentUrl(env().APP_URL, found.publicToken) : null,
  });
  const facturX = (doc.kind === "INVOICE" || doc.kind === "CREDIT_NOTE") && doc.status !== "draft";
  const pdf = await renderDocumentPdf(data, { facturX });
  const download = new URL(request.url).searchParams.get("dl") === "1";
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(documentFilename(doc))}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
