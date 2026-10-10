import "server-only";

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

import { env } from "./env";

function key(): Buffer {
  const e = env();
  if (e.ENCRYPTION_KEY) {
    const raw = Buffer.from(e.ENCRYPTION_KEY, "base64");
    if (raw.length !== 32)
      throw new Error("ENCRYPTION_KEY doit faire 32 octets encodés en base64.");
    return raw;
  }
  return Buffer.from(hkdfSync("sha256", e.BETTER_AUTH_SECRET, "quercy", "quercy:secrets:v1", 32));
}

/** Chiffre un secret (AES-256-GCM) : « v1.iv.tag.données » en base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function decryptSecret(sealed: string): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Secret chiffré illisible.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** Affichage masqué d'une clé (« sk_live_…4f2a »). */
export function maskSecret(plain: string): string {
  return `${plain.slice(0, 8)}…${plain.slice(-4)}`;
}
