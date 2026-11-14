import {
  documentData,
  documentFilename,
  publicDocumentUrl,
  renderDocumentPdf,
} from "@quercy/documents";
import { prisma } from "@quercy/db";
import { NextResponse } from "next/server";

import { env } from "@/server/env";

export const dynamic = "force-dynamic";

/** PDF d'un document émis, accessible au client par son lien public (jeton non devinable). */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await prisma.salesDocument.findUnique({
    where: { publicToken: token },
    select: { id: true, organizationId: true, kind: true, status: true, deletedAt: true },
  });
  if (!found || found.deletedAt || found.status === "draft" || found.kind === "RECURRING")
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const { doc, data } = await documentData(found.organizationId, found.id, {
    paymentUrl: found.kind === "INVOICE" ? publicDocumentUrl(env().APP_URL, token) : null,
  });
  const pdf = await renderDocumentPdf(data, {
    facturX: doc.kind === "INVOICE" || doc.kind === "CREDIT_NOTE",
  });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(documentFilename(doc))}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
