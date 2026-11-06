import type { PrismaClient } from "@prisma/client";

import { rng } from "./seed-crm";

const DAY = 86_400_000;
const SUPPLIERS = [
  ["Papeterie Martin", "supplies", "Cahors"],
  ["Hygiène Pro Sud-Ouest", "goods", "Toulouse"],
  ["Lot Équipements", "goods", "Figeac"],
  ["EDF Entreprises", "utilities", "Paris"],
  ["Orange Business", "utilities", "Paris"],
  ["Garage du Causse", "services", "Gramat"],
  ["Nettoyage Express 46", "subcontracting", "Cahors"],
  ["Fournitures Occitanie", "supplies", "Montauban"],
] as const;
const EMPLOYEES = [
  ["Julie", "Vayssière", "Agente d'entretien", "Exploitation", "cdi", 2_280_000],
  ["Karim", "Benali", "Agent d'entretien", "Exploitation", "cdi", 2_280_000],
  ["Sophie", "Lacoste", "Cheffe d'équipe", "Exploitation", "cdi", 2_760_000],
  ["Thomas", "Delpech", "Laveur de vitres", "Exploitation", "cdd", 2_220_000],
  ["Inès", "Rouquette", "Assistante administrative", "Administration", "cdi", 2_520_000],
  ["Lucas", "Fabre", "Apprenti agent de propreté", "Exploitation", "apprentice", 1_140_000],
  ["Marion", "Couderc", "Responsable commerciale", "Commercial", "cdi", 3_600_000],
  ["Paul", "Lafon", "Agent d'entretien", "Exploitation", "cdi", 2_280_000],
] as const;

/**
 * Données de démonstration des modules complémentaires sur 12 mois : achats, stocks, agenda,
 * support, RH, trésorerie et documents, cohérentes avec les ventes (encaissements réels).
 */
export async function seedModules(
  prisma: PrismaClient,
  organizationId: string,
  ownerIds: string[],
) {
  const r = rng(8080);
  const now = Date.now();
  const ago = (days: number) => new Date(now - days * DAY);
  const owner = () => r.pick(ownerIds);
  const base = { organizationId };

  // Achats
  const suppliers = [];
  for (const [name, category, city] of SUPPLIERS)
    suppliers.push(
      await prisma.supplier.create({
        data: {
          ...base,
          name,
          category,
          city,
          email: `contact@${name.toLowerCase().replace(/[^a-z]+/g, "")}.fr`,
          ownerId: owner(),
        },
      }),
    );
  for (let i = 0; i < 10; i++) {
    const date = ago(r.int(5, 360));
    await prisma.purchaseOrder.create({
      data: {
        ...base,
        number: `BC-${String(i + 1).padStart(4, "0")}`,
        supplierId: r.pick(suppliers.slice(0, 3)).id,
        status: date.getTime() < now - 30 * DAY ? "received" : r.pick(["draft", "sent"]),
        orderDate: date,
        expectedDate: new Date(date.getTime() + 10 * DAY),
        totalExclCents: r.int(20, 250) * 1000,
        ownerId: owner(),
      },
    });
  }
  const bills = [];
  for (let month = 11; month >= 0; month--) {
    for (const supplier of suppliers.slice(0, 5)) {
      if (!r.chance(0.7)) continue;
      const issue = ago(month * 30 + r.int(0, 25));
      const excl = r.int(8, 180) * 1000;
      const due = new Date(issue.getTime() + 30 * DAY);
      const paid = due.getTime() < now - 5 * DAY || r.chance(0.3);
      bills.push(
        await prisma.bill.create({
          data: {
            ...base,
            number: `F${issue.getFullYear()}-${r.int(100, 9999)}`,
            supplierId: supplier.id,
            status: paid ? "paid" : "to_pay",
            category: supplier.category === "utilities" ? "services" : "supplies",
            issueDate: issue,
            dueDate: due,
            totalExclCents: excl,
            vatCents: Math.round(excl * 0.2),
            totalCents: Math.round(excl * 1.2),
            paidAt: paid ? due : null,
            ownerId: owner(),
          },
        }),
      );
    }
  }
  for (let i = 0; i < 24; i++) {
    const amount = r.int(12, 180) * 100;
    await prisma.expense.create({
      data: {
        ...base,
        description: r.pick([
          "Carburant tournée",
          "Péage A20",
          "Repas client",
          "Parking Cahors",
          "Hôtel Toulouse",
          "Petites fournitures",
        ]),
        date: ago(r.int(1, 360)),
        category: r.pick(["travel", "meals", "lodging", "supplies"]),
        amountCents: amount,
        vatCents: Math.round(amount / 6),
        status: i < 4 ? "submitted" : r.pick(["approved", "reimbursed", "reimbursed"]),
        ownerId: owner(),
      },
    });
  }

  // Stocks
  const warehouses = [
    await prisma.warehouse.create({
      data: {
        ...base,
        name: "Dépôt de Cahors",
        address: "12 rue du Portail Alban, 46000 Cahors",
        ownerId: owner(),
      },
    }),
    await prisma.warehouse.create({
      data: {
        ...base,
        name: "Local de Figeac",
        address: "4 avenue Bernard Fontanges, 46100 Figeac",
        ownerId: owner(),
      },
    }),
  ];
  const goods = await prisma.product.findMany({
    where: { organizationId, type: "good" },
    select: { id: true },
  });
  for (const product of goods) {
    let stock = 0;
    for (let i = 0; i < 8; i++) {
      const incoming = i % 3 === 0;
      const quantity = incoming ? r.int(40, 80) : r.int(5, 20);
      stock += incoming ? quantity : -quantity;
      await prisma.stockMovement.create({
        data: {
          ...base,
          productId: product.id,
          warehouseId: r.pick(warehouses).id,
          type: incoming ? "in" : "out",
          quantity,
          date: ago(330 - i * 40),
          reference: incoming ? "Réception fournisseur" : "Sortie chantier",
          ownerId: owner(),
        },
      });
    }
    await prisma.product.update({
      where: { id: product.id },
      data: { stockQuantity: stock, reorderLevel: 20 },
    });
  }

  // Agenda et support
  const companies = await prisma.company.findMany({
    where: { organizationId },
    select: { id: true, name: true },
    take: 30,
  });
  for (let i = 0; i < 40; i++) {
    const start = new Date(now + r.int(-60, 45) * DAY);
    start.setHours(r.pick([8, 9, 10, 14, 15, 16]), 0, 0, 0);
    const company = r.pick(companies);
    const type = r.pick(["meeting", "visit", "visit", "call", "internal"]);
    await prisma.event.create({
      data: {
        ...base,
        title:
          type === "internal"
            ? "Point d'équipe"
            : `${type === "visit" ? "Intervention" : type === "call" ? "Appel" : "Rendez-vous"} — ${company.name}`,
        type,
        startAt: start,
        endAt: new Date(start.getTime() + r.pick([1, 1, 2, 3]) * 3_600_000),
        location: type === "internal" ? "Dépôt de Cahors" : null,
        companyId: type === "internal" ? null : company.id,
        ownerId: owner(),
      },
    });
  }
  const subjects = [
    "Vitres oubliées au 2e étage",
    "Demande de passage supplémentaire",
    "Question sur la facture",
    "Produit laissé sur place",
    "Changement d'horaires",
    "Clé du local à récupérer",
    "Réclamation qualité sanitaires",
  ];
  for (let i = 0; i < 28; i++) {
    const created = ago(r.int(0, 200));
    const status =
      created.getTime() > now - 7 * DAY
        ? r.pick(["new", "open", "pending"])
        : r.pick(["resolved", "closed", "closed"]);
    await prisma.ticket.create({
      data: {
        ...base,
        subject: r.pick(subjects),
        companyId: r.pick(companies).id,
        status,
        priority: r.pick(["low", "normal", "normal", "high", "urgent"]),
        channel: r.pick(["email", "phone", "web"]),
        dueDate: new Date(created.getTime() + 2 * DAY),
        resolvedAt:
          status === "resolved" || status === "closed"
            ? new Date(created.getTime() + r.int(1, 4) * DAY)
            : null,
        createdAt: created,
        ownerId: owner(),
      },
    });
  }

  // RH
  const employees = [];
  for (const [firstName, lastName, jobTitle, department, contractType, salary] of EMPLOYEES)
    employees.push(
      await prisma.employee.create({
        data: {
          ...base,
          firstName,
          lastName,
          jobTitle,
          department,
          contractType,
          grossSalaryCents: salary,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@quercy-proprete.fr`,
          startDate: ago(r.int(200, 2500)),
          ownerId: owner(),
        },
      }),
    );
  for (let i = 0; i < 18; i++) {
    const start = new Date(now + r.int(-200, 60) * DAY);
    const length = r.int(1, 10);
    await prisma.leave.create({
      data: {
        ...base,
        employeeId: r.pick(employees).id,
        type: r.pick(["paid", "paid", "rtt", "sick"]),
        startDate: start,
        endDate: new Date(start.getTime() + (length - 1) * DAY),
        days: Math.max(1, Math.round((length * 5) / 7)),
        status: start.getTime() > now ? r.pick(["requested", "approved"]) : "approved",
        ownerId: owner(),
      },
    });
  }

  // Trésorerie : encaissements réels des factures, fournisseurs payés, salaires et frais.
  const account = await prisma.bankAccount.create({
    data: {
      ...base,
      name: "Compte courant",
      bank: "Crédit Agricole Nord Midi-Pyrénées",
      iban: "FR76 1120 6000 0012 3456 7890 123",
      openingBalanceCents: 1_850_000,
      ownerId: owner(),
    },
  });
  await prisma.bankAccount.create({
    data: {
      ...base,
      name: "Livret professionnel",
      bank: "Crédit Agricole Nord Midi-Pyrénées",
      openingBalanceCents: 3_000_000,
      balanceCents: 3_000_000,
      ownerId: owner(),
    },
  });
  const payments = await prisma.payment.findMany({
    where: { organizationId },
    include: { document: { select: { id: true, number: true } } },
  });
  const tx: {
    date: Date;
    label: string;
    amountCents: number;
    category: string;
    invoiceId?: string;
    billId?: string;
  }[] = [
    ...payments.map((p) => ({
      date: p.date,
      label: `Virement client ${p.document.number ?? ""}`.trim(),
      amountCents: p.amountCents,
      category: "sales",
      invoiceId: p.document.id,
    })),
    ...bills
      .filter((b) => b.paidAt)
      .map((b) => ({
        date: b.paidAt!,
        label: `Paiement ${b.number}`,
        amountCents: -b.totalCents,
        category: "purchases",
        billId: b.id,
      })),
  ];
  for (let month = 11; month >= 0; month--) {
    const d = new Date(now - month * 30 * DAY);
    d.setDate(28);
    if (d.getTime() > now) continue;
    tx.push({ date: d, label: "Salaires", amountCents: -1_650_000, category: "payroll" });
    tx.push({
      date: new Date(d.getTime() - 20 * DAY),
      label: "Frais de tenue de compte",
      amountCents: -2_400,
      category: "bank_fees",
    });
  }
  await prisma.bankTransaction.createMany({
    data: tx.map((t) => ({
      ...base,
      ...t,
      accountId: account.id,
      reconciled: t.date.getTime() < now - 10 * DAY,
      ownerId: ownerIds[0],
    })),
  });
  const total = tx.reduce((s, t) => s + t.amountCents, 0);
  await prisma.bankAccount.update({
    where: { id: account.id },
    data: { balanceCents: 1_850_000 + total },
  });

  // Documents
  const docs = [
    [
      "Contrat d'entretien — " + companies[0]!.name,
      "Contrats clients",
      "contract",
      companies[0]!.id,
    ],
    [
      "Contrat d'entretien — " + companies[1]!.name,
      "Contrats clients",
      "contract",
      companies[1]!.id,
    ],
    ["Attestation d'assurance RC Pro 2026", "Administratif", "legal", null],
    ["Kbis de moins de 3 mois", "Administratif", "legal", null],
    ["Fiches de données de sécurité produits", "Qualité", "technical", null],
    ["Plan de prévention — site hospitalier", "Qualité", "technical", null],
    ["Registre du personnel", "RH", "hr", null],
    ["Accord d'entreprise temps de travail", "RH", "hr", null],
  ] as const;
  for (const [title, folder, category, companyId] of docs)
    await prisma.document.create({
      data: {
        ...base,
        title,
        folder,
        category,
        companyId,
        expiresAt: category === "legal" ? new Date(now + r.int(20, 300) * DAY) : null,
        ownerId: owner(),
      },
    });
}
