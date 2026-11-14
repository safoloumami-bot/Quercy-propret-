"use client";

import { ENTITIES, type EntityKey, type FieldDef, type FilterGroup } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@quercy/ui/components/dropdown-menu";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { cn } from "@quercy/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import * as React from "react";

import { useTRPC } from "@/lib/trpc";

import { FieldDisplay, formatAggregate, isEmptyValue } from "./field-display";
import type { Row } from "./types";
import { useRecordMutations } from "./use-record-mutations";

const NONE = "__none__";
const COLUMN_LIMIT = 50;

interface BoardProps {
  entity: EntityKey;
  fields: FieldDef[];
  filter: FilterGroup;
  search: string | undefined;
  canEdit: boolean;
  canCreate: boolean;
  onOpen: (row: Row) => void;
  onCreate: (defaults: Record<string, unknown>) => void;
}

/** Champs résumés sur une carte : visibles par défaut, hors titre et hors champ des colonnes. */
function cardFields(entity: EntityKey, fields: FieldDef[], columnKey: string) {
  const def = ENTITIES[entity];
  return fields
    .filter(
      (f) =>
        f.defaultVisible &&
        !f.custom &&
        f.key !== columnKey &&
        !def.titleFields.includes(f.key) &&
        f.type !== "select",
    )
    .slice(0, 4);
}

function BoardCard({
  row,
  shown,
  columns,
  current,
  canEdit,
  onOpen,
  onMove,
}: {
  row: Row;
  shown: FieldDef[];
  columns: { value: string; label: string }[];
  current: string;
  canEdit: boolean;
  onOpen: (row: Row) => void;
  onMove: (row: Row, value: string) => void;
}) {
  return (
    <li
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/x-quercy-row", JSON.stringify({ id: row.id, from: current }));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group/card relative rounded-lg border border-border bg-card p-3 text-sm shadow-xs",
        canEdit && "cursor-grab active:cursor-grabbing",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="block w-full pr-6 text-left font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-[3px] focus-visible:after:ring-ring/40"
      >
        {row.title}
      </button>
      <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
        {shown
          .filter((f) => !isEmptyValue(row[f.key]))
          .map((f) => (
            <div key={f.key} className="flex min-w-0 items-center gap-1.5">
              <dt className="sr-only">{f.label}</dt>
              <dd className="relative z-10 min-w-0 truncate">
                <FieldDisplay field={f} row={row} />
              </dd>
            </div>
          ))}
      </dl>
      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Déplacer « ${row.title} »`}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Déplacer vers</DropdownMenuLabel>
            {columns
              .filter((c) => c.value !== current)
              .map((c) => (
                <DropdownMenuItem key={c.value} onSelect={() => onMove(row, c.value)}>
                  {c.label}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}

function BoardColumn({
  entity,
  field,
  column,
  columns,
  filter,
  search,
  shown,
  sumField,
  aggregate,
  count,
  canEdit,
  canCreate,
  moved,
  onOpen,
  onMove,
  onCreate,
}: {
  entity: EntityKey;
  field: FieldDef;
  column: { value: string; label: string; tone?: string };
  columns: { value: string; label: string }[];
  filter: FilterGroup;
  search: string | undefined;
  shown: FieldDef[];
  sumField: FieldDef | undefined;
  aggregate: number | null;
  count: number | undefined;
  canEdit: boolean;
  canCreate: boolean;
  moved: Map<string, { row: Row; to: string }>;
  onOpen: (row: Row) => void;
  onMove: (row: Row, value: string) => void;
  onCreate: (defaults: Record<string, unknown>) => void;
}) {
  const trpc = useTRPC();
  const [over, setOver] = React.useState(false);
  const rule =
    column.value === NONE
      ? { field: field.key, operator: "is_empty" as const }
      : { field: field.key, operator: "in" as const, value: [column.value] };
  const list = useQuery(
    trpc.records.list.queryOptions({
      entity,
      filter,
      search,
      and: rule,
      sort: [],
      limit: COLUMN_LIMIT,
    }),
  );
  // Déplacements en cours : la carte change de colonne avant la réponse du serveur.
  const rows = [
    ...((list.data?.rows as Row[] | undefined) ?? []).filter((r) => !moved.has(r.id)),
    ...[...moved.values()].filter((m) => m.to === column.value).map((m) => m.row),
  ];

  return (
    <section
      aria-label={`${column.label} (${count ?? rows.length})`}
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const raw = e.dataTransfer.getData("text/x-quercy-row");
        if (!raw) return;
        const { id, from } = JSON.parse(raw) as { id: string; from: string };
        if (from === column.value) return;
        const source =
          (list.data?.rows as Row[] | undefined)?.find((r) => r.id === id) ??
          [...moved.values()].find((m) => m.row.id === id)?.row;
        onMove(source ?? ({ id, title: "", labels: {} } as Row), column.value);
      }}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl bg-muted/50 transition-colors",
        over && "bg-accent ring-2 ring-primary/40",
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        {column.value === NONE ? (
          <span className="text-sm font-medium text-muted-foreground">{column.label}</span>
        ) : (
          <Badge variant={(column.tone as "neutral") ?? "neutral"}>{column.label}</Badge>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">{count ?? "…"}</span>
        {sumField && aggregate ? (
          <span className="ml-auto text-xs font-medium tabular-nums">
            {formatAggregate(sumField, aggregate)}
          </span>
        ) : null}
      </header>
      <ul className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {list.isPending ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : (
          rows.map((row) => (
            <BoardCard
              key={row.id}
              row={row}
              shown={shown}
              columns={columns}
              current={column.value}
              canEdit={canEdit}
              onOpen={onOpen}
              onMove={onMove}
            />
          ))
        )}
        {count !== undefined && count > COLUMN_LIMIT ? (
          <li className="px-1 text-xs text-muted-foreground">
            {count - COLUMN_LIMIT} de plus : affinez les filtres ou passez en tableau.
          </li>
        ) : null}
      </ul>
      {canCreate && column.value !== NONE ? (
        <Button
          variant="ghost"
          size="sm"
          className="mx-2 mb-2 justify-start text-muted-foreground"
          onClick={() => onCreate({ [field.key]: column.value })}
        >
          <PlusIcon />
          Ajouter
        </Button>
      ) : null}
    </section>
  );
}

/** Kanban : une colonne par valeur du champ, glisser-déposer (ou menu « Déplacer vers »). */
export function BoardView({
  entity,
  fields,
  filter,
  search,
  canEdit,
  canCreate,
  onOpen,
  onCreate,
}: BoardProps) {
  const trpc = useTRPC();
  const def = ENTITIES[entity];
  const board = def.layouts!.board!;
  const field = fields.find((f) => f.key === board.field)!;
  const sumField = board.sum ? fields.find((f) => f.key === board.sum) : undefined;
  const { update } = useRecordMutations(entity);
  const [moved, setMoved] = React.useState<Map<string, { row: Row; to: string }>>(new Map());

  const groups = useQuery(
    trpc.records.groups.queryOptions({ entity, filter, search, groupBy: field.key }),
  );
  const byValue = new Map((groups.data ?? []).map((g) => [g.value ?? NONE, g]));
  const columns = [
    ...(field.options ?? []).map((o) => ({ value: o.value, label: o.label, tone: o.tone })),
    ...(field.required ? [] : [{ value: NONE, label: "Non renseigné", tone: undefined }]),
  ];
  const shown = cardFields(entity, fields, field.key);

  function move(row: Row, to: string) {
    setMoved((m) => new Map(m).set(row.id, { row, to }));
    update.mutate(
      { entity, id: row.id, values: { [field.key]: to === NONE ? "" : to } },
      {
        onSettled: () =>
          setMoved((m) => {
            const next = new Map(m);
            next.delete(row.id);
            return next;
          }),
      },
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto px-6 py-4">
      {columns.map((column) => {
        const group = byValue.get(column.value);
        return (
          <BoardColumn
            key={column.value}
            entity={entity}
            field={field}
            column={column}
            columns={columns}
            filter={filter}
            search={search}
            shown={shown}
            sumField={sumField}
            aggregate={
              sumField
                ? ((group?.aggregates as Record<string, number | null> | undefined)?.[
                    sumField.key
                  ] ?? null)
                : null
            }
            count={groups.data ? (group?.count ?? 0) : undefined}
            canEdit={canEdit}
            canCreate={canCreate}
            moved={moved}
            onOpen={onOpen}
            onMove={move}
            onCreate={onCreate}
          />
        );
      })}
    </div>
  );
}
