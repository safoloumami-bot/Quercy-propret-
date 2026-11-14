"use client";

import { Button } from "@quercy/ui/components/button";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Input } from "@quercy/ui/components/input";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ClockIcon, DownloadIcon } from "lucide-react";
import * as React from "react";

import { useTRPC } from "@/lib/trpc";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** Heures du mois par agent (paie) : total, nuit, dimanche, férié ; export CSV. */
export function HoursTable({ canExport }: { canExport: boolean }) {
  const trpc = useTRPC();
  const [month, setMonth] = React.useState(currentMonth);
  const data = useQuery(trpc.cleaning.hours.queryOptions({ month }));
  const rows = data.data?.rows ?? [];
  const total = rows.reduce(
    (acc, r) => ({
      interventions: acc.interventions + r.interventions,
      total: acc.total + r.totalMinutes,
      night: acc.night + r.nightMinutes,
      sunday: acc.sunday + r.sundayMinutes,
      holiday: acc.holiday + r.holidayMinutes,
    }),
    { interventions: 0, total: 0, night: 0, sunday: 0, holiday: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Mois
          <Input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="w-44"
          />
        </label>
        {canExport ? (
          <Button asChild variant="secondary" className="ml-auto">
            <a href={`/api/nettoyage/heures?month=${month}`} download>
              <DownloadIcon />
              Exporter pour la paie (CSV)
            </a>
          </Button>
        ) : null}
      </div>

      {data.isPending ? (
        <Skeleton className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClockIcon />}
          title="Aucune heure pointée ce mois-ci"
          description="Les heures proviennent des interventions réalisées (pointage d'arrivée et de départ, ou durée prévue)."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 text-right font-medium">Interventions</th>
                <th className="px-3 py-2 text-right font-medium">Jours</th>
                <th className="px-3 py-2 text-right font-medium">Heures totales</th>
                <th className="px-3 py-2 text-right font-medium">dont nuit (21 h–6 h)</th>
                <th className="px-3 py-2 text-right font-medium">dont dimanche</th>
                <th className="px-3 py-2 text-right font-medium">dont férié</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.agentId ?? "none"}>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.interventions}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.days}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {hours(r.totalMinutes)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{hours(r.nightMinutes)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{hours(r.sundayMinutes)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{hours(r.holidayMinutes)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 font-medium">
              <tr>
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{total.interventions}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right tabular-nums">{hours(total.total)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{hours(total.night)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{hours(total.sunday)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{hours(total.holiday)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
