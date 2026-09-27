import "server-only";

import {
  CUSTOM_PREFIX,
  ENTITIES,
  type EntityKey,
  type FieldDef,
  recordTitle,
  relationName,
} from "@quercy/core";

export type RecordRow = Record<string, unknown> & {
  id: string;
  title: string;
  /** Libellés des champs relationnels (responsable, entreprise…). */
  labels: Record<string, string>;
};

function referenceFields(entity: EntityKey): FieldDef[] {
  return ENTITIES[entity].fields.filter((f) => f.type === "user" || f.type === "relation");
}

/** Colonnes nécessaires pour afficher le libellé d'une entité liée. */
function titleSelect(entity: EntityKey) {
  return Object.fromEntries([["id", true], ...ENTITIES[entity].titleFields.map((k) => [k, true])]);
}

/** Inclusions Prisma pour afficher les libellés des relations. */
export function listInclude(entity: EntityKey) {
  return Object.fromEntries(
    referenceFields(entity).map((f) => [
      relationName(f),
      {
        select: f.type === "user" ? { id: true, name: true } : titleSelect(f.relation as EntityKey),
      },
    ]),
  );
}

/** Enregistrement Prisma → ligne à plat (champs personnalisés sous « cf.clé »). */
export function serialize(entity: EntityKey, record: Record<string, unknown>): RecordRow {
  const refs = referenceFields(entity);
  const {
    customFields,
    organizationId: _org,
    deletedAt: _deleted,
    ...rest
  } = record as Record<string, unknown> & { customFields?: Record<string, unknown> };
  const labels: Record<string, string> = {};
  for (const field of refs) {
    const name = relationName(field);
    const related = rest[name] as Record<string, unknown> | null | undefined;
    delete rest[name];
    if (!related) continue;
    labels[field.key] =
      field.type === "user"
        ? String(related.name ?? "")
        : recordTitle(field.relation as EntityKey, related);
  }
  const row: RecordRow = {
    ...rest,
    id: String(rest.id),
    title: recordTitle(entity, rest),
    labels,
  };
  for (const [key, value] of Object.entries(customFields ?? {}))
    row[`${CUSTOM_PREFIX}${key}`] = value;
  return row;
}
