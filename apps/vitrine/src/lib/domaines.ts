// Disponibilité simulée et déterministe. En production : API du registrar revendeur
// (ex. IONOS Domains API, OpenSRS, Gandi) via une route serveur.

export function nettoyerNomDomaine(saisie: string) {
  return saisie
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(".")[0]!
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const pris = ["google", "amazon", "facebook", "apple", "sebt", "orange", "free", "test"];

export function disponibiliteDomaine(nom: string) {
  const base = nom.split(".")[0]!;
  if (pris.includes(base) || base.length <= 3) return false;
  if (nom.endsWith(".com") && base.length < 8) return false;
  return hash(nom) % 5 !== 0;
}
