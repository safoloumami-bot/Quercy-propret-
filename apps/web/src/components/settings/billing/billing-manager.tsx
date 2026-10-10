"use client";

import {
  type BillingInterval,
  PLANS,
  PLAN_KEYS,
  type PlanKey,
  READ_ONLY_MESSAGES,
  formatCents,
  pricePerSeatPerMonth,
} from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Skeleton } from "@quercy/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@quercy/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@quercy/ui/components/tabs";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  CircleAlertIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PartyPopperIcon,
  ReceiptIcon,
} from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { toastError } from "@/components/toast-error";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { SettingsSection } from "../section";
import { UsageMeter } from "./usage-meter";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const STATUS: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" | "info" }
> = {
  NONE: { label: "Sans abonnement", variant: "neutral" },
  TRIALING: { label: "Essai", variant: "info" },
  ACTIVE: { label: "Actif", variant: "success" },
  PAST_DUE: { label: "Paiement refusé", variant: "warning" },
  UNPAID: { label: "Impayé", variant: "danger" },
  CANCELED: { label: "Résilié", variant: "neutral" },
  INCOMPLETE: { label: "Paiement en attente", variant: "warning" },
};

const INVOICE_STATUS: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
  paid: { label: "Payée", variant: "success" },
  open: { label: "À payer", variant: "warning" },
  uncollectible: { label: "Irrécouvrable", variant: "danger" },
  void: { label: "Annulée", variant: "neutral" },
  draft: { label: "Brouillon", variant: "neutral" },
};

type PaidPlan = "PRO" | "BUSINESS";

export function BillingManager({ justPaid }: { justPaid: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [interval, setInterval] = React.useState<BillingInterval>("YEAR");
  const [pendingChange, setPendingChange] = React.useState<{
    plan: PaidPlan;
    interval: BillingInterval;
  } | null>(null);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  // Après le paiement, l'abonnement arrive par webhook : on actualise quelques secondes.
  const [waiting, setWaiting] = React.useState(justPaid);
  const overview = useQuery({
    ...trpc.billing.overview.queryOptions(),
    refetchInterval: waiting ? 2_000 : false,
  });
  const invoices = useQuery(trpc.billing.invoices.queryOptions());

  React.useEffect(() => {
    if (!waiting) return;
    if (overview.data?.hasSubscription) {
      setWaiting(false);
      toast.success("Abonnement activé. Merci !");
      void queryClient.invalidateQueries({ queryKey: trpc.billing.invoices.queryKey() });
      return;
    }
    const timeout = setTimeout(() => setWaiting(false), 30_000);
    return () => clearTimeout(timeout);
  }, [waiting, overview.data?.hasSubscription, queryClient, trpc]);

  React.useEffect(() => {
    if (overview.data?.billingInterval) setInterval(overview.data.billingInterval);
  }, [overview.data?.billingInterval]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.billing.overview.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.billing.invoices.queryKey() });
  };
  const redirect = {
    onSuccess: (data: { url: string }) => window.location.assign(data.url),
    onError: toastError,
  };
  const checkout = useMutation(trpc.billing.checkout.mutationOptions(redirect));
  const portal = useMutation(trpc.billing.portal.mutationOptions(redirect));
  const changePlan = useMutation(
    trpc.billing.changePlan.mutationOptions({
      onSuccess: () => {
        setPendingChange(null);
        toast.success("Offre mise à jour. La différence est calculée au prorata.");
        refresh();
      },
      onError: toastError,
    }),
  );
  const cancel = useMutation(
    trpc.billing.setCancelAtPeriodEnd.mutationOptions({
      onSuccess: (_d, vars) => {
        setConfirmCancel(false);
        toast.success(
          vars.cancel
            ? "Résiliation programmée en fin de période."
            : "Résiliation annulée : l'abonnement continue.",
        );
        refresh();
      },
      onError: toastError,
    }),
  );

  if (overview.isPending) {
    return (
      <>
        <PageHeader title="Facturation" />
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </>
    );
  }
  if (overview.isError) {
    return (
      <>
        <PageHeader title="Facturation" />
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {errorMessage(overview.error)}
        </Callout>
      </>
    );
  }

  const o = overview.data;
  const effective = o.state.effectivePlan as PlanKey;
  const effectiveDef = PLANS[effective];
  const statusKey = o.cancelAtPeriodEnd
    ? "CANCELING"
    : o.state.trialing && !o.hasSubscription
      ? "TRIALING"
      : o.subscriptionStatus;
  const status =
    statusKey === "CANCELING"
      ? { label: "Résiliation programmée", variant: "warning" as const }
      : (STATUS[statusKey] ?? STATUS.NONE!);
  const busy = checkout.isPending || portal.isPending || changePlan.isPending || cancel.isPending;
  const actionable = o.canManage && o.stripeConfigured;

  function choose(plan: PlanKey) {
    if (plan !== "PRO" && plan !== "BUSINESS") return;
    if (o.hasSubscription) setPendingChange({ plan, interval });
    else checkout.mutate({ plan, interval });
  }

  const pricePerSeat = o.billingInterval
    ? pricePerSeatPerMonth(o.plan as PlanKey, o.billingInterval)
    : null;

  return (
    <>
      <PageHeader
        title="Facturation"
        description="Votre offre, son utilisation, vos factures et votre moyen de paiement."
      />

      {waiting ? (
        <Callout variant="success" icon={<PartyPopperIcon />}>
          Paiement reçu. Activation de l&apos;abonnement en cours…
        </Callout>
      ) : null}
      {o.state.readOnly ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {READ_ONLY_MESSAGES[o.state.readOnly]}
        </Callout>
      ) : null}
      {!o.stripeConfigured && o.canManage ? (
        <Callout variant="info" icon={<CircleAlertIcon />}>
          Le paiement en ligne n&apos;est pas encore configuré sur cette installation (clés Stripe
          absentes). Les offres restent consultables ; la souscription sera possible dès la
          configuration terminée.
        </Callout>
      ) : null}

      <SettingsSection
        id="current-plan"
        title="Offre actuelle"
        footer={
          actionable && (o.hasCustomer || o.hasSubscription) ? (
            <>
              {o.hasSubscription ? (
                o.cancelAtPeriodEnd ? (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => cancel.mutate({ cancel: false })}
                  >
                    Reprendre l&apos;abonnement
                  </Button>
                ) : (
                  <Button variant="ghost" disabled={busy} onClick={() => setConfirmCancel(true)}>
                    Résilier
                  </Button>
                )
              ) : null}
              {o.hasCustomer ? (
                <Button variant="secondary" disabled={busy} onClick={() => portal.mutate()}>
                  <ExternalLinkIcon />
                  Moyen de paiement et coordonnées
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      >
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              {effectiveDef.name}
              <Badge variant={status.variant}>{status.label}</Badge>
            </p>
            <p className="text-sm text-muted-foreground">
              {o.state.trialDaysLeft !== null && !o.hasSubscription && o.trialEndsAt
                ? `Essai Business jusqu'au ${dateFormat.format(new Date(o.trialEndsAt))} — sans carte bancaire.`
                : o.hasSubscription && pricePerSeat !== null
                  ? `${formatCents(pricePerSeat)} HT par utilisateur et par mois · ${o.seats} utilisateur${o.seats > 1 ? "s" : ""} · ${o.billingInterval === "YEAR" ? "facturation annuelle" : "facturation mensuelle"}`
                  : effectiveDef.tagline}
            </p>
            {o.hasSubscription && o.currentPeriodEnd ? (
              <p className="text-sm text-muted-foreground">
                {o.cancelAtPeriodEnd ? "Fin de l'abonnement le " : "Prochain renouvellement le "}
                {dateFormat.format(new Date(o.currentPeriodEnd))}.
              </p>
            ) : null}
          </div>
          {o.hasSubscription && pricePerSeat !== null ? (
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums">
                {formatCents(pricePerSeat * o.seats)}
              </p>
              <p className="text-xs text-muted-foreground">HT par mois</p>
            </div>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        id="usage"
        title="Utilisation"
        description={`Limites de l'offre ${effectiveDef.name}.`}
      >
        <div className="grid grid-cols-2 gap-6">
          <UsageMeter label="Membres" used={o.usage.members} limit={o.state.limits.maxMembers} />
          <UsageMeter
            label="Modules actifs"
            used={o.usage.modules}
            limit={o.state.limits.maxModules}
          />
        </div>
      </SettingsSection>

      <section aria-labelledby="plans-title" className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 id="plans-title" className="text-base font-semibold">
              Offres
            </h2>
            <p className="text-sm text-muted-foreground">
              Prix HT par utilisateur et par mois. Résiliable à tout moment.
            </p>
          </div>
          <Tabs value={interval} onValueChange={(v) => setInterval(v as BillingInterval)}>
            <TabsList aria-label="Périodicité">
              <TabsTrigger value="MONTH">Mensuel</TabsTrigger>
              <TabsTrigger value="YEAR">
                Annuel <Badge variant="success">−20 %</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ul className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
          {PLAN_KEYS.map((key) => {
            const plan = PLANS[key];
            const price = pricePerSeatPerMonth(key, interval);
            const isCurrent =
              effective === key &&
              (key === "FREE" || !o.hasSubscription || o.billingInterval === interval);
            const selectable = (key === "PRO" || key === "BUSINESS") && !isCurrent;
            return (
              <li
                key={key}
                className={cn(
                  "flex flex-col gap-4 rounded-lg border border-border bg-card p-5",
                  isCurrent && "border-primary ring-1 ring-primary",
                )}
              >
                <div className="space-y-1">
                  <p className="flex items-center justify-between font-semibold">
                    {plan.name}
                    {isCurrent ? <Badge variant="primary">Offre actuelle</Badge> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                </div>
                <p className="text-2xl font-semibold tabular-nums">
                  {price === null ? "Sur devis" : price === 0 ? "0 €" : formatCents(price)}
                  {price ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      /utilisateur/mois
                    </span>
                  ) : null}
                </p>
                <ul className="flex-1 space-y-1.5 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      {h}
                    </li>
                  ))}
                </ul>
                {key === "ENTERPRISE" ? (
                  <Button variant="secondary" asChild>
                    <a
                      href={`mailto:${o.salesEmail}?subject=${encodeURIComponent("Offre Entreprise Quercy")}`}
                    >
                      Nous contacter
                    </a>
                  </Button>
                ) : selectable && actionable ? (
                  <Button
                    variant={key === "BUSINESS" ? "primary" : "secondary"}
                    disabled={busy}
                    onClick={() => choose(key)}
                  >
                    {o.hasSubscription ? `Passer à ${plan.name}` : `Choisir ${plan.name}`}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {!o.canManage ? (
          <p className="text-sm text-muted-foreground">
            Seul le propriétaire de l&apos;espace peut changer d&apos;offre.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="invoices-title" className="space-y-3">
        <h2 id="invoices-title" className="text-base font-semibold">
          Factures
        </h2>
        {invoices.isPending ? (
          <Skeleton className="h-24" />
        ) : invoices.isError ? (
          <Callout variant="danger" icon={<CircleAlertIcon />}>
            {errorMessage(invoices.error)}
          </Callout>
        ) : invoices.data.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon />}
            title="Aucune facture pour l'instant"
            description="Vos factures apparaîtront ici dès la première échéance de votre abonnement, téléchargeables en PDF."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-40">
                  <span className="sr-only">Téléchargement</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.data.map((inv) => {
                const s = INVOICE_STATUS[inv.status ?? "draft"] ?? INVOICE_STATUS.draft!;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.number ?? "—"}</TableCell>
                    <TableCell>{dateFormat.format(new Date(inv.createdAt))}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.pdfUrl ? (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={inv.pdfUrl} target="_blank" rel="noreferrer">
                            <DownloadIcon />
                            PDF
                          </a>
                        </Button>
                      ) : inv.hostedUrl ? (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={inv.hostedUrl} target="_blank" rel="noreferrer">
                            <ExternalLinkIcon />
                            Voir
                          </a>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <ConfirmDialog
        open={pendingChange !== null}
        onOpenChange={(open) => (open ? null : setPendingChange(null))}
        title={pendingChange ? `Passer à l'offre ${PLANS[pendingChange.plan].name} ?` : ""}
        description={
          pendingChange
            ? `${formatCents(pricePerSeatPerMonth(pendingChange.plan, pendingChange.interval) ?? 0)} HT par utilisateur et par mois, ${pendingChange.interval === "YEAR" ? "facturés annuellement" : "facturés mensuellement"}. La différence est calculée au prorata sur votre prochaine facture.`
            : ""
        }
        confirmLabel="Confirmer le changement"
        pending={changePlan.isPending}
        onConfirm={() => pendingChange && changePlan.mutate(pendingChange)}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Résilier l'abonnement ?"
        description={`L'abonnement reste actif jusqu'au ${o.currentPeriodEnd ? dateFormat.format(new Date(o.currentPeriodEnd)) : "terme de la période"}, puis l'espace passe à l'offre Gratuite. Vos données sont conservées ; vous pouvez reprendre l'abonnement à tout moment.`}
        confirmLabel="Programmer la résiliation"
        destructive
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate({ cancel: true })}
      />
    </>
  );
}
