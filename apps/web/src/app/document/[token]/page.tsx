import {
  DOCUMENT_TITLES,
  type DocumentKind,
  PRODUCT_UNITS,
  VAT_EXEMPT_MENTION,
  formatCents,
} from "@quercy/core";
import { documentData } from "@quercy/documents";
import { prisma } from "@quercy/db";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { CheckCircle2Icon, DownloadIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AcceptQuoteForm, PayInvoiceForm } from "./forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Document", robots: { index: false, follow: false } };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const qty = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

const STATUS_LABEL: Record<
  string,
  { label: string; tone: "info" | "success" | "warning" | "danger" | "neutral" }
> = {
  sent: { label: "En attente", tone: "info" },
  accepted: { label: "Accepté", tone: "success" },
  declined: { label: "Refusé", tone: "danger" },
  expired: { label: "Expiré", tone: "warning" },
  invoiced: { label: "Facturé", tone: "success" },
  confirmed: { label: "Confirmée", tone: "info" },
  delivered: { label: "Livrée", tone: "success" },
  cancelled: { label: "Annulée", tone: "danger" },
  partial: { label: "Partiellement payée", tone: "warning" },
  overdue: { label: "En retard", tone: "danger" },
  paid: { label: "Payée", tone: "success" },
  credited: { label: "Annulée par avoir", tone: "neutral" },
  issued: { label: "Émis", tone: "info" },
  refunded: { label: "Remboursé", tone: "success" },
};

/** Page publique d'un document émis : consultation, PDF, acceptation d'un devis, paiement. */
export default async function PublicDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paiement?: string; accepte?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const found = await prisma.salesDocument.findUnique({
    where: { publicToken: token },
    select: { id: true, organizationId: true, kind: true, status: true, deletedAt: true },
  });
  if (!found || found.deletedAt || found.status === "draft" || found.kind === "RECURRING")
    notFound();
  const [{ doc, data }, settings] = await Promise.all([
    documentData(found.organizationId, found.id),
    prisma.salesSettings.findUnique({
      where: { organizationId: found.organizationId },
      select: { stripeSecretKeyEnc: true },
    }),
  ]);
  const kind = doc.kind as DocumentKind;
  const status = STATUS_LABEL[doc.status];
  const payable =
    kind === "INVOICE" && ["sent", "partial", "overdue"].includes(doc.status) && doc.dueCents > 0;

  return (
    <main className="min-h-dvh bg-sidebar px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{data.seller.name}</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {DOCUMENT_TITLES[kind]} {doc.number}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {status ? <Badge variant={status.tone}>{status.label}</Badge> : null}
            <Button asChild variant="secondary">
              <a href={`/document/${token}/pdf`} target="_blank" rel="noreferrer">
                <DownloadIcon />
                Télécharger le PDF
              </a>
            </Button>
          </div>
        </header>

        {query.paiement === "ok" ? (
          <Callout variant="success" icon={<CheckCircle2Icon />}>
            Merci, votre paiement a bien été reçu. Il apparaîtra sur la facture d&apos;ici quelques
            instants.
          </Callout>
        ) : null}
        {query.accepte ? (
          <Callout variant="success" icon={<CheckCircle2Icon />}>
            Le devis est accepté : {data.seller.name} en a été informé.
          </Callout>
        ) : null}

        <section className="grid gap-6 rounded-xl border border-border bg-card p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Émetteur
            </p>
            <p className="font-medium">{data.seller.name}</p>
            {[
              data.seller.address,
              [data.seller.postalCode, data.seller.city].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .map((l) => (
                <p key={l} className="text-muted-foreground">
                  {l}
                </p>
              ))}
            {data.seller.registration ? (
              <p className="text-muted-foreground">SIRET {data.seller.registration}</p>
            ) : null}
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Client
            </p>
            <p className="font-medium">{data.buyer.name}</p>
            {doc.issueDate ? (
              <p className="text-muted-foreground">Émis le {dateFmt.format(doc.issueDate)}</p>
            ) : null}
            {doc.dueDate ? (
              <p className="text-muted-foreground">
                {kind === "QUOTE"
                  ? "Valable jusqu'au"
                  : kind === "INVOICE"
                    ? "Échéance"
                    : "Date prévue"}{" "}
                {dateFmt.format(doc.dueDate)}
              </p>
            ) : null}
          </div>
          {doc.subject ? (
            <p className="text-sm font-medium md:col-span-2">Objet : {doc.subject}</p>
          ) : null}
          <div className="overflow-x-auto md:col-span-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Désignation</th>
                  <th className="py-2 text-right font-medium">Qté</th>
                  <th className="py-2 text-right font-medium">PU HT</th>
                  <th className="py-2 text-right font-medium">TVA</th>
                  <th className="py-2 text-right font-medium">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((l, i) => (
                  <tr key={i} className="border-b border-border align-top">
                    <td className="py-2 whitespace-pre-line">{l.description}</td>
                    <td className="py-2 text-right tabular-nums">
                      {qty.format(l.quantity)}{" "}
                      {PRODUCT_UNITS.find((u) => u.value === l.unit)?.label ?? ""}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCents(l.unitPriceCents)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {data.seller.vatExempt ? "—" : `${qty.format(l.vatRate)} %`}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCents(l.totalExclCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="ml-auto w-full max-w-xs space-y-1 text-sm md:col-span-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total HT</dt>
              <dd className="tabular-nums">{formatCents(data.totals.totalExclCents)}</dd>
            </div>
            {data.totals.vat.map((v) => (
              <div key={v.rate} className="flex justify-between">
                <dt className="text-muted-foreground">TVA {qty.format(v.rate)} %</dt>
                <dd className="tabular-nums">{formatCents(v.taxCents)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <dt>Total TTC</dt>
              <dd className="tabular-nums">{formatCents(data.totals.totalCents)}</dd>
            </div>
            {kind === "INVOICE" && doc.paidCents > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reste à payer</dt>
                <dd className="font-semibold tabular-nums">
                  {formatCents(Math.max(0, doc.dueCents))}
                </dd>
              </div>
            ) : null}
          </dl>
          {data.seller.vatExempt ? (
            <p className="text-xs text-muted-foreground md:col-span-2">{VAT_EXEMPT_MENTION}</p>
          ) : null}
        </section>

        {kind === "QUOTE" && doc.status === "sent" ? (
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold">Accepter ce devis</h2>
            <AcceptQuoteForm token={token} />
          </section>
        ) : null}

        {payable ? (
          <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold">Régler la facture</h2>
            {data.seller.iban ? (
              <p className="text-sm text-muted-foreground">
                Par virement : IBAN{" "}
                <span className="font-mono text-foreground">{data.seller.iban}</span>
                {data.seller.bic ? ` — BIC ${data.seller.bic}` : ""}, en indiquant la référence{" "}
                <strong className="text-foreground">{doc.number}</strong>.
              </p>
            ) : null}
            {settings?.stripeSecretKeyEnc ? (
              <PayInvoiceForm
                token={token}
                label={`Payer ${formatCents(doc.dueCents)} par carte`}
              />
            ) : null}
          </section>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Document transmis par {data.seller.name} via Quercy.
        </p>
      </div>
    </main>
  );
}
