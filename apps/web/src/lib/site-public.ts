/**
 * Site public de sebt (accueil, tarifs, pages légales). Réglable avec NEXT_PUBLIC_SITE_URL ;
 * par défaut, l'adresse Netlify en attendant le domaine sebt.cloud.
 */
export const sitePublicUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://sebt-cloud.netlify.app"
).replace(/\/$/, "");

export const pagesLegales = {
  mentions: `${sitePublicUrl}/mentions-legales`,
  confidentialite: `${sitePublicUrl}/confidentialite`,
  cgu: `${sitePublicUrl}/cgu`,
  cgv: `${sitePublicUrl}/cgv`,
} as const;
