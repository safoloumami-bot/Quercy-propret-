import "server-only";

import {
  EXPENSE_CATEGORIES,
  type FinanceContract,
  type FinanceVisit,
  contractRevenueCents,
  extraRevenueCents,
  labelOf,
  laborCostCents,
  marginOf,
  monthsBetween,
  prorateMonthly,
} from "@quercy/core";
import { prisma } from "@quercy/db";

export interface FinanceFilters {
  from: Date;
  to: Date;
  companyId?: string | null;
  siteId?: string | null;
  activity?: string | null;
}

const DEFAULT_ACTIVITY = "Entretien";

interface Bucket {
  key: string;
  label: string;
  revenueCents: number;
  costCents: number;
  visits: number;
}

function bump(map: Map<string, Bucket>, key: string, label: string, revenue: number, cost: number) {
  const b = map.get(key) ?? { key, label, revenueCents: 0, costCents: 0, visits: 0 };
  b.revenueCents += revenue;
  b.costCents += cost;
  b.visits += 1;
  map.set(key, b);
}

const withMargin = (list: Bucket[]) =>
  list.map((b) => ({ ...b, ...marginOf(b) })).sort((a, b) => b.revenueCents - a.revenueCents);

/**
 * Tableau de bord financier : CA produit par les passages (récurrent, ponctuel), CA facturé,
 * coûts directs (salariés, sous-traitants, produits ; et, sans filtre, déplacements, matériel,
 * autres dépenses), marge contributive, trésorerie, et rentabilité par contrat, client, site
 * et activité.
 */
export async function financeDashboard(organizationId: string, f: FinanceFilters) {
  const settings = await prisma.salesSettings.findUnique({
    where: { organizationId },
    select: { minMarginPct: true, defaultHourlyCostCents: true },
  });
  const minMarginPct = settings?.minMarginPct ?? 20;
  const visits = await prisma.intervention.findMany({
    where: {
      organizationId,
      deletedAt: null,
      date: { gte: f.from, lte: f.to },
      status: { not: "cancelled" },
      ...(f.siteId ? { siteId: f.siteId } : {}),
    },
    select: {
      id: true,
      date: true,
      status: true,
      companyId: true,
      siteId: true,
      contractId: true,
      ownerId: true,
      replacementAgentId: true,
      actualAgentId: true,
      workedMinutes: true,
      durationMinutes: true,
      extraPriceCents: true,
      extraStatus: true,
      site: { select: { name: true, companyId: true } },
      serviceLine: { select: { activity: true } },
      contract: {
        select: {
          id: true,
          name: true,
          kind: true,
          billingMode: true,
          monthlyPriceCents: true,
          visitPriceCents: true,
          companyId: true,
        },
      },
    },
  });
  const companyOf = (v: (typeof visits)[number]) =>
    v.contract?.companyId ?? v.companyId ?? v.site?.companyId ?? null;
  const activityOf = (v: (typeof visits)[number]) =>
    v.serviceLine?.activity?.trim() || DEFAULT_ACTIVITY;
  const rows = visits.filter(
    (v) =>
      (!f.companyId || companyOf(v) === f.companyId) &&
      (!f.activity || activityOf(v) === f.activity),
  );

  // Coût horaire de chaque intervenant (fiche intervenant, sinon coût par défaut).
  const profiles = await prisma.workerProfile.findMany({
    where: { organizationId },
    select: { userId: true, kind: true, hourlyCostCents: true },
  });
  const profileOf = new Map(profiles.map((p) => [p.userId, p]));
  const fallbackHourly = settings?.defaultHourlyCostCents ?? 0;

  // Produits consommés (sorties de stock rattachées aux passages) au prix d'achat.
  const moves = await prisma.stockMovement.findMany({
    where: {
      organizationId,
      deletedAt: null,
      type: "out",
      interventionId: { in: rows.map((r) => r.id) },
    },
    select: {
      interventionId: true,
      quantity: true,
      product: { select: { purchasePrice: true } },
    },
  });
  const productsOf = new Map<string, number>();
  for (const m of moves)
    productsOf.set(
      m.interventionId!,
      (productsOf.get(m.interventionId!) ?? 0) +
        Math.round(m.quantity * (m.product.purchasePrice ?? 0) * 100),
    );

  const finance: FinanceVisit[] = rows.map((v) => ({
    status: v.status,
    month: v.date.toISOString().slice(0, 7),
    contractId: v.contractId,
    extraPriceCents: v.extraPriceCents,
    extraStatus: v.extraStatus,
  }));
  const contracts = new Map<string, FinanceContract & { name: string }>();
  for (const v of rows) if (v.contract) contracts.set(v.contract.id, v.contract);

  // Coût direct par passage.
  let employees = 0;
  let subcontractors = 0;
  let products = 0;
  const costOf = new Map<string, number>();
  for (const v of rows) {
    const agent = v.actualAgentId ?? v.replacementAgentId ?? v.ownerId;
    const profile = agent ? profileOf.get(agent) : undefined;
    const minutes = v.status === "done" ? (v.workedMinutes ?? v.durationMinutes ?? 0) : 0;
    const labor = laborCostCents(minutes, profile?.hourlyCostCents ?? fallbackHourly);
    if (profile?.kind === "subcontractor") subcontractors += labor;
    else employees += labor;
    const p = productsOf.get(v.id) ?? 0;
    products += p;
    costOf.set(v.id, labor + p);
  }

  // CA par contrat (réparti sur ses passages pour les vues par site, client, activité).
  const revenueOf = new Map<string, number>();
  let recurring = 0;
  let oneOff = 0;
  const byContract = new Map<string, Bucket>();
  for (const c of contracts.values()) {
    const own = rows.filter((v) => v.contractId === c.id);
    const revenue = contractRevenueCents(c, finance);
    if (c.kind === "one_off") oneOff += revenue;
    else recurring += revenue;
    const billable = own.filter((v) => v.status !== "missed");
    for (const v of own)
      revenueOf.set(
        v.id,
        v.status === "missed" || !billable.length ? 0 : Math.round(revenue / billable.length),
      );
    byContract.set(c.id, {
      key: c.id,
      label: c.name,
      revenueCents: revenue,
      costCents: own.reduce((n, v) => n + (costOf.get(v.id) ?? 0), 0),
      visits: own.length,
    });
  }
  for (const v of rows) {
    const extra = extraRevenueCents({
      status: v.status,
      month: "",
      contractId: v.contractId,
      extraPriceCents: v.extraPriceCents,
      extraStatus: v.extraStatus,
    });
    if (!extra) continue;
    oneOff += extra;
    revenueOf.set(v.id, (revenueOf.get(v.id) ?? 0) + extra);
  }

  const bySite = new Map<string, Bucket>();
  const byClient = new Map<string, Bucket>();
  const byActivity = new Map<string, Bucket>();
  const byMonth = new Map<string, Bucket>();
  for (const v of rows) {
    const revenue = revenueOf.get(v.id) ?? 0;
    const cost = costOf.get(v.id) ?? 0;
    bump(bySite, v.siteId ?? "-", v.site?.name ?? "Sans site", revenue, cost);
    const company = companyOf(v);
    bump(byClient, company ?? "-", company ?? "Sans client", revenue, cost);
    const activity = activityOf(v);
    bump(byActivity, activity, activity, revenue, cost);
    const month = v.date.toISOString().slice(0, 7);
    bump(byMonth, month, month, revenue, cost);
  }
  const clientNames = await prisma.company.findMany({
    where: { organizationId, id: { in: [...byClient.keys()].filter((k) => k !== "-") } },
    select: { id: true, name: true },
  });
  for (const c of clientNames) byClient.get(c.id)!.label = c.name;

  // Coûts de structure, seulement sans filtre (ils ne se rattachent pas à un client).
  const unfiltered = !f.companyId && !f.siteId && !f.activity;
  let travel = 0;
  let equipment = 0;
  let other = 0;
  const otherByCategory = new Map<string, number>();
  if (unfiltered) {
    const [vehicles, hired, expenses] = await Promise.all([
      prisma.vehicle.findMany({
        where: { organizationId, deletedAt: null, status: { not: "sold" } },
        select: { monthlyCostCents: true },
      }),
      prisma.equipment.findMany({
        where: { organizationId, deletedAt: null, ownership: "hired" },
        select: { hireCostCents: true },
      }),
      prisma.expense.findMany({
        where: {
          organizationId,
          deletedAt: null,
          date: { gte: f.from, lte: new Date(f.to.getTime() + 86_399_999) },
          status: { not: "rejected" },
        },
        select: { category: true, amountCents: true },
      }),
    ]);
    travel = vehicles.reduce(
      (n, v) => n + prorateMonthly(v.monthlyCostCents ?? 0, f.from, f.to),
      0,
    );
    equipment = hired.reduce((n, e) => n + prorateMonthly(e.hireCostCents ?? 0, f.from, f.to), 0);
    for (const e of expenses) {
      if (e.category === "travel") travel += e.amountCents;
      else {
        other += e.amountCents;
        const label = labelOf(EXPENSE_CATEGORIES, e.category);
        otherByCategory.set(label, (otherByCategory.get(label) ?? 0) + e.amountCents);
      }
    }
  }

  const [invoiced, accounts, receivables] = await Promise.all([
    prisma.salesDocument.aggregate({
      where: {
        organizationId,
        kind: "INVOICE",
        deletedAt: null,
        status: { notIn: ["draft", "cancelled"] },
        issueDate: { gte: f.from, lte: new Date(f.to.getTime() + 86_399_999) },
        ...(f.companyId ? { companyId: f.companyId } : {}),
      },
      _sum: { totalExclCents: true },
    }),
    prisma.bankAccount.aggregate({
      where: { organizationId, deletedAt: null },
      _sum: { balanceCents: true },
      _count: true,
    }),
    prisma.salesDocument.aggregate({
      where: {
        organizationId,
        kind: "INVOICE",
        deletedAt: null,
        status: { notIn: ["draft", "cancelled", "paid"] },
        ...(f.companyId ? { companyId: f.companyId } : {}),
      },
      _sum: { dueCents: true },
    }),
  ]);

  const revenueCents = recurring + oneOff;
  const costs = [
    { key: "employees", label: "Salariés", cents: employees },
    { key: "subcontractors", label: "Sous-traitants", cents: subcontractors },
    { key: "products", label: "Produits", cents: products },
    { key: "travel", label: "Déplacements", cents: travel },
    { key: "equipment", label: "Matériel", cents: equipment },
    { key: "other", label: "Autres", cents: other },
  ];
  const costCents = costs.reduce((n, c) => n + c.cents, 0);
  const months = monthsBetween(f.from, f.to).map((m) => {
    const b = byMonth.get(m);
    const revenue = b?.revenueCents ?? 0;
    const cost = b?.costCents ?? 0;
    return {
      month: m,
      label: new Date(`${m}-01T00:00:00Z`).toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      revenueCents: revenue,
      marginCents: revenue - cost,
    };
  });
  const contractsList = withMargin([...byContract.values()]);

  // Options de filtre (clients, sites, activités vus sur la période).
  const activities = [...new Set(visits.map(activityOf))].sort((a, b) => a.localeCompare(b, "fr"));

  return {
    minMarginPct,
    unfiltered,
    totals: {
      recurringCents: recurring,
      oneOffCents: oneOff,
      revenueCents,
      invoicedCents: invoiced._sum.totalExclCents ?? 0,
      costCents,
      ...marginOf({ revenueCents, costCents }),
      cashCents: accounts._count ? (accounts._sum.balanceCents ?? 0) : null,
      receivablesCents: receivables._sum.dueCents ?? 0,
    },
    costs,
    otherByCategory: [...otherByCategory.entries()].map(([label, cents]) => ({ label, cents })),
    months,
    contracts: contractsList,
    lowProfit: contractsList
      .filter((c) => c.revenueCents > 0 && (c.marginPct ?? 0) < minMarginPct)
      .sort((a, b) => (a.marginPct ?? 0) - (b.marginPct ?? 0)),
    clients: withMargin([...byClient.values()]),
    sites: withMargin([...bySite.values()]),
    activitiesBreakdown: withMargin([...byActivity.values()]),
    filterOptions: {
      activities,
      clients: clientNames.map((c) => ({ id: c.id, name: c.name })),
    },
  };
}
