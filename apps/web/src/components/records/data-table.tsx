"use client";

import {
  type EntityKey,
  type FieldDef,
  type FilterGroup,
  type SortSpec,
  type ViewConfig,
  countRules,
} from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Checkbox } from "@quercy/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@quercy/ui/components/dropdown-menu";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Input } from "@quercy/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@quercy/ui/components/select";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type ColumnSizingState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTRPC } from "@/lib/trpc";

import { exportUrl } from "./export-url";
import { useUserOptions } from "./field-editor";
import { formatEuros } from "./field-display";
import { FilterBuilder } from "./filter-builder";
import {
  type ColumnLayout,
  ROW_HEIGHTS,
  type RowActions,
  SELECT_COLUMN_WIDTH,
  TableRow,
} from "./table-row";
import { ColumnsMenu, DensityMenu, GroupMenu, SortMenu } from "./toolbar-menus";
import type { EntityPermissions, Row } from "./types";
import { useRecordMutations } from "./use-record-mutations";
import { useViewState } from "./use-view-state";
import { ViewsBar } from "./views-bar";

const PAGE_SIZE = 100;

export interface DataTableProps {
  entity: EntityKey;
  fields: FieldDef[];
  permissions: EntityPermissions;
  labels: { singular: string; plural: string; feminine: boolean };
  onOpen: (row: Row) => void;
  onOpenPage: (row: Row) => void;
  onCreate: () => void;
  onImport: () => void;
  onTrash: () => void;
}

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Règle de filtre correspondant à un groupe (pour charger ses lignes). */
function groupRule(field: FieldDef, value: string | null) {
  if (value === null) return { field: field.key, operator: "is_empty" as const };
  if (field.type === "select" || field.type === "user" || field.type === "relation") {
    return { field: field.key, operator: "in" as const, value: [value] };
  }
  return { field: field.key, operator: "equals" as const, value };
}

function HeaderCell({
  field,
  width,
  left,
  sort,
  onSort,
  resizeHandler,
  isResizing,
}: {
  field: FieldDef;
  width: number;
  left: number | null;
  sort: SortSpec[];
  onSort: (key: string, additive: boolean) => void;
  resizeHandler: (event: unknown) => void;
  isResizing: boolean;
}) {
  const index = sort.findIndex((s) => s.field === field.key);
  const current = index >= 0 ? sort[index] : undefined;
  return (
    <div
      role="columnheader"
      aria-sort={current ? (current.direction === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "group/header relative flex shrink-0 items-center",
        left !== null && "sticky z-20 bg-muted",
      )}
      style={{ width, left: left ?? undefined }}
    >
      <button
        type="button"
        disabled={!field.sortable}
        onClick={(e) => onSort(field.key, e.shiftKey)}
        className="flex h-full min-w-0 flex-1 items-center gap-1 px-3 text-left text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-default disabled:hover:text-muted-foreground"
        title={field.sortable ? "Cliquer pour trier (Maj + clic : tri secondaire)" : undefined}
      >
        <span className="truncate">{field.label}</span>
        {current ? (
          <span className="flex items-center text-foreground">
            {current.direction === "asc" ? (
              <ArrowUpIcon className="size-3" />
            ) : (
              <ArrowDownIcon className="size-3" />
            )}
            {sort.length > 1 ? <span className="text-[10px]">{index + 1}</span> : null}
          </span>
        ) : null}
      </button>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Redimensionner ${field.label}`}
        onMouseDown={resizeHandler as React.MouseEventHandler}
        onTouchStart={resizeHandler as React.TouchEventHandler}
        onDoubleClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-primary/40",
          isResizing && "bg-primary",
        )}
      />
    </div>
  );
}

export function DataTable({
  entity,
  fields,
  permissions,
  labels,
  onOpen,
  onOpenPage,
  onCreate,
  onImport,
  onTrash,
}: DataTableProps) {
  const trpc = useTRPC();
  const { config, update, apply, reset, viewId, loaded } = useViewState(entity, fields);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounced(search);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = React.useState<number | null>(null);
  const [focused, setFocused] = React.useState<number>(-1);
  const [editing, setEditing] = React.useState<{ id: string; key: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<string[] | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const mutations = useRecordMutations(entity);
  const users = useUserOptions(permissions.update);

  const byKey = React.useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);
  const visible = React.useMemo(() => {
    const cols = config.columns.filter((c) => c.visible && byKey.has(c.key));
    return [...cols.filter((c) => c.pinned), ...cols.filter((c) => !c.pinned)];
  }, [config.columns, byKey]);

  // Largeurs : TanStack Table gère le redimensionnement, la vue garde la largeur finale.
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const columnDefs = React.useMemo<ColumnDef<Row>[]>(
    () =>
      visible.map((c) => ({
        id: c.key,
        size: c.width ?? byKey.get(c.key)?.width ?? 160,
        minSize: 70,
        maxSize: 800,
      })),
    [visible, byKey],
  );

  const groupField = config.groupBy ? (byKey.get(config.groupBy) ?? null) : null;
  const listInput = {
    entity,
    filter: config.filter,
    sort: config.sort,
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
  };
  const list = useInfiniteQuery({
    ...trpc.records.list.infiniteQueryOptions(listInput, {
      getNextPageParam: (last) => last.nextCursor,
    }),
    enabled: loaded && !groupField,
    placeholderData: keepPreviousData,
  });
  const rows = React.useMemo(
    () => list.data?.pages.flatMap((p) => p.rows as Row[]) ?? [],
    [list.data],
  );
  const total = list.data?.pages[0]?.total ?? 0;

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => r.id,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    state: { columnSizing },
    onColumnSizingChange: setColumnSizing,
  });
  const resizing = table.getState().columnSizingInfo.isResizingColumn;
  React.useEffect(() => {
    if (resizing || Object.keys(columnSizing).length === 0) return;
    update({
      columns: config.columns.map((c) =>
        columnSizing[c.key] ? { ...c, width: Math.round(columnSizing[c.key]!) } : c,
      ),
    });
    setColumnSizing({});
    // On valide les largeurs à la fin du glissement seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizing]);

  const layout: ColumnLayout[] = React.useMemo(() => {
    let offset = SELECT_COLUMN_WIDTH;
    return visible.map((c) => {
      const width = table.getColumn(c.key)?.getSize() ?? c.width ?? 160;
      const left = c.pinned ? offset : null;
      if (c.pinned) offset += width;
      return { field: byKey.get(c.key)!, width, left };
    });
    // columnSizing déclenche le recalcul pendant le glissement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, byKey, table, columnSizing]);
  const totalWidth = SELECT_COLUMN_WIDTH + layout.reduce((sum, c) => sum + c.width, 0);
  const rowHeight = ROW_HEIGHTS[config.density];

  const virtualizer = useVirtualizer({
    count: groupField ? 0 : rows.length + (list.hasNextPage ? 1 : 0),
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });
  const virtualItems = virtualizer.getVirtualItems();
  React.useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (last && last.index >= rows.length - 1 && list.hasNextPage && !list.isFetchingNextPage)
      void list.fetchNextPage();
  }, [virtualItems, rows.length, list]);
  React.useEffect(() => virtualizer.measure(), [rowHeight, virtualizer]);

  // Le raccourci global « C » crée une fiche sur cet écran.
  React.useEffect(() => {
    if (!permissions.create) return;
    const handler = () => onCreate();
    window.addEventListener("quercy:create", handler);
    return () => window.removeEventListener("quercy:create", handler);
  }, [permissions.create, onCreate]);

  const clearSelection = () => {
    setSelected(new Set());
    setLastSelected(null);
  };
  React.useEffect(clearSelection, [config.filter, debouncedSearch, config.groupBy]);

  function onSort(key: string, additive: boolean) {
    const existing = config.sort.find((s) => s.field === key);
    let next: SortSpec[];
    if (!existing)
      next = additive
        ? [...config.sort, { field: key, direction: "asc" }]
        : [{ field: key, direction: "asc" }];
    else if (existing.direction === "asc")
      next = config.sort.map((s) => (s.field === key ? { ...s, direction: "desc" as const } : s));
    else next = config.sort.filter((s) => s.field !== key);
    update({ sort: next.slice(0, 5) });
  }

  const actions: RowActions = React.useMemo(
    () => ({
      onOpen,
      onOpenPage,
      onDelete: permissions.delete ? (row) => setConfirmDelete([row.id]) : undefined,
      onEdit: (row, key) => setEditing({ id: row.id, key }),
      onCancelEdit: () => setEditing(null),
      onCommit: (row, key, value) => {
        setEditing(null);
        mutations.update.mutate({ entity, id: row.id, values: { [key]: value } });
      },
      onToggleSelect: (row, shift) => {
        const index = rows.findIndex((r) => r.id === row.id);
        setSelected((prev) => {
          const next = new Set(prev);
          if (shift && lastSelected !== null && index >= 0) {
            const [a, b] = [Math.min(lastSelected, index), Math.max(lastSelected, index)];
            for (let i = a; i <= b; i++) next.add(rows[i]!.id);
          } else if (next.has(row.id)) next.delete(row.id);
          else next.add(row.id);
          return next;
        });
        if (index >= 0) setLastSelected(index);
      },
      onFocusRow: (index) => setFocused(index),
      onCopyLink: (row) => {
        void navigator.clipboard
          .writeText(`${window.location.origin}${window.location.pathname}/${row.id}`)
          .then(() => toast.success("Lien copié."));
      },
    }),
    [onOpen, onOpenPage, permissions.delete, mutations.update, entity, rows, lastSelected],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (editing || event.target !== event.currentTarget || groupField) return;
    const key = event.key.toLowerCase();
    const row = rows[focused];
    if (key === "j" || key === "arrowdown") {
      event.preventDefault();
      const next = Math.min(rows.length - 1, focused + 1);
      setFocused(next);
      virtualizer.scrollToIndex(next);
    } else if (key === "k" || key === "arrowup") {
      event.preventDefault();
      const next = Math.max(0, focused - 1);
      setFocused(next);
      virtualizer.scrollToIndex(next);
    } else if (key === "enter" && row) {
      event.preventDefault();
      onOpen(row);
    } else if (key === "o" && row) {
      event.preventDefault();
      onOpenPage(row);
    } else if (key === "x" && row) {
      event.preventDefault();
      actions.onToggleSelect(row, event.shiftKey);
    } else if (key === "e" && row && permissions.update) {
      const first = layout.find((c) => c.field.editable);
      if (first) {
        event.preventDefault();
        setEditing({ id: row.id, key: first.field.key });
      }
    } else if (key === "escape") {
      clearSelection();
    }
  }

  const filtersActive = countRules(config.filter) > 0 || debouncedSearch !== "";
  const visibleKeys = visible.map((c) => c.key);
  const exportState = {
    filter: config.filter,
    sort: config.sort,
    search: debouncedSearch || undefined,
    columns: visibleKeys,
  };
  const allLoadedSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const noun = labels.plural.toLowerCase();

  const header = (
    <div
      role="row"
      className="sticky top-0 z-20 flex h-9 border-b border-border bg-muted"
      style={{ width: totalWidth }}
    >
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center justify-center bg-muted"
        style={{ width: SELECT_COLUMN_WIDTH }}
      >
        <Checkbox
          checked={allLoadedSelected ? true : selected.size > 0 ? "indeterminate" : false}
          onCheckedChange={(v) =>
            setSelected(v === true ? new Set(rows.map((r) => r.id)) : new Set())
          }
          aria-label="Tout sélectionner"
          disabled={Boolean(groupField)}
        />
      </div>
      {layout.map(({ field, width, left }) => {
        const header = table.getFlatHeaders().find((h) => h.id === field.key);
        return (
          <HeaderCell
            key={field.key}
            field={field}
            width={width}
            left={left}
            sort={config.sort}
            onSort={onSort}
            resizeHandler={header ? header.getResizeHandler() : () => undefined}
            isResizing={Boolean(header?.column.getIsResizing())}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2 border-b border-border px-6 pt-3 pb-2">
        <ViewsBar
          entity={entity}
          config={config}
          viewId={viewId}
          labelPlural={labels.plural}
          onApply={apply}
          onReset={reset}
        />
        <div className="flex items-center gap-1.5">
          <div className="relative w-64">
            <SearchIcon
              className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Rechercher dans les ${noun}…`}
              aria-label={`Rechercher dans les ${noun}`}
              className="h-8 pl-8"
            />
          </div>
          <FilterBuilder
            fields={fields}
            value={config.filter}
            onChange={(filter: FilterGroup) => update({ filter })}
          />
          <SortMenu fields={fields} sort={config.sort} onChange={(sort) => update({ sort })} />
          <GroupMenu
            fields={fields}
            groupBy={config.groupBy}
            onChange={(groupBy) => update({ groupBy })}
          />
          <div className="ml-auto flex items-center gap-1">
            <DensityMenu
              density={config.density}
              onChange={(density: ViewConfig["density"]) => update({ density })}
            />
            <ColumnsMenu
              fields={fields}
              columns={config.columns}
              onChange={(columns) => update({ columns })}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Plus d'actions">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {permissions.create ? (
                  <DropdownMenuItem onSelect={onImport}>
                    <UploadIcon />
                    Importer (CSV, Excel)
                  </DropdownMenuItem>
                ) : null}
                {permissions.export ? (
                  <>
                    <DropdownMenuItem asChild>
                      <a href={exportUrl(entity, "xlsx", exportState)} download>
                        <FileSpreadsheetIcon />
                        Exporter la vue (Excel)
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={exportUrl(entity, "csv", exportState)} download>
                        <DownloadIcon />
                        Exporter la vue (CSV)
                      </a>
                    </DropdownMenuItem>
                  </>
                ) : null}
                {permissions.delete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onTrash}>
                      <Trash2Icon />
                      Corbeille
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            {permissions.create ? (
              <Button size="sm" onClick={onCreate}>
                <PlusIcon />
                {labels.feminine ? "Nouvelle" : "Nouveau"} {labels.singular.toLowerCase()}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        role="grid"
        aria-label={labels.plural}
        aria-rowcount={groupField ? undefined : total + 1}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => focused < 0 && rows.length > 0 && setFocused(0)}
        className="relative min-h-0 flex-1 overflow-auto outline-none"
      >
        {groupField ? (
          <div style={{ width: totalWidth, minWidth: "100%" }}>
            {header}
            <GroupedBody
              entity={entity}
              field={groupField}
              listInput={listInput}
              layout={layout}
              totalWidth={totalWidth}
              rowHeight={rowHeight}
              fields={fields}
              canEdit={permissions.update}
              selected={selected}
              editing={editing}
              actions={actions}
            />
          </div>
        ) : list.isPending ? (
          <div className="space-y-px p-0" aria-busy="true">
            {header}
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex h-10 items-center gap-4 border-b border-border px-4">
                <Skeleton className="h-3 w-4" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            {filtersActive ? (
              <EmptyState
                icon={<SearchIcon />}
                title="Aucun résultat"
                description="Aucune fiche ne correspond à la recherche ou aux filtres."
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      update({ filter: { combinator: "and", rules: [] } });
                    }}
                  >
                    Effacer la recherche et les filtres
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<PlusIcon />}
                title={`Aucun${labels.feminine ? "e" : ""} ${labels.singular.toLowerCase()} pour l'instant`}
                description={`Créez ${labels.feminine ? "la première" : "le premier"} ou importez votre fichier existant (CSV ou Excel).`}
                action={
                  permissions.create ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={onCreate}>
                        <PlusIcon />
                        Créer
                      </Button>
                      <Button size="sm" variant="secondary" onClick={onImport}>
                        <UploadIcon />
                        Importer
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            )}
          </div>
        ) : (
          <div style={{ width: totalWidth, minWidth: "100%" }}>
            {header}
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualItems.map((item) => {
                const row = rows[item.index];
                if (!row) {
                  return (
                    <div
                      key="loader"
                      className="absolute left-0 flex items-center px-4 text-sm text-muted-foreground"
                      style={{
                        top: 0,
                        transform: `translateY(${item.start}px)`,
                        height: rowHeight,
                      }}
                    >
                      Chargement…
                    </div>
                  );
                }
                return (
                  <TableRow
                    key={row.id}
                    index={item.index}
                    row={row}
                    columns={layout}
                    height={rowHeight}
                    selected={selected.has(row.id)}
                    focused={focused === item.index}
                    editingKey={editing?.id === row.id ? editing.key : null}
                    canEdit={permissions.update}
                    actions={actions}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: totalWidth,
                      transform: `translateY(${item.start}px)`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex h-9 shrink-0 items-center justify-between border-t border-border px-6 text-xs text-muted-foreground">
        <span>
          {groupField
            ? "Vue regroupée"
            : `${total.toLocaleString("fr-FR")} ${total > 1 ? noun : labels.singular.toLowerCase()}`}
          {filtersActive ? " (filtré)" : ""}
        </span>
        {list.isFetching && !list.isPending ? <span>Actualisation…</span> : null}
      </div>

      {selected.size > 0 ? (
        <div
          role="toolbar"
          aria-label="Actions sur la sélection"
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-popover px-3 py-2 shadow-lg"
        >
          <span className="px-1 text-sm font-medium tabular-nums">
            {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          {permissions.update ? (
            <Select
              value=""
              onValueChange={(ownerId) =>
                mutations.bulkUpdate.mutate({ entity, ids: [...selected], values: { ownerId } })
              }
            >
              <SelectTrigger className="h-7 w-auto" aria-label="Attribuer un responsable">
                Attribuer à…
              </SelectTrigger>
              <SelectContent>
                {(users.data ?? []).map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {permissions.update
            ? fields
                .filter((f) => f.type === "select" && !f.custom && f.editable)
                .slice(0, 1)
                .map((f) => (
                  <Select
                    key={f.key}
                    value=""
                    onValueChange={(v) =>
                      mutations.bulkUpdate.mutate({
                        entity,
                        ids: [...selected],
                        values: { [f.key]: v },
                      })
                    }
                  >
                    <SelectTrigger className="h-7 w-auto" aria-label={`Changer : ${f.label}`}>
                      {f.label}…
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))
            : null}
          {permissions.export ? (
            <Button variant="ghost" size="sm" asChild>
              <a href={exportUrl(entity, "xlsx", { ...exportState, ids: [...selected] })} download>
                <DownloadIcon />
                Exporter
              </a>
            </Button>
          ) : null}
          {permissions.delete ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setConfirmDelete([...selected])}
            >
              <Trash2Icon />
              Supprimer
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clearSelection}
            aria-label="Annuler la sélection"
          >
            <XIcon />
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => (open ? null : setConfirmDelete(null))}
        title={
          confirmDelete && confirmDelete.length > 1
            ? `Mettre ${confirmDelete.length} fiches à la corbeille ?`
            : "Mettre cette fiche à la corbeille ?"
        }
        description="Elles restent restaurables pendant 30 jours, depuis la corbeille ou le bouton « Annuler »."
        confirmLabel="Mettre à la corbeille"
        destructive
        pending={mutations.remove.isPending}
        onConfirm={() => {
          if (!confirmDelete) return;
          mutations.remove.mutate(
            { entity, ids: confirmDelete },
            {
              onSuccess: () => {
                setConfirmDelete(null);
                clearSelection();
              },
            },
          );
        }}
      />
    </div>
  );
}

/** Mode regroupé : un en-tête par valeur (nombre + sous-totaux), lignes chargées à l'ouverture. */
function GroupedBody({
  entity,
  field,
  listInput,
  layout,
  totalWidth,
  rowHeight,
  fields,
  canEdit,
  selected,
  editing,
  actions,
}: {
  entity: EntityKey;
  field: FieldDef;
  listInput: { filter: FilterGroup; sort: SortSpec[]; search?: string };
  layout: ColumnLayout[];
  totalWidth: number;
  rowHeight: number;
  fields: FieldDef[];
  canEdit: boolean;
  selected: Set<string>;
  editing: { id: string; key: string } | null;
  actions: RowActions;
}) {
  const trpc = useTRPC();
  const groups = useQuery(
    trpc.records.groups.queryOptions({
      entity,
      filter: listInput.filter,
      search: listInput.search,
      groupBy: field.key,
    }),
  );
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const aggregateFields = fields.filter((f) => f.aggregate && !f.custom);

  if (groups.isPending) return <Skeleton className="m-4 h-24" />;
  if (!groups.data || groups.data.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">Aucune fiche.</p>;
  }
  return (
    <div>
      {groups.data.map((group) => {
        const key = group.value ?? "__empty__";
        const expanded = open.has(key);
        return (
          <div key={key} role="rowgroup">
            <button
              type="button"
              onClick={() =>
                setOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
              aria-expanded={expanded}
              className="sticky left-0 flex h-9 w-full items-center gap-2 border-b border-border bg-muted/40 px-3 text-sm hover:bg-muted"
              style={{ maxWidth: "100%" }}
            >
              {expanded ? (
                <ChevronDownIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
              <span className="font-medium">{group.label}</span>
              <span className="rounded-sm bg-background px-1.5 text-xs text-muted-foreground tabular-nums">
                {group.count}
              </span>
              {aggregateFields.map((f) => {
                const value = (group.aggregates as Record<string, number | null>)[f.key];
                if (value === null || value === undefined || value === 0) return null;
                const shown =
                  f.type === "currency"
                    ? formatEuros(value)
                    : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
                return (
                  <span key={f.key} className="text-xs text-muted-foreground">
                    · {f.aggregate === "avg" ? "moy." : "Σ"} {f.label.toLowerCase()} :{" "}
                    <span className="text-foreground tabular-nums">{shown}</span>
                  </span>
                );
              })}
            </button>
            {expanded ? (
              <GroupRows
                entity={entity}
                listInput={listInput}
                rule={groupRule(field, group.value)}
                layout={layout}
                totalWidth={totalWidth}
                rowHeight={rowHeight}
                canEdit={canEdit}
                selected={selected}
                editing={editing}
                actions={actions}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function GroupRows({
  entity,
  listInput,
  rule,
  layout,
  totalWidth,
  rowHeight,
  canEdit,
  selected,
  editing,
  actions,
}: {
  entity: EntityKey;
  listInput: { filter: FilterGroup; sort: SortSpec[]; search?: string };
  rule: ReturnType<typeof groupRule>;
  layout: ColumnLayout[];
  totalWidth: number;
  rowHeight: number;
  canEdit: boolean;
  selected: Set<string>;
  editing: { id: string; key: string } | null;
  actions: RowActions;
}) {
  const trpc = useTRPC();
  const query = useInfiniteQuery(
    trpc.records.list.infiniteQueryOptions(
      {
        entity,
        filter: listInput.filter,
        and: rule,
        sort: listInput.sort,
        search: listInput.search,
        limit: 50,
      },
      { getNextPageParam: (last) => last.nextCursor },
    ),
  );
  const rows = query.data?.pages.flatMap((p) => p.rows as Row[]) ?? [];
  if (query.isPending) return <Skeleton className="m-2 h-8" />;
  return (
    <div>
      {rows.map((row, index) => (
        <TableRow
          key={row.id}
          index={index}
          row={row}
          columns={layout}
          height={rowHeight}
          selected={selected.has(row.id)}
          focused={false}
          editingKey={editing?.id === row.id ? editing.key : null}
          canEdit={canEdit}
          actions={actions}
          style={{ width: totalWidth }}
        />
      ))}
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          size="sm"
          className="m-1"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          Afficher plus
        </Button>
      ) : null}
    </div>
  );
}
