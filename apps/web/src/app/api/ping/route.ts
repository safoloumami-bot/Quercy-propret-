export const dynamic = "force-dynamic";

/**
 * Réponse immédiate, sans base de données : sert à garder le serveur éveillé (fonction
 * planifiée netlify/functions/reveil.mts) pour éviter l'attente du premier clic.
 */
export function GET() {
  return new Response("ok", { headers: { "cache-control": "no-store" } });
}
