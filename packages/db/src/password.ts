import { randomBytes } from "node:crypto";

import { argon2Verify, argon2id } from "hash-wasm";

/**
 * Hachage des mots de passe en Argon2id (paramètres recommandés OWASP 2024 :
 * 19 Mio de mémoire, 2 itérations, parallélisme 1).
 * Implémentation WebAssembly : aucun binaire natif, donc identique en local, en Docker et
 * dans les fonctions serverless (Netlify, Vercel). Format PHC standard (`$argon2id$…`),
 * compatible avec les mots de passe déjà enregistrés.
 */
const OPTIONS = { memorySize: 19_456, iterations: 2, parallelism: 1, hashLength: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return argon2id({ password, salt: randomBytes(16), ...OPTIONS, outputType: "encoded" });
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  try {
    return await argon2Verify({ password: data.password, hash: data.hash });
  } catch {
    return false;
  }
}
