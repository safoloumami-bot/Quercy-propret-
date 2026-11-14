"use client";

import { formatCents, recordPath } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Checkbox } from "@quercy/ui/components/checkbox";
import { Input } from "@quercy/ui/components/input";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { errorMessage, useTRPC } from "@/lib/trpc";

/** Mois précédent : celui qu'on facture d'habitude. */
function lastMonth(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function shift(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 7);
}

const euros = (cents: number) => formatCents(cents);
const day = (d: Date | string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export function BillingBoard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [period, setPeriod] = React.useState(lastMonth);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  const preview = useQuery(trpc.cleaningBilling.preview.queryOptions({ period }));
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.cleaningBilling.preview.queryKey() });
  const decide = useMutation(
    trpc.cleaningBilling.decideExtra.mutationOptions({
      onSuccess: () => void refresh(),
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const create = useMutation(
    trpc.cleaningBilling.createInvoices.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          `${r.created.length} facture${r.created.length > 1 ? "s" : ""} brouillon créée${r.created.length > 1 ? "s" : ""}.` +
            (r.skipped.length ? ` ${r.skipped.length} client(s) ignoré(s).` : ""),
        );
        setSelected(new Set());
        void refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  const data = preview.data;
  const billable = (data?.clients ?? []).filter((c) => !c.invoice && c.lines.length);
  React.useEffect(() => setSelected(new Set()), [period]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          size="icon-sm"
          variant="secondary"
          aria-label="Mois précédent"
          onClick={() => setPeriod(shift(period, -1))}
        >
          <ChevronLeftIcon />
        </Button>
        <span className="min-w-36 text-center font-medium capitalize">{data?.label ?? period}</span>
        <Button
          size="icon-sm"
          variant="secondary"
          aria-label="Mois suivant"
          onClick={() => setPeriod(shift(period, 1))}
        >
          <ChevronRightIcon />
        </Button>
      </div>

      {preview.isPending ? (
        <Skeleton className="h-40" />
      ) : preview.error ? (
        <Callout variant="warning">{errorMessage(preview.error)}</Callout>
      ) : data ? (
        <>
          {!data.finished ? (
            <Callout variant="info">
              Ce mois n&apos;est pas terminé : l&apos;aperçu se complète au fil des passages, les
              factures se créent une fois le mois fini.
            </Callout>
          ) : null}
          {data.withoutClient ? (
            <Callout variant="warning">
              {data.withoutClient} passage(s) sans client (contrat ou site sans client) ne peuvent
              pas être facturés : rattachez un client au contrat ou au site.
            </Callout>
          ) : null}

          {data.extras.length ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Suppléments à valider ({data.extras.length})</h3>
              <ul className="divide-y divide-border rounded-md border border-border">
                {data.extras.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <span className="mr-auto">
                      <Link className="hover:underline" href={recordPath("intervention", x.id)}>
                        {x.title}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        · {day(x.date)}
                        {x.site ? ` · ${x.site}` : ""}
                        {x.done ? "" : " · pas encore réalisé"}
                      </span>
                    </span>
                    <Input
                      className="w-24"
                      inputMode="decimal"
                      aria-label={`Prix HT du supplément : ${x.title}`}
                      value={prices[x.id] ?? String(x.extraPriceCents / 100)}
                      onChange={(e) => setPrices({ ...prices, [x.id]: e.target.value })}
                    />
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({
                          interventionId: x.id,
                          approve: true,
                          priceCents: Math.round(
                            Number(
                              (prices[x.id] ?? String(x.extraPriceCents / 100)).replace(",", "."),
                            ) * 100,
                          ),
                        })
                      }
                    >
                      <CheckIcon aria-hidden /> Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ interventionId: x.id, approve: false })}
                    >
                      <XIcon aria-hidden /> Refuser
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mr-auto text-sm font-medium">Clients ({data.clients.length})</h3>
              {billable.length ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setSelected(
                      selected.size === billable.length
                        ? new Set()
                        : new Set(billable.map((c) => c.companyId)),
                    )
                  }
                >
                  {selected.size === billable.length ? "Tout désélectionner" : "Tout sélectionner"}
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={!selected.size || !data.finished || create.isPending}
                onClick={() => create.mutate({ period, companyIds: [...selected] })}
              >
                {selected.size
                  ? `Créer ${selected.size} facture${selected.size > 1 ? "s" : ""} brouillon`
                  : "Créer les factures brouillon"}
              </Button>
            </div>
            {data.clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun passage à facturer ce mois-ci.</p>
            ) : (
              data.clients.map((c) => (
                <div key={c.companyId} className="rounded-md border border-border">
                  <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                    {!c.invoice && c.lines.length ? (
                      <Checkbox
                        aria-label={`Facturer ${c.name}`}
                        checked={selected.has(c.companyId)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v === true) next.add(c.companyId);
                          else next.delete(c.companyId);
                          setSelected(next);
                        }}
                      />
                    ) : null}
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.done}/{c.visits} passage{c.visits > 1 ? "s" : ""} réalisé
                      {c.done > 1 ? "s" : ""}
                      {c.missed ? ` · ${c.missed} manqué${c.missed > 1 ? "s" : ""}` : ""}
                    </span>
                    {c.pendingExtras ? (
                      <Badge variant="warning">{c.pendingExtras} supplément(s) à valider</Badge>
                    ) : null}
                    <span className="ml-auto font-medium">{euros(c.totalExclCents)} HT</span>
                    {c.invoice ? (
                      <Button asChild size="sm" variant="secondary">
                        <Link href={recordPath("invoice", c.invoice.id)}>
                          Facture {c.invoice.number ?? "brouillon"}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  {c.lines.length ? (
                    <ul className="space-y-0.5 px-3 py-2 text-sm">
                      {c.lines.map((l, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mr-auto">{l.description}</span>
                          <span className="text-muted-foreground">
                            {l.quantity} × {euros(l.unitPriceCents)}
                          </span>
                          <span className="w-24 text-right">
                            {euros(Math.round(l.quantity * l.unitPriceCents))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : !c.invoice ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Aucun prix au contrat : renseignez le forfait mensuel ou le prix par passage.
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
