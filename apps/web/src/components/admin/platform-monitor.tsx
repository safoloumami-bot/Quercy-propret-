"use client";

import { Badge } from "@quercy/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@quercy/ui/components/card";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CreditCardIcon, StoreIcon, UserPlusIcon } from "lucide-react";

import { RankList, SignupsChart, VisitsChart } from "@/components/analytics/visit-charts";
import { errorMessage, useTRPC } from "@/lib/trpc";

const when = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
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

const FEED_ICON = { signup: StoreIcon, user: UserPlusIcon, billing: CreditCardIcon } as const;

/** Surveillance de la plateforme : inscriptions, activité, visites, derniers événements. */
export function PlatformMonitor() {
  const trpc = useTRPC();
  const activity = useQuery({ ...trpc.admin.activity.queryOptions(), refetchInterval: 60_000 });

  if (activity.isPending)
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  if (activity.isError)
    return <p className="text-sm text-destructive">{errorMessage(activity.error)}</p>;
  const a = activity.data;

  return (
    <section aria-labelledby="monitor-title" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="monitor-title" className="text-base font-semibold">
          Surveillance — 30 derniers jours
        </h2>
        <p className="text-xs text-muted-foreground">
          Mise à jour chaque minute · visites comptées sans cookie
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Nouveaux espaces"
          value={a.newOrganizations}
          hint={`${a.newUsers} nouveaux utilisateurs`}
        />
        <Stat
          label="Utilisateurs actifs"
          value={a.activeUsers.week}
          hint={`${a.activeUsers.day} aujourd'hui · ${a.activeUsers.month} sur 30 jours`}
        />
        <Stat
          label="Visites des sites clients"
          value={a.sites.views}
          hint={`${a.sites.visitors} visiteurs · ${percent.format(a.sites.mobileShare)} sur mobile`}
        />
        <Stat
          label="Pages ouvertes du logiciel"
          value={a.app.views}
          hint={`${percent.format(a.app.mobileShare)} sur téléphone`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscriptions par jour</CardTitle>
            <CardDescription>Nouveaux espaces et nouveaux utilisateurs.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignupsChart series={a.signups} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visites des sites clients</CardTitle>
            <CardDescription>Pages vues et visiteurs uniques par jour.</CardDescription>
          </CardHeader>
          <CardContent>
            <VisitsChart series={a.sites.series} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sites les plus visités</CardTitle>
          </CardHeader>
          <CardContent>
            <RankList
              items={a.topSites.map((s) => ({ label: s.name, value: s.views }))}
              empty="Aucune visite pour l'instant."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">D&apos;où viennent les visiteurs</CardTitle>
          </CardHeader>
          <CardContent>
            <RankList
              items={a.sites.referrers.map((r) => ({ label: r.host, value: r.views }))}
              empty="Visites directes uniquement pour l'instant."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pages du logiciel les plus ouvertes</CardTitle>
          </CardHeader>
          <CardContent>
            <RankList
              items={a.app.pages.map((p) => ({ label: p.path, value: p.views }))}
              empty="Aucune page ouverte pour l'instant."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derniers événements</CardTitle>
          <CardDescription>
            Inscriptions, abonnements, résiliations et paiements refusés. Vous recevez aussi un
            email à chacun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {a.feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien de nouveau sur 30 jours.</p>
          ) : (
            <ul className="divide-y divide-border">
              {a.feed.map((e, i) => {
                const Icon = FEED_ICON[e.kind];
                return (
                  <li key={`${e.kind}-${i}`} className="flex items-start gap-3 py-2.5">
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.label}</p>
                      {e.detail ? (
                        <p className="truncate text-xs text-muted-foreground">{e.detail}</p>
                      ) : null}
                    </div>
                    <Badge variant="neutral" className="shrink-0">
                      {when.format(new Date(e.at))}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
