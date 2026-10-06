import { terrainServiceWorker } from "@/server/terrain/service-worker";
import { terrainOrg } from "@/server/terrain/org";

export const dynamic = "force-dynamic";

/**
 * Service worker de l'application terrain : l'application et les données du jour (tournée,
 * fiches) restent consultables sans réseau. Portée : l'adresse de l'application.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await terrainOrg(slug);
  if (!org) return new Response("", { status: 404 });
  const base = `/terrain/${org.slug}`;
  return new Response(terrainServiceWorker(base), {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-cache",
      "service-worker-allowed": base,
    },
  });
}
