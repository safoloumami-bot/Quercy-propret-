import "server-only";

import { prisma } from "@quercy/db";

import { parsePreferences } from "../workspace";
import { type TerrainBrand, terrainBrand } from "./brand";

/** Entreprise servie par l'application terrain (adresse /terrain/<espace>). */
export async function terrainOrg(slug: string) {
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const org = await prisma.organization.findFirst({
    where: { slug, deletedAt: null },
    include: { salesSettings: { select: { city: true, postalCode: true } } },
  });
  // L'application terrain fait partie du module Nettoyage.
  if (!org || !org.modules.includes("cleaning")) return null;
  return org;
}

/** Même chose à partir de l'identifiant (tâches planifiées). */
export async function loadTerrainOrgById(id: string) {
  const org = await prisma.organization.findFirst({
    where: { id, deletedAt: null },
    include: { salesSettings: { select: { city: true, postalCode: true } } },
  });
  return org && org.modules.includes("cleaning") ? org : null;
}

export type TerrainOrgRow = NonNullable<Awaited<ReturnType<typeof terrainOrg>>>;

/** Nom, couleur, ville et logo de l'entreprise, pris dans ses réglages du logiciel. */
export function terrainBrandOf(org: TerrainOrgRow): TerrainBrand {
  const city = org.salesSettings?.city?.trim();
  const department = org.salesSettings?.postalCode?.trim().slice(0, 2);
  return terrainBrand({
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    accentColor: parsePreferences(org.preferences).accentColor,
    city: city ?? null,
    department: department && /^\d{2}$/.test(department) ? department : null,
  });
}
