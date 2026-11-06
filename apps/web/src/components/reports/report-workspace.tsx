"use client";

import {
  BUCKET_LABELS,
  CHART_LABELS,
  CHART_TYPES,
  DATE_BUCKETS,
  ENTITIES,
  ENTITY_KEYS,
  type EntityKey,
  MODULES,
  type PeriodInput,
  type PeriodPreset,
  PERIOD_LABELS,
  PERIOD_PRESETS,
  type ReportDefinition,
  type ReportSchedule,
  reportFields,
  validateReport,
} from "@quercy/core";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Switch } from "@quercy/ui/components/switch";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleAlertIcon,
  DownloadIcon,
  ExternalLinkIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReportChart, unitOf } from "@/components/dashboard/charts";
import { formatUnit } from "@/components/dashboard/format";
import { PeriodPicker, usePeriod } from "@/components/dashboard/period";
import { FilterBuilder } from "@/components/records/filter-builder";
import { useAccess } from "@/components/shell/access-context";
import { toastError } from "@/components/toast-error";
import { errorMessage, useTRPC } from "@/lib/trpc";

const NONE = "__none__";

export interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  definition: ReportDefinition;
  period: string;
  shared: boolean;
  schedule: string;
  recipients: string[];
  canEdit: boolean;
  owner: string;
  lastSentAt: Date | null;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SaveDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: {
    name: string;
    description: string;
    shared: boolean;
    schedule: ReportSchedule;
    recipients: string;
    period: PeriodPreset;
  };
  pending: boolean;
  onSave: (values: SaveDialogValues) => void;
}) {
  const [values, setValues] = React.useState(initial);
  React.useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial]);
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer le rapport</DialogTitle>
          <DialogDescription>
            Un rapport enregistré peut être partagé, placé sur le tableau de bord et envoyé par
            email.
          </DialogDescription>
        </DialogHeader>
        <form
          id="save-report"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(values);
          }}
        >
          <Field id="report-name" label="Nom">
            <Input
              id="report-name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field id="report-description" label="Description (facultatif)">
            <Textarea
              id="report-description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="report-period" label="Période par défaut">
              <Select value={values.period} onValueChange={(v) => set("period", v as PeriodPreset)}>
                <SelectTrigger id="report-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_PRESETS.filter((p) => p !== "custom").map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERIOD_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="report-schedule" label="Envoi par email">
              <Select
                value={values.schedule}
                onValueChange={(v) => set("schedule", v as ReportSchedule)}
              >
                <SelectTrigger id="report-schedule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Jamais</SelectItem>
                  <SelectItem value="weekly">Chaque lundi</SelectItem>
                  <SelectItem value="monthly">Le 1er de chaque mois</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {values.schedule !== "none" ? (
            <Field
              id="report-recipients"
              label="Destinataires (séparés par des virgules ; vous par défaut)"
            >
              <Input
                id="report-recipients"
                value={values.recipients}
                onChange={(e) => set("recipients", e.target.value)}
                placeholder="direction@exemple.fr, compta@exemple.fr"
              />
            </Field>
          ) : null}
          <div className="flex items-center gap-2">
            <Switch
              id="report-shared"
              checked={values.shared}
              onCheckedChange={(v) => set("shared", v)}
            />
            <Label htmlFor="report-shared" className="font-normal">
              Partager avec l&apos;équipe (chacun le voit selon ses propres droits)
            </Label>
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="save-report" disabled={pending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SaveDialogValues {
  name: string;
  description: string;
  shared: boolean;
  schedule: ReportSchedule;
  recipients: string;
  period: PeriodPreset;
}

/**
 * Constructeur et lecteur de rapport : entité, mesure, regroupement, filtre, graphique ;
 * résultat en direct, clic vers la liste filtrée, exports PDF/Excel/CSV, enregistrement.
 */
export function ReportWorkspace({
  initialDefinition,
  saved,
  presetName,
  presetPeriod,
}: {
  initialDefinition: ReportDefinition;
  saved?: SavedReport;
  presetName?: string;
  presetPeriod?: PeriodPreset;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { allows } = useAccess();
  const [def, setDef] = React.useState<ReportDefinition>(initialDefinition);
  const initialPeriod = React.useMemo<PeriodInput | undefined>(
    () =>
      presetPeriod
        ? { preset: presetPeriod }
        : saved
          ? {
              preset: (PERIOD_PRESETS as readonly string[]).includes(saved.period)
                ? (saved.period as PeriodPreset)
                : "30d",
            }
          : undefined,
    [saved, presetPeriod],
  );
  const [period, setPeriod] = usePeriod(initialPeriod);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const name = saved?.name ?? presetName ?? "Nouveau rapport";
  const problem = validateReport(def);
  const fields = reportFields(def.entity);
  const entity = ENTITIES[def.entity];
  const groupField = fields.groupable.find((f) => f.key === def.groupBy);
  const isDateGroup = groupField?.type === "date" || groupField?.type === "datetime";
  const canEdit = !saved || saved.canEdit;

  const result = useQuery({
    ...trpc.reports.run.queryOptions({ definition: def, period }),
    enabled: !problem,
    placeholderData: keepPreviousData,
  });

  const saveReport = useMutation(
    trpc.reports.save.mutationOptions({
      onSuccess: ({ id }) => {
        setSaving(false);
        void queryClient.invalidateQueries(trpc.reports.pathFilter());
        void queryClient.invalidateQueries(trpc.dashboard.pathFilter());
        toast.success("Rapport enregistré.");
        if (!saved) router.push(`/rapports/${id}`);
      },
      onError: toastError,
    }),
  );
  const remove = useMutation(
    trpc.reports.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.reports.pathFilter());
        toast.success("Rapport supprimé.");
        router.push("/rapports");
      },
      onError: toastError,
    }),
  );

  const update = (patch: Partial<ReportDefinition>) => setDef((d) => ({ ...d, ...patch }));
  const entities = ENTITY_KEYS.filter((k) => allows(ENTITIES[k].module, "view"));
  const exportHref = (format: "csv" | "xlsx" | "pdf") =>
    `/api/rapports/export?${new URLSearchParams({
      format,
      name,
      definition: JSON.stringify(def),
      period: JSON.stringify(period),
    }).toString()}`;
  const unit = unitOf(result.data?.measureField);

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[340px_1fr]">
      <aside aria-label="Définition du rapport" className="space-y-4">
        <Field id="report-entity" label="Données">
          <Select
            value={def.entity}
            disabled={!canEdit}
            onValueChange={(value) => {
              const next = value as EntityKey;
              const f = reportFields(next);
              setDef({
                ...def,
                entity: next,
                measure: { op: "count" },
                groupBy: f.groupable.find((g) => g.type === "select")?.key ?? null,
                dateBucket: null,
                dateField: f.dates.find((d) => d.key !== "updatedAt")?.key ?? null,
                filter: { combinator: "and", rules: [] },
              });
            }}
          >
            <SelectTrigger id="report-entity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entities.map((k) => (
                <SelectItem key={k} value={k}>
                  {ENTITIES[k].labelPlural} · {MODULES[ENTITIES[k].module].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="report-op" label="Mesure">
            <Select
              value={def.measure.op}
              disabled={!canEdit}
              onValueChange={(op) =>
                update({
                  measure:
                    op === "count"
                      ? { op: "count" }
                      : {
                          op: op as "sum" | "avg",
                          field: def.measure.field ?? fields.measurable[0]?.key,
                        },
                })
              }
            >
              <SelectTrigger id="report-op">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">Nombre</SelectItem>
                <SelectItem value="sum" disabled={fields.measurable.length === 0}>
                  Somme
                </SelectItem>
                <SelectItem value="avg" disabled={fields.measurable.length === 0}>
                  Moyenne
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id="report-measure" label="Champ">
            <Select
              value={def.measure.field ?? NONE}
              disabled={!canEdit || def.measure.op === "count"}
              onValueChange={(field) => update({ measure: { ...def.measure, field } })}
            >
              <SelectTrigger id="report-measure">
                <SelectValue placeholder={`de ${entity.labelPlural.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} disabled>
                  —
                </SelectItem>
                {fields.measurable.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="report-group" label="Regrouper par">
            <Select
              value={def.groupBy ?? NONE}
              disabled={!canEdit}
              onValueChange={(v) => {
                const g = fields.groupable.find((f) => f.key === v);
                update({
                  groupBy: v === NONE ? null : v,
                  dateBucket:
                    g && (g.type === "date" || g.type === "datetime")
                      ? (def.dateBucket ?? "month")
                      : null,
                });
              }}
            >
              <SelectTrigger id="report-group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucun (total)</SelectItem>
                {fields.groupable.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="report-bucket" label="Intervalle">
            <Select
              value={def.dateBucket ?? NONE}
              disabled={!canEdit || !isDateGroup}
              onValueChange={(v) => update({ dateBucket: v as ReportDefinition["dateBucket"] })}
            >
              <SelectTrigger id="report-bucket">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {DATE_BUCKETS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {BUCKET_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field id="report-date" label="Période appliquée sur">
          <Select
            value={def.dateField ?? NONE}
            disabled={!canEdit}
            onValueChange={(v) => update({ dateField: v === NONE ? null : v })}
          >
            <SelectTrigger id="report-date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Toutes les fiches (sans période)</SelectItem>
              {fields.dates.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="report-chart" label="Affichage">
            <Select
              value={def.chart}
              disabled={!canEdit}
              onValueChange={(v) => update({ chart: v as ReportDefinition["chart"] })}
            >
              <SelectTrigger id="report-chart">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CHART_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="report-limit" label="Groupes affichés">
            <Input
              id="report-limit"
              type="number"
              min={1}
              max={50}
              value={def.limit}
              disabled={!canEdit}
              onChange={(e) =>
                update({ limit: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })
              }
            />
          </Field>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Filtre</p>
          <FilterBuilder
            fields={ENTITIES[def.entity].fields}
            value={def.filter}
            onChange={(filter) => canEdit && update({ filter })}
          />
        </div>
      </aside>

      <section aria-label="Résultat" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={period} onChange={setPeriod} />
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={Boolean(problem) || !allows(entity.module, "export")}
                >
                  <DownloadIcon />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={exportHref("pdf")} download>
                    PDF
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={exportHref("xlsx")} download>
                    Excel
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={exportHref("csv")} download>
                    CSV
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canEdit ? (
              <Button size="sm" onClick={() => setSaving(true)} disabled={Boolean(problem)}>
                <SaveIcon />
                {saved ? "Enregistrer" : "Enregistrer le rapport"}
              </Button>
            ) : null}
            {saved?.canEdit ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Supprimer le rapport"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2Icon />
              </Button>
            ) : null}
          </div>
        </div>

        {problem ? (
          <Callout variant="warning" icon={<CircleAlertIcon />}>
            {problem}
          </Callout>
        ) : result.isError ? (
          <Callout variant="danger" icon={<CircleAlertIcon />}>
            {errorMessage(result.error)}
          </Callout>
        ) : result.isPending ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {result.data.measure}
                {result.data.period ? ` · ${result.data.period}` : " · toutes périodes"} ·{" "}
                <Link
                  href={result.data.href}
                  className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  {result.data.count} fiche{result.data.count > 1 ? "s" : ""}
                  <ExternalLinkIcon className="size-3" aria-hidden />
                </Link>
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatUnit(result.data.total, unit)}
              </p>
            </div>
            <div className="h-96">
              <ReportChart
                chart={def.chart}
                points={result.data.points}
                unit={unit}
                total={result.data.total}
                caption={name}
              />
            </div>
            {def.chart !== "table" && def.chart !== "number" ? (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">Voir les valeurs</summary>
                <div className="mt-2">
                  <ReportChart
                    chart="table"
                    points={result.data.points}
                    unit={unit}
                    total={result.data.total}
                    caption={name}
                  />
                </div>
              </details>
            ) : null}
            {result.data.truncated ? (
              <p className="text-xs text-muted-foreground">
                {result.data.truncated} groupe(s) regroupé(s) dans « Autres » : augmentez le nombre
                de groupes affichés pour les voir.
              </p>
            ) : null}
          </div>
        )}
        {saved ? (
          <p className="text-xs text-muted-foreground">
            Par {saved.owner}
            {saved.shared ? " · partagé avec l'équipe" : " · privé"}
            {saved.schedule !== "none"
              ? ` · envoi ${saved.schedule === "weekly" ? "chaque lundi" : "le 1er du mois"}${saved.lastSentAt ? `, dernier le ${new Date(saved.lastSentAt).toLocaleDateString("fr-FR")}` : ""}`
              : ""}
          </p>
        ) : null}
      </section>

      <SaveDialog
        open={saving}
        onOpenChange={setSaving}
        pending={saveReport.isPending}
        initial={{
          name: saved?.name ?? presetName ?? "",
          description: saved?.description ?? "",
          shared: saved?.shared ?? false,
          schedule: (saved?.schedule as ReportSchedule | undefined) ?? "none",
          recipients: saved?.recipients.join(", ") ?? "",
          period: (period.preset === "custom" ? "30d" : period.preset) as PeriodPreset,
        }}
        onSave={(values) =>
          saveReport.mutate({
            id: saved?.id,
            name: values.name,
            description: values.description || null,
            definition: def,
            period: values.period,
            shared: values.shared,
            schedule: values.schedule,
            recipients: values.recipients
              .split(/[,;\s]+/)
              .map((e) => e.trim())
              .filter(Boolean),
          })
        }
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer le rapport « ${name} » ?`}
        description="Il disparaît aussi des tableaux de bord où il était affiché, et ses envois programmés s'arrêtent."
        confirmLabel="Supprimer"
        destructive
        pending={remove.isPending}
        onConfirm={() => saved && remove.mutate({ id: saved.id })}
      />
    </div>
  );
}
