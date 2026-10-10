"use client";

import { recordPath } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon, FileDownIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { errorMessage, useTRPC } from "@/lib/trpc";

function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const monthLabel = (month: string) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * Vue d'ensemble d'un client (ex. un syndic et ses cages) : tous ses sites et sous-sites,
 * passages du mois, taux de réalisation, prochains passages, anomalies ouvertes, note qualité.
 */
export function ClientOverview({ companyId }: { companyId: string }) {
  const trpc = useTRPC();
  const [month, setMonth] = React.useState(currentMonth);
  const overview = useQuery(trpc.sites.clientOverview.queryOptions({ companyId, month }));
  const report = useQuery(
    trpc.sites.clientReport.queryOptions({ companyId, from: `${month}-01`, to: monthEnd(month) }),
  );
  const withheld = report.data?.withheldAnomalies ?? 0;

  if (overview.isPending) return <Skeleton className="h-48" />;
  if (overview.error) return <Callout variant="warning">{errorMessage(overview.error)}</Callout>;
  const { sites, totals } = overview.data;
  if (sites.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Aucun site rattaché à ce client. Indiquez-le comme client sur la fiche de ses sites.
      </p>
    );
  const byParent = new Map<string | null, typeof sites>();
  const ids = new Set(sites.map((s) => s.id));
  for (const s of sites) {
    const key = s.parentId && ids.has(s.parentId) ? s.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), s]);
  }
  const ordered: { site: (typeof sites)[number]; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const s of byParent.get(parent) ?? []) {
      ordered.push({ site: s, depth });
      walk(s.id, depth + 1);
    }
  };
  walk(null, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Mois précédent"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        >
          <ChevronLeftIcon />
        </Button>
        <span className="min-w-36 text-center text-sm font-medium capitalize">
          {monthLabel(month)}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Mois suivant"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
        >
          <ChevronRightIcon />
        </Button>
        <Button asChild size="sm" variant="secondary" className="ml-auto">
          <a
            href={`/api/nettoyage/rapport-client?${new URLSearchParams({
              companyId,
              from: `${month}-01`,
              to: monthEnd(month),
            })}`}
            title="Un seul rapport pour tous les sites et sous-sites du client. Seules les anomalies validées et marquées « visible par le client » y figurent."
          >
            <FileDownIcon aria-hidden /> Rapport PDF du mois
          </a>
        </Button>
      </div>
      {withheld ? (
        <Callout variant="info">
          {withheld} anomalie{withheld > 1 ? "s" : ""} validée{withheld > 1 ? "s" : ""} ce mois-ci{" "}
          {withheld > 1 ? "ne sont pas cochées" : "n'est pas cochée"} « visible par le client » :{" "}
          {withheld > 1 ? "elles n'apparaîtront pas" : "elle n'apparaîtra pas"} dans le rapport.{" "}
          <Link href="/nettoyage/anomalies" className="underline">
            Voir les anomalies
          </Link>
        </Callout>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Tile label="Sites" value={String(totals.sites)} />
        <Tile label="Passages prévus" value={String(totals.planned)} />
        <Tile
          label="Réalisés"
          value={String(totals.done)}
          hint={totals.missed ? `${totals.missed} manqué(s)` : undefined}
        />
        <Tile
          label="Taux de réalisation"
          value={totals.completionRate === null ? "—" : `${totals.completionRate} %`}
          hint="sur les passages dus"
        />
        <Tile
          label="Anomalies ouvertes"
          value={String(totals.openAnomalies)}
          hint={
            totals.averageScore === null
              ? "vue interne"
              : `note qualité moy. ${totals.averageScore} %`
          }
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Site</th>
              <th className="px-3 py-2 font-medium">Prestations</th>
              <th className="px-3 py-2 text-right font-medium">Réalisés / prévus</th>
              <th className="px-3 py-2 font-medium">Prochain passage</th>
              <th className="px-3 py-2 text-right font-medium">Anomalies</th>
              <th className="px-3 py-2 text-right font-medium">Qualité</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ordered.map(({ site: s, depth }) => (
              <tr key={s.id} className="align-top">
                <td className="px-3 py-2" style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}>
                  <Link href={recordPath("site", s.id)} className="font-medium hover:underline">
                    {s.code ? `${s.code} · ` : ""}
                    {s.name}
                  </Link>
                  {s.city ? <div className="text-xs text-muted-foreground">{s.city}</div> : null}
                </td>
                <td className="px-3 py-2 text-xs">
                  {s.services.length
                    ? s.services.map((sv) => (
                        <div key={sv.name}>
                          {sv.name}
                          {sv.rule ? ` — ${sv.rule}` : ""}
                          {sv.agentName ? ` · ${sv.agentName}` : ""}
                        </div>
                      ))
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {s.done} / {s.planned}
                  {s.missed ? (
                    <div className="text-xs text-destructive-text">{s.missed} manqué(s)</div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  {s.nextPassage
                    ? new Date(`${s.nextPassage}T12:00:00Z`).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {s.openAnomalies ? <Badge variant="warning">{s.openAnomalies}</Badge> : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {s.lastScore === null ? "—" : `${s.lastScore} %`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Vue interne : les anomalies non validées n&apos;apparaîtront jamais dans un rapport client.
      </p>
    </div>
  );
}
