"use client";

import { WORKER_DOCUMENT_KINDS, WORKER_KINDS, type WorkerKind } from "@quercy/core";
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
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";
import type { AppRouter } from "@/server/trpc/root";

type Worker = inferRouterOutputs<AppRouter>["workers"]["list"]["workers"][number];
const NONE = "__none__";

const frDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("fr-FR", { dateStyle: "medium" });

function DocumentBadge({ doc }: { doc: Worker["documents"][number] }) {
  const variant = doc.alert === "expired" ? "danger" : doc.alert === "soon" ? "warning" : "outline";
  return (
    <Badge variant={variant}>
      {doc.label || doc.kindLabel}
      {doc.expiresAt
        ? ` · ${doc.alert === "expired" ? "expirée le" : "jusqu'au"} ${frDate(doc.expiresAt)}`
        : ""}
    </Badge>
  );
}

/**
 * Intervenants : statut (salarié, sous-traitant, dirigeant), activités, zone, coût horaire,
 * remplaçants n°1 et n°2, véhicule, conduite ; attestations des sous-traitants à échéance.
 */
export function WorkersBoard() {
  const trpc = useTRPC();
  const list = useQuery(trpc.workers.list.queryOptions());
  const [editing, setEditing] = React.useState<Worker | null>(null);

  if (list.isPending) return <Skeleton className="h-48" />;
  if (list.error) return <Callout variant="warning">{errorMessage(list.error)}</Callout>;
  const { workers, activities } = list.data;
  const alerts = workers.flatMap((w) =>
    w.documents.filter((d) => d.alert).map((d) => ({ worker: w, doc: d })),
  );

  return (
    <div className="space-y-4">
      {alerts.length ? (
        <Callout variant="warning">
          {alerts.length} attestation{alerts.length > 1 ? "s" : ""} expirée
          {alerts.length > 1 ? "s" : ""} ou à renouveler :{" "}
          {alerts.map((a) => `${a.worker.name} (${a.doc.kindLabel})`).join(", ")}.
        </Callout>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Intervenant</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Activités · zone</th>
              <th className="px-3 py-2 text-right font-medium">Coût / h</th>
              <th className="px-3 py-2 font-medium">Remplaçants</th>
              <th className="px-3 py-2 font-medium">Véhicule</th>
              <th className="px-3 py-2 font-medium">Attestations</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {workers.map((w) => (
              <tr key={w.id} className="align-top">
                <td className="px-3 py-2">
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.companyName ? `${w.companyName} · ` : ""}
                    {w.role}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={w.kind === "subcontractor" ? "info" : "outline"}>
                    {w.kindLabel}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs">
                  {[w.activities.join(", "), w.zone].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {w.hourlyCost === null
                    ? "—"
                    : w.hourlyCost.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </td>
                <td className="px-3 py-2 text-xs">
                  {w.replacement1 || w.replacement2 ? (
                    <>
                      {w.replacement1 ? <div>n°1 : {w.replacement1}</div> : null}
                      {w.replacement2 ? <div>n°2 : {w.replacement2}</div> : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {w.usualVehicle ?? "—"}
                  {w.canDriveCompanyVehicles ? (
                    <div className="text-muted-foreground">conduit les véhicules</div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {w.documents.length
                      ? w.documents.map((d) => <DocumentBadge key={d.id} doc={d} />)
                      : "—"}
                  </div>
                </td>
                <td className="px-1 py-1.5">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Modifier la fiche de ${w.name}`}
                    onClick={() => setEditing(w)}
                  >
                    <PencilIcon />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing ? (
        <WorkerDialog
          worker={editing}
          others={workers.filter((w) => w.id !== editing.id)}
          activities={activities}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function WorkerDialog({
  worker,
  others,
  activities,
  onClose,
}: {
  worker: Worker;
  others: Worker[];
  activities: string[];
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.workers.list.queryKey() });
  const [form, setForm] = React.useState({
    kind: worker.kind,
    activities: worker.activities.join(", "),
    zone: worker.zone ?? "",
    hourlyCost: worker.hourlyCost === null ? "" : String(worker.hourlyCost).replace(".", ","),
    replacement1Id: worker.replacement1Id ?? NONE,
    replacement2Id: worker.replacement2Id ?? NONE,
    usualVehicle: worker.usualVehicle ?? "",
    canDriveCompanyVehicles: worker.canDriveCompanyVehicles,
    phone: worker.phone ?? "",
    companyName: worker.companyName ?? "",
    siret: worker.siret ?? "",
    notes: worker.notes ?? "",
  });
  const [doc, setDoc] = React.useState({ kind: "urssaf", label: "", expiresAt: "" });
  const onError = (e: unknown) => toast.error(errorMessage(e));
  const save = useMutation(
    trpc.workers.save.mutationOptions({
      onSuccess: () => {
        toast.success("Fiche enregistrée.");
        void refresh();
        onClose();
      },
      onError,
    }),
  );
  const saveDoc = useMutation(
    trpc.workers.saveDocument.mutationOptions({
      onSuccess: () => {
        setDoc({ kind: "urssaf", label: "", expiresAt: "" });
        void refresh();
      },
      onError,
    }),
  );
  const removeDoc = useMutation(
    trpc.workers.removeDocument.mutationOptions({ onSuccess: () => void refresh(), onError }),
  );
  const current =
    queryClient.getQueryData(trpc.workers.list.queryKey())?.workers.find((w) => w.id === worker.id)
      ?.documents ?? worker.documents;
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });
  const replacementSelect = (
    id: string,
    label: string,
    key: "replacement1Id" | "replacement2Id",
  ) => (
    <FormField id={id} label={label}>
      <Select value={form[key]} onValueChange={(v) => set({ [key]: v })}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Aucun</SelectItem>
          {others.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{worker.name}</DialogTitle>
          <DialogDescription>
            Les remplaçants n°1 et n°2 sont proposés en premier quand {worker.name} est absent.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="worker-kind" label="Statut">
            <Select value={form.kind} onValueChange={(v) => set({ kind: v as WorkerKind })}>
              <SelectTrigger id="worker-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKER_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="worker-cost" label="Coût horaire chargé (€)">
            <Input
              id="worker-cost"
              inputMode="decimal"
              value={form.hourlyCost}
              onChange={(e) => set({ hourlyCost: e.target.value })}
            />
          </FormField>
          <FormField id="worker-activities" label="Activités (séparées par des virgules)">
            <Input
              id="worker-activities"
              list="worker-activity-list"
              value={form.activities}
              placeholder={activities.slice(0, 3).join(", ") || "Ex. copropriété, bureaux"}
              onChange={(e) => set({ activities: e.target.value })}
            />
            <datalist id="worker-activity-list">
              {activities.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </FormField>
          <FormField id="worker-zone" label="Zone">
            <Input
              id="worker-zone"
              value={form.zone}
              onChange={(e) => set({ zone: e.target.value })}
            />
          </FormField>
          {replacementSelect("worker-r1", "Remplaçant n°1", "replacement1Id")}
          {replacementSelect("worker-r2", "Remplaçant n°2", "replacement2Id")}
          <FormField id="worker-vehicle" label="Véhicule habituel">
            <Input
              id="worker-vehicle"
              value={form.usualVehicle}
              onChange={(e) => set({ usualVehicle: e.target.value })}
            />
          </FormField>
          <FormField id="worker-phone" label="Téléphone">
            <Input
              id="worker-phone"
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
            />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={form.canDriveCompanyVehicles}
            onCheckedChange={(v) => set({ canDriveCompanyVehicles: v })}
          />
          Autorisé à conduire les véhicules de l&apos;entreprise
        </label>
        {form.kind === "subcontractor" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="worker-company" label="Raison sociale">
              <Input
                id="worker-company"
                value={form.companyName}
                onChange={(e) => set({ companyName: e.target.value })}
              />
            </FormField>
            <FormField id="worker-siret" label="SIRET">
              <Input
                id="worker-siret"
                inputMode="numeric"
                value={form.siret}
                onChange={(e) => set({ siret: e.target.value })}
              />
            </FormField>
          </div>
        ) : null}
        <FormField id="worker-notes" label="Notes">
          <Textarea
            id="worker-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </FormField>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Attestations</h4>
          {current.length ? (
            <ul className="space-y-1 text-sm">
              {current.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <DocumentBadge doc={d} />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Retirer ${d.kindLabel}`}
                    onClick={() => removeDoc.mutate({ id: d.id })}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune attestation. Pour un sous-traitant : URSSAF (tous les 6 mois) et assurance.
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <Select value={doc.kind} onValueChange={(kind) => setDoc({ ...doc, kind })}>
              <SelectTrigger className="w-60" aria-label="Type d'attestation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKER_DOCUMENT_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              aria-label="Date d'expiration"
              className="w-44"
              value={doc.expiresAt}
              onChange={(e) => setDoc({ ...doc, expiresAt: e.target.value })}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!doc.expiresAt || saveDoc.isPending}
              onClick={() =>
                saveDoc.mutate({
                  userId: worker.id,
                  kind: doc.kind,
                  label: doc.label,
                  expiresAt: doc.expiresAt || null,
                })
              }
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
            onClick={() => {
              const cost = form.hourlyCost.trim().replace(",", ".");
              save.mutate({
                userId: worker.id,
                kind: form.kind,
                activities: form.activities
                  .split(",")
                  .map((a) => a.trim())
                  .filter(Boolean),
                zone: form.zone,
                hourlyCost: cost ? Number(cost) : null,
                replacement1Id: form.replacement1Id === NONE ? null : form.replacement1Id,
                replacement2Id: form.replacement2Id === NONE ? null : form.replacement2Id,
                usualVehicle: form.usualVehicle,
                canDriveCompanyVehicles: form.canDriveCompanyVehicles,
                phone: form.phone,
                companyName: form.companyName,
                siret: form.siret,
                notes: form.notes,
              });
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
