import { NextResponse } from "next/server";

import { readObject } from "@/server/storage";
import { publicImage } from "@/server/website";

export const dynamic = "force-dynamic";

/** Photo d'un site publié (seules les images utilisées par la version en ligne sont servies). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await publicImage(id);
  if (!file) return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  const body = await readObject(file.storageKey);
  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(body.byteLength),
      // L'identifiant change à chaque nouvelle photo : cache long.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
