import { hash, verify } from "@node-rs/argon2";

/**
 * Hachage des mots de passe en Argon2id (paramètres recommandés OWASP 2024 :
 * 19 Mio de mémoire, 2 itérations, parallélisme 1).
 */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(data.hash, data.password);
  } catch {
    return false;
  }
}
