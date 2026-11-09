"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const dayLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const label = (day: string) => dayLabel.format(new Date(`${day}T12:00:00Z`));

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

/** Visites et visiteurs par jour. */
export function VisitsChart({
  series,
}: {
  series: { day: string; views: number; visitors: number }[];
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="day"
            tickFormatter={label}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => label(String(d))} />
          <Area
            type="monotone"
            dataKey="views"
            name="Pages vues"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            name="Visiteurs"
            stroke="var(--chart-2)"
            fill="var(--chart-2)"
            fillOpacity={0.1}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Inscriptions par jour : nouveaux espaces et nouveaux utilisateurs. */
export function SignupsChart({
  series,
}: {
  series: { day: string; organizations: number; users: number }[];
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="day"
            tickFormatter={label}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => label(String(d))} />
          <Bar dataKey="users" name="Utilisateurs" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="organizations" name="Espaces" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Liste « libellé · nombre » avec une barre proportionnelle. */
export function RankList({
  items,
  empty,
}: {
  items: { label: string; value: number }[];
  empty: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{i.label}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{i.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${Math.max(4, (i.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
