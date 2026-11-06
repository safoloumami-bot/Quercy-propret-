import * as Sentry from "@sentry/nextjs";

/**
 * Suivi des erreurs (Sentry, région UE). Actif seulement si NEXT_PUBLIC_SENTRY_DSN est défini :
 * en local et en test, rien n'est envoyé. Aucune donnée personnelle n'est jointe aux erreurs.
 */
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.CONTEXT ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
