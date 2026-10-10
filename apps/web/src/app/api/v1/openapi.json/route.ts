import { NextResponse } from "next/server";

import { openApiDocument } from "@/server/api/openapi";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

/** Description OpenAPI de l'API publique (sans authentification). */
export function GET() {
  return NextResponse.json(openApiDocument(env().APP_URL), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
