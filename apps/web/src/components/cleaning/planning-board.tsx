"use client";

import { INTERVENTION_STATUSES, recordPath } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@quercy/ui/components/dropdown-menu";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  CalendarRangeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  UserRoundCogIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

const TONE: Record<string, "info" | "primary" | "success" | "danger" | "neutral"> = {
  planned: "info",
  in_progress: "primary",
  done: "success",
  missed: "danger",
  cancelled: "neutral",
};
const STATUS_LABEL = Object.fromEntries(INTERVENTION_STATUSES.map((s) => [s.value, s.label]));

function todayKey(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

function shift(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const dayLabel = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function duration(minutes: number | null): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}

/**
 * Planning de la semaine : une ligne par agent, une colonne par jour. Chaque intervention
 * ouvre sa fiche ; le menu permet de la confier à un autre agent (absence, remplacement).
 */
export function PlanningBoard({ canManage }: { canManage: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [week, setWeek] = React.useState(todayKey);
  const [agentFilter, setAgentFilter] = React.useState<string>("all");
  const planning = useQuery(trpc.cleaning.planning.queryOptions({ week }));
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.cleaning.pathFilter()),
      queryClient.invalidateQueries(trpc.records.pathFilter()),
    ]);
  const generate = useMutation(
    trpc.cleaning.generate.mutationOptions({
      onSuccess: ({ created, contracts }) => {
        void refresh();
        toast.success(
          created > 0
            ? `${created} intervention${created > 1 ? "s" : ""} ajoutée${created > 1 ? "s" : ""} au planning (${contracts} contrat${contracts > 1 ? "s" : ""}).`
            : "Le planning des contrats est déjà à jour.",
        );
      },
      onError: toastError,
    }),
  );
  const reassign = useMutation(
    trpc.cleaning.reassign.mutationOptions({
      onSuccess: () => {
        void refresh();
        toast.success("Intervention réaffectée.");
      },
      onError: toastError,
    }),
  );

  const data = planning.data;
  const today = todayKey();
  const rows = React.useMemo(() => {
    if (!data) return [];
    const list = data.agents.map((a) => ({ id: a.id as string | null, name: a.name }));
    if (data.interventions.some((i) => !i.agentId)) list.push({ id: null, name: "Non affectées" });
    return list.filter(
      (row) =>
        (agentFilter === "all" || row.id === agentFilter) &&
        (row.id === null || data.interventions.some((i) => i.agentId === row.id)),
    );
  }, [data, agentFilter]);
  const inConflict = React.useMemo(
    () => new Set((data?.conflicts ?? []).flatMap((c) => c.ids)),
    [data],
  );
  const agentName = (id: string) => data?.agents.find((a) => a.id === id)?.name ?? "Un agent";
  const byId = React.useMemo(
    () => new Map((data?.interventions ?? []).map((i) => [i.id, i])),
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Semaine précédente"
          onClick={() => setWeek((w) => shift(w, -7))}
        >
          <ChevronLeftIcon />
        </Button>
        <Button variant="secondary" onClick={() => setWeek(todayKey())}>
          Cette semaine
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Semaine suivante"
          onClick={() => setWeek((w) => shift(w, 7))}
        >
          <ChevronRightIcon />
        </Button>
        {data ? (
          <span className="text-sm text-muted-foreground">
            Semaine du {dayLabel.format(new Date(`${data.days[0]}T00:00:00.000Z`))} au{" "}
            {dayLabel.format(new Date(`${data.days[6]}T00:00:00.000Z`))} ·{" "}
            {data.interventions.length} intervention{data.interventions.length > 1 ? "s" : ""}
          </span>
        ) : null}
        {data && data.agents.length > 1 ? (
          <select
            aria-label="Intervenant"
            className="h-8 rounded-md border border-border bg-card px-2 text-sm"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            <option value="all">Tous les intervenants</option>
            {data.agents.map((a) => (
              <option key={a.id} value={a.id}>
                Planning de {a.name}
              </option>
            ))}
          </select>
        ) : null}
        <div className="ml-auto flex gap-2">
          {canManage ? (
            <Button
              variant="secondary"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              <RefreshCwIcon />
              Mettre à jour depuis les contrats
            </Button>
          ) : null}
          <Button asChild>
            <Link href="/nettoyage/interventions">Toutes les interventions</Link>
          </Button>
        </div>
      </div>

      {data && data.conflicts.length ? (
        <Callout variant="warning" icon={<AlertTriangleIcon />}>
          <p className="font-medium">
            {data.conflicts.length} chevauchement{data.conflicts.length > 1 ? "s" : ""} cette
            semaine
          </p>
          <ul className="space-y-0.5">
            {data.conflicts.map((c) => (
              <li key={c.ids.join("-")}>
                {agentName(c.agentId)} · {dayLabel.format(new Date(`${c.day}T00:00:00.000Z`))} :{" "}
                {c.ids
                  .map((id) => byId.get(id))
                  .map((i) => (i ? `${i.startTime ?? ""} ${i.siteName ?? i.title}`.trim() : ""))
                  .join(" et ")}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Simple alerte : certains horaires sont indicatifs. Réaffectez un passage si besoin.
          </p>
        </Callout>
      ) : null}

      {planning.isPending ? (
        <Skeleton className="h-96" />
      ) : !data || rows.length === 0 ? (
        <EmptyState
          icon={<CalendarRangeIcon />}
          title="Aucune intervention cette semaine"
          description="Créez un contrat d'entretien (jours, horaire, agent) : les interventions s'ajoutent toutes seules au planning."
          action={
            <Button asChild>
              <Link href="/nettoyage/contrats">Contrats d'entretien</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="w-44 border-b border-border px-3 py-2 text-left font-medium">
                  Agent
                </th>
                {data.days.map((day) => (
                  <th
                    key={day}
                    className={`border-b border-l border-border px-2 py-2 text-left font-medium capitalize ${day === today ? "bg-primary/10 text-primary" : ""}`}
                  >
                    {dayLabel.format(new Date(`${day}T00:00:00.000Z`))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id ?? "none"} className="align-top">
                  <th
                    scope="row"
                    className="border-b border-border px-3 py-2 text-left font-medium"
                  >
                    {row.name}
                    <div className="text-xs font-normal text-muted-foreground">
                      {duration(
                        data.interventions
                          .filter((i) => i.agentId === row.id)
                          .reduce((sum, i) => sum + (i.durationMinutes ?? 0), 0),
                      ) || "—"}
                    </div>
                  </th>
                  {data.days.map((day) => (
                    <td
                      key={day}
                      className={`border-b border-l border-border p-1.5 ${day === today ? "bg-primary/5" : ""}`}
                    >
                      <div className="space-y-1.5">
                        {data.interventions
                          .filter((i) => i.day === day && i.agentId === row.id)
                          .map((i) => (
                            <div
                              key={i.id}
                              className={`group rounded-md border bg-card p-2 shadow-xs ${inConflict.has(i.id) ? "border-warning ring-1 ring-warning" : "border-border"}`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <Link
                                  href={recordPath("intervention", i.id)}
                                  className="line-clamp-2 font-medium hover:underline"
                                >
                                  {i.siteName ?? i.title}
                                </Link>
                                {canManage ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 shrink-0"
                                        aria-label="Réaffecter"
                                      >
                                        <UserRoundCogIcon className="size-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Confier à…</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {data.agents
                                        .filter((a) => a.id !== i.agentId)
                                        .map((a) => (
                                          <DropdownMenuItem
                                            key={a.id}
                                            onSelect={() =>
                                              reassign.mutate({ id: i.id, agentId: a.id })
                                            }
                                          >
                                            {a.name}
                                          </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : null}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {[i.startTime, duration(i.durationMinutes), i.city]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                              <Badge variant={TONE[i.status] ?? "neutral"} className="mt-1">
                                {STATUS_LABEL[i.status] ?? i.status}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
