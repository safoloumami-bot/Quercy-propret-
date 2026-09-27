import type { PrismaClient, Product } from "@prisma/client";
import {
  DEAL_STAGES,
  type DocumentKind,
  computeTotals,
  formatDocumentNumber,
  invoiceStatus,
  lineTotalCents,
  nextRunDate,
  sequenceKey,
} from "@quercy/core";

import { rng } from "./seed-crm";

const DAY = 86_400_000;

function utcDay(ms: number): Date {
  const d = new Date(ms);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const POSTAL: Record<string, string> = {
  Cahors: "46000",
  Figeac: "46100",
  Gourdon: "46300",
  Souillac: "46200",
  Prayssac: "46220",
  Montauban: "82000",
  "Villefranche-de-Rouergue": "12200",
  "Brive-la-Gaillarde": "19100",
  Toulouse: "31000",
  Luzech: "46140",
  "Puy-l'Évêque": "46700",
  Gramat: "46500",
  "Saint-Céré": "46400",
  "Castelnau-Montratier": "46170",
};
const STREETS = [
  "rue Nationale",
  "boulevard Gambetta",
  "avenue de la Gare",
  "place Carnot",
  "rue Joachim-Murat",
  "allée des Soupirs",
  "rue du Château-du-Roi",
  "quai Cavaignac",
  "rue Wilson",
  "chemin de Labéraudie",
];

const PRODUCTS = [
  {
    name: "Entretien de bureaux — forfait mensuel",
    sku: "ENT-BUR",
    type: "service",
    unit: "month",
    unitPrice: 890,
    vatRate: "20",
    description: "Passage 3 fois par semaine : sols, sanitaires, poubelles, dépoussiérage.",
  },
  {
    name: "Entretien de bureaux — forfait quotidien",
    sku: "ENT-QUO",
    type: "service",
    unit: "month",
    unitPrice: 1_650,
    vatRate: "20",
    description: "Passage du lundi au vendredi, fournitures sanitaires incluses.",
  },
  {
    name: "Nettoyage de vitres",
    sku: "VIT-H",
    type: "service",
    unit: "hour",
    unitPrice: 38,
    vatRate: "20",
    description: "Vitrerie intérieure et extérieure, perche à eau pure jusqu'à 12 m.",
  },
  {
    name: "Remise en état après travaux",
    sku: "REM-M2",
    type: "service",
    unit: "sqm",
    unitPrice: 6.5,
    vatRate: "20",
    description: "Dépoussiérage, décapage, lavage des sols et menuiseries.",
  },
  {
    name: "Nettoyage de fin de chantier",
    sku: "CHA-J",
    type: "service",
    unit: "day",
    unitPrice: 420,
    vatRate: "20",
    description: "Équipe de deux agents, matériel inclus.",
  },
  {
    name: "Désinfection de locaux médicaux",
    sku: "DES-MED",
    type: "service",
    unit: "flat",
    unitPrice: 260,
    vatRate: "20",
    description: "Protocole virucide EN 14476, traçabilité fournie.",
  },
  {
    name: "Shampouinage moquettes",
    sku: "MOQ-M2",
    type: "service",
    unit: "sqm",
    unitPrice: 4.2,
    vatRate: "20",
    description: "Injection-extraction, séchage rapide.",
  },
  {
    name: "Cristallisation de sols marbre",
    sku: "MAR-M2",
    type: "service",
    unit: "sqm",
    unitPrice: 9.8,
    vatRate: "20",
    description: null,
  },
  {
    name: "Intervention d'urgence (sous 4 h)",
    sku: "URG",
    type: "service",
    unit: "flat",
    unitPrice: 180,
    vatRate: "20",
    description: "Dégât des eaux, sinistre, remise en service rapide.",
  },
  {
    name: "Entretien des parties communes",
    sku: "COP-M",
    type: "service",
    unit: "month",
    unitPrice: 340,
    vatRate: "10",
    description: "Résidences : halls, escaliers, ascenseurs, sortie des conteneurs.",
  },
  {
    name: "Kit produits écolabellisés",
    sku: "KIT-ECO",
    type: "good",
    unit: "unit",
    unitPrice: 45,
    vatRate: "20",
    description: "Nettoyants multi-usages, sols et sanitaires (Ecolabel UE).",
  },
  {
    name: "Distributeur essuie-mains",
    sku: "DIS-EM",
    type: "good",
    unit: "unit",
    unitPrice: 62,
    vatRate: "20",
    description: null,
  },
  {
    name: "Recharge papier essuie-mains (colis)",
    sku: "PAP-EM",
    type: "good",
    unit: "unit",
    unitPrice: 29.9,
    vatRate: "20",
    description: null,
  },
  {
    name: "Audit hygiène des locaux",
    sku: "AUD",
    type: "service",
    unit: "flat",
    unitPrice: 350,
    vatRate: "20",
    description: "Visite, rapport et plan d'action.",
    active: false,
  },
];

const DEAL_NAMES = [
  "Contrat d'entretien annuel",
  "Remise en état après travaux",
  "Vitrerie trimestrielle",
  "Nettoyage fin de chantier",
  "Extension du contrat aux entrepôts",
  "Désinfection cabinet médical",
  "Parties communes de la résidence",
  "Entretien des moquettes",
];

const PROJECTS = [
  "Remise en état — nouveaux locaux",
  "Fin de chantier — extension",
  "Grand nettoyage de printemps",
  "Désinfection complète",
  "Entretien estival des gîtes",
  "Rénovation des sols",
  "Déménagement des bureaux",
  "Mise en service du nouveau site",
];
const TASKS = [
  "Visite technique et métré",
  "Planification des équipes",
  "Commande des consommables",
  "Dépoussiérage des plafonds et luminaires",
  "Lavage des vitres et menuiseries",
  "Décapage et traitement des sols",
  "Nettoyage des sanitaires",
  "Contrôle qualité avec le client",
  "Rapport d'intervention",
  "Réception et levée des réserves",
];

type Line = {
  productId: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unitPriceCents: number;
  discountPercent: number;
  vatRate: number;
};

/**
 * Ventes, pipeline, activités, projets et temps passé sur les 12 derniers mois (une seule fois
 * par espace, à la suite des entreprises et contacts).
 */
export async function seedBusiness(
  prisma: PrismaClient,
  organizationId: string,
  ownerIds: string[],
) {
  if ((await prisma.product.count({ where: { organizationId } })) > 0) return;
  const r = rng(20260928);
  const now = Date.now();
  const today = utcDay(now);

  await prisma.salesSettings.upsert({
    where: { organizationId },
    update: {},
    create: {
      organizationId,
      legalName: "Quercy Propreté SAS",
      address: "14 allée Fénelon",
      postalCode: "46000",
      city: "Cahors",
      siret: "81234567800021",
      vatNumber: "FR45812345678",
      email: "facturation@quercy-proprete.fr",
      phone: "05 65 20 14 14",
      iban: "FR76 1310 6005 0030 0123 4567 890",
      bic: "AGRIFRPP831",
      footer: "SAS au capital de 20 000 € — RCS Cahors 812 345 678 — APE 8121Z",
    },
  });

  // Adresses complètes des clients (mentions obligatoires et Factur-X).
  const companies = await prisma.company.findMany({
    where: { organizationId, deletedAt: null },
    include: { contacts: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });
  for (const c of companies) {
    await prisma.company.update({
      where: { id: c.id },
      data: {
        address: `${r.int(1, 120)} ${r.pick(STREETS)}`,
        postalCode: POSTAL[c.city ?? ""] ?? "46000",
        vatNumber: c.siren ? `FR${String(r.int(10, 99))}${c.siren}` : null,
      },
    });
  }

  const products: Product[] = [];
  for (const p of PRODUCTS) {
    products.push(
      await prisma.product.create({
        data: {
          organizationId,
          ...p,
          active: p.active ?? true,
          purchasePrice: p.type === "good" ? Math.round(p.unitPrice * 0.55 * 100) / 100 : null,
          ownerId: ownerIds[0],
          createdAt: new Date(now - 380 * DAY),
        },
      }),
    );
  }
  const product = (sku: string) => products.find((p) => p.sku === sku)!;
  const lineFrom = (sku: string, quantity: number, discountPercent = 0): Line => {
    const p = product(sku);
    return {
      productId: p.id,
      description: p.description ? `${p.name}\n${p.description}` : p.name,
      quantity,
      unit: p.unit,
      unitPriceCents: Math.round(p.unitPrice * 100),
      discountPercent,
      vatRate: Number(p.vatRate),
    };
  };

  const customers = companies.filter((c) => c.type === "customer" || c.type === "former");
  const prospects = companies.filter((c) => c.type === "prospect" || c.type === "partner");
  const contactOf = async (companyId: string) =>
    (await prisma.contact.findFirst({ where: { companyId }, select: { id: true } }))?.id ?? null;

  // ── Pipeline : opportunités sur 12 mois.
  const deals: {
    id: string;
    companyId: string;
    stage: string;
    amount: number;
    closedAt: Date | null;
  }[] = [];
  for (let i = 0; i < 72; i++) {
    const company = r.chance(0.6)
      ? r.pick(prospects.length ? prospects : companies)
      : r.pick(customers);
    const age = r.int(2, 360);
    const createdAt = new Date(now - age * DAY);
    const stage =
      age > 60
        ? r.pick(["won", "won", "won", "lost", "lost", "negotiation"])
        : r.pick([
            "lead",
            "qualified",
            "qualified",
            "proposal",
            "proposal",
            "negotiation",
            "won",
            "lost",
          ]);
    const closed = stage === "won" || stage === "lost";
    const closedAt = closed
      ? new Date(Math.min(now - DAY, createdAt.getTime() + r.int(10, 60) * DAY))
      : null;
    const amount = r.int(8, 180) * 100;
    const deal = await prisma.deal.create({
      data: {
        organizationId,
        name: `${r.pick(DEAL_NAMES)} — ${company.name}`,
        companyId: company.id,
        contactId: await contactOf(company.id),
        stage,
        amount,
        probability: DEAL_STAGES.find((s) => s.value === stage)!.probability,
        expectedCloseDate: closed ? closedAt : utcDay(now + r.int(7, 90) * DAY),
        closedAt,
        source: r.pick(["website", "referral", "event", "outbound", "partner"]),
        lostReason:
          stage === "lost"
            ? r.pick(["Prix trop élevé", "Concurrent retenu", "Projet reporté", "Pas de budget"])
            : null,
        ownerId: r.pick(ownerIds),
        tags: r.chance(0.2) ? ["prioritaire"] : [],
        createdAt,
        updatedAt: closedAt ?? createdAt,
      },
    });
    deals.push({ id: deal.id, companyId: company.id, stage, amount, closedAt });
  }

  // ── Activités : historique et agenda des 30 prochains jours.
  const activities = [];
  for (let i = 0; i < 260; i++) {
    const company = r.pick(companies);
    const offset = r.chance(0.82) ? -r.int(1, 360) : r.int(0, 30);
    const due = new Date(now + offset * DAY);
    due.setHours(r.pick([9, 10, 11, 14, 15, 16, 17]), r.pick([0, 15, 30, 45]), 0, 0);
    const type = r.pick(["call", "call", "email", "meeting", "task", "note"]);
    const done = offset < 0 ? r.chance(0.94) : false;
    const deal = deals.find((d) => d.companyId === company.id);
    activities.push({
      organizationId,
      type,
      subject:
        type === "call"
          ? r.pick([
              "Appel de suivi",
              "Point sur la prestation",
              "Relance du devis",
              "Appel découverte",
            ])
          : type === "meeting"
            ? r.pick([
                "Visite du site",
                "Rendez-vous de présentation",
                "Revue qualité trimestrielle",
              ])
            : type === "email"
              ? r.pick(["Envoi de la proposition", "Envoi du planning", "Réponse à la réclamation"])
              : type === "task"
                ? r.pick([
                    "Préparer le devis",
                    "Mettre à jour le contrat",
                    "Planifier l'intervention",
                  ])
                : "Compte rendu d'échange",
      dueAt: due,
      done,
      completedAt: done ? due : null,
      durationMinutes:
        type === "meeting"
          ? r.pick([30, 45, 60, 90])
          : type === "call"
            ? r.pick([10, 15, 20])
            : null,
      notes: r.chance(0.4)
        ? "Client satisfait de la prestation ; souhaite un passage supplémentaire en période de fêtes."
        : null,
      companyId: company.id,
      contactId: company.contacts[0]?.id ?? null,
      dealId: deal && r.chance(0.5) ? deal.id : null,
      ownerId: r.pick(ownerIds),
      createdAt: new Date(due.getTime() - r.int(0, 10) * DAY),
      updatedAt: due,
    });
  }
  await prisma.activity.createMany({ data: activities });

  // ── Documents commerciaux.
  type Planned = {
    kind: DocumentKind;
    companyId: string;
    contactId: string | null;
    dealId?: string | null;
    projectId?: string | null;
    subject: string;
    issueDate: Date | null;
    status: string;
    lines: Line[];
    paidRatio?: number;
    sourceIndex?: number;
    creditedIndex?: number;
    interval?: string;
  };
  const planned: Planned[] = [];

  // Contrats mensuels : 16 clients facturés chaque mois (avec leur modèle récurrent).
  const contracts = customers.slice(0, 16);
  const contractLine = new Map<string, Line>();
  for (const c of contracts) {
    const sku = r.chance(0.3) ? "ENT-QUO" : r.chance(0.3) ? "COP-M" : "ENT-BUR";
    contractLine.set(c.id, lineFrom(sku, 1, r.pick([0, 0, 5, 10])));
  }
  for (let m = 11; m >= 0; m--) {
    const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 1));
    if (month.getTime() > now) continue;
    for (const c of contracts) {
      const start = c.createdAt.getTime();
      if (start > month.getTime() + 20 * DAY) continue;
      const lines = [contractLine.get(c.id)!];
      if (r.chance(0.15)) lines.push(lineFrom("PAP-EM", r.int(1, 4)));
      planned.push({
        kind: "INVOICE",
        companyId: c.id,
        contactId: c.contacts[0]?.id ?? null,
        subject: `Entretien — ${month.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}`,
        issueDate: month,
        status: "sent",
        lines,
      });
    }
  }

  // Devis (et factures ponctuelles issues des devis acceptés).
  for (let i = 0; i < 64; i++) {
    const deal = r.chance(0.7) ? r.pick(deals) : null;
    const company = deal ? companies.find((c) => c.id === deal.companyId)! : r.pick(companies);
    const issue = utcDay(now - r.int(1, 350) * DAY);
    const lines = r.pick([
      [lineFrom("REM-M2", r.int(80, 900)), lineFrom("VIT-H", r.int(4, 16))],
      [lineFrom("CHA-J", r.int(1, 5))],
      [lineFrom("MOQ-M2", r.int(60, 400)), lineFrom("KIT-ECO", r.int(1, 3))],
      [lineFrom("DES-MED", r.int(1, 3)), lineFrom("URG", 1)],
      [lineFrom("MAR-M2", r.int(40, 250))],
      [lineFrom("VIT-H", r.int(6, 24), r.pick([0, 5]))],
    ]);
    const age = (now - issue.getTime()) / DAY;
    const status =
      deal?.stage === "won"
        ? r.chance(0.7)
          ? "invoiced"
          : "accepted"
        : deal?.stage === "lost"
          ? "declined"
          : age > 45
            ? r.pick(["expired", "declined", "invoiced", "accepted"])
            : r.pick(["sent", "sent", "accepted"]);
    const quoteIndex = planned.length;
    planned.push({
      kind: "QUOTE",
      companyId: company.id,
      contactId: company.contacts[0]?.id ?? null,
      dealId: deal?.id ?? null,
      subject: deal ? `Proposition — ${company.name}` : `Devis — ${company.name}`,
      issueDate: issue,
      status,
      lines,
    });
    if (status === "invoiced") {
      const invoiceDate = utcDay(Math.min(now - DAY, issue.getTime() + r.int(7, 30) * DAY));
      planned.push({
        kind: "INVOICE",
        companyId: company.id,
        contactId: company.contacts[0]?.id ?? null,
        dealId: deal?.id ?? null,
        subject: `Prestation ponctuelle — ${company.name}`,
        issueDate: invoiceDate,
        status: "sent",
        lines,
        sourceIndex: quoteIndex,
      });
    }
  }
  // Quelques devis en brouillon.
  for (let i = 0; i < 4; i++) {
    const company = r.pick(prospects.length ? prospects : companies);
    planned.push({
      kind: "QUOTE",
      companyId: company.id,
      contactId: company.contacts[0]?.id ?? null,
      subject: `Devis — ${company.name}`,
      issueDate: null,
      status: "draft",
      lines: [lineFrom("ENT-BUR", 1), lineFrom("VIT-H", 8)],
    });
  }
  // Commandes.
  for (let i = 0; i < 10; i++) {
    const company = r.pick(customers);
    planned.push({
      kind: "ORDER",
      companyId: company.id,
      contactId: company.contacts[0]?.id ?? null,
      subject: `Commande de consommables — ${company.name}`,
      issueDate: utcDay(now - r.int(3, 200) * DAY),
      status: r.pick(["confirmed", "delivered", "delivered", "invoiced"]),
      lines: [
        lineFrom("KIT-ECO", r.int(2, 10)),
        lineFrom("PAP-EM", r.int(2, 12)),
        ...(r.chance(0.4) ? [lineFrom("DIS-EM", r.int(1, 4))] : []),
      ],
    });
  }
  // Factures brouillon.
  for (let i = 0; i < 3; i++) {
    const company = r.pick(customers);
    planned.push({
      kind: "INVOICE",
      companyId: company.id,
      contactId: company.contacts[0]?.id ?? null,
      subject: `Intervention complémentaire — ${company.name}`,
      issueDate: null,
      status: "draft",
      lines: [lineFrom("URG", 1), lineFrom("VIT-H", r.int(2, 6))],
    });
  }

  // Création, dans l'ordre chronologique d'émission, avec numérotation continue par année.
  const settings = {
    QUOTE: "DV",
    ORDER: "BC",
    INVOICE: "FA",
    CREDIT_NOTE: "AV",
    RECURRING: "",
  } as const;
  const counters = new Map<string, number>();
  const order = planned
    .map((p, index) => ({ p, index }))
    .sort(
      (a, b) => (a.p.issueDate?.getTime() ?? Infinity) - (b.p.issueDate?.getTime() ?? Infinity),
    );
  const createdIds = new Map<number, string>();
  let late = 0;
  for (const { p, index } of order) {
    const totals = computeTotals(p.lines);
    let number: string | null = null;
    if (p.issueDate && p.status !== "draft") {
      const year = p.issueDate.getUTCFullYear();
      const key = sequenceKey(p.kind, year);
      const seq = (counters.get(key) ?? 0) + 1;
      counters.set(key, seq);
      number = formatDocumentNumber(settings[p.kind], year, seq);
    }
    const dueDate =
      p.kind === "INVOICE" && p.issueDate
        ? new Date(p.issueDate.getTime() + 30 * DAY)
        : p.kind === "QUOTE" && p.issueDate
          ? new Date(p.issueDate.getTime() + 30 * DAY)
          : null;

    // Encaissements : factures anciennes presque toutes payées, quelques retards réalistes.
    let paidCents = 0;
    const payments: { amountCents: number; date: Date; method: string }[] = [];
    if (p.kind === "INVOICE" && p.issueDate && p.status !== "draft") {
      const age = (now - p.issueDate.getTime()) / DAY;
      const roll = r.next();
      const fullyPaid = age > 50 ? roll < 0.93 : age > 25 ? roll < 0.7 : roll < 0.25;
      const partly = !fullyPaid && age > 35 && roll < 0.97 && late < 6;
      if (fullyPaid || partly) {
        const amount = fullyPaid ? totals.totalCents : Math.round(totals.totalCents * 0.4);
        const date = new Date(Math.min(now - DAY, p.issueDate.getTime() + r.int(4, 42) * DAY));
        payments.push({
          amountCents: amount,
          date,
          method: r.pick(["transfer", "transfer", "transfer", "direct_debit", "check", "card"]),
        });
        paidCents = amount;
        if (partly) late += 1;
      }
    }
    const status =
      p.kind === "INVOICE" && p.status !== "draft"
        ? invoiceStatus({ totalCents: totals.totalCents, paidCents, dueDate }, new Date(now))
        : p.status;
    const doc = await prisma.salesDocument.create({
      data: {
        organizationId,
        kind: p.kind,
        number,
        status,
        subject: p.subject,
        companyId: p.companyId,
        contactId: p.contactId,
        dealId: p.dealId ?? null,
        ownerId: r.pick(ownerIds),
        issueDate: p.issueDate,
        dueDate,
        paymentTermsDays: 30,
        totalExclCents: totals.totalExclCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        paidCents,
        dueCents: totals.totalCents - paidCents,
        sourceId: p.sourceIndex !== undefined ? (createdIds.get(p.sourceIndex) ?? null) : null,
        sentAt: p.issueDate && p.status !== "draft" ? p.issueDate : null,
        acceptedAt:
          ["accepted", "invoiced"].includes(p.status) && p.issueDate
            ? new Date(p.issueDate.getTime() + 5 * DAY)
            : null,
        paidAt: status === "paid" ? (payments[0]?.date ?? null) : null,
        reminderCount: status === "overdue" ? r.int(0, 2) : 0,
        createdAt: p.issueDate ?? new Date(now - r.int(1, 5) * DAY),
        updatedAt: payments[0]?.date ?? p.issueDate ?? new Date(now),
        lines: {
          create: p.lines.map((l, position) => ({
            ...l,
            position,
            totalExclCents: lineTotalCents(l),
          })),
        },
        payments: {
          create: payments.map((pay) => ({ ...pay, organizationId })),
        },
      },
    });
    createdIds.set(index, doc.id);
  }

  // Avoirs sur trois factures payées (geste commercial partiel).
  const credited = await prisma.salesDocument.findMany({
    where: { organizationId, kind: "INVOICE", status: "paid" },
    orderBy: { issueDate: "asc" },
    take: 3,
    skip: 10,
    include: { lines: true },
  });
  for (const invoice of credited) {
    const issueDate = utcDay(invoice.issueDate!.getTime() + 20 * DAY);
    const year = issueDate.getUTCFullYear();
    const key = sequenceKey("CREDIT_NOTE", year);
    const seq = (counters.get(key) ?? 0) + 1;
    counters.set(key, seq);
    const line = invoice.lines[0]!;
    const creditLine = {
      ...line,
      quantity: 1,
      unitPriceCents: Math.round(line.unitPriceCents * 0.15),
      discountPercent: 0,
    };
    const totals = computeTotals([creditLine]);
    await prisma.salesDocument.create({
      data: {
        organizationId,
        kind: "CREDIT_NOTE",
        number: formatDocumentNumber("AV", year, seq),
        status: "refunded",
        subject: `Geste commercial sur la facture ${invoice.number}`,
        companyId: invoice.companyId,
        contactId: invoice.contactId,
        ownerId: invoice.ownerId,
        issueDate,
        creditedInvoiceId: invoice.id,
        totalExclCents: totals.totalExclCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        dueCents: totals.totalCents,
        createdAt: issueDate,
        updatedAt: issueDate,
        lines: {
          create: [
            {
              position: 0,
              description: `Remise commerciale — ${line.description.split("\n")[0]}`,
              quantity: 1,
              unit: "flat",
              unitPriceCents: creditLine.unitPriceCents,
              discountPercent: 0,
              vatRate: line.vatRate,
              totalExclCents: lineTotalCents(creditLine),
            },
          ],
        },
      },
    });
  }

  // Modèles récurrents des contrats (prochaine facture le 1er du mois prochain).
  const firstOfNext = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  for (const c of contracts) {
    const line = contractLine.get(c.id)!;
    const totals = computeTotals([line]);
    await prisma.salesDocument.create({
      data: {
        organizationId,
        kind: "RECURRING",
        status: "active",
        subject: `Contrat d'entretien — ${c.name}`,
        companyId: c.id,
        contactId: c.contacts[0]?.id ?? null,
        ownerId: c.ownerId,
        interval: "monthly",
        nextRunAt: firstOfNext,
        autoSend: r.chance(0.6),
        totalExclCents: totals.totalExclCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        dueCents: totals.totalCents,
        createdAt: c.createdAt,
        lines: { create: [{ ...line, position: 0, totalExclCents: lineTotalCents(line) }] },
      },
    });
  }
  // Un modèle trimestriel en pause.
  const paused = customers[20] ?? customers[0]!;
  await prisma.salesDocument.create({
    data: {
      organizationId,
      kind: "RECURRING",
      status: "paused",
      subject: `Vitrerie trimestrielle — ${paused.name}`,
      companyId: paused.id,
      ownerId: paused.ownerId,
      interval: "quarterly",
      nextRunAt: nextRunDate(firstOfNext, "monthly"),
      lines: {
        create: [
          {
            ...lineFrom("VIT-H", 12),
            position: 0,
            totalExclCents: lineTotalCents(lineFrom("VIT-H", 12)),
          },
        ],
      },
      ...(() => {
        const t = computeTotals([lineFrom("VIT-H", 12)]);
        return {
          totalExclCents: t.totalExclCents,
          taxCents: t.taxCents,
          totalCents: t.totalCents,
          dueCents: t.totalCents,
        };
      })(),
    },
  });

  for (const [key, value] of counters)
    await prisma.numberSequence.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value },
      update: { value },
    });

  // ── Projets, tâches et temps passé.
  for (let i = 0; i < PROJECTS.length + 4; i++) {
    const company = r.pick(customers);
    const startAgo = r.int(-20, 330);
    const startDate = utcDay(now - startAgo * DAY);
    const length = r.int(10, 75);
    const endDate = utcDay(startDate.getTime() + length * DAY);
    const status =
      endDate.getTime() < now - 5 * DAY
        ? r.pick(["done", "done", "done", "cancelled"])
        : startDate.getTime() > now
          ? "planned"
          : r.pick(["active", "active", "on_hold"]);
    const project = await prisma.project.create({
      data: {
        organizationId,
        name: `${PROJECTS[i % PROJECTS.length]} — ${company.name}`,
        companyId: company.id,
        status,
        startDate,
        endDate,
        budget: r.int(15, 120) * 100,
        hourlyRate: r.pick([38, 42, 45]),
        description:
          "Intervention planifiée avec le client ; accès par badge, clés au poste de sécurité.",
        ownerId: r.pick(ownerIds),
        createdAt: new Date(startDate.getTime() - 10 * DAY),
      },
    });
    const taskCount = r.int(5, 9);
    for (let t = 0; t < taskCount; t++) {
      const taskStart = utcDay(startDate.getTime() + Math.floor((length * t) / taskCount) * DAY);
      const taskDue = utcDay(taskStart.getTime() + r.int(2, 12) * DAY);
      const taskStatus =
        status === "done"
          ? "done"
          : taskDue.getTime() < now
            ? r.pick(["done", "done", "done", "review"])
            : taskStart.getTime() < now
              ? r.pick(["in_progress", "in_progress", "review", "todo"])
              : "todo";
      const owner = r.pick(ownerIds);
      const task = await prisma.task.create({
        data: {
          organizationId,
          title: TASKS[t % TASKS.length]!,
          projectId: project.id,
          status: taskStatus,
          priority: r.pick(["low", "normal", "normal", "normal", "high", "urgent"]),
          startDate: taskStart,
          dueDate: taskDue,
          estimateHours: r.pick([2, 4, 6, 8, 12, 16]),
          completedAt: taskStatus === "done" ? taskDue : null,
          ownerId: owner,
          createdAt: new Date(project.createdAt.getTime() + DAY),
        },
      });
      // Temps passé sur les tâches commencées.
      if (taskStart.getTime() < now) {
        const entries = r.int(1, 5);
        const time = [];
        for (let e = 0; e < entries; e++) {
          const date = utcDay(Math.min(now - DAY, taskStart.getTime() + r.int(0, 10) * DAY));
          time.push({
            organizationId,
            projectId: project.id,
            taskId: task.id,
            ownerId: r.chance(0.7) ? owner : r.pick(ownerIds),
            description: r.pick([
              "Intervention sur site",
              "Préparation",
              "Déplacement et installation",
              "Finitions",
            ]),
            date,
            minutes: r.pick([45, 60, 90, 120, 180, 240, 300]),
            billable: r.chance(0.85),
            createdAt: date,
          });
        }
        await prisma.timeEntry.createMany({ data: time });
      }
    }
  }
}
