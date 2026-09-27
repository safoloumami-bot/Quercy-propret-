import { HomeIcon, type LucideIcon, PaletteIcon, SwatchBookIcon } from "lucide-react";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Mots-clés supplémentaires pour la palette de commandes. */
  keywords?: string[];
  /** Raccourci de navigation « G puis … ». */
  goKey?: string;
}

export interface NavSection {
  id: string;
  label: string | null;
  items: NavItem[];
}

/** Écrans disponibles. Un écran n'apparaît ici que lorsqu'il est réellement livré. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "main",
    label: null,
    items: [{ id: "home", href: "/", label: "Accueil", icon: HomeIcon, goKey: "h" }],
  },
  {
    id: "settings",
    label: "Réglages",
    items: [
      {
        id: "appearance",
        href: "/reglages/apparence",
        label: "Apparence",
        icon: PaletteIcon,
        keywords: ["thème", "sombre", "clair", "couleur", "accent", "réglages"],
        goKey: "r",
      },
      {
        id: "design-system",
        href: "/design-system",
        label: "Design system",
        icon: SwatchBookIcon,
        keywords: ["composants", "jetons", "tokens", "couleurs", "typographie"],
        goKey: "d",
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

/** Élément de navigation actif pour un chemin (correspondance la plus longue). */
export function activeNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Fil d'Ariane d'un chemin. */
export function breadcrumbFor(pathname: string): Crumb[] {
  const item = activeNavItem(pathname);
  if (!item) return [];
  const section = NAV_SECTIONS.find((s) => s.items.includes(item));
  const crumbs: Crumb[] = [];
  if (section?.label) crumbs.push({ label: section.label });
  crumbs.push({ label: item.label, href: item.href });
  return crumbs;
}

export function navItemByGoKey(key: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.goKey === key.toLowerCase());
}
