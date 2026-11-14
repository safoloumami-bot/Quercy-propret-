import { renderTerrainPage } from "@/server/terrain/brand";
import { terrainBrandOf, terrainOrg } from "@/server/terrain/org";

export const dynamic = "force-dynamic";

const NOT_FOUND = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Application terrain</title><body style="font-family:system-ui,sans-serif;padding:32px;max-width:520px;margin:auto;color:#10221F"><h1 style="font-size:22px">Application terrain introuvable</h1><p>Cette adresse ne correspond à aucune entreprise, ou le module Nettoyage n'y est pas activé. Le lien exact se trouve dans le logiciel : Nettoyage → Application terrain.</p></body></html>`;

/** Application terrain de l'entreprise : même écran que l'application d'origine. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const org = await terrainOrg((await params).slug);
  if (!org)
    return new Response(NOT_FOUND, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  return new Response(renderTerrainPage(terrainBrandOf(org)), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache",
      "x-robots-tag": "noindex",
    },
  });
}
