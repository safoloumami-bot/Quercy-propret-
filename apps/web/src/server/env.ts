import "server-only";

import { z } from "zod";

/** Variables d'environnement du serveur, validées au premier accès. */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  /** URL publique vue par le serveur (liens des emails, origine de confiance). Par défaut : NEXT_PUBLIC_APP_URL. */
  BETTER_AUTH_URL: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32, {
    error: "BETTER_AUTH_SECRET doit faire au moins 32 caractères (openssl rand -base64 32).",
  }),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().default("common"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Quercy <no-reply@quercy.app>"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTH: z.string().optional(),
  STRIPE_PRICE_PRO_YEAR: z.string().optional(),
  STRIPE_PRICE_BUSINESS_MONTH: z.string().optional(),
  STRIPE_PRICE_BUSINESS_YEAR: z.string().optional(),
  /** Adresse de contact commercial (offre Entreprise). */
  SALES_EMAIL: z.string().default("commercial@quercy.app"),
  /** Limitation de débit des connexions. « off » uniquement pour les tests E2E, jamais en production. */
  AUTH_RATE_LIMIT: z.enum(["on", "off"]).default("on"),
  ENABLE_DEV_MAILBOX: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof schema> & { APP_URL: string };

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Configuration invalide : ${parsed.error.issues.map((i) => `${i.path.join(".")} — ${i.message}`).join(" ; ")}`,
      );
    }
    cached = {
      ...parsed.data,
      APP_URL: parsed.data.BETTER_AUTH_URL ?? parsed.data.NEXT_PUBLIC_APP_URL,
    };
  }
  return cached;
}

/** Fournisseurs de connexion configurés (les boutons n'apparaissent que pour ceux-là). */
export function socialProviders(): { google: boolean; microsoft: boolean } {
  const e = env();
  return {
    google: Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET),
    microsoft: Boolean(e.MICROSOFT_CLIENT_ID && e.MICROSOFT_CLIENT_SECRET),
  };
}

/** La boîte de réception de développement n'est active que sans Resend et sur demande. */
export function devMailboxEnabled(): boolean {
  const e = env();
  return e.ENABLE_DEV_MAILBOX && !e.RESEND_API_KEY;
}
