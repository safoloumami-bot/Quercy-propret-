import { prisma } from "@quercy/db";
import { NextResponse } from "next/server";

import { env } from "@/server/env";
import { findPublishedSite } from "@/server/website";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Contenu publié d'un site, pour l'application qui affiche les sites des entreprises.
 * `host` : sous-domaine complet (dupont-plomberie.sebt.site) ou domaine personnel.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const found = await findPublishedSite(decodeURIComponent(host));
  if (!found)
    return NextResponse.json({ error: "Site introuvable." }, { status: 404, headers: CORS });
  const { site, content, theme } = found;

  const services = content.services.fromCatalog
    ? await prisma.product.findMany({
        where: {
          organizationId: site.organizationId,
          deletedAt: null,
          active: true,
          // Les prestations seulement (pas le matériel vendu).
          type: "service",
          ...(content.services.categories.length
            ? { category: { in: content.services.categories } }
            : {}),
        },
        select: { name: true, description: true, unit: true, unitPrice: true, category: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
        take: 60,
      })
    : [];

  const base = env().APP_URL.replace(/\/$/, "");
  return NextResponse.json(
    {
      slug: site.slug,
      domains: site.domains,
      publishedAt: site.publishedAt,
      theme,
      content,
      catalog: services.map((p) => ({
        name: p.name,
        description: p.description,
        category: p.category,
        unit: p.unit,
        price: content.services.showPrices ? p.unitPrice : null,
      })),
      imageBase: `${base}/api/public/sites/images/`,
    },
    { headers: { ...CORS, "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
  );
}
