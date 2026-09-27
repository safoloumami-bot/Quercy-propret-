import { type Action, type PermissionMatrix, type Resource, can } from "@quercy/core";
import {
  Building2Icon,
  HomeIcon,
  KeyRoundIcon,
  type LucideIcon,
  PaletteIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SwatchBookIcon,
  UserIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Mots-clés supplémentaires pour la palette de commandes. */
  keywords?: string[];
  /** Raccourci de navigation « G puis … ». */
  goKey?: string;
  /** Droit requis pour voir l'écran. */
  permission?: readonly [Resource, Action];
}

export interface NavSection {
  id: string;
  label: string | null;
  items: NavItem[];
}

/** Barre latérale. Un écran n'apparaît ici que lorsqu'il est réellement livré. */
export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    id: "main",
    label: null,
    items: [{ id: "home", href: "/", label: "Accueil", icon: HomeIcon, goKey: "h" }],
  },
];

/** Entrée « Réglages » en pied de barre latérale. */
export const SETTINGS_ENTRY: NavItem = {
  id: "settings",
  href: "/reglages/profil",
  label: "Réglages",
  icon: SettingsIcon,
  goKey: "r",
  keywords: ["paramètres", "préférences"],
};

/** Sous-navigation des réglages. */
export const SETTINGS_SECTIONS: NavSection[] = [
  {
    id: "account",
    label: "Mon compte",
    items: [
      {
        id: "profile",
        href: "/reglages/profil",
        label: "Profil",
        icon: UserIcon,
        keywords: ["nom", "compte"],
      },
      {
        id: "security",
        href: "/reglages/securite",
        label: "Sécurité",
        icon: ShieldCheckIcon,
        keywords: [
          "mot de passe",
          "2fa",
          "double authentification",
          "sessions",
          "supprimer mon compte",
        ],
      },
      {
        id: "appearance",
        href: "/reglages/apparence",
        label: "Apparence",
        icon: PaletteIcon,
        keywords: ["thème", "sombre", "clair", "couleur", "accent"],
      },
    ],
  },
  {
    id: "workspace",
    label: "Espace",
    items: [
      {
        id: "workspace-general",
        href: "/reglages/espace",
        label: "Général",
        icon: Building2Icon,
        keywords: ["entreprise", "modules", "devise", "fuseau", "export", "rgpd"],
        permission: ["settings", "view"],
      },
      {
        id: "members",
        href: "/reglages/membres",
        label: "Membres",
        icon: UsersIcon,
        keywords: ["inviter", "invitation", "utilisateurs", "équipe"],
        goKey: "m",
        permission: ["members", "view"],
      },
      {
        id: "teams",
        href: "/reglages/equipes",
        label: "Équipes",
        icon: UsersRoundIcon,
        keywords: ["services", "groupes"],
        permission: ["members", "view"],
      },
      {
        id: "roles",
        href: "/reglages/roles",
        label: "Rôles et permissions",
        icon: KeyRoundIcon,
        keywords: ["droits", "accès"],
        permission: ["settings", "admin"],
      },
      {
        id: "audit",
        href: "/reglages/audit",
        label: "Journal d'audit",
        icon: ScrollTextIcon,
        keywords: ["historique", "traçabilité"],
        permission: ["audit", "view"],
      },
    ],
  },
  {
    id: "resources",
    label: "Ressources",
    items: [
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

const SETTINGS_ITEMS = SETTINGS_SECTIONS.flatMap((s) => s.items);

/** Tous les écrans (palette de commandes, fil d'Ariane, raccourcis). */
export const NAV_ITEMS: NavItem[] = [
  ...SIDEBAR_SECTIONS.flatMap((s) => s.items),
  SETTINGS_ENTRY,
  ...SETTINGS_ITEMS,
];

export function isAllowed(item: NavItem, permissions: PermissionMatrix): boolean {
  return !item.permission || can(permissions, item.permission[0], item.permission[1]);
}

export function filterSections(
  sections: NavSection[],
  permissions: PermissionMatrix,
): NavSection[] {
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => isAllowed(i, permissions)) }))
    .filter((s) => s.items.length > 0);
}

function matches(item: NavItem, pathname: string): boolean {
  return item.href === "/"
    ? pathname === "/"
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Écran actif pour un chemin (correspondance la plus longue, hors entrée « Réglages »). */
export function activeNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter((item) => item !== SETTINGS_ENTRY && matches(item, pathname)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

export function isSettingsPath(pathname: string): boolean {
  const item = activeNavItem(pathname);
  return Boolean(item && SETTINGS_ITEMS.includes(item));
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Fil d'Ariane d'un chemin. */
export function breadcrumbFor(pathname: string): Crumb[] {
  const item = activeNavItem(pathname);
  if (!item) return [];
  if (SETTINGS_ITEMS.includes(item)) {
    return [
      { label: SETTINGS_ENTRY.label, href: SETTINGS_ENTRY.href },
      { label: item.label, href: item.href },
    ];
  }
  return [{ label: item.label, href: item.href }];
}
