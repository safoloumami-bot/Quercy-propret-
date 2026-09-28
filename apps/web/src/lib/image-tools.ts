"use client";

/** Taille maximale (côté le plus long) des images enregistrées dans une fiche. */
const MAX_SIDE = 400;
/** Écart de couleur (0–441) en dessous duquel un pixel de bord est considéré comme du fond. */
const TOLERANCE = 38;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible."));
    };
    img.src = url;
  });
}

/**
 * Retire un fond uni ou presque (photo produit sur fond blanc, gris, coloré) : remplissage
 * depuis les bords de l'image avec une tolérance de couleur, puis adoucissement du contour.
 * Les zones de la même couleur à l'intérieur de l'objet sont conservées (non reliées au bord).
 */
export function removeBackground(data: ImageData): ImageData {
  const { width, height, data: px } = data;
  const at = (x: number, y: number) => (y * width + x) * 4;
  // Couleur de fond : moyenne des quatre coins.
  const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)];
  const bg = [0, 1, 2].map((c) => corners.reduce((s, i) => s + px[i + c]!, 0) / corners.length);
  const distance = (i: number) =>
    Math.hypot(px[i]! - bg[0]!, px[i + 1]! - bg[1]!, px[i + 2]! - bg[2]!);

  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const k = y * width + x;
    if (visited[k]) return;
    visited[k] = 1;
    stack.push(k);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const k = stack.pop()!;
    const i = k * 4;
    const d = distance(i);
    if (d > TOLERANCE * 1.6 || px[i + 3] === 0) {
      if (px[i + 3] === 0) {
        // Déjà transparent : on continue la propagation.
      } else continue;
    }
    // Contour adouci : transparence partielle près du seuil.
    px[i + 3] =
      d <= TOLERANCE
        ? 0
        : Math.min(px[i + 3]!, Math.round(((d - TOLERANCE) / (TOLERANCE * 0.6)) * 255));
    if (d > TOLERANCE) continue;
    const x = k % width;
    const y = (k - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  return data;
}

/**
 * Prépare une image pour une fiche : redimensionnée (400 px au plus), fond retiré si demandé,
 * encodée en PNG (transparence conservée). Les SVG sont gardés tels quels.
 */
export async function prepareImage(file: File, stripBackground: boolean): Promise<string> {
  if (!file.type.startsWith("image/"))
    throw new Error("Choisissez une image (PNG, JPEG, WebP ou SVG).");
  if (file.size > 15 * 1024 * 1024) throw new Error("Image trop lourde (15 Mo au plus).");
  if (file.type === "image/svg+xml") {
    if (file.size > 400_000) throw new Error("SVG trop lourd (400 Ko au plus).");
    const text = await file.text();
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
  }
  const img = await loadImage(file);
  let side = MAX_SIDE;
  for (;;) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (stripBackground) {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.putImageData(removeBackground(data), 0, 0);
    }
    const url = canvas.toDataURL("image/png");
    if (url.length <= 650_000 || side <= 160) return url;
    side = Math.round(side * 0.75);
  }
}
