import { prisma } from "@quercy/db";
import { NextResponse } from "next/server";

import { INLINE_TYPES, readObject, verifyFileSignature } from "@/server/storage";

export const dynamic = "force-dynamic";

/** Téléchargement via URL signée (stockage local). En S3, le lien pointe directement vers le bucket. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") ?? "";
  if (!verifyFileSignature(id, expires, sig)) {
    return NextResponse.json(
      { error: "Lien expiré : rouvrez le fichier depuis la fiche." },
      { status: 403 },
    );
  }
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file || file.deletedAt)
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  const body = await readObject(file.storageKey);
  const inline = INLINE_TYPES.has(file.mimeType) && url.searchParams.get("dl") !== "1";
  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
