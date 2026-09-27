"use client";

import { ENTITIES, type EntityKey, type FieldDef, type FilterGroup } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { cn } from "@quercy/ui/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import * as React from "react";

import { useTRPC } from "@/lib/trpc";

import type { Row } from "./types";
import { useRecordMutations } from "./use-record-mutations";

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** Date locale au format AAAA-MM-JJ (clé de case). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Cases d'un mois : semaines complètes, du lundi au dimanche. */
export function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days = offset + last.getDate();
  const cells = Math.ceil(days / 7) * 7;
  return Array.from(
    { length: cells },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

/** Calendrier mensuel sur le champ date de l'entité ; glisser une fiche change sa date. */
export function CalendarView({
  entity,
  fields,
  filter,
  search,
  canEdit,
  canCreate,
  onOpen,
  onCreate,
}: {
  entity: EntityKey;
  fields: FieldDef[];
  filter: FilterGroup;
  search: string | undefined;
  canEdit: boolean;
  canCreate: boolean;
  onOpen: (row: Row) => void;
  onCreate: (defaults: Record<string, unknown>) => void;
}) {
  const trpc = useTRPC();
  const def = ENTITIES[entity];
  const dateField = fields.find((f) => f.key === def.layouts!.calendar!.start)!;
  const toneField = def.layouts?.board
    ? fields.find((f) => f.key === def.layouts!.board!.field)
    : undefined;
  const [month, setMonth] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [over, setOver] = React.useState<string | null>(null);
  const { update } = useRecordMutations(entity);
  const cells = monthGrid(month);
  const today = dayKey(new Date());

  const list = useQuery({
    ...trpc.records.list.queryOptions({
      entity,
      filter,
      search,
      and: {
        field: dateField.key,
        operator: "between",
        value: [dayKey(cells[0]!), dayKey(cells[cells.length - 1]!)],
      },
      sort: [{ field: dateField.key, direction: "asc" }],
      limit: 200,
    }),
    placeholderData: keepPreviousData,
  });

  const byDay = new Map<string, Row[]>();
  for (const row of (list.data?.rows as Row[] | undefined) ?? []) {
    const value = row[dateField.key];
    if (!value) continue;
    const key = dayKey(new Date(value as string));
    byDay.set(key, [...(byDay.get(key) ?? []), row]);
  }

  function moveTo(id: string, day: string) {
    const row = ((list.data?.rows as Row[] | undefined) ?? []).find((r) => r.id === id);
    if (!row) return;
    const [y, m, d] = day.split("-").map(Number) as [number, number, number];
    let value: string = day;
    if (dateField.type === "datetime" && row[dateField.key]) {
      const previous = new Date(row[dateField.key] as string);
      value = new Date(y, m - 1, d, previous.getHours(), previous.getMinutes()).toISOString();
    }
    update.mutate({ entity, id, values: { [dateField.key]: value } });
  }

  const shift = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => shift(-1)}
          aria-label="Mois précédent"
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => shift(1)}
          aria-label="Mois suivant"
        >
          <ChevronRightIcon />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const now = new Date();
            setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
          }}
        >
          Aujourd&apos;hui
        </Button>
        <h2 className="ml-2 text-base font-semibold capitalize" aria-live="polite">
          {monthFmt.format(month)}
        </h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {dateField.label}
          {list.data && list.data.total > 200 ? ` · 200 premiers sur ${list.data.total}` : ""}
        </span>
      </div>
      <div
        role="grid"
        aria-label={`Calendrier des ${def.labelPlural.toLowerCase()}`}
        className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto] overflow-y-auto rounded-lg border border-border"
      >
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            role="columnheader"
            className="sticky top-0 z-10 border-b border-border bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((date) => {
          const key = dayKey(date);
          const items = byDay.get(key) ?? [];
          const inMonth = date.getMonth() === month.getMonth();
          return (
            <div
              key={key}
              role="gridcell"
              aria-label={date.toLocaleDateString("fr-FR", { dateStyle: "full" })}
              onDragOver={(e) => {
                if (!canEdit || !dateField.editable) return;
                e.preventDefault();
                setOver(key);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                setOver(null);
                const id = e.dataTransfer.getData("text/x-quercy-id");
                if (id) moveTo(id, key);
              }}
              className={cn(
                "group/day min-h-28 border-r border-b border-border p-1.5 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/40",
                over === key && "bg-accent",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    !inMonth && "text-muted-foreground",
                    key === today && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                {canCreate && dateField.editable ? (
                  <button
                    type="button"
                    onClick={() => onCreate({ [dateField.key]: key })}
                    className="rounded p-0.5 text-muted-foreground opacity-0 group-hover/day:opacity-100 hover:bg-accent focus-visible:opacity-100"
                    aria-label={`Ajouter le ${date.toLocaleDateString("fr-FR")}`}
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <ul className="space-y-1">
                {items.slice(0, 4).map((row) => {
                  const tone = toneField?.options?.find(
                    (o) => o.value === row[toneField.key],
                  )?.tone;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        draggable={canEdit && dateField.editable}
                        onDragStart={(e) => e.dataTransfer.setData("text/x-quercy-id", row.id)}
                        onClick={() => onOpen(row)}
                        className={cn(
                          "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs",
                          "bg-primary/10 text-foreground hover:bg-primary/20",
                          tone === "success" && "bg-success/15",
                          tone === "danger" && "bg-destructive/15",
                          tone === "warning" && "bg-warning/15",
                          row.done === true && "line-through opacity-60",
                        )}
                      >
                        {dateField.type === "datetime" ? (
                          <span className="shrink-0 text-muted-foreground tabular-nums">
                            {timeFmt.format(new Date(row[dateField.key] as string))}
                          </span>
                        ) : null}
                        <span className="truncate">{row.title}</span>
                      </button>
                    </li>
                  );
                })}
                {items.length > 4 ? (
                  <li className="px-1.5 text-xs text-muted-foreground">
                    + {items.length - 4} autres
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
