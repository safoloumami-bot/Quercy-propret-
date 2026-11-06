import { buildFec, grantedScope } from "@quercy/core";
import { NextResponse } from "next/server";

import { fileRequestContext } from "@/server/files/access";

export const dynamic = "force-dynamic";

/**
 * Fichier des écritures comptables (FEC) d'une année : factures et avoirs émis, factures
 * fournisseurs et encaissements. Réservé aux personnes ayant accès à toutes les ventes.
 */
export async function GET(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const { permissions } = ctx.workspace.role;
  if (
    grantedScope(permissions, "sales", "export") !== "all" &&
    grantedScope(permissions, "treasury", "export") !== "all"
  )
    return NextResponse.json(
      { error: "L'export comptable est réservé aux administrateurs et comptables." },
      { status: 403 },
    );
  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    return NextResponse.json({ error: "Année invalide." }, { status: 400 });
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));

  const [documents, bills, payments, settings] = await Promise.all([
    ctx.db.salesDocument.findMany({
      where: {
        kind: { in: ["INVOICE", "CREDIT_NOTE"] },
        number: { not: null },
        status: { notIn: ["draft", "cancelled"] },
        issueDate: { gte: from, lt: to },
      },
      include: { company: { select: { name: true } } },
    }),
    ctx.db.bill.findMany({
      where: { issueDate: { gte: from, lt: to } },
      include: { supplier: { select: { name: true } } },
    }),
    ctx.db.payment.findMany({
      where: { date: { gte: from, lt: to } },
      include: {
        document: {
          select: { number: true, companyId: true, company: { select: { name: true } } },
        },
      },
    }),
    ctx.db.salesSettings.findFirst({ select: { siret: true } }),
  ]);

  const fec = buildFec({
    sales: documents.map((d) => ({
      kind: d.kind as "INVOICE" | "CREDIT_NOTE",
      number: d.number!,
      issueDate: d.issueDate ?? d.createdAt,
      customerId: d.companyId,
      customerName: d.company?.name ?? "Client divers",
      totalExclCents: d.totalExclCents,
      taxCents: d.taxCents,
      totalCents: d.totalCents,
    })),
    purchases: bills.map((b) => ({
      id: b.id,
      number: b.number,
      issueDate: b.issueDate,
      supplierId: b.supplierId,
      supplierName: b.supplier.name,
      totalExclCents: b.totalExclCents,
      vatCents: b.vatCents,
      totalCents: b.totalCents,
    })),
    payments: payments.map((p) => ({
      date: p.date,
      amountCents: p.amountCents,
      documentNumber: p.document.number ?? "Sans numéro",
      customerId: p.document.companyId,
      customerName: p.document.company?.name ?? "Client divers",
      method: p.method,
    })),
  });
  const siren = (settings?.siret ?? "").replace(/\D/g, "").slice(0, 9);
  return new Response(fec, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${siren || "FEC"}FEC${year}1231.txt"`,
    },
  });
}
