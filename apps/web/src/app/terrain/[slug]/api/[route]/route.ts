import { handleTerrainApi } from "@/server/terrain/api";
import { terrainOrg } from "@/server/terrain/org";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; route: string }> };

/** Serveur de l'application terrain, relié aux interventions du logiciel. */
async function handle(request: Request, { params }: Params) {
  const { slug, route } = await params;
  const org = await terrainOrg(slug);
  if (!org)
    return Response.json(
      { erreur: "Application terrain introuvable pour cette adresse." },
      { status: 404 },
    );
  return handleTerrainApi(request, org, route);
}

export const GET = handle;
export const POST = handle;
