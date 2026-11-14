"use client";

import { ABSENCE_KINDS, type AbsenceKind, RANK_LABELS } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Checkbox } from "@quercy/ui/components/checkbox";
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
import { Tabs, TabsList, TabsTrigger } from "@quercy/ui/components/tabs";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOffIcon, PlusIcon, TriangleAlertIcon, UsersIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";

const STATUS_VARIANT: Record<string, "warning" | "success" | "neutral"> = {
  requested: "warning",
  approved: "success",
  rejected: "neutral",
  cancelled: "neutral",
};

const frDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
const range = (start: string, end: string) =>
  start === end ? `le ${frDay(start)}` : `du ${frDay(start)} au ${frDay(end)}`;

/**
 * Absences : demandées par les agents (application ou logiciel), validées par le chef ; pour
 * une absence validée, les passages touchés et les remplaçants proposés dans l'ordre.
 */
export function AbsencesBoard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const focus = useSearchParams().get("id");
  const [status, setStatus] = React.useState<"open" | "all">("open");
  const list = useQuery(trpc.absences.list.queryOptions({ status }));
  const [declaring, setDeclaring] = React.useState(false);
  const [impactFor, setImpactFor] = React.useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.absences.list.queryKey() });
  const onError = (e: unknown) => toast.error(errorMessage(e));
  const decide = useMutation(
    trpc.absences.decide.mutationOptions({
      onSuccess: (_, v) => {
        toast.success(v.approve ? "Absence validée." : "Absence refusée.");
        void refresh();
        if (v.approve) setImpactFor(v.id);
      },
      onError,
    }),
  );
  const cancel = useMutation(
    trpc.absences.cancel.mutationOptions({ onSuccess: () => void refresh(), onError }),
  );

  if (list.isPending) return <Skeleton className="h-48" />;
  if (list.error) return <Callout variant="warning">{errorMessage(list.error)}</Callout>;
  const { absences, canManage, members } = list.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(v) => setStatus(v as "open" | "all")}>
          <TabsList>
            <TabsTrigger value="open">En cours et à venir</TabsTrigger>
            <TabsTrigger value="all">Historique</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" variant="secondary" onClick={() => setDeclaring(true)}>
          <PlusIcon aria-hidden /> {canManage ? "Déclarer une absence" : "Demander une absence"}
        </Button>
      </div>

      {absences.length === 0 ? (
        <EmptyState
          icon={<CalendarOffIcon />}
          title="Aucune absence"
          description="Les agents demandent leurs absences depuis l'application terrain ou ici ; le chef les valide puis organise les remplacements."
        />
      ) : (
        <ul className="space-y-2">
          {absences.map((a) => (
            <li
              key={a.id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-sm ${a.id === focus ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{a.user.name}</span>
                  <span>
                    {a.kindLabel} {range(a.start, a.end)}
                  </span>
                  <Badge variant={STATUS_VARIANT[a.status] ?? "neutral"}>{a.statusLabel}</Badge>
                  {a.source === "app" ? (
                    <span className="text-xs text-muted-foreground">depuis l&apos;application</span>
                  ) : null}
                </p>
                {a.comment ? <p className="text-muted-foreground">{a.comment}</p> : null}
                {a.decidedBy ? (
                  <p className="text-xs text-muted-foreground">
                    {a.status === "approved" ? "Validée" : "Traitée"} par {a.decidedBy}
                    {a.decisionNote ? ` — ${a.decisionNote}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {canManage && a.status === "requested" ? (
                  <>
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: a.id, approve: true })}
                    >
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={decide.isPending}
                      onClick={() => {
                        const note = prompt("Motif du refus (facultatif) :") ?? undefined;
                        decide.mutate({ id: a.id, approve: false, note: note || undefined });
                      }}
                    >
                      Refuser
                    </Button>
                  </>
                ) : null}
                {canManage && a.status === "approved" ? (
                  <Button size="sm" variant="secondary" onClick={() => setImpactFor(a.id)}>
                    <UsersIcon aria-hidden /> Remplacements
                  </Button>
                ) : null}
                {a.status === "requested" || (canManage && a.status === "approved") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={cancel.isPending}
                    onClick={() => {
                      if (confirm("Annuler cette absence ?")) cancel.mutate({ id: a.id });
                    }}
                  >
                    Annuler
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DeclareDialog
        open={declaring}
        onOpenChange={setDeclaring}
        members={canManage ? members : []}
        onDone={refresh}
      />
      {impactFor ? <ImpactDialog absenceId={impactFor} onClose={() => setImpactFor(null)} /> : null}
    </div>
  );
}

function DeclareDialog({
  open,
  onOpenChange,
  members,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: { id: string; name: string }[];
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = React.useState({
    userId: "",
    kind: "leave" as AbsenceKind,
    start: today,
    end: today,
    comment: "",
  });
  const create = useMutation(
    trpc.absences.create.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          r.status === "approved" ? "Absence enregistrée." : "Demande envoyée au responsable.",
        );
        onOpenChange(false);
        onDone();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {members.length ? "Déclarer une absence" : "Demander une absence"}
          </DialogTitle>
          <DialogDescription>
            {members.length
              ? "Saisie par un responsable, l'absence est validée tout de suite ; vous organisez ensuite les remplacements."
              : "Votre responsable valide la demande et organise votre remplacement."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {members.length ? (
            <FormField id="absence-agent" label="Agent">
              <Select value={form.userId} onValueChange={(userId) => setForm({ ...form, userId })}>
                <SelectTrigger id="absence-agent">
                  <SelectValue placeholder="Choisir l'agent" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
          <FormField id="absence-kind" label="Type">
            <Select
              value={form.kind}
              onValueChange={(kind) => setForm({ ...form, kind: kind as AbsenceKind })}
            >
              <SelectTrigger id="absence-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ABSENCE_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="absence-start" label="Du">
              <Input
                id="absence-start"
                type="date"
                value={form.start}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start: e.target.value,
                    end: form.end < e.target.value ? e.target.value : form.end,
                  })
                }
              />
            </FormField>
            <FormField id="absence-end" label="Au (inclus)">
              <Input
                id="absence-end"
                type="date"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
              />
            </FormField>
          </div>
          <FormField id="absence-comment" label="Commentaire">
            <Input
              id="absence-comment"
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={create.isPending || (members.length > 0 && !form.userId)}
            onClick={() =>
              create.mutate({
                userId: form.userId || undefined,
                kind: form.kind,
                start: form.start,
                end: form.end,
                comment: form.comment || undefined,
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

function ImpactDialog({ absenceId, onClose }: { absenceId: string; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const impact = useQuery(trpc.absences.impact.queryOptions({ id: absenceId }));
  const [choice, setChoice] = React.useState<Record<string, string>>({});
  const [skipped, setSkipped] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    if (!impact.data) return;
    setChoice(
      Object.fromEntries(
        impact.data.visits
          .filter((v) => v.suggestedAgentId)
          .map((v) => [v.id, v.suggestedAgentId!]),
      ),
    );
  }, [impact.data]);
  const assign = useMutation(
    trpc.absences.assign.mutationOptions({
      onSuccess: (r) => {
        toast.success(`${r.assigned} passage(s) confiés ; les remplaçants sont prévenus.`);
        void queryClient.invalidateQueries({ queryKey: trpc.absences.impact.queryKey() });
        onClose();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const visits = impact.data?.visits ?? [];
  const selected = visits.filter((v) => choice[v.id] && !skipped.has(v.id));

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Remplacements — {impact.data?.absence.user.name}</DialogTitle>
          <DialogDescription>
            {impact.data?.absence.summary}. Proposés dans l&apos;ordre : remplaçant n°1, n°2, agent
            qualifié, puis sous-traitant. Le remplaçant reçoit la fiche du site et ses accès, et
            seulement eux.
          </DialogDescription>
        </DialogHeader>
        {impact.isPending ? (
          <Skeleton className="h-32" />
        ) : visits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun passage à remplacer sur cette période.
          </p>
        ) : (
          <ul className="divide-y rounded-md border border-border text-sm">
            {visits.map((v) => {
              const picked = v.proposals.find((p) => p.agentId === choice[v.id]);
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-3 p-2.5">
                  <Checkbox
                    aria-label={`Remplacer le passage du ${v.day}`}
                    checked={!skipped.has(v.id) && Boolean(choice[v.id])}
                    disabled={!v.proposals.length}
                    onCheckedChange={(on) =>
                      setSkipped((s) => {
                        const next = new Set(s);
                        if (on) next.delete(v.id);
                        else next.add(v.id);
                        return next;
                      })
                    }
                  />
                  <div className="min-w-48 flex-1">
                    <p className="font-medium">
                      {frDay(v.day)}
                      {v.startTime ? ` · ${v.startTime}` : ""} —{" "}
                      {v.site
                        ? v.site.code
                          ? `${v.site.code} · ${v.site.name}`
                          : v.site.name
                        : v.title}
                    </p>
                    {picked?.conflict ? (
                      <p className="flex items-center gap-1 text-xs text-warning-text">
                        <TriangleAlertIcon className="size-3.5" aria-hidden /> Déjà prévu à cette
                        heure
                      </p>
                    ) : null}
                  </div>
                  {v.proposals.length ? (
                    <Select
                      value={choice[v.id] ?? ""}
                      onValueChange={(agentId) => setChoice({ ...choice, [v.id]: agentId })}
                    >
                      <SelectTrigger className="w-80" aria-label="Remplaçant">
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent>
                        {v.proposals.map((p) => (
                          <SelectItem key={p.agentId} value={p.agentId}>
                            {p.name} — {RANK_LABELS[p.rank]}
                            {p.knowsSite ? " · connaît le site" : ""}
                            {p.conflict ? " · déjà pris" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">Personne de disponible</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button
            disabled={!selected.length || assign.isPending}
            onClick={() =>
              assign.mutate({
                absenceId,
                assignments: selected.map((v) => ({
                  interventionId: v.id,
                  agentId: choice[v.id]!,
                })),
              })
            }
          >
            Confirmer {selected.length ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
