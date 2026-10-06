"use client";

import { todayIn } from "@quercy/core";
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
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@quercy/ui/components/tabs";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { AlertTriangleIcon, CalendarSyncIcon, CheckIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { errorMessage, useTRPC } from "@/lib/trpc";
import type { AppRouter } from "@/server/trpc/root";

import { type RuleDraft, RuleEditor } from "./rule-editor";

type Series = inferRouterOutputs<AppRouter>["recurrence"]["list"]["series"][number];

const STATUS_LABEL: Record<string, string> = {
  proposed: "À valider",
  active: "Active",
  paused: "En pause",
  ended: "Terminée",
};

const shortDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function draftOf(s: Series, effectiveFrom?: string): RuleDraft {
  return {
    rule: s.current.rule,
    effectiveFrom: effectiveFrom ?? s.current.effectiveFrom,
    startTime: s.current.startTime ?? "",
    durationMinutes: s.current.durationMinutes ? String(s.current.durationMinutes) : "",
    plannedAgentId: s.current.plannedAgentId ?? "",
    holidayPolicy: s.holidayPolicy as RuleDraft["holidayPolicy"],
    holidayCalendar: s.holidayCalendar as RuleDraft["holidayCalendar"],
  };
}

/** Récurrences : séries à valider (import), actives, en pause ; règles et versions. */
export function SeriesBoard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const list = useQuery(trpc.recurrence.list.queryOptions({}));
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [editing, setEditing] = React.useState<{ series: Series; mode: "fix" | "version" } | null>(
    null,
  );
  const [draft, setDraft] = React.useState<RuleDraft | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.recurrence.list.queryKey() });
  const validate = useMutation(
    trpc.recurrence.validate.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          `${r.validated} récurrence${r.validated > 1 ? "s" : ""} validée${r.validated > 1 ? "s" : ""} : ${r.created} passage${r.created > 1 ? "s" : ""} planifié${r.created > 1 ? "s" : ""}.`,
        );
        setSelected(new Set());
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const updateProposal = useMutation(
    trpc.recurrence.updateProposal.mutationOptions({
      onSuccess: () => {
        toast.success("Règle enregistrée.");
        setEditing(null);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const newVersion = useMutation(
    trpc.recurrence.newVersion.mutationOptions({
      onSuccess: (r) => {
        toast.success(`Version ${r.version} enregistrée : ${r.created} passage(s) replanifié(s).`);
        setEditing(null);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const setStatus = useMutation(
    trpc.recurrence.setStatus.mutationOptions({
      onSuccess: () => refresh(),
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  if (list.isLoading) return <Skeleton className="h-64 w-full" />;
  if (list.error) return <Callout variant="danger">{errorMessage(list.error)}</Callout>;
  const all = list.data?.series ?? [];
  const agents = list.data?.agents ?? [];
  const groups = {
    proposed: all.filter((s) => s.status === "proposed"),
    active: all.filter((s) => s.status === "active"),
    other: all.filter((s) => s.status === "paused" || s.status === "ended"),
  };

  function open(series: Series, mode: "fix" | "version") {
    setEditing({ series, mode });
    setDraft(draftOf(series, mode === "version" ? todayIn() : undefined));
  }

  function save() {
    if (!editing || !draft?.rule) return;
    const common = {
      seriesId: editing.series.id,
      rule: draft.rule,
      effectiveFrom: draft.effectiveFrom,
      startTime: draft.startTime || null,
      durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : null,
      plannedAgentId: draft.plannedAgentId || null,
    };
    if (editing.mode === "fix")
      updateProposal.mutate({
        ...common,
        holidayPolicy: draft.holidayPolicy,
        holidayCalendar: draft.holidayCalendar,
      });
    else newVersion.mutate(common);
  }

  const row = (s: Series, selectable: boolean) => (
    <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
      {selectable ? (
        <input
          type="checkbox"
          aria-label={`Sélectionner ${s.site.name}`}
          className="mt-1 size-4 accent-[var(--primary)]"
          disabled={!s.current.rule}
          checked={selected.has(s.id)}
          onChange={() =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(s.id)) next.delete(s.id);
              else next.add(s.id);
              return next;
            })
          }
        />
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {s.site.code ? <Badge variant="outline">{s.site.code}</Badge> : null}
          <span className="font-medium">{s.site.name}</span>
          <span className="text-sm text-muted-foreground">
            {s.serviceLine.name}
            {s.site.city ? ` · ${s.site.city}` : ""}
            {s.site.company ? ` · ${s.site.company.name}` : ""}
          </span>
          {s.status !== "proposed" ? (
            <Badge variant={s.status === "active" ? "success" : "neutral"}>
              {STATUS_LABEL[s.status]}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm">
          <span className="font-medium">{s.current.description}</span>
          {s.current.startTime ? ` à ${s.current.startTime}` : ""}
          {s.current.durationMinutes ? ` · ${s.current.durationMinutes} min` : ""}
          {` · ${s.current.agentName ?? "intervenant non affecté"}`}
          {s.current.version > 1
            ? ` · version ${s.current.version} depuis le ${shortDate(s.current.effectiveFrom)}`
            : ""}
        </p>
        {s.next.length ? (
          <p className="text-xs text-muted-foreground">
            Prochains passages : {s.next.map(shortDate).join(" · ")}
          </p>
        ) : null}
        {s.status === "proposed" && s.current.note ? (
          <p className="flex items-start gap-1.5 text-xs text-warning-text">
            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {s.current.note}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1.5">
        {s.status === "proposed" ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => open(s, "fix")}>
              Corriger
            </Button>
            <Button
              size="sm"
              disabled={!s.current.rule || validate.isPending}
              onClick={() => validate.mutate({ seriesIds: [s.id] })}
            >
              <CheckIcon aria-hidden /> Valider
            </Button>
          </>
        ) : s.status === "active" ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => open(s, "version")}>
              Changer la règle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatus.mutate({ seriesId: s.id, status: "paused" })}
            >
              Pause
            </Button>
          </>
        ) : s.status === "paused" ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStatus.mutate({ seriesId: s.id, status: "active" })}
          >
            Reprendre
          </Button>
        ) : null}
      </div>
    </li>
  );

  if (all.length === 0)
    return (
      <EmptyState
        icon={<CalendarSyncIcon />}
        title="Aucune récurrence pour l'instant"
        description="Importez votre fichier Excel de pilotage : chaque site reçoit une règle proposée, à valider ici."
        action={
          <Button asChild>
            <Link href="/nettoyage/import-excel">Importer le fichier Excel</Link>
          </Button>
        }
      />
    );

  return (
    <>
      <Tabs defaultValue={groups.proposed.length ? "proposed" : "active"}>
        <TabsList>
          <TabsTrigger value="proposed">À valider ({groups.proposed.length})</TabsTrigger>
          <TabsTrigger value="active">Actives ({groups.active.length})</TabsTrigger>
          <TabsTrigger value="other">En pause ou terminées ({groups.other.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="proposed" className="space-y-3">
          {groups.proposed.length ? (
            <>
              <Callout variant="info">
                Ces règles ont été <strong>proposées</strong> d&apos;après votre fichier : rien
                n&apos;est planifié tant qu&apos;elles ne sont pas validées. Vérifiez surtout les
                lignes signalées, corrigez si besoin, puis validez.
              </Callout>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setSelected(
                      new Set(groups.proposed.filter((s) => s.current.rule).map((s) => s.id)),
                    )
                  }
                >
                  Tout sélectionner
                </Button>
                <Button
                  size="sm"
                  disabled={selected.size === 0 || validate.isPending}
                  onClick={() => validate.mutate({ seriesIds: [...selected] })}
                >
                  <CheckIcon aria-hidden /> Valider la sélection ({selected.size})
                </Button>
              </div>
            </>
          ) : null}
          <ul className="divide-y">{groups.proposed.map((s) => row(s, true))}</ul>
        </TabsContent>
        <TabsContent value="active">
          <ul className="divide-y">{groups.active.map((s) => row(s, false))}</ul>
        </TabsContent>
        <TabsContent value="other">
          <ul className="divide-y">{groups.other.map((s) => row(s, false))}</ul>
        </TabsContent>
      </Tabs>

      <Dialog open={editing !== null} onOpenChange={(o) => (!o ? setEditing(null) : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.mode === "version" ? "Changer la règle" : "Corriger la règle proposée"} —{" "}
              {editing?.series.site.name}
            </DialogTitle>
            <DialogDescription>
              {editing?.mode === "version"
                ? "Une nouvelle version s'applique à partir de la date choisie. Les passages réalisés ou commencés ne bougent pas ; les passages futurs encore intacts sont recalculés."
                : "Rien n'est encore planifié : la règle sera appliquée à la validation."}
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <RuleEditor
              draft={draft}
              onChange={setDraft}
              agents={agents}
              dateLabel={editing?.mode === "version" ? "Nouvelle règle à partir du" : "À partir du"}
            />
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button
              onClick={save}
              disabled={!draft?.rule || updateProposal.isPending || newVersion.isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
