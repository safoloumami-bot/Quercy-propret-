import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiError, authenticate, fromTrpc, isEntity } from "@/server/api/keys";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ entity: string; id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { entity, id } = await params;
  if (!isEntity(entity)) return apiError(404, `Ressource inconnue : ${entity}.`);
  const auth = await authenticate(request, false);
  if ("response" in auth) return auth.response;
  try {
    const { row } = await auth.caller.records.get({ entity, id });
    return NextResponse.json({ data: row });
  } catch (error) {
    return fromTrpc(error);
  }
}

/** Modification partielle : seuls les champs fournis changent. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { entity, id } = await params;
  if (!isEntity(entity)) return apiError(404, `Ressource inconnue : ${entity}.`);
  const auth = await authenticate(request, true);
  if ("response" in auth) return auth.response;
  const values = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!values || typeof values !== "object" || Array.isArray(values))
    return apiError(400, 'Corps JSON attendu : { "champ": valeur }.');
  try {
    return NextResponse.json({ data: await auth.caller.records.update({ entity, id, values }) });
  } catch (error) {
    return fromTrpc(error);
  }
}

/** Mise en corbeille (restaurable 30 jours depuis l'application). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { entity, id } = await params;
  if (!isEntity(entity)) return apiError(404, `Ressource inconnue : ${entity}.`);
  const auth = await authenticate(request, true);
  if ("response" in auth) return auth.response;
  try {
    const { count } = await auth.caller.records.delete({ entity, ids: [id] });
    if (count === 0) return apiError(404, "Fiche introuvable ou hors de votre périmètre.");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return fromTrpc(error);
  }
}
