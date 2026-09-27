import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Taille maximale d'un fichier envoyé. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Types acceptés. Les types capables d'exécuter du code dans le navigateur (HTML, SVG, JS)
 * sont exclus : un fichier ne doit jamais devenir une page servie depuis notre domaine.
 */
export const ALLOWED_TYPES: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "image/heic": ["heic"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt"],
  "text/csv": ["csv"],
  "application/zip": ["zip"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.oasis.opendocument.text": ["odt"],
  "application/vnd.oasis.opendocument.spreadsheet": ["ods"],
  "message/rfc822": ["eml"],
};

/** Types affichables directement dans le navigateur (aperçu) ; les autres se téléchargent. */
export const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
]);

export function checkFile(name: string, mimeType: string, size: number): string | null {
  if (size <= 0) return "Le fichier est vide.";
  if (size > MAX_FILE_BYTES) return "Fichier trop volumineux : 25 Mo maximum.";
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = ALLOWED_TYPES[mimeType];
  if (!allowed || !allowed.includes(extension)) {
    return `Type de fichier non accepté (.${extension}). Formats possibles : images, PDF, documents bureautiques, CSV, ZIP.`;
  }
  return null;
}

/** Clé de stockage opaque, rangée par espace. */
export function newStorageKey(organizationId: string, name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "bin";
  return `${organizationId}/${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString("hex")}.${extension}`;
}

/** Configuration lue dans l'environnement (partagée par l'application web et le worker). */
export function storageConfig() {
  return {
    driver: process.env.STORAGE_DRIVER === "s3" ? ("s3" as const) : ("local" as const),
    localDir: process.env.STORAGE_LOCAL_DIR || ".storage",
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };
}

let s3: S3Client | null = null;
export function s3Client(): S3Client {
  const c = storageConfig();
  if (!c.bucket || !c.accessKeyId || !c.secretAccessKey) {
    throw new Error("Stockage S3 incomplet (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).");
  }
  s3 ??= new S3Client({
    region: c.region,
    endpoint: c.endpoint,
    forcePathStyle: c.forcePathStyle,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
  return s3;
}

function localPath(key: string): string {
  const root = path.resolve(storageConfig().localDir);
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Clé de stockage invalide.");
  return full;
}

export async function putObject(key: string, body: Uint8Array, mimeType: string): Promise<void> {
  if (storageConfig().driver === "s3") {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: storageConfig().bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
    return;
  }
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

export async function readObject(key: string): Promise<Uint8Array> {
  return readFile(localPath(key));
}

export async function deleteObject(key: string): Promise<void> {
  if (storageConfig().driver === "s3") {
    await s3Client().send(new DeleteObjectCommand({ Bucket: storageConfig().bucket, Key: key }));
    return;
  }
  await rm(localPath(key), { force: true });
}

/** URL présignée S3 (lecture), pour le pilote S3. */
export function presignedGetUrl(
  key: string,
  name: string,
  mimeType: string,
  disposition: string,
  expiresIn: number,
): Promise<string> {
  return getSignedUrl(
    s3Client(),
    new GetObjectCommand({
      Bucket: storageConfig().bucket,
      Key: key,
      ResponseContentDisposition: disposition,
      ResponseContentType: mimeType,
    }),
    { expiresIn },
  );
}
