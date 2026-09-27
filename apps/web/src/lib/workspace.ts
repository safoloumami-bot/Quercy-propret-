import "server-only";

import { userPreferencesSchema } from "@quercy/core";
import { prisma } from "@quercy/db";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getSession } from "@/server/auth";
import { type ResolvedWorkspace, resolveWorkspace } from "@/server/workspace";

export interface WorkspaceSummary {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface WorkspaceContext extends ResolvedWorkspace {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    preferences: ReturnType<typeof userPreferencesSchema.parse>;
  };
}

/** Utilisateur connecté, ou redirection vers la connexion. */
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session;
});

/**
 * Contexte de la page : utilisateur connecté et espace actif.
 * Sans session → /connexion ; sans espace → assistant d'accueil (/bienvenue).
 */
export const requireWorkspaceContext = cache(async (): Promise<WorkspaceContext> => {
  const session = await requireUser();
  const activeId = (session.session as { activeOrganizationId?: string | null })
    .activeOrganizationId;
  const workspace = await resolveWorkspace(session.user.id, activeId);
  if (!workspace) redirect("/bienvenue");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, preferences: true },
  });
  return {
    ...workspace,
    user: { ...user, preferences: userPreferencesSchema.parse(user.preferences ?? {}) },
  };
});
