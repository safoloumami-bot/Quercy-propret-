import {
  type Action,
  ENTITIES,
  type EntityKey,
  type FieldDef,
  type Scope,
  entityFields,
  grantedScope,
  permissionMatrixSchema,
} from "@quercy/core";
import { type TenantClient, forTenant, prisma } from "@quercy/db";

export type Delegate = TenantClient["company"];

/**
 * Délégué Prisma (déjà restreint à l'espace) d'une entité. Pour les entités qui partagent une
 * table (documents commerciaux), la restriction `baseWhere` est ajoutée à chaque requête et
 * les valeurs `createDefaults` à chaque création.
 */
export function entityDelegate(db: TenantClient, entity: EntityKey): Delegate {
  const def = ENTITIES[entity];
  // Tous les délégués partagent l'API utilisée ici (findMany, count, groupBy, create, update…).
  const model = (db as unknown as Record<string, Delegate>)[def.model]!;
  const base = def.baseWhere;
  if (!base) return model;
  const scoped = (args: Record<string, unknown> | undefined) => ({
    ...args,
    where: { ...(args?.where as Record<string, unknown> | undefined), ...base },
  });
  const withDefaults = (data: unknown) => ({ ...(data as object), ...def.createDefaults });
  const wrapped = {
    findMany: (a?: Record<string, unknown>) => model.findMany(scoped(a) as never),
    findFirst: (a?: Record<string, unknown>) => model.findFirst(scoped(a) as never),
    count: (a?: Record<string, unknown>) => model.count(scoped(a) as never),
    groupBy: (a: Record<string, unknown>) => model.groupBy(scoped(a) as never),
    aggregate: (a: Record<string, unknown>) => model.aggregate(scoped(a) as never),
    updateMany: (a: Record<string, unknown>) => model.updateMany(scoped(a) as never),
    update: (a: Record<string, unknown>) => model.update(scoped(a) as never),
    create: (a: Record<string, unknown>) =>
      model.create({ ...a, data: withDefaults(a.data) } as never),
    createMany: (a: Record<string, unknown> & { data: unknown[] }) =>
      model.createMany({ ...a, data: a.data.map(withDefaults) } as never),
  };
  return wrapped as unknown as Delegate;
}

/**
 * Restriction de portée : « les siens » = responsable ; « son équipe » = responsable membre
 * d'une de mes équipes (ou moi). « Tous » = aucune restriction.
 */
export async function scopeFilter(
  db: TenantClient,
  scope: Scope,
  userId: string,
  teamIds: readonly string[],
): Promise<Record<string, unknown>> {
  if (scope === "all") return {};
  if (scope === "own") return { ownerId: userId };
  const teammates = await db.teamMember.findMany({
    where: { teamId: { in: [...teamIds] } },
    select: { userId: true },
  });
  return { ownerId: { in: [...new Set([userId, ...teammates.map((t) => t.userId)])] } };
}

/** Champs d'une entité, champs personnalisés de l'espace compris. */
export async function fieldsFor(db: TenantClient, entity: EntityKey): Promise<FieldDef[]> {
  const custom = await db.customFieldDefinition.findMany({
    where: { entityType: entity },
    orderBy: { position: "asc" },
    select: { key: true, label: true, type: true, options: true },
  });
  return entityFields(ENTITIES[entity], custom);
}

export class AccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessError";
  }
}

/**
 * Droits d'une personne sur une entité, hors requête HTTP (worker : envois programmés).
 * Mêmes règles que l'application : module actif, rôle, portée, équipes.
 */
export async function accessFor(
  organizationId: string,
  userId: string,
  entity: EntityKey,
  action: Action,
) {
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId, deletedAt: null },
    include: {
      role: { select: { permissions: true } },
      organization: { select: { modules: true, preferences: true } },
    },
  });
  if (!membership) throw new AccessError("Cette personne n'est plus membre de l'espace.");
  const def = ENTITIES[entity];
  if (!membership.organization.modules.includes(def.module))
    throw new AccessError("Le module de ce rapport est désactivé.");
  const permissions = permissionMatrixSchema.parse(membership.role.permissions);
  const scope = grantedScope(permissions, def.module, action);
  if (!scope) throw new AccessError("Le rôle de cette personne ne permet plus ce rapport.");
  const db = forTenant(organizationId);
  const teams = await prisma.teamMember.findMany({
    where: { userId, team: { organizationId } },
    select: { teamId: true },
  });
  const timeZone =
    ((membership.organization.preferences ?? {}) as { timezone?: string }).timezone ??
    "Europe/Paris";
  return {
    db,
    fields: await fieldsFor(db, entity),
    scopeWhere: await scopeFilter(
      db,
      scope,
      userId,
      teams.map((t) => t.teamId),
    ),
    timeZone,
  };
}
