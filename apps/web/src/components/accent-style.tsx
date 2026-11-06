import { accentPalette } from "@quercy/core";

/**
 * Injecte la couleur d'accent de l'entreprise (thèmes clair et sombre) dans les jetons CSS.
 * La valeur est validée (#RRGGBB) par le schéma des préférences avant d'arriver ici.
 */
export function AccentStyle({ color }: { color: string }) {
  const { light, dark } = accentPalette(color);
  const css = `:root{--brand:${light.primary};--brand-foreground:${light.foreground};--brand-dark:${dark.primary};--brand-dark-foreground:${dark.foreground}}`;
  return <style id="quercy-accent" dangerouslySetInnerHTML={{ __html: css }} />;
}
