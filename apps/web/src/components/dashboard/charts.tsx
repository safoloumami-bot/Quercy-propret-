"use client";

import type { ChartType, FieldDef } from "@quercy/core";
import { cn } from "@quercy/ui/lib/utils";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { type Unit, formatAxis, formatUnit } from "./format";

export const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function unitOf(field: FieldDef | null | undefined): Unit {
  if (!field) return "count";
  if (field.type === "currency") return field.cents ? "cents" : "euros";
  if (field.type === "duration") return "minutes";
  return "count";
}

export interface ChartPoint {
  key: string | null;
  label: string;
  value: number;
  count?: number;
  href?: string | null;
}

interface TooltipPayload {
  name?: string;
  value?: number;
  color?: string;
  payload?: { label?: string };
}

/** Infobulle lisible dans les deux thèmes. */
function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  unit: Unit;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{payload[0]?.payload?.label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular-nums">
          <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
          {payload.length > 1 ? `${p.name} : ` : ""}
          {formatUnit(Number(p.value ?? 0), unit)}
        </p>
      ))}
    </div>
  );
}

/** Tableau équivalent au graphique, pour les lecteurs d'écran. */
function SrTable({ points, unit, caption }: { points: ChartPoint[]; unit: Unit; caption: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {points.map((p) => (
          <tr key={`${p.key}-${p.label}`}>
            <th scope="row">{p.label}</th>
            <td>{formatUnit(p.value, unit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const axisProps = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "var(--border)" },
} as const;

/**
 * Graphique d'un rapport. Un clic sur une barre, un point ou un secteur ouvre la liste filtrée
 * correspondante ; en tableau, chaque ligne est un lien.
 */
export function ReportChart({
  chart,
  points,
  unit,
  caption,
  total,
  className,
}: {
  chart: ChartType;
  points: ChartPoint[];
  unit: Unit;
  caption: string;
  total?: number;
  className?: string;
}) {
  const router = useRouter();
  const open = (p?: ChartPoint) => {
    if (p?.href) router.push(p.href);
  };
  const clickable = points.some((p) => p.href);

  if (chart === "number") {
    return (
      <div className={cn("flex h-full flex-col justify-center", className)}>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {formatUnit(total ?? 0, unit)}
        </p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
    );
  }
  if (chart === "table") {
    return (
      <div className={cn("h-full overflow-auto", className)}>
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <tbody className="divide-y divide-border">
            {points.map((p) => (
              <tr key={`${p.key}-${p.label}`}>
                <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                  {p.href ? (
                    <a href={p.href} className="hover:underline">
                      {p.label}
                    </a>
                  ) : (
                    p.label
                  )}
                </th>
                <td className="py-1.5 text-right font-medium tabular-nums">
                  {formatUnit(p.value, unit)}
                </td>
              </tr>
            ))}
          </tbody>
          {total !== undefined ? (
            <tfoot>
              <tr className="border-t border-border">
                <th scope="row" className="py-1.5 text-left font-medium">
                  Total
                </th>
                <td className="py-1.5 text-right font-semibold tabular-nums">
                  {formatUnit(total, unit)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    );
  }

  const cursor = clickable ? "pointer" : undefined;
  const common = { data: points, margin: { top: 8, right: 8, bottom: 0, left: 0 } };
  return (
    <div className={cn("h-full min-h-40 w-full", className)} role="img" aria-label={caption}>
      <SrTable points={points} unit={unit} caption={caption} />
      <ResponsiveContainer width="100%" height="100%">
        {chart === "pie" ? (
          <PieChart>
            <Pie
              data={points}
              dataKey="value"
              nameKey="label"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={1}
              stroke="var(--card)"
              onClick={(d: { payload?: ChartPoint }) => open(d.payload)}
              style={{ cursor }}
            >
              {points.map((p, i) => (
                <Cell key={`${p.key}-${i}`} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip unit={unit} />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
              formatter={(value: string) => (
                <span style={{ color: "var(--foreground)" }}>{value}</span>
              )}
            />
          </PieChart>
        ) : chart === "line" ? (
          <LineChart {...common} onClick={(state) => open(points[Number(state?.activeIndex)])}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatAxis(v, unit)} />
            <Tooltip content={<ChartTooltip unit={unit} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5, style: { cursor } }}
            />
          </LineChart>
        ) : chart === "area" ? (
          <AreaChart {...common} onClick={(state) => open(points[Number(state?.activeIndex)])}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatAxis(v, unit)} />
            <Tooltip content={<ChartTooltip unit={unit} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.15}
              strokeWidth={2}
              activeDot={{ r: 5, style: { cursor } }}
            />
          </AreaChart>
        ) : (
          <BarChart {...common}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatAxis(v, unit)} />
            <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "var(--accent)" }} />
            <Bar
              dataKey="value"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              style={{ cursor }}
              onClick={(d: { payload?: ChartPoint }) => open(d.payload)}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Deux séries mensuelles (facturé / encaissé). */
export function TrendChart({
  points,
}: {
  points: { key: string; label: string; invoiced: number; cash: number; href: string }[];
}) {
  const router = useRouter();
  return (
    <div
      className="h-full min-h-40 w-full"
      role="img"
      aria-label="Chiffre d'affaires facturé et encaissé par mois"
    >
      <table className="sr-only">
        <caption>Chiffre d&apos;affaires facturé et encaissé par mois</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.label}</th>
              <td>Facturé {formatUnit(p.invoiced, "cents")}</td>
              <td>Encaissé {formatUnit(p.cash, "cents")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatAxis(v, "cents")} />
          <Tooltip content={<ChartTooltip unit="cents" />} cursor={{ fill: "var(--accent)" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => (
              <span style={{ color: "var(--foreground)" }}>{value}</span>
            )}
          />
          <Bar
            dataKey="invoiced"
            name="Facturé HT"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            style={{ cursor: "pointer" }}
            onClick={(d: { payload?: { href?: string } }) =>
              d.payload?.href && router.push(d.payload.href)
            }
          />
          <Bar dataKey="cash" name="Encaissé TTC" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
