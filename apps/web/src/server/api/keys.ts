import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { ENTITY_KEYS, type EntityKey } from "@quercy/core";
import { prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";

import { redis } from "@/lib/redis";

import type { Context } from "../trpc/init";
import { createCaller } from "../trpc/root";

/** Requêtes autorisées par clé et par minute. */
export const API_RATE_LIMIT = 600;

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Nouvelle clé : « qk_ » + 32 octets aléatoires ; seule l'empreinte est stockée. */
export function generateKey(): { key: string; prefix: string; hash: string } {
  const key = `qk_${randomBytes(32).toString("base64url")}`;
  return { key, prefix: key.slice(0, 10), hash: hashKey(key) };
}

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: { status, message } }, { status });
}

export function isEntity(value: string): value is EntityKey {
  return (ENTITY_KEYS as readonly string[]).includes(value);
}

/** Traduit une erreur tRPC (droits, validation…) en réponse HTTP de l'API publique. */
export function fromTrpc(error: unknown) {
  if (error instanceof TRPCError) {
    const status =
      {
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        TOO_MANY_REQUESTS: 429,
      }[error.code as string] ?? 500;
    const fieldErrors = (error.cause as { fieldErrors?: Record<string, string> } | undefined)
      ?.fieldErrors;
    return NextResponse.json(
      {
        error: { status, message: error.message, ...(fieldErrors ? { fields: fieldErrors } : {}) },
      },
      { status },
    );
  }
  console.error(error);
  return apiError(500, "Erreur interne.");
}

/**
 * Authentifie une requête de l'API publique (en-tête `Authorization: Bearer qk_…`) et renvoie
 * un appelant tRPC agissant avec les droits de la personne qui a créé la clé.
 */
export async function authenticate(
  request: Request,
  write: boolean,
): Promise<{ caller: ReturnType<typeof createCaller> } | { response: NextResponse }> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith("qk_")) return { response: apiError(401, "Clé d'API manquante.") };
  const key = await prisma.apiKey.findUnique({
    where: { hash: hashKey(token) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!key || key.revokedAt) return { response: apiError(401, "Clé d'API invalide ou révoquée.") };
  if (write && key.scope !== "write")
    return { response: apiError(403, "Cette clé est en lecture seule.") };

  try {
    if (redis.status === "wait") await redis.connect();
    const bucket = `api:rate:${key.id}:${Math.floor(Date.now() / 60_000)}`;
    const count = await redis.incr(bucket);
    if (count === 1) await redis.expire(bucket, 70);
    if (count > API_RATE_LIMIT)
      return {
        response: apiError(429, `Limite de ${API_RATE_LIMIT} requêtes par minute atteinte.`),
      };
  } catch {
    // Redis indisponible : l'API reste servie, sans limitation de débit.
  }
  if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000)
    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });

  const context = {
    headers: new Headers({ "x-api-key-id": key.id }),
    session: {
      user: key.user,
      session: {
        id: `api:${key.id}`,
        userId: key.user.id,
        activeOrganizationId: key.organizationId,
      },
    },
  } as unknown as Context;
  return { caller: createCaller(context) };
}
