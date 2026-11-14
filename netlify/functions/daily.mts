/**
 * Ancienne fonction planifiée Netlify. Les tâches quotidiennes (planning des contrats,
 * factures récurrentes et relances, rapports programmés, corbeille) sont désormais lancées
 * par l'hébergement Render (RUN_DAILY_ON_PING, voir apps/web/src/server/daily-on-ping.ts).
 * Cette fonction ne fait plus rien : elle évite seulement les envois en double tant que
 * l'ancien site Netlify existe encore.
 */
export default function daily() {
  return new Response("Tâches quotidiennes lancées par Render.");
}

// 5 h UTC : 6 h ou 7 h à Paris selon la saison.
export const config = { schedule: "0 5 * * *" };
