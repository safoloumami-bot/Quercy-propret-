import { terrainManifest } from "@/server/terrain/brand";
import { terrainBrandOf, terrainOrg } from "@/server/terrain/org";

export const dynamic = "force-dynamic";

/** Manifeste d'installation sur l'écran d'accueil, au nom de l'entreprise. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const org = await terrainOrg((await params).slug);
  if (!org) return Response.json({ error: "Introuvable." }, { status: 404 });
  return new Response(JSON.stringify(terrainManifest(terrainBrandOf(org))), {
    headers: { "content-type": "application/manifest+json", "cache-control": "no-cache" },
  });
}
