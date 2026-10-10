import "server-only";

import { ENTITIES, type EntityKey, can, entityFields } from "@quercy/core";
import { prisma } from "@quercy/db";

import type { EntityPermissions } from "@/components/records/types";

import { requireWorkspaceContext } from "./workspace";

/** Données communes aux pages d'une entité : champs (avec personnalisés), droits, utilisateur. */
export async function loadEntityPage(entity: EntityKey) {
  const context = await requireWorkspaceContext();
  const def = ENTITIES[entity];
  const perms = context.role.permissions;
  const enabled = context.organization.modules.includes(def.module);
  const allowed = enabled && can(perms, def.module, "view");
  const custom = allowed
    ? await prisma.customFieldDefinition.findMany({
        where: { organizationId: context.organization.id, entityType: entity, deletedAt: null },
        orderBy: { position: "asc" },
        select: { key: true, label: true, type: true, options: true },
      })
    : [];
  const readOnly = Boolean(context.billing.readOnly);
  const permissions: EntityPermissions = {
    create: !readOnly && can(perms, def.module, "create"),
    update: !readOnly && can(perms, def.module, "update"),
    delete: !readOnly && can(perms, def.module, "delete"),
    export: can(perms, def.module, "export"),
  };
  return {
    def,
    enabled,
    allowed,
    fields: entityFields(def, custom),
    permissions,
    meId: context.user.id,
  };
}
