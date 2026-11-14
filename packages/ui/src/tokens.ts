/**
 * Référence typée des jetons du design system (affichés dans /design-system).
 * Les valeurs vivent dans styles/globals.css ; ce fichier n'en liste que les noms.
 */
export const COLOR_TOKENS = [
  { name: "background", label: "Fond", fg: "foreground" },
  { name: "card", label: "Carte", fg: "card-foreground" },
  { name: "popover", label: "Popover", fg: "popover-foreground" },
  { name: "primary", label: "Accent (entreprise)", fg: "primary-foreground" },
  { name: "secondary", label: "Secondaire", fg: "secondary-foreground" },
  { name: "muted", label: "Atténué", fg: "muted-foreground" },
  { name: "accent", label: "Survol", fg: "accent-foreground" },
  { name: "success", label: "Succès", fg: "success-foreground" },
  { name: "warning", label: "Avertissement", fg: "warning-foreground" },
  { name: "destructive", label: "Danger", fg: "destructive-foreground" },
  { name: "info", label: "Information", fg: "info-foreground" },
  { name: "sidebar", label: "Barre latérale", fg: "sidebar-foreground" },
] as const;

export const CHART_TOKENS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
] as const;

export const RADIUS_TOKENS = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
] as const;

export const SHADOW_TOKENS = [
  { name: "xs", className: "shadow-xs" },
  { name: "sm", className: "shadow-sm" },
  { name: "md", className: "shadow-md" },
  { name: "lg", className: "shadow-lg" },
] as const;

export const TYPE_SCALE = [
  { className: "text-2xl font-semibold tracking-tight", label: "Titre de page — 24/600" },
  { className: "text-lg font-semibold tracking-tight", label: "Titre de section — 18/600" },
  { className: "text-base font-medium", label: "Sous-titre — 16/500" },
  { className: "text-sm", label: "Texte courant — 14/400" },
  { className: "text-xs text-muted-foreground", label: "Légende — 12/400" },
  { className: "font-mono text-xs", label: "Code et numéros — mono 12" },
] as const;
