import "server-only";

import {
  type Action,
  ENTITIES,
  type EntityDef,
  type EntityKey,
  type FieldDef,
  type Scope,
  entityFields,
  grantedScope,
} from "@quercy/core";
import type { TenantClient } from "@quercy/db";
import { TRPCError } from "@trpc/server";

import type { ResolvedWorkspace } from "../workspace";

export interface RecordsCtx {
  db: TenantClient;
  user: { id: string; name: string; email: string };
  organizationId: string;
  workspace: ResolvedWorkspace;
  headers: Headers;
}

type Delegate = TenantClient["company"];

/**
 * Délégué Prisma (déjà restreint à l'espace) d'une entité. Pour les entités qui partagent une
 * table (documents commerciaux), la restriction `baseWhere` est ajoutée à chaque requête et
 * les valeurs `createDefaults` à chaque création.
 */
export function delegate(ctx: { db: TenantClient }, entity: EntityKey): Delegate {
  const def = ENTITIES[entity];
  // Tous les délégués partagent l'API utilisée ici (findMany, count, groupBy, create, update…).
  const model = (ctx.db as unknown as Record<string, Delegate>)[def.model]!;
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

/** Définition + champs (standards et personnalisés) d'une entité, après contrôle d'accès. */
export async function entityContext(ctx: RecordsCtx, entity: EntityKey, action: Action) {
  const def: EntityDef = ENTITIES[entity];
  if (!ctx.workspace.organization.modules.includes(def.module)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Ce module n'est pas activé dans l'espace.",
    });
  }
  const scope = grantedScope(ctx.workspace.role.permissions, def.module, action);
  if (!scope) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Votre rôle ne permet pas cette action sur ce module.",
    });
  }
  const custom = await ctx.db.customFieldDefinition.findMany({
    where: { entityType: entity },
    orderBy: { position: "asc" },
    select: { key: true, label: true, type: true, options: true },
  });
  const fields: FieldDef[] = entityFields(def, custom);
  return { def, fields, scope, scopeWhere: await scopeWhere(ctx, scope) };
}

/**
 * Restriction de portée : « les siens » = responsable ; « son équipe » = responsable membre
 * d'une de mes équipes (ou moi). « Tous » = aucune restriction.
 */
export async function scopeWhere(ctx: RecordsCtx, scope: Scope): Promise<Record<string, unknown>> {
  if (scope === "all") return {};
  if (scope === "own") return { ownerId: ctx.user.id };
  const teammates = await ctx.db.teamMember.findMany({
    where: { teamId: { in: ctx.workspace.teamIds } },
    select: { userId: true },
  });
  return { ownerId: { in: [...new Set([ctx.user.id, ...teammates.map((t) => t.userId)])] } };
}
