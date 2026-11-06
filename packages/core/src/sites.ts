/**
 * Fiche de site : catégories d'informations et visibilité. Chaque information est visible
 * par les agents du site, par un agent précis, ou par les seuls responsables.
 */
export const SITE_INFO_CATEGORIES = [
  { value: "access", label: "Accès, eau, électricité" },
  { value: "keys", label: "Clés, badges, codes" },
  { value: "instructions", label: "Consignes" },
  { value: "surfaces", label: "Surfaces, sols, zones" },
  { value: "products", label: "Produits" },
  { value: "equipment", label: "Matériel" },
  { value: "safety", label: "Sécurité, risques" },
  { value: "proof", label: "Preuves attendues" },
  { value: "contact", label: "Contacts sur place" },
  { value: "team", label: "Équipe, remplaçants" },
  { value: "other", label: "Autres informations" },
] as const;
export type SiteInfoCategory = (typeof SITE_INFO_CATEGORIES)[number]["value"];

export const SITE_INFO_VISIBILITIES = [
  { value: "site_agents", label: "Agents du site" },
  { value: "agent", label: "Un agent précis" },
  { value: "managers", label: "Responsables seulement" },
] as const;
export type SiteInfoVisibility = (typeof SITE_INFO_VISIBILITIES)[number]["value"];

/** Une information est-elle visible par cette personne ? */
export function siteInfoVisible(
  info: { visibility: string; agentId: string | null },
  viewer: { userId: string; manager: boolean; siteAgent: boolean },
): boolean {
  if (viewer.manager) return true;
  if (info.visibility === "managers") return false;
  if (info.visibility === "agent") return info.agentId === viewer.userId;
  return viewer.siteAgent;
}

/** Catégorie et visibilité d'une colonne de l'ancien fichier de pilotage (V12). */
export function v12InfoCategory(header: string): {
  category: SiteInfoCategory;
  visibility: SiteInfoVisibility;
} {
  const h = header.toLowerCase();
  const agents = (category: SiteInfoCategory) => ({ category, visibility: "site_agents" as const });
  if (/preuve/.test(h)) return agents("proof");
  if (/^eau$|électricité|accès|horaires/.test(h)) return agents("access");
  if (
    /sol|surface|matière|vitrage|sanitaire|kitchenette|poubelle|déchet|extérieur|zone|niveau|configuration/.test(
      h,
    )
  )
    return agents("surfaces");
  if (/produit/.test(h)) return agents("products");
  if (/matériel/.test(h)) return agents("equipment");
  if (/sécurité|risque|hauteur/.test(h)) return agents("safety");
  if (/consigne|prestation|anomalie/.test(h)) return agents("instructions");
  if (/contact/.test(h)) return agents("contact");
  if (/remplaçant/.test(h)) return { category: "team", visibility: "managers" };
  return { category: "other", visibility: "managers" };
}
