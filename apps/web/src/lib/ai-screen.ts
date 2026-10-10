import { ENTITIES, ENTITY_KEYS, type EntityKey, MODULES } from "@quercy/core";

import type { AiStreamEvent } from "./ai-types";

/** Segments qui ne sont pas des identifiants de fiche (pages spéciales d'un module). */
const NOT_IDS = new Set(["nouveau", "parametres", "doublons", "corbeille"]);

/** Entité (et fiche) affichée à une adresse donnée, d'après le registre des entités. */
export function screenFromPath(pathname: string): { entity?: EntityKey; recordId?: string } {
  const [moduleSlug, entitySlug, id] = pathname.split("?")[0]!.split("/").filter(Boolean);
  if (!moduleSlug || !entitySlug) return {};
  const entity = ENTITY_KEYS.find(
    (key) => MODULES[ENTITIES[key].module].slug === moduleSlug && ENTITIES[key].slug === entitySlug,
  );
  if (!entity) return {};
  return id && !NOT_IDS.has(id) ? { entity, recordId: id } : { entity };
}

/**
 * Découpe un flux Server-Sent Events : renvoie les événements complets et le reste (partiel)
 * à compléter avec les prochains octets. Les lignes illisibles sont ignorées.
 */
export function parseSse(buffer: string): { events: AiStreamEvent[]; rest: string } {
  const chunks = buffer.split("\n\n");
  const rest = chunks.pop() ?? "";
  const events: AiStreamEvent[] = [];
  for (const chunk of chunks) {
    const data = chunk
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      events.push(JSON.parse(data) as AiStreamEvent);
    } catch {
      // Fragment corrompu : ignoré, la suite du flux reste lisible.
    }
  }
  return { events, rest };
}
