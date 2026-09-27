import "server-only";

import { CUSTOM_PREFIX, type EntityKey, recordTitle } from "@quercy/core";

export type RecordRow = Record<string, unknown> & {
  id: string;
  title: string;
  /** Libellés des champs relationnels (responsable, entreprise…). */
  labels: Record<string, string>;
};

/** Inclusions Prisma pour afficher les libellés des relations. */
export function listInclude(entity: EntityKey) {
  return entity === "contact"
    ? { owner: { select: { id: true, name: true } }, company: { select: { id: true, name: true } } }
    : { owner: { select: { id: true, name: true } } };
}

/** Enregistrement Prisma → ligne à plat (champs personnalisés sous « cf.clé »). */
export function serialize(entity: EntityKey, record: Record<string, unknown>): RecordRow {
  const {
    customFields,
    owner,
    company,
    organizationId: _org,
    deletedAt: _deleted,
    ...rest
  } = record as Record<string, unknown> & {
    customFields?: Record<string, unknown>;
    owner?: { name: string } | null;
    company?: { name: string } | null;
  };
  const row: RecordRow = {
    ...rest,
    id: String(rest.id),
    title: recordTitle(entity, rest),
    labels: {},
  };
  for (const [key, value] of Object.entries(customFields ?? {}))
    row[`${CUSTOM_PREFIX}${key}`] = value;
  if (owner) row.labels.ownerId = owner.name;
  if (company) row.labels.companyId = company.name;
  return row;
}
