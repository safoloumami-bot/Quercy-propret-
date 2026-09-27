import type { EntityKey, FieldDef } from "@quercy/core";

/** Ligne telle que renvoyée par l'API (champs à plat, champs personnalisés sous « cf.clé »). */
export type Row = Record<string, unknown> & {
  id: string;
  title: string;
  labels: Record<string, string>;
};

export interface EntityPermissions {
  create: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
}

export interface EntityProps {
  entity: EntityKey;
  fields: FieldDef[];
  permissions: EntityPermissions;
}
