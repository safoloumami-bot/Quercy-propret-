import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "../env";

let client: Anthropic | null = null;

/** L'assistant est-il configuré (clé d'API présente) ? */
export function aiConfigured(): boolean {
  return Boolean(env().ANTHROPIC_API_KEY);
}

/** Client de l'API Claude (une instance par processus). */
export function anthropic(): Anthropic {
  const e = env();
  if (!e.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY manquante.");
  client ??= new Anthropic({
    apiKey: e.ANTHROPIC_API_KEY,
    baseURL: e.ANTHROPIC_BASE_URL,
    maxRetries: 2,
  });
  return client;
}

export function aiModel(): string {
  return env().AI_MODEL;
}

export function aiEffort() {
  return env().AI_EFFORT;
}

/**
 * Repli automatique côté serveur si le modèle principal décline une demande (catégorie de
 * refus) : réservé aux modèles qui le proposent.
 */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";
