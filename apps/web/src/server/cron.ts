import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton des tâches planifiées : dérivé du secret d'authentification (ou CRON_SECRET),
 * connu seulement du serveur et de la fonction planifiée Netlify (netlify/functions/daily.mts).
 */
export function cronToken(): string {
  const secret = process.env.CRON_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET manquant.");
  return createHmac("sha256", secret).update("quercy:cron:v1").digest("hex");
}

export function isCronRequest(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(cronToken());
  return given.length === expected.length && timingSafeEqual(given, expected);
}
