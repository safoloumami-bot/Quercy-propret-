import { TASK_LIBRARY, addDays, utcDay } from "@quercy/core";
import type { PrismaClient } from "@prisma/client";

/**
 * Démonstration des lots 6 à 9 (données fictives) : fiches intervenants et coûts horaires,
 * une absence, une tournée, une fiche mission, véhicules, matériel, une location, des
 * chiffrages, un supplément à valider et les réglages du chiffrage.
 */
export async function seedField(prisma: PrismaClient, organizationId: string, agentIds: string[]) {
  if (await prisma.workerProfile.count({ where: { organizationId } })) return;
  const today = utcDay(new Date());
  const [chef, a1, a2, a3] = agentIds;

  // Réglages du chiffrage.
  await prisma.salesSettings.updateMany({
    where: { organizationId },
    data: { minMarginPct: 20, defaultHourlyCostCents: 2_350, defaultKmCostCents: 45 },
  });

  // Fiches intervenants : coût horaire chargé, remplaçants.
  const costs = [2_600, 2_250, 2_300, 2_400, 2_200, 2_350];
  for (const [i, userId] of agentIds.entries())
    await prisma.workerProfile.create({
      data: {
        organizationId,
        userId,
        kind: i === 0 ? "manager" : "employee",
        activities: i % 2 ? ["copropriété", "bureaux"] : ["bureaux", "commerces"],
        zone: i % 2 ? "Cahors" : "Figeac",
        hourlyCostCents: costs[i % costs.length]!,
        replacement1Id: agentIds[(i + 1) % agentIds.length] ?? null,
        replacement2Id: agentIds[(i + 2) % agentIds.length] ?? null,
        canDriveCompanyVehicles: true,
      },
    });
  if (a2)
    await prisma.absence.create({
      data: {
        organizationId,
        userId: a2,
        kind: "leave",
        startDate: addDays(today, 9),
        endDate: addDays(today, 13),
        status: "approved",
        comment: "Congés d'automne",
        requestedById: a2,
        decidedById: chef ?? a2,
        decidedAt: new Date(),
      },
    });

  const sites = await prisma.site.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 4,
    select: { id: true, companyId: true, name: true },
  });
  if (sites.length >= 3)
    await prisma.route.create({
      data: {
        organizationId,
        name: "Tournée du matin — Cahors",
        zone: "Cahors",
        mainAgentId: a1 ?? null,
        replacementAgentId: a3 ?? null,
        vehicle: "GH-482-KL",
        weekdays: [1, 2, 3, 4, 5],
        startTime: "06:00",
        endTime: "11:30",
        startPoint: "Dépôt de Cahors",
        stops: {
          create: sites.slice(0, 3).map((s, i) => ({
            organizationId,
            siteId: s.id,
            sortOrder: i,
            travelMinutes: i ? 12 + i * 4 : null,
            travelMeters: i ? 6_000 + i * 2_500 : null,
          })),
        },
      },
    });

  // Stock : dépôt, articles consommables, fiche mission avec consommables prévus.
  const warehouse =
    (await prisma.warehouse.findFirst({ where: { organizationId, deletedAt: null } })) ??
    (await prisma.warehouse.create({ data: { organizationId, name: "Dépôt de Cahors" } }));
  const goods = await prisma.product.findMany({
    where: { organizationId, type: "good", deletedAt: null },
    take: 2,
    select: { id: true },
  });
  if (sites[0]) {
    const zone = TASK_LIBRARY[0]!;
    await prisma.missionSheet.create({
      data: {
        organizationId,
        siteId: sites[0].id,
        title: "Fiche mission",
        version: 1,
        instructions: "Prévenir l'accueil en arrivant. Pas de javel sur le parquet.",
        durationMinutes: 120,
        createdById: chef ?? null,
        updatedById: chef ?? null,
        tasks: {
          create: zone.tasks.map((t, i) => ({
            organizationId,
            zone: zone.zone,
            label: t.label,
            frequency: t.frequency,
            critical: t.critical,
            photoRequired: t.photo,
            sortOrder: i,
          })),
        },
        consumables: {
          create: goods.map((g, i) => ({
            organizationId,
            productId: g.id,
            plannedQuantity: 1,
            sortOrder: i,
          })),
        },
      },
    });
  }

  // Véhicules et matériel.
  await prisma.vehicle.createMany({
    data: [
      {
        organizationId,
        plate: "GH-482-KL",
        model: "Renault Kangoo",
        type: "van",
        energy: "diesel",
        assignedUserId: a1 ?? null,
        mileage: 58_210,
        status: "in_use",
        financing: "lease",
        monthlyCostCents: 39_000,
        inspectionDueDate: addDays(today, 18),
        nextServiceMileage: 60_000,
      },
      {
        organizationId,
        plate: "FT-117-PB",
        model: "Peugeot Partner",
        type: "van",
        energy: "electric",
        assignedUserId: a2 ?? null,
        mileage: 21_480,
        status: "in_use",
        financing: "owned",
        insuranceDueDate: addDays(today, 75),
      },
    ],
  });
  const machines = await Promise.all(
    [
      { name: "Autolaveuse Kärcher B 40", serial: "KB40-2291", day: 9_000, week: 40_000 },
      { name: "Monobrosse Taski Ergodisc", serial: "TE-77812", day: 4_500, week: 20_000 },
      { name: "Nettoyeur haute pression HD 6/13", serial: "HD613-0451", day: 3_500, week: 15_000 },
    ].map((m, i) =>
      prisma.equipment.create({
        data: {
          organizationId,
          name: m.name,
          category: "Machines",
          serialNumber: m.serial,
          status: i === 0 ? "assigned_agent" : "in_stock",
          assignedUserId: i === 0 ? (a1 ?? null) : null,
          warehouseId: i === 0 ? null : warehouse.id,
          ownership: i === 2 ? "hired" : "owned",
          hireCostCents: i === 2 ? 12_000 : null,
          rentable: i !== 2,
          dayRateCents: m.day,
          weekRateCents: m.week,
          depositCents: i === 0 ? 50_000 : 20_000,
        },
      }),
    ),
  );
  for (const m of machines)
    await prisma.equipmentMovement.create({
      data: {
        organizationId,
        equipmentId: m.id,
        status: m.status,
        location: m.warehouseId ? "Dépôt de Cahors" : "Affecté",
        assignedUserId: m.assignedUserId,
        warehouseId: m.warehouseId,
        movedById: chef ?? null,
      },
    });
  const renter = sites[1]?.companyId ?? sites[0]?.companyId ?? null;
  if (renter)
    await prisma.rental.create({
      data: {
        organizationId,
        reference: `LOC-${today.getUTCFullYear()}-0001`,
        equipmentId: machines[1]!.id,
        companyId: renter,
        startDate: addDays(today, 4),
        endDate: addDays(today, 10),
        period: "week",
        unitPriceCents: 20_000,
        depositCents: 20_000,
        status: "reserved",
      },
    });
  await prisma.numberSequence.upsert({
    where: {
      organizationId_key: { organizationId, key: `location-${today.getUTCFullYear()}` },
    },
    create: { organizationId, key: `location-${today.getUTCFullYear()}`, value: 1 },
    update: {},
  });

  // Chiffrages : un brouillon, un validé (valeurs calculées comme le fait le logiciel).
  if (sites[2]) {
    const year = today.getUTCFullYear();
    await prisma.estimate.createMany({
      data: [
        {
          organizationId,
          reference: `CH-${year}-0001`,
          title: "Remise en état après travaux — rez-de-chaussée",
          companyId: sites[2].companyId,
          siteId: sites[2].id,
          kind: "one_off",
          status: "draft",
          people: 2,
          hoursPerPerson: 3,
          hourlyCostCents: 2_350,
          km: 30,
          kmCostCents: 45,
          travelMinutes: 30,
          productsCents: 800,
          equipmentCents: 500,
          targetMarginPct: 32,
          costCents: 19_300,
          minPriceCents: 24_125,
          advisedPriceCents: 28_382,
          marginPct: 32,
          startDate: addDays(today, 15),
          startTime: "08:00",
          ownerId: chef ?? null,
        },
        {
          organizationId,
          reference: `CH-${year}-0002`,
          title: "Entretien des parties communes",
          companyId: sites[2].companyId,
          siteId: sites[2].id,
          kind: "recurring",
          status: "approved",
          people: 1,
          hoursPerPerson: 1.5,
          hourlyCostCents: 2_350,
          km: 12,
          kmCostCents: 45,
          travelMinutes: 15,
          productsCents: 300,
          targetMarginPct: 30,
          weekdays: ["2", "5"],
          costCents: 4_652,
          minPriceCents: 5_815,
          advisedPriceCents: 6_646,
          marginPct: 30,
          monthlyPriceCents: 57_602,
          approvedById: chef ?? null,
          approvedAt: new Date(),
          startDate: addDays(today, 20),
          startTime: "07:00",
          ownerId: chef ?? null,
        },
      ],
    });
    await prisma.numberSequence.upsert({
      where: { organizationId_key: { organizationId, key: `chiffrage-${year}` } },
      create: { organizationId, key: `chiffrage-${year}`, value: 2 },
      update: {},
    });
  }

  // Un supplément réalisé, à valider avant facturation.
  if (sites[0])
    await prisma.intervention.create({
      data: {
        organizationId,
        title: "Vitrerie du hall (supplément)",
        siteId: sites[0].id,
        companyId: sites[0].companyId,
        ownerId: a1 ?? null,
        date: addDays(today, -3),
        startTime: "14:00",
        durationMinutes: 90,
        status: "done",
        workedMinutes: 95,
        extraPriceCents: 12_000,
        extraStatus: "pending",
      },
    });
}
