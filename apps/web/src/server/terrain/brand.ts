import { DEFAULT_ACCENT, accentPalette } from "@quercy/core";

import { TERRAIN_TEMPLATE } from "./template.generated";

/** Vert d'origine de l'application terrain, gardé tant que l'entreprise n'a pas choisi sa couleur. */
export const TERRAIN_GREEN = "#009C84";

export interface TerrainOrg {
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor?: string | null;
  city?: string | null;
  /** Département, affiché après la ville en pied de page : « Cahors (46) ». */
  department?: string | null;
}

export interface TerrainBrand {
  name: string;
  shortName: string;
  initials: string;
  footer: string;
  city: string;
  base: string;
  accent: string;
  accentDark: string;
  accentInk: string;
  accentInkDark: string;
  icon: (size: number) => string;
  /** Logo affiché à la connexion et dans le menu. */
  logo: string;
  /** Logo de l'en-tête des PDF (même site, sinon aucun). */
  logoPdf: string | null;
  favicon: string;
  /** Petite icône monochrome des notifications. */
  badge: string;
  /** Icône « maskable » (Android), si l'entreprise en a une. */
  maskable: string | null;
  /** Couleur d'accent personnalisée (sinon le vert d'origine). */
  customAccent: boolean;
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Initiales : « Quercy Propreté » → « QP », « Net'Pro » → « NE ». */
export function initials(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length > 0 && !/^(de|du|des|la|le|les|et|d|l)$/i.test(w));
  const letters =
    words.length >= 2 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

/** Logo utilisable comme icône : adresse absolue ou image intégrée (pas un fichier privé). */
export function publicLogo(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https:\/\//.test(url) || /^data:image\/(png|jpeg|webp);/.test(url) ? url : null;
}

/** Fichiers de la marque Quercy Propreté (logo, icônes) servis tels quels par le site. */
export const QUERCY_ASSETS = "/terrain-quercy/";

/** L'entreprise est Quercy Propreté (ou sa démonstration) : elle garde ses logo et icônes. */
export function isQuercyBrand(name: string): boolean {
  return /quercy\s*propret/i.test(name.normalize("NFD").replace(/[̀-ͯ]/g, ""));
}

/** Marque de l'application terrain pour une entreprise : tout vient de ses réglages. */
export function terrainBrand(org: TerrainOrg): TerrainBrand {
  const customAccent = Boolean(
    org.accentColor && org.accentColor.toUpperCase() !== DEFAULT_ACCENT.toUpperCase(),
  );
  const palette = customAccent ? accentPalette(org.accentColor!) : null;
  const base = `/terrain/${org.slug}/`;
  const logo = publicLogo(org.logoUrl);
  const city = (org.city ?? "").trim();
  const firstWord = org.name.split(/\s+/)[0] ?? org.name;
  const quercy = !logo && isQuercyBrand(org.name);
  const icon = (size: number) =>
    logo ?? (quercy ? `${QUERCY_ASSETS}icone-${size}.png` : `${base}icone/${size}`);
  return {
    name: org.name,
    shortName: (firstWord.length <= 12 ? firstWord : org.name.slice(0, 12)).trim(),
    initials: initials(org.name),
    footer: city
      ? `${org.name} — ${city}${org.department ? ` (${org.department})` : ""}`
      : org.name,
    city,
    base,
    accent: palette?.light.primary ?? TERRAIN_GREEN,
    accentDark: palette?.dark.primary ?? "#2FD3B4",
    accentInk: palette?.light.foreground ?? "#FFFFFF",
    accentInkDark: palette?.dark.foreground ?? "#04231E",
    icon,
    logo: logo ?? (quercy ? `${QUERCY_ASSETS}logo.webp` : icon(512)),
    logoPdf: logo
      ? logo.startsWith("data:")
        ? logo
        : null
      : quercy
        ? `${QUERCY_ASSETS}logo-pdf.png`
        : icon(512),
    favicon: logo ?? (quercy ? `${QUERCY_ASSETS}favicon.png` : icon(192)),
    badge: quercy ? `${QUERCY_ASSETS}badge-96.png` : icon(192),
    maskable: quercy ? `${QUERCY_ASSETS}icone-maskable-512.png` : null,
    customAccent,
  };
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** Version sans accents ni caractères spéciaux pour l'en-tête du PDF. */
function pdfName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .toUpperCase();
}

/** Page de l'application terrain, avec le nom, la couleur et les adresses de l'entreprise. */
export function renderTerrainPage(brand: TerrainBrand): string {
  const [r, g, b] = rgb(brand.accent);
  const config = {
    base: brand.base,
    cle: `${brand.base}:`,
    nom: brand.name,
    nomPdf: pdfName(brand.name),
    pied: brand.footer,
    ville: brand.city,
    acc: [r, g, b],
    logo: brand.logo,
    logoPdf: brand.logoPdf,
    icone: brand.icon(180),
    icone192: brand.icon(192),
    badge: brand.badge,
    accFonce: [Math.round(r * 0.77), Math.round(g * 0.77), Math.round(b * 0.77)],
  };
  const style = brand.customAccent
    ? `<style>
:root{--acc:${brand.accent};--acc-ink:${brand.accentInk};--acc-soft:rgba(${r},${g},${b},.13)}
@media (prefers-color-scheme:dark){:root{--acc:${brand.accentDark};--acc-ink:${brand.accentInkDark};--acc-soft:rgba(${rgb(brand.accentDark).join(",")},.14)}}
</style>`
    : "";
  return TERRAIN_TEMPLATE.replaceAll("%%NOM%%", () => escapeHtml(brand.name))
    .replaceAll("%%COURT%%", () => escapeHtml(brand.shortName))
    .replaceAll("%%INITIALES%%", () => escapeHtml(brand.initials))
    .replaceAll("%%BASE%%", () => escapeHtml(brand.base))
    .replaceAll("%%ICONE%%", () => escapeHtml(brand.icon(180)))
    .replaceAll("%%LOGO%%", () => escapeHtml(brand.logo))
    .replaceAll("%%FAVICON%%", () => escapeHtml(brand.favicon))
    .replace("%%STYLE%%", () => style)
    .replace("%%CONFIG%%", () => JSON.stringify(config).replace(/</g, "\\u003c"));
}

/** Manifeste d'installation sur l'écran d'accueil du téléphone. */
export function terrainManifest(brand: TerrainBrand) {
  return {
    name: `${brand.name} — Terrain`,
    short_name: brand.shortName,
    start_url: brand.base,
    scope: brand.base,
    display: "standalone",
    orientation: "portrait",
    background_color: "#EDF3F1",
    theme_color: brand.accent,
    description: `Pointage, contrôle qualité et bon d'intervention pour les agents de ${brand.name}.`,
    lang: "fr",
    icons: [
      ...[192, 512].map((size) => ({
        src: brand.icon(size),
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      })),
      ...(brand.maskable
        ? [{ src: brand.maskable, sizes: "512x512", type: "image/png", purpose: "maskable" }]
        : []),
    ],
  };
}
