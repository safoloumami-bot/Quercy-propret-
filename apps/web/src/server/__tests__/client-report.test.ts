import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { RecordsCtx } from "../records/context";
import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("rapport");
type Api = Awaited<ReturnType<typeof fx.caller>>;
let storageDir: string;
let orgId: string;
let owner: Api;
let agentA: Api;
let ownerCtx: RecordsCtx;
let companyId: string;
const cages: string[] = [];

// Plus petite image PNG valide (1 × 1 pixel).
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  ),
);
const day = (d: string) => new Date(`${d}T00:00:00.000Z`);

beforeAll(async () => {
  storageDir = mkdtempSync(path.join(os.tmpdir(), "quercy-rapport-"));
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = storageDir;
  const o = await fx.user("owner");
  const a = await fx.user("agent-a");
  orgId = (await fx.org("a")).id;
  await fx.member(orgId, o.id, "owner");
  await fx.member(orgId, a.id, "worker");
  owner = await fx.caller(o, orgId);
  agentA = await fx.caller(a, orgId);
  const { resolveWorkspace } = await import("../workspace");
  const { forTenant } = await import("@quercy/db");
  ownerCtx = {
    db: forTenant(orgId),
    user: o,
    organizationId: orgId,
    workspace: (await resolveWorkspace(o.id, orgId))!,
    headers: new Headers(),
  };

  companyId = (
    await prisma.company.create({ data: { organizationId: orgId, name: "Syndic Fictif" } })
  ).id;
  const other = await prisma.company.create({
    data: { organizationId: orgId, name: "Autre client" },
  });
  // Deux résidences du syndic, dix cages chacune (sans client renseigné sur les cages).
  for (const r of [1, 2]) {
    const residence = await prisma.site.create({
      data: { organizationId: orgId, name: `Résidence ${r}`, code: `R${r}`, companyId },
    });
    for (let c = 1; c <= 10; c++) {
      const cage = await prisma.site.create({
        data: {
          organizationId: orgId,
          name: `Cage ${c}`,
          code: `R${r}-${String(c).padStart(2, "0")}`,
          parentId: residence.id,
        },
      });
      cages.push(cage.id);
    }
  }
  const outside = await prisma.site.create({
    data: { organizationId: orgId, name: "Hors syndic", companyId: other.id },
  });
  // Septembre : chaque cage a un passage réalisé et un passage manqué.
  await prisma.intervention.createMany({
    data: cages.flatMap((siteId, i) => [
      {
        organizationId: orgId,
        title: "Entretien parties communes",
        siteId,
        ownerId: i === 0 ? a.id : null,
        actualAgentId: i === 0 ? a.id : null,
        date: day("2026-09-07"),
        startTime: "08:00",
        status: "done",
        notes: i === 0 ? "Hall propre, poubelles sorties." : null,
        reportNumber: i === 0 ? "BI-2026-0001" : null,
      },
      {
        organizationId: orgId,
        title: "Entretien parties communes",
        siteId,
        date: day("2026-09-21"),
        status: "missed",
      },
    ]),
  });
  await prisma.intervention.create({
    data: {
      organizationId: orgId,
      title: "Ailleurs",
      siteId: outside.id,
      date: day("2026-09-10"),
      status: "done",
    },
  });

  const { putObject, newStorageKey } = await import("../storage");
  const key = newStorageKey(orgId, "fuite.png");
  await putObject(key, PNG, "image/png");
  const photo = await prisma.storedFile.create({
    data: {
      organizationId: orgId,
      storageKey: key,
      name: "fuite.png",
      mimeType: "image/png",
      size: PNG.byteLength,
      uploadedById: o.id,
    },
  });
  const anomaly = (type: string, status: string, visibleToClient: boolean, siteId: string) => ({
    organizationId: orgId,
    siteId,
    type,
    status,
    visibleToClient,
    location: "Hall",
    comment: `Anomalie ${type}`,
    reportedAt: new Date("2026-09-08T09:00:00Z"),
  });
  await prisma.anomaly.createMany({
    data: [
      // Non validée : jamais dans le rapport.
      anomaly("pests", "reported", false, cages[1]!),
      // Validée mais pas cochée « visible par le client » : signalée à part.
      anomaly("damage", "validated", false, cages[2]!),
      // Hors syndic.
      anomaly("leak", "resolved", true, outside.id),
    ],
  });
  await prisma.anomaly.create({
    data: {
      ...anomaly("leak", "resolved", true, cages[3]!),
      photoFileId: photo.id,
      resolution: "Plombier passé",
    },
  });
});

afterAll(async () => {
  await prisma.anomaly.deleteMany({ where: { organizationId: orgId } });
  await prisma.site.updateMany({ where: { organizationId: orgId }, data: { parentId: null } });
  await fx.cleanup();
  await prisma.$disconnect();
  rmSync(storageDir, { recursive: true, force: true });
});

describe("rapport syndic", () => {
  it("un seul rapport, juste, pour les 20 cages du syndic", async () => {
    const report = await owner.sites.clientReport({
      companyId,
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(report.totals).toEqual({
      planned: 40,
      due: 40,
      done: 20,
      completionRate: 50,
      anomalies: 1,
      sites: 20,
      sitesInContract: 22,
    });
    expect(report.passages.map((p) => p.site)).not.toContain("Hors syndic");
    expect(report.passages[0]).toMatchObject({
      site: "R1-01 · Cage 1",
      date: "2026-09-07",
      status: "Réalisée",
      observation: "Hall propre, poubelles sorties.",
      proof: "BI-2026-0001",
    });
    expect(report.anomalies).toEqual([
      expect.objectContaining({
        type: "Fuite / eau",
        site: "R1-04 · Cage 4",
        status: "Résolue",
        resolution: "Plombier passé",
        hasPhoto: true,
      }),
    ]);
    expect(report.withheldAnomalies).toBe(1);
  });

  it("produit un PDF unique avec la photo de l'anomalie", async () => {
    const { clientReport, clientReportPdf } = await import("../cleaning/client-report");
    const report = await clientReport(ownerCtx, {
      companyId,
      from: "2026-09-01",
      to: "2026-09-30",
    });
    const bytes = await clientReportPdf(ownerCtx, report);
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
    // 40 passages et une photo : plusieurs pages, un seul fichier.
    expect(bytes.byteLength).toBeGreaterThan(10_000);
  });

  it("réservé aux responsables ; l'agent de la cage A ne voit rien de la cage B", async () => {
    await expectCode(
      agentA.sites.clientReport({ companyId, from: "2026-09-01", to: "2026-09-30" }),
      "FORBIDDEN",
    );
    await expectCode(agentA.sites.clientOverview({ companyId, month: "2026-09" }), "FORBIDDEN");
    expect((await agentA.sites.sheet({ siteId: cages[0]! })).site.code).toBe("R1-01");
    await expectCode(agentA.sites.sheet({ siteId: cages[1]! }), "FORBIDDEN");
  });
});
