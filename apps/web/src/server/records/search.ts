import "server-only";

import type { EntityDef } from "@quercy/core";

/** Recherche rapide (barre de recherche du tableau) sur les champs de recherche de l'entité. */
export function searchWhere(def: EntityDef, search: string | undefined): Record<string, unknown> {
  const terms = (search ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (terms.length === 0) return {};
  // Chaque mot doit apparaître dans au moins un champ (« marie dupont » trouve Marie Dupont).
  return {
    AND: terms.map((term) => ({
      OR: def.searchFields.map((field) => ({ [field]: { contains: term, mode: "insensitive" } })),
    })),
  };
}
