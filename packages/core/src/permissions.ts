import { z } from "zod";

import { MODULE_KEYS, type ModuleKey } from "./modules";

/** Actions possibles sur une ressource. */
export const ACTIONS = ["view", "create", "update", "delete", "export", "admin"] as const;
export const actionSchema = z.enum(ACTIONS);
export type Action = z.infer<typeof actionSchema>;

/**
 * Portée d'un droit :
 * - `all`  : tous les éléments de l'espace
 * - `team` : les éléments de ses équipes
 * - `own`  : uniquement ses propres éléments
 */
export const SCOPES = ["all", "team", "own"] as const;
export const scopeSchema = z.enum(SCOPES);
export type Scope = z.infer<typeof scopeSchema>;

/** Ressources non liées à un module métier. */
export const PLATFORM_RESOURCES = ["settings", "members", "billing", "audit"] as const;
export type PlatformResource = (typeof PLATFORM_RESOURCES)[number];

export const RESOURCES = [...MODULE_KEYS, ...PLATFORM_RESOURCES] as const;
export const resourceSchema = z.enum(RESOURCES);
export type Resource = ModuleKey | PlatformResource;

/** Droits accordés sur une ressource : action → portée. Action absente = refusée. */
export type ResourceGrant = Partial<Record<Action, Scope>>;
export type PermissionMatrix = Partial<Record<Resource, ResourceGrant>>;

export const permissionMatrixSchema = z.partialRecord(
  resourceSchema,
  z.partialRecord(actionSchema, scopeSchema),
);

export const SYSTEM_ROLE_KEYS = [
  "owner",
  "admin",
  "manager",
  "member",
  "viewer",
  "accountant",
] as const;
export const systemRoleKeySchema = z.enum(SYSTEM_ROLE_KEYS);
export type SystemRoleKey = z.infer<typeof systemRoleKeySchema>;

export const SYSTEM_ROLE_LABELS: Record<SystemRoleKey, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Manager",
  member: "Membre",
  viewer: "Lecteur",
  accountant: "Comptable externe",
};

function grantAll(actions: readonly Action[], scope: Scope): ResourceGrant {
  return Object.fromEntries(actions.map((a) => [a, scope])) as ResourceGrant;
}

function matrix(
  resources: readonly Resource[],
  actions: readonly Action[],
  scope: Scope,
): PermissionMatrix {
  return Object.fromEntries(resources.map((r) => [r, grantAll(actions, scope)]));
}

const FINANCE_MODULES: readonly ModuleKey[] = ["sales", "purchases", "treasury"];

/** Matrices des rôles prédéfinis. Les rôles personnalisés sont stockés en base. */
export const SYSTEM_ROLES: Record<SystemRoleKey, PermissionMatrix> = {
  owner: matrix(RESOURCES, ACTIONS, "all"),
  admin: {
    ...matrix(RESOURCES, ACTIONS, "all"),
    // Seul le propriétaire administre la facturation de l'abonnement.
    billing: { view: "all" },
  },
  manager: {
    ...matrix(MODULE_KEYS, ["view", "create", "update", "delete", "export"], "team"),
    members: { view: "all" },
    settings: { view: "all" },
  },
  member: {
    ...Object.fromEntries(
      MODULE_KEYS.map((m) => [m, { view: "all", create: "own", update: "own", delete: "own" }]),
    ),
    members: { view: "all" },
  },
  viewer: {
    ...matrix(MODULE_KEYS, ["view"], "all"),
    members: { view: "all" },
  },
  accountant: {
    ...matrix(FINANCE_MODULES, ["view", "export"], "all"),
    audit: { view: "all" },
  },
};

const SCOPE_RANK: Record<Scope, number> = { own: 0, team: 1, all: 2 };

/** Contexte d'un élément pour les contrôles de portée `own` / `team`. */
export interface OwnershipContext {
  userId: string;
  teamIds: readonly string[];
  ownerId?: string | null;
  ownerTeamIds?: readonly string[];
}

/** Portée accordée pour (ressource, action), ou `null` si refusée. */
export function grantedScope(
  permissions: PermissionMatrix,
  resource: Resource,
  action: Action,
): Scope | null {
  return permissions[resource]?.[action] ?? null;
}

/**
 * Vérifie un droit. Sans `ownership`, vérifie seulement que l'action est accordée
 * sur au moins une partie des éléments (utile pour afficher un bouton).
 */
export function can(
  permissions: PermissionMatrix,
  resource: Resource,
  action: Action,
  ownership?: OwnershipContext,
): boolean {
  const scope = grantedScope(permissions, resource, action);
  if (!scope) return false;
  if (!ownership || scope === "all") return true;
  if (ownership.ownerId && ownership.ownerId === ownership.userId) return true;
  if (scope === "team") {
    const mine = new Set(ownership.teamIds);
    return (ownership.ownerTeamIds ?? []).some((t) => mine.has(t));
  }
  return false;
}

/** Fusionne plusieurs matrices en gardant la portée la plus large. */
export function mergePermissions(...matrices: PermissionMatrix[]): PermissionMatrix {
  const result: PermissionMatrix = {};
  for (const m of matrices) {
    for (const [resource, grant] of Object.entries(m) as [Resource, ResourceGrant][]) {
      const target: ResourceGrant = { ...result[resource] };
      for (const [action, scope] of Object.entries(grant) as [Action, Scope][]) {
        const current = target[action];
        if (!current || SCOPE_RANK[scope] > SCOPE_RANK[current]) target[action] = scope;
      }
      result[resource] = target;
    }
  }
  return result;
}

export const ACTION_LABELS: Record<Action, string> = {
  view: "Voir",
  create: "Créer",
  update: "Modifier",
  delete: "Supprimer",
  export: "Exporter",
  admin: "Administrer",
};

export const SCOPE_LABELS: Record<Scope, string> = {
  own: "Les siens",
  team: "Son équipe",
  all: "Tous",
};

export const PLATFORM_RESOURCE_LABELS: Record<PlatformResource, string> = {
  settings: "Réglages de l'espace",
  members: "Membres et équipes",
  billing: "Abonnement et facturation",
  audit: "Journal d'audit",
};

/** Portées pertinentes pour (ressource, action) : « les siens / son équipe » n'a de sens que sur les données métier. */
export function applicableScopes(resource: Resource, action: Action): readonly Scope[] {
  if ((PLATFORM_RESOURCES as readonly string[]).includes(resource) || action === "admin")
    return ["all"];
  return SCOPES;
}
