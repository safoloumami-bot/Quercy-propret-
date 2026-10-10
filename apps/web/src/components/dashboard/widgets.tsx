"use client";

import { type PeriodInput, formatCents, recordPath, widgetByKey } from "@quercy/core";
import { Callout } from "@quercy/ui/components/callout";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { cn } from "@quercy/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRightIcon, ArrowUpRightIcon, CircleAlertIcon, MinusIcon } from "lucide-react";
import Link from "next/link";

import { StartActions } from "@/components/home/start-actions";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { ReportChart, TrendChart, unitOf } from "./charts";
import { type Unit, formatChange, formatUnit } from "./format";

type Config = Record<string, string | number | boolean | null>;

const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/** Chiffre clé avec comparaison à la période précédente (flèche + %). */
function Kpi({
  value,
  previous,
  unit,
  detail,
  href,
}: {
  value: number;
  previous: number | null;
  unit: Unit;
  detail?: string;
  href: string;
}) {
  const ratio =
    previous === null
      ? null
      : previous === 0
        ? value === 0
          ? 0
          : null
        : (value - previous) / Math.abs(previous);
  const up = ratio !== null && ratio > 0.0005;
  const down = ratio !== null && ratio < -0.0005;
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <Link
        href={href}
        className="text-2xl font-semibold tracking-tight tabular-nums hover:underline 2xl:text-3xl"
      >
        {formatUnit(value, unit)}
      </Link>
      <div className="space-y-1">
        {previous !== null ? (
          <p className="flex items-center gap-1 text-xs">
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 rounded-sm px-1 font-medium whitespace-nowrap tabular-nums",
                // Texte en couleur du thème (contraste suffisant), la flèche garde le vert.
                up && "bg-success/12 text-foreground [&>svg]:text-success",
                down && "bg-destructive/10 text-destructive",
                !up && !down && "bg-muted text-muted-foreground",
              )}
            >
              {up ? (
                <ArrowUpRightIcon className="size-3" aria-hidden />
              ) : down ? (
                <ArrowDownRightIcon className="size-3" aria-hidden />
              ) : (
                <MinusIcon className="size-3" aria-hidden />
              )}
              {ratio === null ? "nouveau" : formatChange(ratio)}
            </span>
            <span className="text-muted-foreground">
              vs {formatUnit(previous, unit)} la période précédente
            </span>
          </p>
        ) : null}
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

function Ranking({
  items,
  unit,
}: {
  items: { id: string; label: string; value: number; href: string }[];
  unit: Unit;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Aucune donnée sur la période.</p>;
  return (
    <ol className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href} className="group block space-y-1 text-sm">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate group-hover:underline">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatUnit(item.value, unit)}
              </span>
            </span>
            <span className="block h-1.5 rounded-full bg-muted">
              <span
                className="block h-1.5 rounded-full bg-primary"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Contenu d'un widget, chargé selon la période globale. */
export function WidgetBody({
  widget,
  period,
  config,
}: {
  widget: string;
  period: PeriodInput;
  config: Config;
}) {
  const trpc = useTRPC();
  const needsData = widget !== "start";
  const query = useQuery({
    ...trpc.dashboard.widget.queryOptions({ widget, period, config }),
    enabled: needsData,
    staleTime: 60_000,
  });
  if (widget === "start") return <StartActions />;
  if (query.isPending) return <Skeleton className="h-full min-h-16" />;
  if (query.isError)
    return (
      <Callout variant="danger" icon={<CircleAlertIcon />}>
        {errorMessage(query.error)}
      </Callout>
    );
  const data = query.data;

  switch (data.kind) {
    case "kpi":
      return (
        <Kpi
          value={data.value}
          previous={data.previous}
          unit={data.unit}
          detail={data.detail}
          href={data.href}
        />
      );
    case "objective": {
      if (data.target === null)
        return (
          <p className="text-sm text-muted-foreground">
            Définissez un objectif (menu du widget, « Configurer ») pour suivre votre progression.
          </p>
        );
      const ratio = data.value / data.target;
      return (
        <div className="flex h-full flex-col justify-between gap-2">
          <p className="text-sm">
            <Link href={data.href} className="text-2xl font-semibold tabular-nums hover:underline">
              {Math.round(ratio * 100)} %
            </Link>{" "}
            <span className="text-muted-foreground">de {formatCents(data.target)}</span>
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(ratio * 100))}
            aria-label="Progression vers l'objectif"
            className="h-2 rounded-full bg-muted"
          >
            <div
              className={cn("h-2 rounded-full", ratio >= 1 ? "bg-success" : "bg-primary")}
              style={{ width: `${Math.min(100, ratio * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCents(data.value)} facturés
            {ratio < 1
              ? ` · reste ${formatCents(data.target - data.value)}`
              : " · objectif atteint"}
          </p>
        </div>
      );
    }
    case "overdue": {
      const max = Math.max(1, ...data.buckets.map((b) => b.cents));
      return (
        <div className="flex h-full flex-col gap-3">
          <Link href={data.href} className="block hover:underline">
            <span className="text-2xl font-semibold tabular-nums">{formatCents(data.total)}</span>{" "}
            <span className="text-sm text-muted-foreground">
              · {data.count} facture{data.count > 1 ? "s" : ""}
            </span>
          </Link>
          <dl className="space-y-1.5 text-xs">
            {data.buckets.map((b) => (
              <div key={b.label} className="grid grid-cols-[100px_1fr_auto] items-center gap-2">
                <dt className="text-muted-foreground">{b.label}</dt>
                <dd className="h-1.5 rounded-full bg-muted">
                  <span
                    className="block h-1.5 rounded-full bg-destructive/80"
                    style={{ width: `${(b.cents / max) * 100}%` }}
                  />
                </dd>
                <dd className="text-right tabular-nums">{formatCents(b.cents)}</dd>
              </div>
            ))}
          </dl>
          <ul className="min-h-0 flex-1 divide-y divide-border overflow-auto text-sm">
            {data.items.map((i) => (
              <li key={i.id}>
                <Link
                  href={recordPath("invoice", i.id)}
                  className="flex items-center justify-between gap-2 py-1.5 hover:underline"
                >
                  <span className="truncate">{i.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatCents(i.cents)}{" "}
                    <span className="text-xs text-destructive">+{i.days} j</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "trend":
      return <TrendChart points={data.points} />;
    case "ranking":
      return (
        <div className="flex h-full flex-col gap-3">
          {"total" in data ? (
            <Kpi
              value={data.total ?? 0}
              previous={data.previous ?? null}
              unit={data.unit}
              href={data.items[0]?.href ?? "/projets/temps"}
            />
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">
            <Ranking items={data.items} unit={data.unit} />
          </div>
        </div>
      );
    case "pipeline":
      return (
        <div className="flex h-full flex-col gap-2">
          <p className="text-sm">
            <span className="text-2xl font-semibold tabular-nums">
              {formatUnit(data.total, "euros")}
            </span>{" "}
            <span className="text-muted-foreground">
              ouverts · {formatUnit(data.weighted, "euros")} pondérés
            </span>
          </p>
          <ReportChart
            chart="bar"
            unit="euros"
            caption="Montant des opportunités ouvertes par étape"
            points={data.stages.map((s) => ({
              key: s.key,
              label: s.label,
              value: s.amount,
              href: s.href,
            }))}
            className="min-h-0 flex-1"
          />
        </div>
      );
    case "agenda":
      return (
        <div className="flex h-full flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            <Link href={data.href} className="font-medium text-foreground hover:underline">
              {data.count} à traiter
            </Link>
            {data.late ? <span className="text-destructive"> · {data.late} en retard</span> : null}
          </p>
          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien de prévu : belle journée !</p>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-border overflow-auto text-sm">
              {data.items.map((i) => (
                <li key={i.id}>
                  <Link
                    href={recordPath(data.entity, i.id)}
                    className="flex items-center gap-2 py-1.5 hover:underline"
                  >
                    <span
                      className={cn(
                        "w-14 shrink-0 text-xs tabular-nums",
                        i.late ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {i.at
                        ? data.entity === "activity" && !i.late
                          ? time.format(new Date(i.at))
                          : shortDate.format(new Date(i.at))
                        : "—"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{i.label}</span>
                    {i.detail ? (
                      <span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">
                        {i.detail}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case "report":
      if (!data.report || !data.result)
        return (
          <p className="text-sm text-muted-foreground">
            Choisissez un rapport enregistré (menu du widget, « Configurer »).
          </p>
        );
      return (
        <ReportChart
          chart={data.report.definition.chart}
          unit={unitOf(data.result.measureField)}
          caption={data.report.name}
          total={data.result.total}
          points={data.result.points}
        />
      );
  }
}

export function widgetTitle(
  widget: string,
  config: Config,
  reports: { id: string; name: string }[],
): string {
  if (widget === "report" && typeof config.reportId === "string")
    return reports.find((r) => r.id === config.reportId)?.name ?? "Rapport";
  return widgetByKey(widget)?.label ?? widget;
}
