// Petits outils de couleur pour les sites générés (mélange, luminance, contraste WCAG).

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function hex([r, g, b]: [number, number, number]) {
  return "#" + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
}

/** Mélange `a` et `b` : t = 0 donne a, t = 1 donne b. */
export function melanger(a: string, b: string, t: number) {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export function luminance(c: string) {
  const v = rgb(c).map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
}

export function contraste(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

/** Couleur de texte lisible sur un fond donné : `sombre` ou blanc, selon le meilleur contraste. */
export function texteSur(fond: string, sombre = "#141414") {
  return contraste(fond, "#ffffff") >= contraste(fond, sombre) ? "#ffffff" : sombre;
}

/** Ajuste `couleur` vers `vers` jusqu'à atteindre le contraste demandé sur `fond`. */
export function lisible(couleur: string, fond: string, vers: string, cible = 4.5) {
  let c = couleur;
  for (let t = 0.1; contraste(c, fond) < cible && t <= 1; t += 0.1) c = melanger(couleur, vers, t);
  return c;
}
