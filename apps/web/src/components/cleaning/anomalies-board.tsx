"use client";

import {
  ANOMALY_SEVERITIES,
  ANOMALY_STATUSES,
  FIELD_ANOMALY_TYPES,
  type AnomalySeverity,
  SYSTEM_ANOMALY_TYPES,
  anomalyClientEligible,
  recordPath,
} from "@quercy/core";
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
import { Tabs, TabsList, TabsTrigger } from "@quercy/ui/components/tabs";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { CheckCircle2Icon, PlusIcon, ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";
import type { AppRouter } from "@/server/trpc/root";

type Anomaly = inferRouterOutputs<AppRouter>["anomalies"]["list"]["anomalies"][number];
type Filter = "open" | "reported" | "resolved" | "rejected" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "À traiter" },
  { value: "reported", label: "À valider" },
  { value: "resolved", label: "Résolues" },
  { value: "rejected", label: "Rejetées" },
  { value: "all", label: "Toutes" },
];

const STATUS_LABEL = Object.fromEntries(ANOMALY_STATUSES.map((s) => [s.value, s.label]));
const STATUS_VARIANT: Record<string, "warning" | "info" | "primary" | "success" | "neutral"> = {
  reported: "warning",
  validated: "info",
  in_progress: "primary",
  resolved: "success",
  rejected: "neutral",
};
const SEVERITY_LABEL = Object.fromEntries(ANOMALY_SEVERITIES.map((s) => [s.value, s.label]));
const ALL_TYPES = [...FIELD_ANOMALY_TYPES, ...SYSTEM_ANOMALY_TYPES];

const when = (d: Date | string) =>
  new Date(d).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

interface Fields {
  type: string;
  location: string;
  comment: string;
  severity: AnomalySeverity;
}
interface Correction extends Fields {
  id: string;
}

/**
 * Circuit des anomalies : signalées par les agents ou détectées, elles arrivent ici « à
 * valider ». Le responsable valide, rejette, corrige, prend en charge et résout ; seule une
 * anomalie validée peut être rendue visible du client.
 */
export function AnomaliesBoard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const focus = useSearchParams().get("id");
  const [filter, setFilter] = React.useState<Filter>(focus ? "all" : "open");
  const list = useQuery(trpc.anomalies.list.queryOptions({ status: filter }));
  const [correcting, setCorrecting] = React.useState<Correction | null>(null);
  const [closing, setClosing] = React.useState<{
    id: string;
    action: "resolve" | "reject";
  } | null>(null);
  const [note, setNote] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.anomalies.list.queryKey() });
  const onError = (e: unknown) => toast.error(errorMessage(e));
  const act = useMutation(
    trpc.anomalies.act.mutationOptions({
      onSuccess: (_, v) => {
        toast.success(
          {
            validate: "Anomalie validée.",
            reject: "Anomalie rejetée.",
            start: "Anomalie prise en charge.",
            resolve: "Anomalie résolue.",
            reopen: "Anomalie rouverte.",
          }[v.action],
        );
        setClosing(null);
        setNote("");
        void refresh();
      },
      onError,
    }),
  );
  const update = useMutation(
    trpc.anomalies.update.mutationOptions({
      onSuccess: () => {
        toast.success("Anomalie corrigée.");
        setCorrecting(null);
        void refresh();
      },
      onError,
    }),
  );
  const visibility = useMutation(
    trpc.anomalies.setClientVisibility.mutationOptions({
      onSuccess: () => void refresh(),
      onError,
    }),
  );

  React.useEffect(() => {
    if (focus && list.data)
      document.getElementById(`anomalie-${focus}`)?.scrollIntoView({ block: "center" });
  }, [focus, list.data]);

  const counts = list.data?.counts ?? {};
  const open = (counts.reported ?? 0) + (counts.validated ?? 0) + (counts.in_progress ?? 0);
  const countOf = (f: Filter) => (f === "open" ? open : f === "all" ? undefined : (counts[f] ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
                {countOf(f.value) ? (
                  <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                    {countOf(f.value)}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
          <PlusIcon aria-hidden /> Nouvelle anomalie
        </Button>
      </div>

      {list.isPending ? (
        <Skeleton className="h-48" />
      ) : list.error ? (
        <Callout variant="warning">{errorMessage(list.error)}</Callout>
      ) : list.data.anomalies.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2Icon />}
          title="Rien à traiter"
          description="Les anomalies signalées par les agents depuis l'application, ou détectées automatiquement (passage non pointé, durée anormale, point critique non fait…), arrivent ici."
        />
      ) : (
        <ul className="space-y-2">
          {list.data.anomalies.map((a) => (
            <AnomalyCard
              key={a.id}
              anomaly={a}
              highlighted={a.id === focus}
              busy={act.isPending || visibility.isPending}
              onAct={(action) => {
                if (action === "resolve" || action === "reject") {
                  setNote("");
                  setClosing({ id: a.id, action });
                } else act.mutate({ id: a.id, action });
              }}
              onCorrect={() =>
                setCorrecting({
                  id: a.id,
                  type: a.type,
                  location: a.location ?? "",
                  comment: a.comment ?? "",
                  severity: a.severity as AnomalySeverity,
                })
              }
              onVisibility={(visible) => visibility.mutate({ id: a.id, visible })}
            />
          ))}
        </ul>
      )}

      <Dialog open={closing !== null} onOpenChange={(o) => (!o ? setClosing(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {closing?.action === "resolve" ? "Résoudre l'anomalie" : "Rejeter l'anomalie"}
            </DialogTitle>
            <DialogDescription>
              {closing?.action === "resolve"
                ? "Ce qui a été fait (ampoule changée, encombrants enlevés, syndic prévenu…). Cela restera dans l'historique."
                : "Une anomalie rejetée n'apparaîtra jamais côté client. Vous pouvez dire pourquoi."}
            </DialogDescription>
          </DialogHeader>
          <FormField
            id="anomaly-note"
            label={closing?.action === "resolve" ? "Action menée" : "Motif"}
          >
            <Textarea
              id="anomaly-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setClosing(null)}>
              Annuler
            </Button>
            <Button
              disabled={act.isPending || (closing?.action === "resolve" && !note.trim())}
              onClick={() =>
                closing &&
                act.mutate({ id: closing.id, action: closing.action, note: note || undefined })
              }
            >
              {closing?.action === "resolve" ? "Marquer résolue" : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={correcting !== null} onOpenChange={(o) => (!o ? setCorrecting(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corriger l&apos;anomalie</DialogTitle>
            <DialogDescription>
              Précisez le type, l&apos;emplacement ou la description avant de la valider.
            </DialogDescription>
          </DialogHeader>
          {correcting ? (
            <AnomalyFields
              value={correcting}
              onChange={(v) => setCorrecting({ ...correcting, ...v })}
            />
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCorrecting(null)}>
              Annuler
            </Button>
            <Button
              disabled={update.isPending}
              onClick={() => correcting && update.mutate(correcting)}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateAnomalyDialog open={creating} onOpenChange={setCreating} onCreated={refresh} />
    </div>
  );
}

function AnomalyCard({
  anomaly: a,
  highlighted,
  busy,
  onAct,
  onCorrect,
  onVisibility,
}: {
  anomaly: Anomaly;
  highlighted: boolean;
  busy: boolean;
  onAct: (action: "validate" | "reject" | "start" | "resolve" | "reopen") => void;
  onCorrect: () => void;
  onVisibility: (visible: boolean) => void;
}) {
  const openStatus = ["reported", "validated", "in_progress"].includes(a.status);
  return (
    <li
      id={`anomalie-${a.id}`}
      className={`flex gap-3 rounded-lg border bg-card p-3 ${highlighted ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
    >
      {a.photoUrl ? (
        <a href={a.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- lien signé et expirant */}
          <img
            src={a.photoUrl}
            alt={`Photo : ${a.typeLabel}`}
            className="size-20 rounded-md border border-border object-cover"
          />
        </a>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1.5 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{a.typeLabel}</span>
          <Badge variant={STATUS_VARIANT[a.status] ?? "neutral"}>
            {STATUS_LABEL[a.status] ?? a.status}
          </Badge>
          {a.severity === "high" || a.severity === "critical" ? (
            <Badge variant="danger">{SEVERITY_LABEL[a.severity]}</Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">{a.sourceLabel}</span>
        </div>
        <p className="text-muted-foreground">
          {a.site ? (
            <Link href={recordPath("site", a.site.id)} className="text-primary hover:underline">
              {a.site.code ? `${a.site.code} · ` : ""}
              {a.site.name}
            </Link>
          ) : (
            "Site non précisé"
          )}
          {a.location ? ` — ${a.location}` : ""}
        </p>
        {a.comment ? <p className="whitespace-pre-line">{a.comment}</p> : null}
        {a.resolution ? (
          <p className="text-success-text">
            <CheckCircle2Icon className="mr-1 inline size-3.5" aria-hidden />
            {a.resolution}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Signalée le {when(a.reportedAt)}
          {a.reportedBy ? ` par ${a.reportedBy}` : ""}
          {a.intervention ? (
            <>
              {" · "}
              <Link
                href={recordPath("intervention", a.intervention.id)}
                className="hover:underline"
              >
                {a.intervention.reportNumber ?? a.intervention.title}
              </Link>
            </>
          ) : null}
          {a.validatedBy ? ` · validée par ${a.validatedBy}` : ""}
          {a.resolvedBy ? ` · résolue par ${a.resolvedBy}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {a.status === "reported" ? (
            <Button size="sm" disabled={busy} onClick={() => onAct("validate")}>
              Valider
            </Button>
          ) : null}
          {a.status === "validated" ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAct("start")}>
              Prendre en charge
            </Button>
          ) : null}
          {a.status === "validated" || a.status === "in_progress" ? (
            <Button size="sm" disabled={busy} onClick={() => onAct("resolve")}>
              Résoudre…
            </Button>
          ) : null}
          {openStatus ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onCorrect}>
              Corriger
            </Button>
          ) : null}
          {a.status === "reported" || a.status === "validated" ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAct("reject")}>
              Rejeter
            </Button>
          ) : null}
          {a.status === "resolved" || a.status === "rejected" ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAct("reopen")}>
              Rouvrir
            </Button>
          ) : null}
          {anomalyClientEligible(a.status) ? (
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={a.visibleToClient}
                disabled={busy}
                onCheckedChange={(v) => onVisibility(v)}
                aria-label="Visible par le client"
              />
              Visible par le client
            </label>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldAlertIcon className="size-3.5" aria-hidden /> Interne
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function AnomalyFields({
  value,
  onChange,
}: {
  value: Fields;
  onChange: (v: Partial<Fields>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="anomaly-type" label="Type">
          <Select value={value.type} onValueChange={(type) => onChange({ type })}>
            <SelectTrigger id="anomaly-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="anomaly-severity" label="Gravité">
          <Select
            value={value.severity}
            onValueChange={(severity) => onChange({ severity: severity as AnomalySeverity })}
          >
            <SelectTrigger id="anomaly-severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANOMALY_SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <FormField id="anomaly-location" label="Emplacement">
        <Input
          id="anomaly-location"
          value={value.location}
          placeholder="Ex. hall, 2e étage, local poubelles"
          onChange={(e) => onChange({ location: e.target.value })}
        />
      </FormField>
      <FormField id="anomaly-comment" label="Description">
        <Textarea
          id="anomaly-comment"
          rows={3}
          value={value.comment}
          onChange={(e) => onChange({ comment: e.target.value })}
        />
      </FormField>
    </div>
  );
}

function CreateAnomalyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const trpc = useTRPC();
  const [siteId, setSiteId] = React.useState("");
  const [source, setSource] = React.useState<"inspection" | "client">("inspection");
  const [fields, setFields] = React.useState<Fields>({
    type: "other",
    location: "",
    comment: "",
    severity: "normal",
  });
  const sites = useQuery({ ...trpc.records.options.queryOptions({ kind: "site" }), enabled: open });
  const create = useMutation(
    trpc.anomalies.create.mutationOptions({
      onSuccess: () => {
        toast.success("Anomalie enregistrée et validée.");
        onOpenChange(false);
        setSiteId("");
        setFields({ type: "other", location: "", comment: "", severity: "normal" });
        onCreated();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle anomalie</DialogTitle>
          <DialogDescription>
            Constatée lors d&apos;une ronde ou signalée par le client. Saisie par un responsable,
            elle est validée d&apos;office.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="anomaly-site" label="Site">
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger id="anomaly-site">
                <SelectValue placeholder="Choisir le site" />
              </SelectTrigger>
              <SelectContent>
                {(sites.data ?? []).map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="anomaly-source" label="Origine">
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger id="anomaly-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inspection">Ronde ou contrôle du chef</SelectItem>
                <SelectItem value="client">Signalée par le client</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <AnomalyFields value={fields} onChange={(v) => setFields({ ...fields, ...v })} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={!siteId || create.isPending}
            onClick={() =>
              create.mutate({
                siteId,
                source,
                ...fields,
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
