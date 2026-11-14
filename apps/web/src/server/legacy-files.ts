import "server-only";

import { createHmac } from "node:crypto";

import { prisma } from "@quercy/db";
import { putObject, storageConfig } from "@quercy/storage";

import { env } from "./env";

let running = false;
/** Échecs par fichier (dans ce processus) : après 3 essais, le fichier n'est plus demandé. */
const failures = new Map<string, number>();

/**
 * Changement d'hébergement : recopie dans le stockage actuel (base de données) les fichiers
 * encore rangés sur l'ancien serveur (LEGACY_FILES_URL, ex. l'adresse Netlify). Seuls les
 * fichiers absents sont copiés ; sans fichier manquant, rien n'est fait.
 */
export async function importLegacyFiles(): Promise<{ copied: number; failed: number }> {
  const legacy = env().LEGACY_FILES_URL;
  if (!legacy || storageConfig().driver !== "database" || running) return { copied: 0, failed: 0 };
  running = true;
  let copied = 0;
  let failed = 0;
  try {
    const missing = await prisma.$queryRaw<
      { id: string; storageKey: string; mimeType: string; entityType: string | null }[]
    >`
      SELECT f.id, f."storageKey", f."mimeType", f."entityType" FROM stored_file f
      LEFT JOIN stored_blob b ON b.key = f."storageKey"
      WHERE b.key IS NULL LIMIT 50`;
    for (const file of missing.filter((f) => (failures.get(f.id) ?? 0) < 3)) {
      const exp = Math.floor(Date.now() / 1000) + 300;
      const sig = createHmac("sha256", env().BETTER_AUTH_SECRET)
        .update(`file:${file.id}:${exp}`)
        .digest("base64url");
      // Images des sites publiés : adresse publique (sans signature). Les autres fichiers :
      // lien signé, valable seulement si l'ancien serveur partage BETTER_AUTH_SECRET.
      const base = legacy.replace(/\/$/, "");
      const url =
        file.entityType === "website"
          ? `${base}/api/public/sites/images/${file.id}`
          : `${base}/api/files/${file.id}?exp=${exp}&sig=${sig}`;
      try {
        const response = await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await putObject(
          file.storageKey,
          new Uint8Array(await response.arrayBuffer()),
          file.mimeType,
        );
        copied += 1;
      } catch (error) {
        failed += 1;
        failures.set(file.id, (failures.get(file.id) ?? 0) + 1);
        console.warn(
          JSON.stringify({
            level: "warn",
            msg: "legacy_file.failed",
            id: file.id,
            error: String(error),
          }),
        );
      }
    }
    if (copied || failed)
      console.info(JSON.stringify({ level: "info", msg: "legacy_files.done", copied, failed }));
    return { copied, failed };
  } finally {
    running = false;
  }
}
