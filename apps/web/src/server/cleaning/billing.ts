import "server-only";

import { type BillableVisit, billingLines } from "@quercy/core";
import { prisma } from "@quercy/db";

/** « 2026-10 » → bornes du mois (jours UTC) et libellé « octobre 2026 ». */
export function periodBounds(period: string) {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  const label = start.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return { start, end, label };
}

/**
 * Facturation d'un mois, client par client : lignes calculées depuis les passages (forfaits,
 * manqués déduits, passages réalisés, suppléments validés), passages pas encore facturés.
 */
export async function billingPreview(organizationId: string, period: string) {
  const { start, end, label } = periodBounds(period);
  const visits = await prisma.intervention.findMany({
    where: {
      organizationId,
      deletedAt: null,
      invoiceId: null,
      date: { gte: start, lte: end },
      OR: [{ contractId: { not: null } }, { extraStatus: { not: null } }],
    },
    select: {
      id: true,
      title: true,
      date: true,
      status: true,
      siteId: true,
      companyId: true,
      contractId: true,
      serviceLineId: true,
      extraPriceCents: true,
      extraStatus: true,
      site: { select: { name: true, companyId: true } },
      serviceLine: { select: { name: true } },
      contract: {
        select: {
          id: true,
          name: true,
          companyId: true,
          billingMode: true,
          monthlyPriceCents: true,
          visitPriceCents: true,
        },
      },
    },
  });
  const companyOf = (v: (typeof visits)[number]) =>
    v.contract?.companyId ?? v.companyId ?? v.site?.companyId ?? null;
  const byCompany = new Map<string, typeof visits>();
  let withoutClient = 0;
  for (const v of visits) {
    const company = companyOf(v);
    if (!company) {
      withoutClient++;
      continue;
    }
    byCompany.set(company, [...(byCompany.get(company) ?? []), v]);
  }
  const [companies, invoices] = await Promise.all([
    prisma.company.findMany({
      where: { organizationId, id: { in: [...byCompany.keys()] } },
      select: { id: true, name: true },
    }),
    prisma.salesDocument.findMany({
      where: {
        organizationId,
        kind: "INVOICE",
        billingPeriod: period,
        deletedAt: null,
        status: { not: "cancelled" },
      },
      select: { id: true, companyId: true, number: true, status: true, totalExclCents: true },
    }),
  ]);
  const clients = [...byCompany.entries()].map(([companyId, list]) => {
    const contracts = [
      ...new Map(list.filter((v) => v.contract).map((v) => [v.contract!.id, v.contract!])).values(),
    ];
    const billable: BillableVisit[] = list.map((v) => ({
      title: v.title,
      date: v.date,
      siteId: v.siteId,
      siteName: v.site?.name ?? "Sans site",
      serviceLineId: v.serviceLineId,
      serviceLineName: v.serviceLine?.name ?? null,
      status: v.status,
      extraPriceCents: v.extraPriceCents,
      extraStatus: v.extraStatus,
      contractId: v.contractId,
    }));
    const lines = billingLines(contracts, billable, label);
    // Passages rattachés à la facture : ceux des contrats facturés et les suppléments validés.
    const billedContracts = new Set(contracts.map((c) => c.id));
    const interventionIds = list
      .filter(
        (v) =>
          (v.contractId && billedContracts.has(v.contractId)) ||
          (v.extraStatus === "approved" && v.status === "done"),
      )
      .map((v) => v.id);
    return {
      companyId,
      name: companies.find((c) => c.id === companyId)?.name ?? "Client",
      lines,
      totalExclCents: lines.reduce((n, l) => n + Math.round(l.quantity * l.unitPriceCents), 0),
      visits: list.filter((v) => v.contractId).length,
      done: list.filter((v) => v.contractId && v.status === "done").length,
      missed: list.filter((v) => v.status === "missed").length,
      pendingExtras: list.filter((v) => v.extraStatus === "pending").length,
      interventionIds,
      invoice: invoices.find((i) => i.companyId === companyId) ?? null,
    };
  });
  // Clients déjà facturés ce mois-ci, dont tous les passages sont rattachés.
  for (const inv of invoices)
    if (inv.companyId && !byCompany.has(inv.companyId)) {
      const company = await prisma.company.findFirst({
        where: { id: inv.companyId, organizationId },
        select: { name: true },
      });
      clients.push({
        companyId: inv.companyId,
        name: company?.name ?? "Client",
        lines: [],
        totalExclCents: inv.totalExclCents,
        visits: 0,
        done: 0,
        missed: 0,
        pendingExtras: 0,
        interventionIds: [],
        invoice: inv,
      });
    }
  clients.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return { period, label, clients, withoutClient };
}

/** Suppléments (passages hors contrat ou en plus) en attente de validation pour le mois. */
export async function pendingExtras(organizationId: string, period: string) {
  const { start, end } = periodBounds(period);
  const rows = await prisma.intervention.findMany({
    where: {
      organizationId,
      deletedAt: null,
      date: { gte: start, lte: end },
      extraStatus: "pending",
    },
    select: {
      id: true,
      title: true,
      date: true,
      status: true,
      extraPriceCents: true,
      site: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date,
    done: r.status === "done",
    site: r.site?.name ?? null,
    extraPriceCents: r.extraPriceCents ?? 0,
  }));
}
