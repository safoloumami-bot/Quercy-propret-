/**
 * Outils couleur pour la couleur d'accent personnalisable :
 * calcul d'une couleur de texte lisible (contraste WCAG) sur l'accent.
 */

function channel(hex: string, index: number): number {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

function linear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminance relative WCAG 2.1 d'une couleur #RRGGBB. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [0, 1, 2].map((i) => linear(channel(hex, i))) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/** Texte blanc ou quasi-noir, celui qui contraste le mieux sur `background`. */
export function readableForeground(background: string): "#FFFFFF" | "#0A0F0E" {
  return contrastRatio(background, "#FFFFFF") >= contrastRatio(background, "#0A0F0E")
    ? "#FFFFFF"
    : "#0A0F0E";
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = [0, 1, 2].map((i) => channel(hex, i)) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)]
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

export interface AccentPalette {
  light: { primary: string; foreground: string };
  dark: { primary: string; foreground: string };
}

/**
 * Déclinaisons claire et sombre d'une couleur d'accent d'entreprise.
 * En thème sombre, l'accent est éclairci pour rester lisible sur fond foncé.
 */
export function accentPalette(hex: string): AccentPalette {
  const [h, s, l] = toHsl(hex);
  const light = l > 0.62 ? fromHsl(h, s, 0.42) : hex.toUpperCase();
  const dark = fromHsl(h, Math.min(1, s * 1.05), Math.min(0.68, Math.max(0.52, l + 0.3)));
  return { light: withReadableText(light), dark: withReadableText(dark) };
}

/** Ajuste légèrement la luminosité jusqu'à obtenir un contraste AA (4,5:1) avec le texte. */
function withReadableText(hex: string): { primary: string; foreground: string } {
  const foreground = readableForeground(hex);
  const [h, s, initial] = toHsl(hex);
  let primary = hex;
  let l = initial;
  const step = foreground === "#FFFFFF" ? -0.01 : 0.01;
  while (contrastRatio(primary, foreground) < 4.5 && l > 0 && l < 1) {
    l += step;
    primary = fromHsl(h, s, Math.min(1, Math.max(0, l)));
  }
  return { primary, foreground };
}
