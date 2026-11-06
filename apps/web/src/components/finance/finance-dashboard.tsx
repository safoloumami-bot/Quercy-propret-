"use client";

import { FINANCE_PRESETS, type FinancePreset, formatCents, recordPath } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Callout } from "@quercy/ui/components/callout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Skeleton } from "@quercy/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@quercy/ui/components/table";
import { cn } from "@quercy/ui/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatAxis } from "@/components/dashboard/format";
import { errorMessage, useTRPC } from "@/lib/trpc";
import type { AppRouter } from "@/server/trpc/root";

type Data = inferRouterOutputs<AppRouter>["finance"]["dashboard"];
type Row = Data["contracts"][number];

const ALL = "__all__";
const euros = (cents: number) => formatCents(cents);
const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("fr-FR")} %`);
const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
const axis = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "var(--border)" },
};

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "danger" | "success";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "danger" && "text-destructive-text",
          tone === "success" && "text-success-text",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Breakdown({
  title,
  column,
  rows,
  minMarginPct,
  link,
}: {
  title: string;
  column: string;
  rows: Row[];
  minMarginPct: number;
  link?: (key: string) => string | null;
}) {
  if (!rows.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{column}</TableHead>
              <TableHead className="text-right">CA HT</TableHead>
              <TableHead className="text-right">Coûts directs</TableHead>
              <TableHead className="text-right">Marge</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 15).map((r) => {
              const low = r.revenueCents > 0 && (r.marginPct ?? 0) < minMarginPct;
              const href = link?.(r.key) ?? null;
              return (
                <TableRow key={r.key}>
                  <TableCell>
                    {href ? (
                      <Link className="hover:underline" href={href}>
                        {r.label}
                      </Link>
                    ) : (
                      r.label
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{euros(r.revenueCents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{euros(r.costCents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{euros(r.marginCents)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      low && "font-medium text-destructive-text",
                    )}
                  >
                    {pct(r.marginPct)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

/**
 * Pilotage financier : CA récurrent, ponctuel, total et facturé ; coûts directs ; marge
 * contributive ; trésorerie ; évolution et structure des coûts ; rentabilité par contrat,
 * client, site et activité.
 */
export function FinanceDashboard() {
  const trpc = useTRPC();
  const [preset, setPreset] = React.useState<FinancePreset>("12m");
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [activity, setActivity] = React.useState<string | null>(null);
  const query = useQuery({
    ...trpc.finance.dashboard.queryOptions({ preset, companyId, activity }),
    placeholderData: keepPreviousData,
  });

  if (query.isPending) return <Skeleton className="h-96" />;
  if (query.error) return <Callout variant="warning">{errorMessage(query.error)}</Callout>;
  const d = query.data;
  const t = d.totals;
  const costs = d.costs.filter((c) => c.cents > 0);

  return (
    <div className={cn("space-y-8", query.isFetching && "opacity-70 transition-opacity")}>
      <div className="flex flex-wrap gap-2">
        <Select value={preset} onValueChange={(v) => setPreset(v as FinancePreset)}>
          <SelectTrigger className="w-48" aria-label="Période">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FINANCE_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={companyId ?? ALL} onValueChange={(v) => setCompanyId(v === ALL ? null : v)}>
          <SelectTrigger className="w-56" aria-label="Client">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les clients</SelectItem>
            {d.filterOptions.clients
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "fr"))
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={activity ?? ALL} onValueChange={(v) => setActivity(v === ALL ? null : v)}>
          <SelectTrigger className="w-48" aria-label="Activité">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les activités</SelectItem>
            {d.filterOptions.activities.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="CA total (passages)"
          value={euros(t.revenueCents)}
          hint={`Récurrent ${euros(t.recurringCents)} · ponctuel ${euros(t.oneOffCents)}`}
        />
        <Kpi label="CA facturé" value={euros(t.invoicedCents)} hint="Factures émises, HT" />
        <Kpi
          label="Marge contributive"
          value={euros(t.marginCents)}
          hint={`${pct(t.marginPct)} du CA · coûts ${euros(t.costCents)}`}
          tone={t.marginPct !== null && t.marginPct < d.minMarginPct ? "danger" : "success"}
        />
        <Kpi
          label="Trésorerie"
          value={t.cashCents === null ? "—" : euros(t.cashCents)}
          hint={`À encaisser ${euros(t.receivablesCents)}`}
        />
      </div>
      {!d.unfiltered ? (
        <p className="text-xs text-muted-foreground">
          Filtré : seuls les coûts rattachés aux passages (main-d&apos;œuvre et produits) sont
          comptés ; véhicules, matériel loué et dépenses générales restent sur la vue
          d&apos;ensemble.
        </p>
      ) : null}

      {d.lowProfit.length ? (
        <section className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-destructive-text">
            <TriangleAlertIcon className="size-4" aria-hidden />
            {d.lowProfit.length} contrat{d.lowProfit.length > 1 ? "s" : ""} sous la marge minimale (
            {d.minMarginPct} %)
          </h3>
          <ul className="space-y-1 text-sm">
            {d.lowProfit.slice(0, 8).map((c) => (
              <li key={c.key} className="flex flex-wrap items-center gap-2">
                <Link
                  className="font-medium hover:underline"
                  href={recordPath("cleaningContract", c.key)}
                >
                  {c.label}
                </Link>
                <Badge variant="danger">{pct(c.marginPct)}</Badge>
                <span className="text-muted-foreground">
                  CA {euros(c.revenueCents)} · coûts {euros(c.costCents)} · {c.visits} passage
                  {c.visits > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-2 lg:col-span-2">
          <h3 className="text-sm font-medium">Évolution du CA et de la marge</h3>
          <div className="h-64" role="img" aria-label="CA et marge par mois">
            <table className="sr-only">
              <caption>CA et marge par mois</caption>
              <tbody>
                {d.months.map((m) => (
                  <tr key={m.month}>
                    <th scope="row">{m.label}</th>
                    <td>CA {euros(m.revenueCents)}</td>
                    <td>Marge {euros(m.marginCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} width={56} tickFormatter={(v: number) => formatAxis(v, "cents")} />
                <Tooltip
                  formatter={(v) => euros(Number(v ?? 0))}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "var(--accent)" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="revenueCents"
                  name="CA HT"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="marginCents"
                  name="Marge"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Structure des coûts</h3>
          {costs.length ? (
            <>
              <div className="h-40" role="img" aria-label="Répartition des coûts">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costs}
                      dataKey="cents"
                      nameKey="label"
                      innerRadius="55%"
                      outerRadius="90%"
                      stroke="var(--card)"
                    >
                      {costs.map((c, i) => (
                        <Cell key={c.key} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => euros(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1 text-sm">
                {costs.map((c, i) => (
                  <li key={c.key} className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                      aria-hidden
                    />
                    <span className="mr-auto">{c.label}</span>
                    <span className="tabular-nums">{euros(c.cents)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun coût sur la période : renseignez le coût horaire des intervenants.
            </p>
          )}
        </section>
      </div>

      <Breakdown
        title="Par contrat"
        column="Contrat"
        rows={d.contracts}
        minMarginPct={d.minMarginPct}
        link={(k) => recordPath("cleaningContract", k)}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown
          title="Par client"
          column="Client"
          rows={d.clients}
          minMarginPct={d.minMarginPct}
          link={(k) => (k === "-" ? null : recordPath("company", k))}
        />
        <Breakdown
          title="Par activité"
          column="Activité"
          rows={d.activitiesBreakdown}
          minMarginPct={d.minMarginPct}
        />
      </div>
      <Breakdown
        title="Par site"
        column="Site"
        rows={d.sites}
        minMarginPct={d.minMarginPct}
        link={(k) => (k === "-" ? null : recordPath("site", k))}
      />
    </div>
  );
}
