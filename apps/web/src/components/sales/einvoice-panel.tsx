"use client";

import { einvoiceStatus } from "@quercy/documents/einvoice/lifecycle";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";
import Link from "next/link";

import { errorMessage, useTRPC } from "@/lib/trpc";

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

const TONE = {
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

/** Suivi de la facture électronique d'une facture ou d'un avoir émis. */
export function EInvoicePanel({ id, canEdit }: { id: string; canEdit: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const query = useQuery(trpc.sales.einvoice.queryOptions({ id }));
  const transmit = useMutation(
    trpc.sales.transmitEInvoice.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          r.simulated
            ? "Déposée sur la plateforme d'essai (rien n'est réellement transmis)."
            : "Facture déposée sur la plateforme agréée.",
        );
        void queryClient.invalidateQueries(trpc.sales.einvoice.queryFilter({ id }));
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  const data = query.data;
  if (!data || !data.concerned) return null;
  const t = data.transmission;
  const status = t ? einvoiceStatus(t.status) : null;

  return (
    <section aria-labelledby="einvoice-title" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="einvoice-title" className="text-sm font-semibold">
          Facture électronique
        </h2>
        {status ? <Badge variant={TONE[status.tone]}>{status.label}</Badge> : null}
      </div>
      {!data.enabled ? (
        <p className="text-sm text-muted-foreground">
          Non activée.{" "}
          <Link href="/ventes/parametres#einvoicing" className="underline underline-offset-2">
            Activer
          </Link>{" "}
          pour être prêt pour l&apos;obligation du 1er septembre 2027.
        </p>
      ) : data.missingSiren ? (
        <p className="text-sm text-muted-foreground">
          Client sans SIREN : s&apos;il s&apos;agit d&apos;un particulier, la vente relève de
          l&apos;e-reporting, pas de la facture électronique. Sinon, renseignez son SIREN sur sa
          fiche.
        </p>
      ) : t ? (
        <div className="space-y-2 text-sm">
          {t.error ? <p className="text-destructive">{t.error}</p> : null}
          <ol className="space-y-1 border-l border-border pl-3">
            {t.history
              .slice()
              .reverse()
              .map((e, i) => (
                <li key={`${e.at}-${i}`} className="text-muted-foreground">
                  <span className="text-foreground">{einvoiceStatus(e.status).label}</span> ·{" "}
                  {dateTime.format(new Date(e.at))}
                </li>
              ))}
          </ol>
          {data.simulated ? (
            <p className="text-xs text-muted-foreground">
              Plateforme d&apos;essai : rien n&apos;est transmis.
            </p>
          ) : null}
          {t.status === "error" && canEdit ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => transmit.mutate({ id })}
              disabled={transmit.isPending}
            >
              <SendIcon /> Réessayer
            </Button>
          ) : null}
        </div>
      ) : data.eligible && canEdit ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => transmit.mutate({ id })}
          disabled={transmit.isPending}
        >
          <SendIcon /> {transmit.isPending ? "Transmission…" : "Transmettre à la plateforme"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Émettez la facture pour la transmettre.</p>
      )}
    </section>
  );
}
