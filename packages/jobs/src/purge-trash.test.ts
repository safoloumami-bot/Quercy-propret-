import { randomBytes } from "node:crypto";

import { prisma } from "@quercy/db";
import { afterAll, describe, expect, it } from "vitest";

import { purgeTrash } from "./purge-trash";

const run = randomBytes(4).toString("hex");

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { slug: `purge-${run}` } });
  await prisma.$disconnect();
});

describe("purgeTrash", () => {
  it("efface les éléments en corbeille depuis plus de 30 jours, et eux seulement", async () => {
    const org = await prisma.organization.create({ data: { name: "Purge", slug: `purge-${run}` } });
    const now = new Date();
    const old = new Date(now.getTime() - 31 * 86_400_000);
    const recent = new Date(now.getTime() - 5 * 86_400_000);
    const expired = await prisma.company.create({
      data: { organizationId: org.id, name: "Ancienne", deletedAt: old },
    });
    const kept = await prisma.company.create({
      data: { organizationId: org.id, name: "Récente", deletedAt: recent },
    });
    const alive = await prisma.company.create({ data: { organizationId: org.id, name: "Active" } });

    const result = await purgeTrash(now);
    expect(result.companies).toBeGreaterThanOrEqual(1);
    expect(await prisma.company.findUnique({ where: { id: expired.id } })).toBeNull();
    expect(await prisma.company.findUnique({ where: { id: kept.id } })).not.toBeNull();
    expect(await prisma.company.findUnique({ where: { id: alive.id } })).not.toBeNull();
  });
});
