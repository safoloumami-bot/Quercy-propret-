import type { Prisma, PrismaClient } from "@prisma/client";

import { rng } from "./seed-crm";

const DAY = 86_400_000;
const empty = { combinator: "and", rules: [] };
const view = (filter: object, extra: Record<string, unknown> = {}) =>
  ({
    columns: [],
    sort: [],
    filter,
    groupBy: null,
    density: "normal",
    layout: "table",
    ...extra,
  }) as Prisma.InputJsonValue;

/**
 * Compléments de démonstration pour que chaque écran ait du contenu : champs personnalisés,
 * vues enregistrées, commentaires, journal d'audit, automatisations et notifications.
 */
export async function seedExtras(prisma: PrismaClient, organizationId: string, userIds: string[]) {
  const r = rng(4646);
  const now = Date.now();
  const owner = userIds[0]!;
  const someone = () => r.pick(userIds);

  // Champs personnalisés (Réglages › Champs) et valeurs sur les entreprises.
  await prisma.customFieldDefinition.createMany({
    data: [
      {
        organizationId,
        entityType: "company",
        key: "surface",
        label: "Surface à entretenir (m²)",
        type: "NUMBER",
        position: 0,
      },
      {
        organizationId,
        entityType: "company",
        key: "frequence",
        label: "Fréquence de passage",
        type: "SELECT",
        position: 1,
        options: { choices: ["Quotidienne", "3 fois par semaine", "Hebdomadaire", "Mensuelle"] },
      },
      {
        organizationId,
        entityType: "company",
        key: "acces",
        label: "Accès aux locaux",
        type: "TEXT",
        position: 2,
      },
    ],
  });
  const companies = await prisma.company.findMany({
    where: { organizationId },
    select: { id: true, name: true, type: true },
  });
  for (const c of companies.filter((c) => c.type === "customer")) {
    await prisma.company.update({
      where: { id: c.id },
      data: {
        customFields: {
          surface: r.int(8, 120) * 10,
          frequence: r.pick(["Quotidienne", "3 fois par semaine", "Hebdomadaire", "Mensuelle"]),
          acces: r.pick([
            "Badge à l'accueil",
            "Clé au coffre",
            "Code portail 2468",
            "Gardien sur place",
          ]),
        },
      },
    });
  }

  // Vues enregistrées partagées.
  await prisma.savedView.createMany({
    data: [
      {
        organizationId,
        ownerId: owner,
        entityType: "company",
        name: "Clients actifs",
        shared: true,
        config: view({
          combinator: "and",
          rules: [{ field: "type", operator: "in", value: ["customer"] }],
        }),
      },
      {
        organizationId,
        ownerId: owner,
        entityType: "invoice",
        name: "À relancer",
        shared: true,
        config: view({
          combinator: "and",
          rules: [{ field: "status", operator: "in", value: ["overdue"] }],
        }),
      },
      {
        organizationId,
        ownerId: owner,
        entityType: "task",
        name: "Tableau de l'équipe",
        shared: true,
        config: view(empty, { layout: "board" }),
      },
      {
        organizationId,
        ownerId: owner,
        entityType: "ticket",
        name: "Tickets ouverts",
        shared: true,
        config: view(
          {
            combinator: "and",
            rules: [{ field: "status", operator: "in", value: ["new", "open", "pending"] }],
          },
          { layout: "board" },
        ),
      },
    ],
  });

  // Commentaires sur des fiches (onglet Commentaires).
  const notes = [
    "Client très satisfait du dernier passage, penser à proposer la vitrerie trimestrielle.",
    "Attention : alarme à désactiver avant 7 h (code dans le champ Accès).",
    "Rendez-vous pris avec la responsable des services généraux pour le renouvellement.",
    "Prévoir des sacs 100 L supplémentaires, forte activité en fin de mois.",
    "Facture contestée par erreur, le client a confirmé le règlement par virement.",
  ];
  const invoices = await prisma.salesDocument.findMany({
    where: { organizationId, kind: "INVOICE", status: { in: ["overdue", "partial"] } },
    select: { id: true },
    take: 5,
  });
  const tickets = await prisma.ticket.findMany({
    where: { organizationId },
    select: { id: true },
    take: 6,
  });
  const targets = [
    ...companies.slice(0, 8).map((c) => ({ entityType: "company", entityId: c.id })),
    ...invoices.map((i) => ({ entityType: "invoice", entityId: i.id })),
    ...tickets.map((t) => ({ entityType: "ticket", entityId: t.id })),
  ];
  await prisma.comment.createMany({
    data: targets.map((t, i) => ({
      organizationId,
      ...t,
      authorId: someone(),
      body:
        t.entityType === "ticket"
          ? r.pick([
              "Pris en charge, passage prévu demain matin.",
              "Le client confirme que tout est rentré dans l'ordre.",
              "Photo avant/après jointe au rapport d'intervention.",
            ])
          : notes[i % notes.length]!,
      createdAt: new Date(now - r.int(1, 60) * DAY),
    })),
  });

  // Journal d'audit (Réglages › Journal d'audit).
  await prisma.auditLog.createMany({
    data: companies.slice(0, 25).map((c, i) => ({
      organizationId,
      actorId: someone(),
      action: i % 3 === 0 ? "record.update" : "record.create",
      entityType: "company",
      entityId: c.id,
      metadata: { name: c.name },
      createdAt: new Date(now - (25 - i) * 3 * DAY),
    })),
  });

  // Automatisations (Automatisations).
  const overdue = {
    combinator: "and",
    rules: [{ field: "status", operator: "in", value: ["overdue"] }],
  };
  await prisma.automation.createMany({
    data: [
      {
        organizationId,
        name: "Facture en retard : tâche de relance",
        entity: "invoice",
        trigger: "updated",
        conditions: overdue,
        actions: [
          { type: "create_task", title: "Relancer {{number}}", dueInDays: 2 },
          { type: "notify", to: "owner", message: "La facture {{number}} est en retard." },
        ],
        runCount: 14,
        lastRunAt: new Date(now - 2 * DAY),
        createdById: owner,
      },
      {
        organizationId,
        name: "Ticket urgent : prévenir le responsable",
        entity: "ticket",
        trigger: "created",
        conditions: {
          combinator: "and",
          rules: [{ field: "priority", operator: "in", value: ["urgent", "high"] }],
        },
        actions: [
          { type: "notify", to: "owner", message: "Nouveau ticket prioritaire : {{titre}}" },
        ],
        runCount: 6,
        lastRunAt: new Date(now - 5 * DAY),
        createdById: owner,
      },
      {
        organizationId,
        name: "Affaire gagnée : lancer le projet",
        entity: "deal",
        trigger: "updated",
        conditions: {
          combinator: "and",
          rules: [{ field: "stage", operator: "in", value: ["won"] }],
        },
        actions: [
          { type: "create_task", title: "Planifier le démarrage : {{titre}}", dueInDays: 3 },
        ],
        runCount: 9,
        lastRunAt: new Date(now - 9 * DAY),
        createdById: owner,
        active: false,
      },
    ],
  });

  // Notifications (cloche) pour chaque membre.
  const titles = [
    [
      "record.assigned",
      "Julien vous a confié « Remise en état — Pharmacie Rocamadour »",
      "/ventes/devis",
    ],
    ["automation", "La facture FA-2026-0053 est en retard.", "/ventes/factures"],
    ["stock.low", "Stock bas : « Sacs poubelle 100 L (rouleau de 25) »", "/ventes/catalogue"],
    ["comment", "Sophie a commenté « Domaine Bonnet »", "/crm/entreprises"],
  ] as const;
  await prisma.notification.createMany({
    data: userIds.flatMap((userId) =>
      titles.map(([type, title, url], i) => ({
        organizationId,
        userId,
        type,
        title,
        url,
        createdAt: new Date(now - (i + 1) * 3_600_000 * 5),
        readAt: i >= 2 ? new Date(now - 3_600_000) : null,
      })),
    ),
  });
}
