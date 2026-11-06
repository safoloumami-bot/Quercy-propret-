import { filterGroupSchema } from "@quercy/core";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiError, authenticate, fromTrpc, isEntity } from "@/server/api/keys";

export const dynamic = "force-dynamic";

/** Liste paginée : ?limit=50&offset=0&search=…&sort=champ:asc&filter={…} (JSON). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;
  if (!isEntity(entity)) return apiError(404, `Ressource inconnue : ${entity}.`);
  const auth = await authenticate(request, false);
  if ("response" in auth) return auth.response;
  const q = request.nextUrl.searchParams;
  const limit = Math.min(200, Math.max(1, Number(q.get("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(q.get("offset") ?? 0) || 0);
  let filter = { combinator: "and" as const, rules: [] };
  if (q.get("filter")) {
    try {
      const parsed = filterGroupSchema.safeParse(JSON.parse(q.get("filter")!));
      if (!parsed.success) return apiError(400, "Filtre invalide.");
      filter = parsed.data as typeof filter;
    } catch {
      return apiError(400, "Filtre illisible (JSON attendu).");
    }
  }
  const sort = (q.get("sort") ?? "")
    .split(",")
    .filter(Boolean)
    .map((s) => {
      const [field, direction] = s.split(":");
      return {
        field: field!,
        direction: direction === "desc" ? ("desc" as const) : ("asc" as const),
      };
    });
  try {
    const result = await auth.caller.records.list({
      entity,
      filter,
      sort,
      search: q.get("search") ?? undefined,
      limit,
      cursor: offset,
    });
    return NextResponse.json({
      data: result.rows,
      total: result.total,
      offset,
      limit,
      nextOffset: result.nextCursor,
    });
  } catch (error) {
    return fromTrpc(error);
  }
}

/** Création : corps JSON des valeurs par clé de champ (montants en euros). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;
  if (!isEntity(entity)) return apiError(404, `Ressource inconnue : ${entity}.`);
  const auth = await authenticate(request, true);
  if ("response" in auth) return auth.response;
  const values = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!values || typeof values !== "object" || Array.isArray(values))
    return apiError(400, 'Corps JSON attendu : { "champ": valeur }.');
  try {
    return NextResponse.json(
      { data: await auth.caller.records.create({ entity, values }) },
      { status: 201 },
    );
  } catch (error) {
    return fromTrpc(error);
  }
}
