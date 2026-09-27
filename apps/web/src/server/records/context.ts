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

/** Délégué Prisma (déjà restreint à l'espace) d'une entité. */
export function delegate(ctx: RecordsCtx, entity: EntityKey) {
  // Les deux délégués partagent l'API utilisée ici (findMany, count, groupBy, create, update…).
  return (entity === "company"
    ? ctx.db.company
    : ctx.db.contact) as unknown as typeof ctx.db.company;
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
