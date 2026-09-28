import { createHmac } from "node:crypto";

/**
 * Fonction planifiée Netlify : chaque matin, déclenche les tâches quotidiennes de Quercy
 * (planning des contrats d'entretien, factures récurrentes et relances, rapports
 * programmés, corbeille) via /api/cron/<tâche>.
 * Remplace le worker quand l'application est hébergée seulement sur Netlify.
 */
const JOBS = ["cleaning-daily", "sales-daily", "reports-daily", "purge-trash"];

export default async function daily() {
  const secret = process.env.CRON_SECRET || process.env.BETTER_AUTH_SECRET;
  const site = process.env.URL;
  if (!secret || !site) {
    console.error("Tâches quotidiennes : BETTER_AUTH_SECRET ou URL manquant.");
    return new Response("Configuration incomplète.", { status: 500 });
  }
  const token = createHmac("sha256", secret).update("quercy:cron:v1").digest("hex");
  for (const job of JOBS) {
    const response = await fetch(`${site}/api/cron/${job}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    console.info(`Tâche ${job} : ${response.status} ${await response.text()}`.slice(0, 500));
  }
  return new Response("ok");
}

// 5 h UTC : 6 h ou 7 h à Paris selon la saison.
export const config = { schedule: "0 5 * * *" };
