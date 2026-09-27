import "server-only";

import { type Action, type Resource, can } from "@quercy/core";
import { type TenantClient, forTenant, prisma } from "@quercy/db";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "../auth";
import { resolveWorkspace } from "../workspace";

export async function createContext(opts: { headers: Headers }) {
  const session = await auth().api.getSession({ headers: opts.headers });
  return { headers: opts.headers, session };
}
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Journalisation structurée des erreurs serveur inattendues. */
const logged = t.middleware(async ({ path, type, next }) => {
  const result = await next();
  if (!result.ok && result.error.code === "INTERNAL_SERVER_ERROR") {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "trpc.error",
        path,
        type,
        error: result.error.message,
      }),
    );
  }
  return result;
});

export const publicProcedure = t.procedure.use(logged);

/** Procédure réservée aux utilisateurs connectés. */
export const authedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Votre session a expiré. Reconnectez-vous.",
    });
  }
  return next({ ctx: { ...ctx, session: ctx.session, user: ctx.session.user } });
});

/**
 * Procédure liée à l'espace actif. Le contexte fournit `db`, un client Prisma restreint à
 * cet espace : aucune requête métier ne peut lire ou modifier les données d'un autre espace.
 */
export const orgProcedure = authedProcedure.use(async ({ ctx, next }) => {
  const workspace = await resolveWorkspace(
    ctx.user.id,
    (ctx.session.session as { activeOrganizationId?: string | null }).activeOrganizationId,
  );
  if (!workspace) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Vous n'appartenez à aucun espace." });
  }
  return next({
    ctx: {
      ...ctx,
      workspace,
      organizationId: workspace.organization.id,
      permissions: workspace.role.permissions,
      db: forTenant(workspace.organization.id),
    },
  });
});

/** Vérifie un droit côté serveur ; lève FORBIDDEN avec un message clair sinon. */
export function authorize(
  ctx: { workspace: { role: { permissions: Parameters<typeof can>[0] } } },
  resource: Resource,
  action: Action,
  message = "Votre rôle ne permet pas cette action. Demandez à un administrateur.",
): void {
  if (!can(ctx.workspace.role.permissions, resource, action)) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
}

/** Enregistre une entrée du journal d'audit dans l'espace courant. */
export async function recordAudit(
  ctx: { db: TenantClient; user: { id: string }; headers: Headers },
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    changes?: Record<string, { before: unknown; after: unknown }> | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  await ctx.db.auditLog.create({
    data: {
      organizationId: "", // remplacé par l'extension d'isolation
      actorId: ctx.user.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      changes: (entry.changes ?? undefined) as object | undefined,
      metadata: (entry.metadata ?? undefined) as object | undefined,
      ipAddress: ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    },
  });
}

export { prisma };
