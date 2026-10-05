import { ImageResponse } from "next/og";

import { terrainBrandOf, terrainOrg } from "@/server/terrain/org";

export const dynamic = "force-dynamic";

const SIZES = new Set([180, 192, 512]);

/**
 * Icône de l'application sur l'écran d'accueil : initiales de l'entreprise sur sa couleur,
 * avec une petite étincelle (le propre). Remplacée par le logo de l'entreprise s'il est public.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; taille: string }> },
) {
  const { slug, taille } = await params;
  const size = Number(taille);
  const org = await terrainOrg(slug);
  if (!org || !SIZES.has(size)) return new Response("Introuvable.", { status: 404 });
  const brand = terrainBrandOf(org);
  const unit = size / 100;
  const darker = `#${[1, 3, 5]
    .map((i) =>
      Math.round(parseInt(brand.accent.slice(i, i + 2), 16) * 0.72)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(150deg, ${brand.accent} 35%, ${darker} 100%)`,
        position: "relative",
      }}
    >
      <svg
        width={18 * unit}
        height={18 * unit}
        viewBox="0 0 24 24"
        style={{ position: "absolute", top: 17 * unit, right: 17 * unit }}
      >
        <path
          d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z"
          fill="white"
        />
      </svg>
      <div
        style={{
          color: brand.accentInk,
          fontSize: 44 * unit,
          fontWeight: 700,
          letterSpacing: -2 * unit,
          lineHeight: 1,
        }}
      >
        {brand.initials}
      </div>
    </div>,
    {
      width: size,
      height: size,
      headers: { "cache-control": "public, max-age=86400" },
    },
  );
}
