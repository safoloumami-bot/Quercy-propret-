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
import { entityDelegate, scopeFilter } from "@quercy/reports";
import { TRPCError } from "@trpc/server";

import type { ResolvedWorkspace } from "../workspace";

export interface RecordsCtx {
  db: TenantClient;
  user: { id: string; name: string; email: string };
  organizationId: string;
  workspace: ResolvedWorkspace;
  headers: Headers;
}

/** Délégué Prisma (déjà restreint à l'espace) d'une entité — voir `entityDelegate`. */
export function delegate(ctx: { db: TenantClient }, entity: EntityKey) {
  return entityDelegate(ctx.db, entity);
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

/** Restriction de portée (les siens, son équipe, tous) de la personne connectée. */
export function scopeWhere(ctx: RecordsCtx, scope: Scope): Promise<Record<string, unknown>> {
  return scopeFilter(ctx.db, scope, ctx.user.id, ctx.workspace.teamIds);
}
