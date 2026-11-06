import "server-only";

import { ENTITY_KEYS, type EntityKey, PLANS } from "@quercy/core";
import { forTenant, prisma } from "@quercy/db";
import { headers } from "next/headers";

import { auth } from "../auth";
import { delegate, entityContext, type RecordsCtx } from "../records/context";
import { resolveWorkspace } from "../workspace";

/** Contexte d'accès (session + espace) pour les routes HTTP de fichiers. */
export async function fileRequestContext(): Promise<RecordsCtx | null> {
  const requestHeaders = await headers();
  const session = await auth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const workspace = await resolveWorkspace(
    session.user.id,
    (session.session as { activeOrganizationId?: string | null }).activeOrganizationId,
  );
  if (!workspace) return null;
  return {
    db: forTenant(workspace.organization.id),
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    organizationId: workspace.organization.id,
    workspace,
    headers: requestHeaders,
  };
}

export function isEntityKey(value: string): value is EntityKey {
  return (ENTITY_KEYS as readonly string[]).includes(value);
}

/** La fiche existe et l'utilisateur a le droit `action` dessus. */
export async function canAccessRecord(
  ctx: RecordsCtx,
  entity: EntityKey,
  id: string,
  action: "view" | "update",
) {
  try {
    const { scopeWhere } = await entityContext(ctx, entity, action);
    return (await delegate(ctx, entity).count({ where: { id, ...scopeWhere } })) > 0;
  } catch {
    return false;
  }
}

/** Stockage utilisé et quota de l'offre (Go par membre). */
export async function storageUsage(
  organizationId: string,
  plan: keyof typeof PLANS,
  members: number,
) {
  const used = await prisma.storedFile.aggregate({
    where: { organizationId, deletedAt: null },
    _sum: { size: true },
  });
  const quota = PLANS[plan].limits.storageGbPerMember * Math.max(1, members) * 1024 ** 3;
  return { used: used._sum.size ?? 0, quota };
}
