"use client";

import { formatCents } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@quercy/ui/components/card";
import { Input } from "@quercy/ui/components/input";
import { Skeleton } from "@quercy/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@quercy/ui/components/table";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcwIcon, SearchIcon, UserCogIcon } from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { PLAN_LABELS } from "@/lib/format";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { errorMessage, useTRPC } from "@/lib/trpc";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });

const STATUS_LABEL: Record<string, string> = {
  NONE: "Sans abonnement",
  TRIALING: "Essai (carte)",
  ACTIVE: "Actif",
  PAST_DUE: "Paiement refusé",
  UNPAID: "Impayé",
  CANCELED: "Résilié",
  INCOMPLETE: "Incomplet",
};

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-5">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}

export function AdminDashboard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [target, setTarget] = React.useState<{ id: string; name: string; org: string } | null>(
    null,
  );
  const [impersonating, setImpersonating] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const stats = useQuery(trpc.admin.stats.queryOptions());
  const orgs = useQuery(trpc.admin.organizations.queryOptions({ search: debounced || undefined }));
  const failed = useQuery(trpc.admin.failedEvents.queryOptions());
  const replay = useMutation(
    trpc.admin.replayEvent.mutationOptions({
      onSuccess: ({ result }) => {
        toast[result === "failed" ? "error" : "success"](
          result === "failed"
            ? "L'événement échoue toujours : voir l'erreur."
            : "Événement rejoué avec succès.",
        );
        void queryClient.invalidateQueries({ queryKey: trpc.admin.failedEvents.queryKey() });
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  async function impersonate() {
    if (!target) return;
    setImpersonating(true);
    const { error } = await authClient.admin.impersonateUser({ userId: target.id });
    if (error) {
      setImpersonating(false);
      toast.error(authErrorMessage(error));
      return;
    }
    window.location.assign("/");
  }

  return (
    <>
      <PageHeader
        title="Tableau de bord de la plateforme"
        description="Clients, revenus récurrents et santé de la facturation."
      />

      {stats.isPending ? (
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : stats.isError ? (
        <p className="text-sm text-destructive">{errorMessage(stats.error)}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <Kpi
            label="Revenu mensuel récurrent (MRR)"
            value={formatCents(stats.data.mrr)}
            hint={`ARR ${formatCents(stats.data.arr)}`}
          />
          <Kpi label="Espaces payants" value={String(stats.data.payingCount)} />
          <Kpi label="Essais en cours" value={String(stats.data.trials)} />
          <Kpi
            label="Churn sur 30 jours"
            value={percent.format(stats.data.churnRate)}
            hint={`${stats.data.canceled30} résiliation(s)`}
          />
          <Kpi
            label="Espaces / utilisateurs"
            value={`${stats.data.organizations} / ${stats.data.users}`}
          />
        </div>
      )}

      <section aria-labelledby="orgs-title" className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="orgs-title" className="text-base font-semibold">
            Espaces clients
          </h2>
          <div className="relative w-72">
            <SearchIcon
              className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un espace…"
              aria-label="Rechercher un espace"
              className="pl-8"
            />
          </div>
        </div>
        {orgs.isPending ? (
          <Skeleton className="h-64" />
        ) : orgs.isError ? (
          <p className="text-sm text-destructive">{errorMessage(orgs.error)}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Espace</TableHead>
                <TableHead>Offre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Membres</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-44">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.data.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <p className="font-medium">{o.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.owner ? `${o.owner.name} · ${o.owner.email}` : "Sans propriétaire"}
                    </p>
                  </TableCell>
                  <TableCell>{PLAN_LABELS[o.plan] ?? o.plan}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {o.readOnly ? <Badge variant="danger">Lecture seule</Badge> : null}
                      {o.trialDaysLeft !== null ? (
                        <Badge variant="info">Essai · {o.trialDaysLeft} j</Badge>
                      ) : (
                        <Badge
                          variant={
                            o.subscriptionStatus === "ACTIVE"
                              ? "success"
                              : o.subscriptionStatus === "PAST_DUE"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {STATUS_LABEL[o.subscriptionStatus] ?? o.subscriptionStatus}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{o.members}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {o.mrr > 0 ? formatCents(o.mrr) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFormat.format(new Date(o.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    {o.owner ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setTarget({ id: o.owner!.id, name: o.owner!.name, org: o.name })
                        }
                      >
                        <UserCogIcon />
                        Se connecter en tant que
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section aria-labelledby="events-title" className="space-y-3">
        <h2 id="events-title" className="text-base font-semibold">
          Webhooks Stripe en échec
        </h2>
        {failed.data && failed.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Événement</TableHead>
                <TableHead>Erreur</TableHead>
                <TableHead className="text-right">Tentatives</TableHead>
                <TableHead>Reçu le</TableHead>
                <TableHead className="w-32">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failed.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <p className="font-mono text-xs">{e.type}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{e.id}</p>
                  </TableCell>
                  <TableCell
                    className="max-w-md truncate text-sm text-destructive"
                    title={e.error ?? ""}
                  >
                    {e.error}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{e.attempts}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFormat.format(new Date(e.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={replay.isPending}
                      onClick={() => replay.mutate({ id: e.id })}
                    >
                      <RotateCcwIcon />
                      Rejouer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            {failed.isPending ? "Chargement…" : "Aucun événement en échec."}
          </p>
        )}
      </section>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => (open ? null : setTarget(null))}
        title={target ? `Se connecter en tant que ${target.name} ?` : ""}
        description={
          target
            ? `Vous verrez l'espace « ${target.org} » exactement comme cette personne, pendant une heure au plus. L'ouverture de la session et chacune de vos modifications sont inscrites dans le journal d'audit du client.`
            : ""
        }
        confirmLabel="Ouvrir la session d'assistance"
        pending={impersonating}
        onConfirm={impersonate}
      />
    </>
  );
}
