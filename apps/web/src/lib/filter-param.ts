import { type EntityKey, type FilterGroup, entityPath, filterGroupSchema } from "@quercy/core";

/** Paramètre d'URL portant un filtre de liste (clic sur un chiffre ou une barre). */
export const FILTER_PARAM = "filtre";

/** Adresse d'une liste ouverte avec un filtre. */
export function filteredListHref(entity: EntityKey, filter: FilterGroup | null): string {
  const base = entityPath(entity);
  if (!filter || filter.rules.length === 0) return base;
  return `${base}?${FILTER_PARAM}=${encodeURIComponent(JSON.stringify(filter))}`;
}

/** Lit le filtre d'une URL ; null s'il est absent ou invalide (jamais d'erreur visible). */
export function readFilterParam(value: string | null | undefined): FilterGroup | null {
  if (!value) return null;
  try {
    const parsed = filterGroupSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
