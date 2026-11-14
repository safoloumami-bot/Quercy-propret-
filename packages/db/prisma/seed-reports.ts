import type { Prisma, PrismaClient } from "@prisma/client";
import { PRESET_REPORTS } from "@quercy/core";

/** Deux rapports enregistrés de démonstration (dont un partagé et envoyé chaque mois). */
export async function seedReports(prisma: PrismaClient, organizationId: string, ownerId: string) {
  if ((await prisma.report.count({ where: { organizationId } })) > 0) return;
  const preset = (key: string) => PRESET_REPORTS.find((p) => p.key === key)!.definition;
  const json = (value: unknown) => value as Prisma.InputJsonValue;
  await prisma.report.createMany({
    data: [
      {
        organizationId,
        ownerId,
        name: "CA mensuel facturé",
        description: "Chiffre d'affaires HT des factures émises, mois par mois.",
        definition: json({ ...preset("revenue-by-month"), chart: "area" }),
        period: "12m",
        shared: true,
        schedule: "monthly",
        recipients: [],
      },
      {
        organizationId,
        ownerId,
        name: "Top 10 clients de l'année",
        definition: json(preset("revenue-by-customer")),
        period: "year",
        shared: true,
      },
    ],
  });
}
