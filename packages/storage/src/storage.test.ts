import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  MAX_FILE_BYTES,
  checkFile,
  deleteObject,
  newStorageKey,
  putObject,
  readObject,
} from "./index";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "quercy-storage-"));
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = dir;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("checkFile", () => {
  it("accepte les formats bureautiques courants", () => {
    expect(checkFile("devis.pdf", "application/pdf", 1000)).toBeNull();
    expect(checkFile("photo.JPG", "image/jpeg", 1000)).toBeNull();
  });

  it("refuse les types exécutables ou incohérents, les fichiers vides ou trop gros", () => {
    expect(checkFile("page.html", "text/html", 100)).toContain("non accepté");
    expect(checkFile("image.svg", "image/svg+xml", 100)).toContain("non accepté");
    expect(checkFile("facture.pdf.exe", "application/pdf", 100)).toContain("non accepté");
    expect(checkFile("vide.pdf", "application/pdf", 0)).toBe("Le fichier est vide.");
    expect(checkFile("gros.pdf", "application/pdf", MAX_FILE_BYTES + 1)).toContain("25 Mo");
  });
});

describe("stockage local", () => {
  it("range les fichiers par espace sous une clé opaque", () => {
    const key = newStorageKey("org_1", "Relevé bancaire.PDF");
    expect(key).toMatch(/^org_1\/\d{4}-\d{2}\/[0-9a-f]{32}\.pdf$/);
  });

  it("écrit, relit puis supprime un objet", async () => {
    const key = newStorageKey("org_1", "note.txt");
    await putObject(key, new TextEncoder().encode("bonjour"), "text/plain");
    expect(new TextDecoder().decode(await readObject(key))).toBe("bonjour");
    await deleteObject(key);
    await expect(readObject(key)).rejects.toThrow();
  });

  it("refuse une clé qui sortirait du dossier de stockage", async () => {
    await expect(putObject("../../etc/passwd", new Uint8Array([1]), "text/plain")).rejects.toThrow(
      "Clé de stockage invalide",
    );
  });
});
