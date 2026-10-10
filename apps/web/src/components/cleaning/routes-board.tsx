"use client";

import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Input } from "@quercy/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Switch } from "@quercy/ui/components/switch";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  RouteIcon,
  Trash2Icon,
} from "lucide-react";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";
import type { AppRouter } from "@/server/trpc/root";

type RouteRow = inferRouterOutputs<AppRouter>["routes"]["list"][number];
const NONE = "__none__";
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface Draft {
  id?: string;
  name: string;
  zone: string;
  mainAgentId: string;
  replacementAgentId: string;
  vehicle: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  startPoint: string;
  active: boolean;
  stops: { siteId: string; label: string; travelMinutes: string; travelKm: string }[];
}

function draftOf(r?: RouteRow): Draft {
  return {
    id: r?.id,
    name: r?.name ?? "",
    zone: r?.zone ?? "",
    mainAgentId: r?.mainAgent?.id ?? NONE,
    replacementAgentId: r?.replacementAgent?.id ?? NONE,
    vehicle: r?.vehicle ?? "",
    weekdays: r?.weekdays ?? [],
    startTime: r?.startTime ?? "",
    endTime: r?.endTime ?? "",
    startPoint: r?.startPoint ?? "",
    active: r?.active ?? true,
    stops: (r?.stops ?? []).map((s) => ({
      siteId: s.siteId,
      label: s.site.code ? `${s.site.code} · ${s.site.name}` : s.site.name,
      travelMinutes: s.travelMinutes === null ? "" : String(s.travelMinutes),
      travelKm: s.travelKm === null ? "" : String(s.travelKm).replace(".", ","),
    })),
  };
}

/** Tournées : sites dans l'ordre, agent principal et remplaçant, jours, horaires, trajets. */
export function RoutesBoard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const list = useQuery(trpc.routes.list.queryOptions());
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const archive = useMutation(
    trpc.routes.archive.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.routes.list.queryKey() }),
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  if (list.isPending) return <Skeleton className="h-48" />;
  if (list.error) return <Callout variant="warning">{errorMessage(list.error)}</Callout>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => setDraft(draftOf())}>
          <PlusIcon aria-hidden /> Nouvelle tournée
        </Button>
      </div>
      {list.data.length === 0 ? (
        <EmptyState
          icon={<RouteIcon />}
          title="Aucune tournée"
          description="Regroupez les sites d'un agent dans l'ordre de passage, avec ses jours, ses horaires et le temps de trajet entre chaque site."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.data.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                <span className="font-medium">{r.name}</span>
                {r.active ? null : <Badge variant="neutral">Inactive</Badge>}
                {r.zone ? <span className="text-xs text-muted-foreground">{r.zone}</span> : null}
                <span className="ml-auto flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Modifier ${r.name}`}
                    onClick={() => setDraft(draftOf(r))}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Retirer ${r.name}`}
                    onClick={() => {
                      if (confirm(`Retirer la tournée « ${r.name} » ?`))
                        archive.mutate({ id: r.id });
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </span>
              </div>
              <div className="space-y-2 p-3 text-sm">
                <p className="text-muted-foreground">
                  {[
                    r.mainAgent?.name,
                    r.replacementAgent ? `remplaçant : ${r.replacementAgent.name}` : null,
                    r.weekdays.length ? r.weekdays.map((d) => WEEKDAYS[d - 1]).join(", ") : null,
                    r.startTime && r.endTime ? `${r.startTime} – ${r.endTime}` : r.startTime,
                    r.vehicle,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Agent et horaires à définir"}
                </p>
                {r.startPoint ? <p>Départ : {r.startPoint}</p> : null}
                <ol className="space-y-0.5">
                  {r.stops.map((s, i) => (
                    <li key={s.siteId} className="flex gap-2">
                      <span className="w-5 text-right text-muted-foreground tabular-nums">
                        {i + 1}.
                      </span>
                      <span className="flex-1">
                        {s.site.code ? `${s.site.code} · ` : ""}
                        {s.site.name}
                        {s.site.city ? (
                          <span className="text-muted-foreground"> — {s.site.city}</span>
                        ) : null}
                      </span>
                      {s.travelMinutes !== null || s.travelKm !== null ? (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {[
                            s.travelMinutes !== null ? `${s.travelMinutes} min` : null,
                            s.travelKm !== null ? `${s.travelKm.toLocaleString("fr-FR")} km` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">
                  {r.totals.stops} site{r.totals.stops > 1 ? "s" : ""} · trajets{" "}
                  {r.totals.travelMinutes} min ·{" "}
                  {r.totals.travelKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {draft ? (
        <RouteDialog draft={draft} onChange={setDraft} onClose={() => setDraft(null)} />
      ) : null}
    </div>
  );
}

function RouteDialog({
  draft,
  onChange,
  onClose,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const agents = useQuery(trpc.records.options.queryOptions({ kind: "user" }));
  const [search, setSearch] = React.useState("");
  const sites = useQuery(trpc.records.options.queryOptions({ kind: "site", search }));
  const [pick, setPick] = React.useState("");
  const save = useMutation(
    trpc.routes.save.mutationOptions({
      onSuccess: () => {
        toast.success("Tournée enregistrée.");
        void queryClient.invalidateQueries({ queryKey: trpc.routes.list.queryKey() });
        onClose();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const move = (i: number, delta: number) => {
    const stops = [...draft.stops];
    const [s] = stops.splice(i, 1);
    stops.splice(i + delta, 0, s!);
    set({ stops });
  };
  const agentSelect = (id: string, label: string, key: "mainAgentId" | "replacementAgentId") => (
    <FormField id={id} label={label}>
      <Select value={draft[key]} onValueChange={(v) => set({ [key]: v })}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Aucun</SelectItem>
          {(agents.data ?? []).map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Modifier la tournée" : "Nouvelle tournée"}</DialogTitle>
          <DialogDescription>
            Les sites dans l&apos;ordre de passage, avec le trajet depuis l&apos;étape précédente.
            L&apos;optimisation automatique viendra plus tard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="route-name" label="Nom">
            <Input
              id="route-name"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </FormField>
          <FormField id="route-zone" label="Zone">
            <Input
              id="route-zone"
              value={draft.zone}
              onChange={(e) => set({ zone: e.target.value })}
            />
          </FormField>
          {agentSelect("route-main", "Agent principal", "mainAgentId")}
          {agentSelect("route-replacement", "Remplaçant", "replacementAgentId")}
          <FormField id="route-vehicle" label="Véhicule">
            <Input
              id="route-vehicle"
              value={draft.vehicle}
              onChange={(e) => set({ vehicle: e.target.value })}
            />
          </FormField>
          <FormField id="route-start-point" label="Point de départ">
            <Input
              id="route-start-point"
              value={draft.startPoint}
              onChange={(e) => set({ startPoint: e.target.value })}
            />
          </FormField>
          <FormField id="route-start" label="Départ">
            <Input
              id="route-start"
              type="time"
              value={draft.startTime}
              onChange={(e) => set({ startTime: e.target.value })}
            />
          </FormField>
          <FormField id="route-end" label="Fin">
            <Input
              id="route-end"
              type="time"
              value={draft.endTime}
              onChange={(e) => set({ endTime: e.target.value })}
            />
          </FormField>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm font-medium">Jours habituels</span>
          {WEEKDAYS.map((d, i) => {
            const on = draft.weekdays.includes(i + 1);
            return (
              <Button
                key={d}
                size="sm"
                variant={on ? "primary" : "secondary"}
                aria-pressed={on}
                onClick={() =>
                  set({
                    weekdays: on
                      ? draft.weekdays.filter((x) => x !== i + 1)
                      : [...draft.weekdays, i + 1],
                  })
                }
              >
                {d}
              </Button>
            );
          })}
          <label className="ml-auto flex items-center gap-2 text-sm">
            <Switch checked={draft.active} onCheckedChange={(v) => set({ active: v })} /> Active
          </label>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Sites ({draft.stops.length})</h4>
          {draft.stops.length ? (
            <ol className="divide-y rounded-md border border-border text-sm">
              {draft.stops.map((s, i) => (
                <li key={s.siteId} className="flex flex-wrap items-center gap-2 p-2">
                  <span className="w-5 text-right text-muted-foreground tabular-nums">
                    {i + 1}.
                  </span>
                  <span className="min-w-40 flex-1">{s.label}</span>
                  <Input
                    aria-label={`Trajet en minutes vers ${s.label}`}
                    inputMode="numeric"
                    placeholder="min"
                    className="h-8 w-20"
                    value={s.travelMinutes}
                    onChange={(e) =>
                      set({
                        stops: draft.stops.map((x, k) =>
                          k === i ? { ...x, travelMinutes: e.target.value.replace(/\D/g, "") } : x,
                        ),
                      })
                    }
                  />
                  <Input
                    aria-label={`Distance en km vers ${s.label}`}
                    inputMode="decimal"
                    placeholder="km"
                    className="h-8 w-20"
                    value={s.travelKm}
                    onChange={(e) =>
                      set({
                        stops: draft.stops.map((x, k) =>
                          k === i ? { ...x, travelKm: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Monter"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Descendre"
                    disabled={i === draft.stops.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Retirer ${s.label}`}
                    onClick={() => set({ stops: draft.stops.filter((_, k) => k !== i) })}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <Input
              aria-label="Chercher un site"
              placeholder="Chercher un site…"
              className="w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger className="w-72" aria-label="Site à ajouter">
                <SelectValue placeholder="Choisir le site" />
              </SelectTrigger>
              <SelectContent>
                {(sites.data ?? [])
                  .filter((o) => !draft.stops.some((s) => s.siteId === o.value))
                  .map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!pick}
              onClick={() => {
                const o = sites.data?.find((x) => x.value === pick);
                if (!o) return;
                set({
                  stops: [
                    ...draft.stops,
                    { siteId: o.value, label: o.label, travelMinutes: "", travelKm: "" },
                  ],
                });
                setPick("");
              }}
            >
              <PlusIcon aria-hidden /> Ajouter
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                id: draft.id,
                name: draft.name,
                zone: draft.zone,
                mainAgentId: draft.mainAgentId === NONE ? null : draft.mainAgentId,
                replacementAgentId:
                  draft.replacementAgentId === NONE ? null : draft.replacementAgentId,
                vehicle: draft.vehicle,
                weekdays: draft.weekdays,
                startTime: draft.startTime || null,
                endTime: draft.endTime || null,
                startPoint: draft.startPoint,
                active: draft.active,
                notes: null,
                stops: draft.stops.map((s) => ({
                  siteId: s.siteId,
                  travelMinutes: s.travelMinutes ? Number(s.travelMinutes) : null,
                  travelKm: s.travelKm ? Number(s.travelKm.replace(",", ".")) : null,
                })),
              })
            }
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
