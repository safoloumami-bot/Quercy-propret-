import "server-only";

import { GENERAL_TRADE_KEY, type TradePreset, mergeTradePresets } from "@quercy/core";
import { prisma } from "@quercy/db";

/**
 * Préréglages de corps de métier en vigueur : ceux d'origine (code) remplacés ou complétés
 * par ceux que l'équipe a enregistrés dans l'administration. Gardés 60 secondes en mémoire ;
 * l'administration vide ce cache à chaque modification.
 */
let cache: { at: number; presets: TradePreset[] } | null = null;
const TTL = 60_000;

export async function listTradePresets(): Promise<TradePreset[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.presets;
  const rows = await prisma.tradePreset.findMany();
  const presets = mergeTradePresets(rows);
  cache = { at: Date.now(), presets };
  return presets;
}

export function clearTradePresetCache(): void {
  cache = null;
}

/** Préréglage actif de cette clé, ou null (clé inconnue ou métier désactivé). */
export async function findTradePreset(key: string | null | undefined): Promise<TradePreset | null> {
  if (!key) return null;
  const preset = (await listTradePresets()).find((p) => p.key === key);
  return preset?.active ? preset : null;
}

/** Préréglage d'un espace : son métier, sinon la base neutre (« Autre activité »). */
export async function tradePresetFor(key: string | null | undefined): Promise<TradePreset> {
  const presets = await listTradePresets();
  return (
    presets.find((p) => p.key === key && p.active) ??
    presets.find((p) => p.key === GENERAL_TRADE_KEY)!
  );
}
