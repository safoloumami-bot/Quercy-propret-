import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { env } from "../env";

/** Session de l'application terrain : 30 jours, comme l'application d'origine. */
export const SESSION_MS = 30 * 86_400_000;

export function hashPin(pin: string, salt: string): string {
  return scryptSync(String(pin), salt, 32).toString("hex");
}

export function newPin(pin: string): { pinHash: string; pinSalt: string } {
  const pinSalt = randomBytes(16).toString("hex");
  return { pinHash: hashPin(pin, pinSalt), pinSalt };
}

export function pinMatches(pin: string, access: { pinHash: string; pinSalt: string }): boolean {
  const a = Buffer.from(hashPin(pin, access.pinSalt), "hex");
  const b = Buffer.from(access.pinHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function key(): Buffer {
  return createHmac("sha256", env().BETTER_AUTH_SECRET).update("quercy:terrain:v1").digest();
}

interface TokenPayload {
  /** Identifiant de l'accès terrain. */
  id: string;
  /** Espace : un jeton ne vaut que pour l'entreprise qui l'a émis. */
  org: string;
  exp: number;
}

export function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", key()).update(body).digest("base64url")}`;
}

export function verifyToken(token: string | null | undefined, org: string): TokenPayload | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".") as [string, string];
  const expected = Buffer.from(createHmac("sha256", key()).update(body).digest("base64url"));
  const given = Buffer.from(sig ?? "");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (!payload.exp || payload.exp < Date.now() || payload.org !== org) return null;
    return payload;
  } catch {
    return null;
  }
}

const COOKIE = "qp_terrain";

export function readCookie(request: Request): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Cookie limité à l'adresse de l'entreprise (/terrain/<espace>/). */
export function sessionCookie(token: string, base: string): string {
  const secure = env().APP_URL.startsWith("https://") ? " Secure;" : "";
  return `${COOKIE}=${encodeURIComponent(token)}; Path=${base}; HttpOnly;${secure} SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}`;
}

export function clearCookie(base: string): string {
  return `${COOKIE}=; Path=${base}; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Limitation des essais de connexion : 8 échecs, puis un quart d'heure d'attente. */
const attempts = new Map<string, { n: number; t: number }>();

export function tooManyAttempts(id: string): boolean {
  const entry = attempts.get(id);
  if (!entry) return false;
  if (Date.now() - entry.t > 900_000) {
    attempts.delete(id);
    return false;
  }
  return entry.n >= 8;
}

export function noteFailure(id: string): void {
  const entry = attempts.get(id) ?? { n: 0, t: Date.now() };
  entry.n += 1;
  entry.t = Date.now();
  attempts.set(id, entry);
}

export function clearAttempts(id: string): void {
  attempts.delete(id);
}
