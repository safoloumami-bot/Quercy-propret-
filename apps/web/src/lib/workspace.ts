import "server-only";

import {
  type ModuleKey,
  type PermissionMatrix,
  moduleKeySchema,
  organizationPreferencesSchema,
  permissionMatrixSchema,
} from "@quercy/core";
import { prisma } from "@quercy/db";
import { cookies } from "next/headers";
import { cache } from "react";

/** Cookie mémorisant l'espace actif. */
export const ACTIVE_ORG_COOKIE = "quercy-org";

export interface WorkspaceSummary {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface WorkspaceContext {
  user: { id: string; name: string; email: string; image: string | null };
  organization: WorkspaceSummary & {
    slug: string;
    plan: string;
    modules: ModuleKey[];
    preferences: ReturnType<typeof organizationPreferencesSchema.parse>;
    memberCount: number;
  };
  role: { name: string; permissions: PermissionMatrix };
  workspaces: WorkspaceSummary[];
}

function parseModules(value: string[]): ModuleKey[] {
  return value.flatMap((key) => {
    const parsed = moduleKeySchema.safeParse(key);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * Contexte de l'utilisateur courant : utilisateur, espace actif, rôle et autres espaces.
 *
 * Phase 1 (avant l'authentification) : l'utilisateur courant est le premier compte
 * disposant d'un espace. La phase 2 remplace cette résolution par la session Better Auth,
 * sans changer la forme du contexte renvoyé.
 */
export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext | null> => {
  const user = await prisma.user.findFirst({
    where: { deletedAt: null, memberships: { some: { deletedAt: null } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, image: true },
  });
  if (!user) return null;

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, deletedAt: null, organization: { deletedAt: null } },
    include: { organization: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  const activeId = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const current = memberships.find((m) => m.organizationId === activeId) ?? memberships[0];
  if (!current) return null;

  const org = current.organization;
  const memberCount = await prisma.membership.count({
    where: { organizationId: org.id, deletedAt: null },
  });
  const preferences = organizationPreferencesSchema.safeParse(org.preferences);
  const permissions = permissionMatrixSchema.safeParse(current.role.permissions);

  return {
    user,
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      plan: org.plan,
      modules: parseModules(org.modules),
      preferences: preferences.success ? preferences.data : organizationPreferencesSchema.parse({}),
      memberCount,
    },
    role: { name: current.role.name, permissions: permissions.success ? permissions.data : {} },
    workspaces: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      logoUrl: m.organization.logoUrl,
    })),
  };
});

/** Variante qui lève une erreur si aucun espace n'existe (pour les actions serveur). */
export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const context = await getWorkspaceContext();
  if (!context) throw new Error("Aucun espace de travail n'est disponible.");
  return context;
}
