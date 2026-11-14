import { TERRAIN_TEMPLATE } from "./template.generated";

/** Bronze de sebt : couleur de l'application terrain (« sebt Terrain »), quelle que soit l'entreprise. */
export const TERRAIN_ACCENT = "#82623A";

/** Ancienne couleur par défaut des agents (vert d'origine), remplacée par le bronze de sebt. */
const LEGACY_AGENT_COLOR = "#009C84";

/** Couleur d'un agent : la sienne, sinon le bronze de sebt. */
export function agentColor(color: string | null | undefined): string {
  return !color || color.toUpperCase() === LEGACY_AGENT_COLOR ? TERRAIN_ACCENT : color;
}

/** Icônes de sebt servies par le site (même icône que le logiciel). */
function sebtIcon(size: number): string {
  if (size <= 180) return "/apple-icon.png";
  return size <= 192 ? "/app/icone-192.png" : "/app/icone-512.png";
}

/**
 * Couleurs de sebt (tons chauds, bronze et sable), en clair et en sombre : elles remplacent
 * le vert d'origine du modèle de l'application.
 */
const SEBT_LIGHT = `--base:#F6F1E8;--m1:#EFE2CB;--m2:#F4EDE2;--m3:#EADBC2;
--glass:rgba(255,253,249,.74);--glass-2:rgba(255,253,249,.52);--glass-br:rgba(255,255,255,.86);
--glass-hi:rgba(255,253,249,.94);--barre:rgba(255,252,246,.76);
--ink:#1F1B16;--ink-2:#5C5247;--ink-3:#7A6F62;
--acc:#82623A;--acc-ink:#FFFFFF;--acc-soft:rgba(130,98,58,.13);
--edge:rgba(70,50,25,.22);--edge-2:rgba(70,50,25,.12);
--sep:rgba(70,50,25,.09);--sep-2:rgba(70,50,25,.18);--cell:rgba(255,253,249,.58);
--sh:0 1px 2px rgba(70,50,25,.05),0 10px 28px -16px rgba(70,50,25,.24);--sh-2:0 22px 48px -22px rgba(70,50,25,.42);`;
const SEBT_DARK = `--base:#110E0B;--m1:#2A2016;--m2:#1C1712;--m3:#241C14;
--glass:rgba(255,245,230,.07);--glass-2:rgba(255,245,230,.045);--glass-br:rgba(255,245,230,.13);
--glass-hi:rgba(255,245,230,.17);--barre:rgba(30,24,18,.8);
--ink:#F5EFE4;--ink-2:#C2B6A3;--ink-3:#8F8473;
--acc:#E2C99F;--acc-ink:#1F1B16;--acc-soft:rgba(226,201,159,.14);
--edge:rgba(255,245,230,.28);--edge-2:rgba(255,245,230,.14);
--sep:rgba(255,245,230,.08);--sep-2:rgba(255,245,230,.17);--cell:rgba(255,245,230,.035);`;
const SEBT_STYLE = `<style>
:root{${SEBT_LIGHT}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${SEBT_DARK}}}
:root[data-theme="dark"]{${SEBT_DARK}}
.logo-cx{width:64px;border-radius:16px;margin:0 0 14px}
.art.a1{background:linear-gradient(135deg,#82623A,#E2C99F)}
.jour-hero::before{background:radial-gradient(55% 45% at 50% 88%,var(--acc) 0%,transparent 62%),radial-gradient(45% 40% at 20% 70%,rgba(226,201,159,.9) 0%,transparent 62%),radial-gradient(45% 40% at 82% 72%,rgba(201,169,124,.8) 0%,transparent 62%)}
</style>`;

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
  const base = `/terrain/${org.slug}/`;
  const logo = publicLogo(org.logoUrl);
  const city = (org.city ?? "").trim();
  const firstWord = org.name.split(/\s+/)[0] ?? org.name;
  const quercy = !logo && isQuercyBrand(org.name);
  // L'application est « sebt Terrain » : icônes, logo et couleurs de sebt. Seuls les bons
  // d'intervention (PDF remis aux clients) gardent le logo de l'entreprise.
  return {
    name: org.name,
    shortName: (firstWord.length <= 12 ? firstWord : org.name.slice(0, 12)).trim(),
    initials: initials(org.name),
    footer: city
      ? `${org.name} — ${city}${org.department ? ` (${org.department})` : ""}`
      : org.name,
    city,
    base,
    accent: TERRAIN_ACCENT,
    accentDark: "#E2C99F",
    accentInk: "#FFFFFF",
    accentInkDark: "#1F1B16",
    icon: sebtIcon,
    logo: sebtIcon(512),
    logoPdf: logo
      ? logo.startsWith("data:")
        ? logo
        : null
      : quercy
        ? `${QUERCY_ASSETS}logo-pdf.png`
        : null,
    favicon: "/app/icone-192.png",
    badge: "/app/icone-192.png",
    maskable: "/app/icone-maskable-512.png",
    customAccent: false,
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
  const style = SEBT_STYLE;
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
    name: `sebt Terrain — ${brand.name}`,
    short_name: "sebt Terrain",
    // Adresse sans « / » final : c'est celle que sert le logiciel (l'autre y redirige).
    start_url: brand.base.replace(/\/$/, ""),
    scope: brand.base.replace(/\/$/, ""),
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F1E8",
    theme_color: brand.accent,
    description: `sebt Terrain : pointage, contrôle qualité et bon d'intervention pour les agents de ${brand.name}.`,
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
