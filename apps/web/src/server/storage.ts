import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { INLINE_TYPES, presignedGetUrl, storageConfig } from "@quercy/storage";

import { env } from "./env";

export {
  ALLOWED_TYPES,
  INLINE_TYPES,
  MAX_FILE_BYTES,
  checkFile,
  deleteObject,
  newStorageKey,
  putObject,
  readObject,
} from "@quercy/storage";

/** Durée de validité des liens de téléchargement. */
export const URL_TTL_SECONDS = 5 * 60;

function signature(fileId: string, expires: number): string {
  return createHmac("sha256", env().BETTER_AUTH_SECRET)
    .update(`file:${fileId}:${expires}`)
    .digest("base64url");
}

export function verifyFileSignature(fileId: string, expires: number, sig: string): boolean {
  if (!Number.isFinite(expires) || expires < Date.now() / 1000) return false;
  const expected = Buffer.from(signature(fileId, expires));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** URL signée et expirante (5 minutes) pour consulter ou télécharger un fichier. */
export async function signedFileUrl(
  file: { id: string; storageKey: string; name: string; mimeType: string },
  download = false,
): Promise<string> {
  const disposition = `${download || !INLINE_TYPES.has(file.mimeType) ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.name)}`;
  if (storageConfig().driver === "s3") {
    return presignedGetUrl(file.storageKey, file.name, file.mimeType, disposition, URL_TTL_SECONDS);
  }
  const expires = Math.floor(Date.now() / 1000) + URL_TTL_SECONDS;
  const params = new URLSearchParams({
    exp: String(expires),
    sig: signature(file.id, expires),
    ...(download ? { dl: "1" } : {}),
  });
  return `/api/files/${file.id}?${params.toString()}`;
}
