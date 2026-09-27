import "server-only";

import {
  type ModuleKey,
  type PermissionMatrix,
  moduleKeySchema,
  organizationPreferencesSchema,
  permissionMatrixSchema,
} from "@quercy/core";
import { prisma } from "@quercy/db";

export interface ResolvedWorkspace {
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    industry: string | null;
    size: string | null;
    plan: string;
    trialEndsAt: Date | null;
    modules: ModuleKey[];
    preferences: ReturnType<typeof organizationPreferencesSchema.parse>;
  };
  membership: { id: string; roleId: string };
  role: { id: string; name: string; systemKey: string | null; permissions: PermissionMatrix };
  teamIds: string[];
  workspaces: { id: string; name: string; logoUrl: string | null }[];
}

export function parseModules(value: readonly string[]): ModuleKey[] {
  return value.flatMap((key) => {
    const parsed = moduleKeySchema.safeParse(key);
    return parsed.success ? [parsed.data] : [];
  });
}

export function parsePreferences(value: unknown) {
  const parsed = organizationPreferencesSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : organizationPreferencesSchema.parse({});
}

/**
 * Résout l'espace actif d'un utilisateur : celui mémorisé dans la session s'il en est
 * toujours membre, sinon le premier espace. Renvoie null s'il n'appartient à aucun espace.
 */
export async function resolveWorkspace(
  userId: string,
  activeOrganizationId: string | null | undefined,
): Promise<ResolvedWorkspace | null> {
  const memberships = await prisma.membership.findMany({
    where: { userId, deletedAt: null, organization: { deletedAt: null } },
    include: { organization: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  const current =
    memberships.find((m) => m.organizationId === activeOrganizationId) ?? memberships[0];
  if (!current) return null;

  const org = current.organization;
  const teams = await prisma.teamMember.findMany({
    where: { userId, team: { organizationId: org.id, deletedAt: null } },
    select: { teamId: true },
  });
  const permissions = permissionMatrixSchema.safeParse(current.role.permissions);

  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      industry: org.industry,
      size: org.size,
      plan: org.plan,
      trialEndsAt: org.trialEndsAt,
      modules: parseModules(org.modules),
      preferences: parsePreferences(org.preferences),
    },
    membership: { id: current.id, roleId: current.roleId },
    role: {
      id: current.role.id,
      name: current.role.name,
      systemKey: current.role.systemKey,
      permissions: permissions.success ? permissions.data : {},
    },
    teamIds: teams.map((t) => t.teamId),
    workspaces: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      logoUrl: m.organization.logoUrl,
    })),
  };
}
