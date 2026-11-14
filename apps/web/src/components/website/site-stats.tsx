"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@quercy/ui/components/card";
import { useQuery } from "@tanstack/react-query";

import { RankList, VisitsChart } from "@/components/analytics/visit-charts";
import { useTRPC } from "@/lib/trpc";

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** Visites du site de l'entreprise sur 30 jours (mesurées sans cookie). */
export function SiteStats() {
  const trpc = useTRPC();
  const stats = useQuery(trpc.website.stats.queryOptions());
  if (!stats.data) return null;
  const s = stats.data;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Visites — 30 jours</CardTitle>
        <p className="text-sm text-muted-foreground">
          <span className="text-2xl font-semibold text-foreground tabular-nums">{s.visitors}</span>{" "}
          visiteurs · {s.views} pages vues · {percent.format(s.mobileShare)} sur mobile
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <VisitsChart series={s.series} />
        <div className="space-y-2">
          <p className="text-sm font-medium">Provenance</p>
          <RankList
            items={s.referrers.map((r) => ({ label: r.host, value: r.views }))}
            empty="Visites directes ou pas encore de visite."
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Mesuré sans cookie ni traceur : aucun bandeau à faire accepter à vos visiteurs.
        </p>
      </CardContent>
    </Card>
  );
}
