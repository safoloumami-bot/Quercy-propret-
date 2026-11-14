import { SYSTEM_ROLES } from "@quercy/core";
import { forTenant, prisma } from "@quercy/db";
import { purgeTrash } from "@quercy/jobs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { testFixtures } from "./helpers";

/**
 * Isolation garantie par PostgreSQL lui-même (RLS, rôle restreint, garde « même entreprise »)
 * et conservation de l'historique : ces tests passent par la base, pas par le code applicatif.
 */
const fx = testFixtures("dbsec");
let orgA: string;
let orgB: string;
let siteA: string;
let siteB: string;
let contractA: string;

/** Exécute une requête SQL comme le fait le client d'un espace (rôle restreint + app.org_id). */
async function asTenant<T>(organizationId: string, sql: string, ...values: unknown[]) {
  const [, , rows] = await prisma.$transaction([
    prisma.$executeRaw`SELECT set_config('app.org_id', ${organizationId}, TRUE)`,
    prisma.$executeRaw`SELECT set_config('role', 'quercy_tenant', TRUE)`,
    prisma.$queryRawUnsafe<T>(sql, ...values),
  ]);
  return rows;
}

beforeAll(async () => {
  orgA = (await fx.org("a")).id;
  orgB = (await fx.org("b")).id;
  siteA = (await prisma.site.create({ data: { organizationId: orgA, name: "Résidence A" } })).id;
  siteB = (await prisma.site.create({ data: { organizationId: orgB, name: "Résidence B" } })).id;
  contractA = (
    await prisma.cleaningContract.create({
      data: { organizationId: orgA, name: "Entretien A", siteId: siteA },
    })
  ).id;
});

afterAll(async () => {
  // Nettoyage dans l'ordre inverse : l'historique n'a pas de suppression en cascade.
  for (const org of [orgA, orgB]) {
    await prisma.interventionEvent.deleteMany({ where: { organizationId: org } });
    await prisma.anomaly.deleteMany({ where: { organizationId: org } });
    await prisma.intervention.deleteMany({ where: { organizationId: org } });
    await prisma.recurrenceRuleVersion.deleteMany({ where: { organizationId: org } });
    await prisma.recurrenceSeries.deleteMany({ where: { organizationId: org } });
    await prisma.serviceLine.deleteMany({ where: { organizationId: org } });
    await prisma.siteClosure.deleteMany({ where: { organizationId: org } });
  }
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("RLS : le rôle restreint ne voit que son entreprise", () => {
  it("les requêtes d'un espace passent par le rôle restreint", async () => {
    const rows = await asTenant<{ who: string }[]>(orgA, "SELECT current_user AS who");
    expect(rows[0]!.who).toBe("quercy_tenant");
  });

  it("une ligne d'une autre entreprise est invisible, même demandée par son identifiant", async () => {
    const rows = await asTenant<{ id: string }[]>(
      orgA,
      `SELECT id FROM site WHERE id IN ($1, $2)`,
      siteA,
      siteB,
    );
    expect(rows.map((r) => r.id)).toEqual([siteA]);
  });

  it("impossible d'écrire, de modifier ou d'effacer chez une autre entreprise", async () => {
    await expect(
      asTenant(
        orgA,
        `INSERT INTO site (id, "organizationId", name, "updatedAt") VALUES ('intrus', $1, 'Intrus', now())`,
        orgB,
      ),
    ).rejects.toThrow();
    const updated = await asTenant<{ id: string }[]>(
      orgA,
      `UPDATE site SET name = 'Piraté' WHERE id = $1 RETURNING id`,
      siteB,
    );
    expect(updated).toHaveLength(0);
    const deleted = await asTenant<{ id: string }[]>(
      orgA,
      `DELETE FROM site WHERE id = $1 RETURNING id`,
      siteB,
    );
    expect(deleted).toHaveLength(0);
    expect((await prisma.site.findUniqueOrThrow({ where: { id: siteB } })).name).toBe(
      "Résidence B",
    );
  });

  it("le client Prisma d'un espace fonctionne normalement sur ses propres données", async () => {
    const db = forTenant(orgA);
    const created = await db.siteClosure.create({
      data: {
        organizationId: orgA,
        siteId: siteA,
        startDate: new Date("2026-12-20"),
        endDate: new Date("2027-01-03"),
        reason: "Fermeture annuelle",
      },
    });
    expect(await db.siteClosure.count()).toBe(1);
    expect(await forTenant(orgB).siteClosure.count({ where: { id: created.id } })).toBe(0);
  });
});

describe("Garde « même entreprise » (vaut aussi pour les tâches système)", () => {
  it("la base explique le refus", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO intervention (id, "organizationId", title, "siteId", date, "updatedAt")
         VALUES ('croise', $1, 'Mauvais site', $2, now(), now())`,
        orgA,
        siteB,
      ),
    ).rejects.toThrow(/Référence entre entreprises refusée/);
  });

  it("refuse qu'une intervention de A pointe vers un site de B", async () => {
    await expect(
      prisma.intervention.create({
        data: { organizationId: orgA, title: "Mauvais site", siteId: siteB, date: new Date() },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("refuse une prestation de A sur un contrat de A mais un site de B", async () => {
    await expect(
      prisma.serviceLine.create({
        data: { organizationId: orgA, contractId: contractA, siteId: siteB, name: "Escalier" },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("refuse de déplacer une ligne vers une autre entreprise en gardant ses liens", async () => {
    const intervention = await prisma.intervention.create({
      data: { organizationId: orgA, title: "Passage", siteId: siteA, date: new Date() },
    });
    await expect(
      prisma.intervention.update({
        where: { id: intervention.id },
        data: { organizationId: orgB },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
});

describe("Chaîne contractuelle et historique", () => {
  it("prestation → série → version → intervention, sans doublon de créneau", async () => {
    const line = await prisma.serviceLine.create({
      data: {
        organizationId: orgA,
        contractId: contractA,
        siteId: siteA,
        name: "Escalier",
        activity: "cage",
      },
    });
    const series = await prisma.recurrenceSeries.create({
      data: { organizationId: orgA, serviceLineId: line.id },
    });
    expect(series).toMatchObject({ status: "proposed", holidayPolicy: "keep" });
    const v1 = await prisma.recurrenceRuleVersion.create({
      data: {
        organizationId: orgA,
        seriesId: series.id,
        version: 1,
        effectiveFrom: new Date("2026-10-01"),
        rule: { kind: "weekly", weekdays: [1], everyWeeks: 1 },
      },
    });
    await expect(
      prisma.recurrenceRuleVersion.create({
        data: {
          organizationId: orgA,
          seriesId: series.id,
          version: 1,
          effectiveFrom: new Date("2026-11-01"),
          rule: { kind: "weekly", weekdays: [2], everyWeeks: 1 },
        },
      }),
    ).rejects.toThrow();

    const slot = { slotKey: `${series.id}:2026-10-05` };
    const base = {
      organizationId: orgA,
      title: "Escalier",
      siteId: siteA,
      serviceLineId: line.id,
      seriesId: series.id,
      ruleVersionId: v1.id,
      date: new Date("2026-10-05"),
      ...slot,
    };
    const first = await prisma.intervention.createMany({ data: [base], skipDuplicates: true });
    const again = await prisma.intervention.createMany({ data: [base], skipDuplicates: true });
    expect([first.count, again.count]).toEqual([1, 0]);
  });

  it("l'historique ne s'efface pas : site et intervention documentée restent", async () => {
    const intervention = await prisma.intervention.create({
      data: {
        organizationId: orgA,
        title: "Passage documenté",
        siteId: siteA,
        date: new Date("2026-01-05"),
        deletedAt: new Date("2026-01-06"),
      },
    });
    await prisma.interventionEvent.create({
      data: { organizationId: orgA, interventionId: intervention.id, type: "started" },
    });
    await prisma.anomaly.create({
      data: { organizationId: orgA, siteId: siteA, type: "eclairage", comment: "Ampoule HS" },
    });
    await prisma.site.update({ where: { id: siteA }, data: { deletedAt: new Date("2026-01-06") } });

    // La base refuse l'effacement direct d'une intervention qui a un journal.
    await expect(prisma.intervention.delete({ where: { id: intervention.id } })).rejects.toThrow();
    // La corbeille ne purge pas ce qui a un historique.
    await purgeTrash(new Date("2026-06-01"));
    expect(await prisma.intervention.count({ where: { id: intervention.id } })).toBe(1);
    expect(await prisma.site.count({ where: { id: siteA } })).toBe(1);
    await prisma.site.update({ where: { id: siteA }, data: { deletedAt: null } });
  });
});

describe("Rôles", () => {
  it("l'intervenant (worker) ne supprime jamais rien", () => {
    for (const grant of Object.values(SYSTEM_ROLES.worker)) {
      expect(grant).not.toHaveProperty("delete");
    }
    expect(SYSTEM_ROLES.worker.cleaning).toEqual({ view: "own", create: "own", update: "own" });
  });

  it("chaque espace a son rôle Intervenant", async () => {
    expect(await prisma.role.count({ where: { organizationId: orgA, systemKey: "worker" } })).toBe(
      1,
    );
  });
});
