"use client";

import { ENTITIES, type EntityKey, type FieldDef, type FilterGroup } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { cn } from "@quercy/ui/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { useTRPC } from "@/lib/trpc";

import { dayKey } from "./calendar-view";
import type { Row } from "./types";
import { useRecordMutations } from "./use-record-mutations";

const DAY = 86_400_000;
const DAY_WIDTH = 28;
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 280;
const WINDOW_DAYS = 91;
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Nombre de jours entiers entre deux dates locales. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

/** Barre d'une fiche : début et fin (une seule date connue = barre d'un jour). */
export function barRange(
  row: Record<string, unknown>,
  startKey: string,
  endKey: string,
): { start: Date; end: Date } | null {
  const s = row[startKey] ? new Date(row[startKey] as string) : null;
  const e = row[endKey] ? new Date(row[endKey] as string) : null;
  if (!s && !e) return null;
  const start = startOfDay(s ?? e!);
  const end = startOfDay(e ?? s!);
  return end < start ? { start, end: start } : { start, end };
}

type Drag = { id: string; mode: "move" | "resize"; originX: number; delta: number };

/** Diagramme de Gantt : barres début → fin, déplaçables et redimensionnables à la souris. */
export function GanttView({
  entity,
  fields,
  filter,
  search,
  canEdit,
  onOpen,
}: {
  entity: EntityKey;
  fields: FieldDef[];
  filter: FilterGroup;
  search: string | undefined;
  canEdit: boolean;
  onOpen: (row: Row) => void;
}) {
  const trpc = useTRPC();
  const def = ENTITIES[entity];
  const gantt = def.layouts!.gantt!;
  const startField = fields.find((f) => f.key === gantt.start)!;
  const endField = fields.find((f) => f.key === gantt.end)!;
  const statusField = def.layouts?.board
    ? fields.find((f) => f.key === def.layouts!.board!.field)
    : undefined;
  const { update } = useRecordMutations(entity);
  const [from, setFrom] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  });
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const to = addDays(from, WINDOW_DAYS);
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(from, i));
  const todayOffset = daysBetween(from, new Date());

  // Aujourd'hui visible à l'ouverture et à chaque changement de période.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = todayOffset >= 0 && todayOffset < WINDOW_DAYS ? todayOffset - 7 : 0;
    el.scrollLeft = Math.max(0, target * DAY_WIDTH);
  }, [todayOffset]);

  const list = useQuery({
    ...trpc.records.list.queryOptions({
      entity,
      filter,
      // Fiches qui chevauchent la période affichée.
      and: {
        combinator: "or",
        rules: [
          { field: startField.key, operator: "between", value: [dayKey(from), dayKey(to)] },
          { field: endField.key, operator: "between", value: [dayKey(from), dayKey(to)] },
          {
            combinator: "and",
            rules: [
              { field: startField.key, operator: "before", value: dayKey(from) },
              { field: endField.key, operator: "after", value: dayKey(to) },
            ],
          },
        ],
      },
      search,
      sort: [{ field: startField.key, direction: "asc" }],
      limit: 200,
    }),
    placeholderData: keepPreviousData,
  });
  const rows = ((list.data?.rows as Row[] | undefined) ?? []).filter((r) =>
    barRange(r, startField.key, endField.key),
  );

  // Mois affichés au-dessus des jours.
  const months: { label: string; span: number }[] = [];
  for (const d of days) {
    const label = monthFmt.format(d);
    const last = months[months.length - 1];
    if (last && last.label === label) last.span += 1;
    else months.push({ label, span: 1 });
  }

  const editable = canEdit && Boolean(startField.editable) && Boolean(endField.editable);

  function onPointerDown(e: React.PointerEvent, id: string, mode: Drag["mode"]) {
    if (!editable || e.button !== 0) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id, mode, originX: e.clientX, delta: 0 });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, delta: Math.round((e.clientX - drag.originX) / DAY_WIDTH) });
  }

  function onPointerUp(row: Row) {
    if (!drag) return;
    const current = drag;
    setDrag(null);
    if (current.delta === 0) {
      onOpen(row);
      return;
    }
    const range = barRange(row, startField.key, endField.key)!;
    const values =
      current.mode === "move"
        ? {
            [startField.key]: dayKey(addDays(range.start, current.delta)),
            [endField.key]: dayKey(addDays(range.end, current.delta)),
          }
        : {
            [endField.key]: dayKey(
              addDays(range.end, Math.max(current.delta, daysBetween(range.end, range.start))),
            ),
          };
    update.mutate({ entity, id: row.id, values });
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => setFrom((f) => new Date(f.getFullYear(), f.getMonth() - 1, 1))}
          aria-label="Mois précédent"
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => setFrom((f) => new Date(f.getFullYear(), f.getMonth() + 1, 1))}
          aria-label="Mois suivant"
        >
          <ChevronRightIcon />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const now = new Date();
            setFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1));
          }}
        >
          Aujourd&apos;hui
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">
          {startField.label} → {endField.label}
          {editable ? " · glissez une barre pour la déplacer, son bord droit pour l'allonger" : ""}
        </p>
      </div>
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto rounded-lg border border-border"
      >
        <div style={{ width: LABEL_WIDTH + WINDOW_DAYS * DAY_WIDTH }}>
          <div className="sticky top-0 z-20 flex border-b border-border bg-muted">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              style={{ width: LABEL_WIDTH }}
            >
              {def.labelPlural}
            </div>
            <div>
              <div className="flex">
                {months.map((m) => (
                  <div
                    key={m.label}
                    className="truncate border-r border-border px-2 py-1 text-xs font-medium capitalize"
                    style={{ width: m.span * DAY_WIDTH }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="flex">
                {days.map((d) => (
                  <div
                    key={dayKey(d)}
                    className={cn(
                      "border-r border-border/60 py-0.5 text-center text-[10px] text-muted-foreground tabular-nums",
                      (d.getDay() === 0 || d.getDay() === 6) && "bg-background/40",
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
                    {d.getDate()}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {list.isPending
                ? "Chargement…"
                : `Aucune fiche datée sur cette période. Renseignez « ${startField.label} » et « ${endField.label} » pour les voir ici.`}
            </p>
          ) : (
            <ul className="relative">
              {todayOffset >= 0 && todayOffset < WINDOW_DAYS ? (
                <li
                  aria-hidden
                  className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary"
                  style={{ left: LABEL_WIDTH + todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                />
              ) : null}
              {rows.map((row) => {
                const range = barRange(row, startField.key, endField.key)!;
                const active = drag?.id === row.id ? drag : null;
                const shiftStart = active?.mode === "move" ? active.delta : 0;
                const shiftEnd = active ? active.delta : 0;
                const left = daysBetween(from, range.start) + shiftStart;
                const length = Math.max(
                  1,
                  daysBetween(range.start, range.end) + 1 + shiftEnd - shiftStart,
                );
                const tone = statusField?.options?.find(
                  (o) => o.value === row[statusField.key],
                )?.tone;
                return (
                  <li
                    key={row.id}
                    className="flex border-b border-border"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpen(row)}
                      className="sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-border bg-background px-3 text-left text-sm hover:bg-accent"
                      style={{ width: LABEL_WIDTH }}
                    >
                      <span className="truncate">{row.title}</span>
                    </button>
                    <div className="relative flex-1">
                      <div
                        role="button"
                        tabIndex={-1}
                        aria-label={`${row.title} : du ${range.start.toLocaleDateString("fr-FR")} au ${range.end.toLocaleDateString("fr-FR")}`}
                        onPointerDown={(e) => onPointerDown(e, row.id, "move")}
                        onPointerMove={onPointerMove}
                        onPointerUp={() => onPointerUp(row)}
                        className={cn(
                          "absolute top-1.5 flex h-6 touch-none items-center overflow-hidden rounded-md px-2 text-xs font-medium text-primary-foreground shadow-xs select-none",
                          "bg-primary",
                          tone === "success" && "bg-success text-success-foreground",
                          tone === "warning" && "bg-warning text-warning-foreground",
                          tone === "danger" && "bg-destructive text-destructive-foreground",
                          tone === "neutral" && "bg-muted-foreground text-background",
                          editable && "cursor-grab active:cursor-grabbing",
                        )}
                        style={{ left: left * DAY_WIDTH + 1, width: length * DAY_WIDTH - 2 }}
                      >
                        <span className="truncate">{row.title}</span>
                        {editable ? (
                          <span
                            aria-hidden
                            onPointerDown={(e) => onPointerDown(e, row.id, "resize")}
                            className="absolute top-0 right-0 h-full w-2 cursor-ew-resize"
                          />
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
