/**
 * Fonction planifiée Netlify : garde le serveur du logiciel éveillé pendant les heures de
 * travail. Un serveur endormi met 8 à 12 secondes à répondre au premier clic ; éveillé, il
 * répond en 0,2 seconde. Trois appels simultanés gardent plusieurs instances prêtes (une page
 * fait souvent plusieurs requêtes en même temps). Aucun accès à la base de données.
 */
export default async function reveil() {
  const site = process.env.URL;
  if (!site) return new Response("URL manquante.", { status: 500 });
  await Promise.all(
    [0, 1, 2].map(() => fetch(`${site}/api/ping`, { cache: "no-store" }).catch(() => undefined)),
  );
  return new Response("ok");
}

// Toutes les 5 minutes, du lundi au samedi, de 5 h à 19 h 59 UTC (6 h ou 7 h à 21 h à Paris).
export const config = { schedule: "*/5 5-19 * * 1-6" };
