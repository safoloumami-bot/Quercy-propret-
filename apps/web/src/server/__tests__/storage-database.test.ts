import { createHmac } from "node:crypto";
import { type Server, createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { testFixtures } from "./helpers";

const fx = testFixtures("fichiers-base");
const SECRET = process.env.BETTER_AUTH_SECRET!;
const PHOTO = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
let legacy: Server;
let orgId: string;
let fileId: string;
const keys: string[] = [];

beforeAll(async () => {
  // Ancien serveur : ne sert le fichier qu'avec un lien signé valide (même secret).
  legacy = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const id = url.pathname.split("/").pop()!;
    const exp = url.searchParams.get("exp")!;
    const expected = createHmac("sha256", SECRET).update(`file:${id}:${exp}`).digest("base64url");
    if (id !== fileId || url.searchParams.get("sig") !== expected) {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(200, { "Content-Type": "image/jpeg" }).end(Buffer.from(PHOTO));
  });
  await new Promise<void>((resolve) => legacy.listen(0, resolve));
  process.env.STORAGE_DRIVER = "database";
  process.env.LEGACY_FILES_URL = `http://127.0.0.1:${(legacy.address() as AddressInfo).port}`;

  const u = await fx.user("owner");
  orgId = (await fx.org("a")).id;
  const key = `${orgId}/2026-11/ancien.jpg`;
  keys.push(key, `${orgId}/2026-11/nouveau.pdf`);
  fileId = (
    await prisma.storedFile.create({
      data: {
        organizationId: orgId,
        storageKey: key,
        name: "Sanitaires - avant.jpg",
        mimeType: "image/jpeg",
        size: PHOTO.length,
        uploadedById: u.id,
      },
    })
  ).id;
});

afterAll(async () => {
  await prisma.storedBlob.deleteMany({ where: { key: { in: keys } } });
  await prisma.storedFile.deleteMany({ where: { organizationId: orgId } });
  await fx.cleanup();
  legacy.close();
});

describe("fichiers rangés dans la base", () => {
  it("enregistre, relit et supprime un fichier", async () => {
    const { deleteObject, putObject, readObject } = await import("@quercy/storage");
    await putObject(keys[1]!, Uint8Array.from([1, 2, 3]), "application/pdf");
    expect([...(await readObject(keys[1]!))]).toEqual([1, 2, 3]);
    await deleteObject(keys[1]!);
    await expect(readObject(keys[1]!)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("recopie depuis l'ancien serveur les fichiers absents, une seule fois", async () => {
    const { importLegacyFiles } = await import("../legacy-files");
    const { readObject } = await import("@quercy/storage");
    const first = await importLegacyFiles();
    expect(first.copied).toBeGreaterThanOrEqual(1);
    expect([...(await readObject(keys[0]!))]).toEqual([...PHOTO]);
    const again = await importLegacyFiles();
    expect(again.copied).toBe(0);
  });
});
