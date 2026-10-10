import type { EntityKey, FilterGroup, SortSpec } from "@quercy/core";

function base64url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** URL d'export de la vue courante (ou d'une sélection). */
export function exportUrl(
  entity: EntityKey,
  format: "csv" | "xlsx",
  state: {
    filter: FilterGroup;
    sort: SortSpec[];
    search?: string;
    columns: string[];
    ids?: string[];
  },
): string {
  return `/api/records/${entity}/export?format=${format}&state=${base64url(JSON.stringify(state))}`;
}
