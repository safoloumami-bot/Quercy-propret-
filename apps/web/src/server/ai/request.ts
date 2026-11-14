import "server-only";

import { headers } from "next/headers";

import { createContext } from "../trpc/init";
import { createCaller } from "../trpc/root";
import { resolveWorkspace } from "../workspace";

/** Contexte d'une requête HTTP de l'assistant : session, espace et appelant tRPC (mêmes droits). */
export async function aiRequestContext() {
  const requestHeaders = await headers();
  const ctx = await createContext({ headers: requestHeaders });
  if (!ctx.session) return null;
  const workspace = await resolveWorkspace(
    ctx.session.user.id,
    (ctx.session.session as { activeOrganizationId?: string | null }).activeOrganizationId,
  );
  if (!workspace) return null;
  return {
    user: { id: ctx.session.user.id, name: ctx.session.user.name, email: ctx.session.user.email },
    workspace,
    caller: createCaller(ctx),
  };
}
