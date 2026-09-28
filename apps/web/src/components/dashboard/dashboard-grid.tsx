"use client";

import "react-grid-layout/css/styles.css";

import { type DashboardItem, type WidgetDefinition, widgetByKey } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@quercy/ui/components/dropdown-menu";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  GripVerticalIcon,
  LayoutGridIcon,
  MaximizeIcon,
  MinimizeIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react";
import * as React from "react";
import ReactGridLayout, { type Layout, verticalCompactor } from "react-grid-layout";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

import { PeriodPicker, usePeriod } from "./period";
import { WidgetBody, widgetTitle } from "./widgets";

const COLS = 12;

/** Largeur réelle d'un élément, suivie à chaque redimensionnement. */
function useElementWidth() {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { ref: setNode, width };
}

function newId(widget: string) {
  return `${widget}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Réordonne verticalement la grille après un déplacement au clavier. */
function moveItem(items: DashboardItem[], id: string, delta: -1 | 1): DashboardItem[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const index = sorted.findIndex((i) => i.i === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= sorted.length) return items;
  const a = sorted[index]!;
  const b = sorted[target]!;
  return items.map((i) =>
    i.i === a.i ? { ...i, x: b.x, y: b.y } : i.i === b.i ? { ...i, x: a.x, y: a.y } : i,
  );
}

function ConfigDialog({
  item,
  reports,
  onClose,
  onSave,
}: {
  item: DashboardItem | null;
  reports: { id: string; name: string }[];
  onClose: () => void;
  onSave: (config: DashboardItem["config"]) => void;
}) {
  const [target, setTarget] = React.useState("");
  const [reportId, setReportId] = React.useState("");
  React.useEffect(() => {
    setTarget(item?.config.target ? String(item.config.target) : "");
    setReportId(typeof item?.config.reportId === "string" ? item.config.reportId : "");
  }, [item]);
  if (!item) return null;
  const isObjective = item.widget === "objective";
  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurer « {widgetByKey(item.widget)?.label} »</DialogTitle>
          <DialogDescription>
            {isObjective
              ? "Objectif de chiffre d'affaires hors taxes pour la période affichée."
              : "Rapport affiché dans ce widget, avec la période du tableau de bord."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="widget-config"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(
              isObjective
                ? { target: Number(target.replace(/\s/g, "").replace(",", ".")) || null }
                : { reportId: reportId || null },
            );
          }}
        >
          {isObjective ? (
            <div className="space-y-1.5">
              <Label htmlFor="widget-target">Objectif (€ HT)</Label>
              <Input
                id="widget-target"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                autoFocus
              />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun rapport enregistré : créez-en un depuis l&apos;écran Rapports.
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="widget-report">Rapport</Label>
              <Select value={reportId} onValueChange={setReportId}>
                <SelectTrigger id="widget-report">
                  <SelectValue placeholder="Choisir un rapport" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="widget-config">
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Library({
  open,
  onOpenChange,
  available,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: WidgetDefinition[];
  onAdd: (widget: WidgetDefinition) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ajouter un widget</DialogTitle>
          <DialogDescription>
            Widgets disponibles selon les modules actifs et votre rôle.
          </DialogDescription>
        </DialogHeader>
        <ul className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto">
          {available.map((w) => (
            <li key={w.key}>
              <button
                type="button"
                onClick={() => onAdd(w)}
                className="flex h-full w-full flex-col items-start gap-1 rounded-lg border border-border p-3 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <span className="text-sm font-medium">{w.label}</span>
                <span className="text-xs text-muted-foreground">{w.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Tableau de bord d'accueil : grille de widgets déplaçables et redimensionnables (mode
 * « Personnaliser »), période globale, bibliothèque de widgets, réglage par widget.
 */
export function DashboardGrid() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const dashboard = useQuery(trpc.dashboard.get.queryOptions());
  const [period, setPeriod] = usePeriod();
  const [editing, setEditing] = React.useState(false);
  const [items, setItems] = React.useState<DashboardItem[] | null>(null);
  const [library, setLibrary] = React.useState(false);
  const [configuring, setConfiguring] = React.useState<DashboardItem | null>(null);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const { ref: containerRef, width } = useElementWidth();

  React.useEffect(() => {
    if (dashboard.data && !editing) setItems(dashboard.data.layout);
  }, [dashboard.data, editing]);

  const refresh = () => queryClient.invalidateQueries(trpc.dashboard.get.queryFilter());
  const save = useMutation(
    trpc.dashboard.save.mutationOptions({
      onSuccess: () => {
        void refresh();
        toast.success("Tableau de bord enregistré.");
      },
      onError: toastError,
    }),
  );
  const reset = useMutation(
    trpc.dashboard.reset.mutationOptions({
      onSuccess: () => {
        setConfirmReset(false);
        setEditing(false);
        void refresh();
        toast.success("Tableau de bord par défaut rétabli.");
      },
      onError: toastError,
    }),
  );

  if (dashboard.isPending || !items) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }
  const reports = dashboard.data?.reports ?? [];
  const available = dashboard.data?.available ?? [];

  const persist = (next: DashboardItem[]) => {
    setItems(next);
    if (!editing) save.mutate({ layout: next });
  };
  const layout: Layout = items.map((item) => {
    const def = widgetByKey(item.widget);
    return {
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: def?.minSize.w,
      minH: def?.minSize.h,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodPicker value={period} onChange={setPeriod} />
        <div className="ml-auto flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setLibrary(true)}>
                <PlusIcon />
                Ajouter un widget
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                <RotateCcwIcon />
                Par défaut
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(false);
                  save.mutate({ layout: items });
                }}
              >
                <CheckIcon />
                Terminer
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <LayoutGridIcon />
              Personnaliser
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Votre tableau de bord est vide.</p>
          <Button
            className="mt-3"
            size="sm"
            onClick={() => {
              setEditing(true);
              setLibrary(true);
            }}
          >
            <PlusIcon />
            Ajouter un widget
          </Button>
        </div>
      ) : null}

      <div ref={containerRef}>
        {width > 0 ? (
          <ReactGridLayout
            width={width}
            layout={layout}
            gridConfig={{ cols: COLS, rowHeight: 76, margin: [16, 16], containerPadding: [0, 0] }}
            dragConfig={{ enabled: editing, handle: ".widget-handle" }}
            resizeConfig={{ enabled: editing, handles: ["se"] }}
            compactor={verticalCompactor}
            onLayoutChange={(next) => {
              if (!editing) return;
              setItems((current) =>
                (current ?? []).map((item) => {
                  const l = next.find((n) => n.i === item.i);
                  return l ? { ...item, x: l.x, y: l.y, w: l.w, h: l.h } : item;
                }),
              );
            }}
          >
            {items.map((item) => {
              const def = widgetByKey(item.widget);
              const configurable = item.widget === "objective" || item.widget === "report";
              return (
                <section
                  key={item.i}
                  aria-label={widgetTitle(item.widget, item.config, reports)}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs",
                    editing && "ring-2 ring-primary/20",
                  )}
                >
                  <header className="flex items-center gap-1 px-4 pt-3 pb-2">
                    {editing ? (
                      <GripVerticalIcon
                        className="widget-handle size-4 cursor-grab text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                    <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
                      {widgetTitle(item.widget, item.config, reports)}
                    </h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Options du widget ${def?.label ?? ""}`}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {configurable ? (
                          <DropdownMenuItem onSelect={() => setConfiguring(item)}>
                            <Settings2Icon />
                            Configurer
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onSelect={() => persist(moveItem(items, item.i, -1))}>
                          <ArrowUpIcon />
                          Monter
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => persist(moveItem(items, item.i, 1))}>
                          <ArrowDownIcon />
                          Descendre
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            persist(
                              items.map((i) =>
                                i.i === item.i
                                  ? {
                                      ...i,
                                      w: Math.min(COLS, i.w + 3),
                                      x: Math.min(i.x, COLS - Math.min(COLS, i.w + 3)),
                                    }
                                  : i,
                              ),
                            )
                          }
                        >
                          <MaximizeIcon />
                          Élargir
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            persist(
                              items.map((i) =>
                                i.i === item.i
                                  ? { ...i, w: Math.max(def?.minSize.w ?? 2, i.w - 3) }
                                  : i,
                              ),
                            )
                          }
                        >
                          <MinimizeIcon />
                          Réduire
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => persist(items.filter((i) => i.i !== item.i))}
                        >
                          <Trash2Icon />
                          Retirer du tableau de bord
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </header>
                  <div className="min-h-0 flex-1 px-4 pb-4">
                    <WidgetBody widget={item.widget} period={period} config={item.config} />
                  </div>
                </section>
              );
            })}
          </ReactGridLayout>
        ) : null}
      </div>

      <Library
        open={library}
        onOpenChange={setLibrary}
        available={available}
        onAdd={(w) => {
          const bottom = items.reduce((max, i) => Math.max(max, i.y + i.h), 0);
          setItems([
            ...items,
            {
              i: newId(w.key),
              widget: w.key,
              x: 0,
              y: bottom,
              w: w.size.w,
              h: w.size.h,
              config: {},
            },
          ]);
          setLibrary(false);
          toast.success(`Widget « ${w.label} » ajouté.`);
        }}
      />
      <ConfigDialog
        item={configuring}
        reports={reports}
        onClose={() => setConfiguring(null)}
        onSave={(config) => {
          const next = items.map((i) => (i.i === configuring?.i ? { ...i, config } : i));
          setConfiguring(null);
          persist(next);
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Rétablir le tableau de bord par défaut ?"
        description="Vos widgets et leur disposition sont remplacés par le tableau de bord prévu pour votre rôle."
        confirmLabel="Rétablir"
        pending={reset.isPending}
        onConfirm={() => reset.mutate()}
      />
    </div>
  );
}
