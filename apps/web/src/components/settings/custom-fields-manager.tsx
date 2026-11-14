"use client";

import { ENTITIES, ENTITY_KEYS, type EntityKey } from "@quercy/core";
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
import { Label } from "@quercy/ui/components/label";
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
import { ListPlusIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { errorMessage, useTRPC } from "@/lib/trpc";

const TYPE_LABELS = {
  TEXT: "Texte",
  NUMBER: "Nombre",
  DATE: "Date",
  SELECT: "Liste de choix",
  CHECKBOX: "Case à cocher",
} as const;
type FieldType = keyof typeof TYPE_LABELS;

interface Draft {
  id?: string;
  label: string;
  type: FieldType;
  choices: string;
  required: boolean;
}

export function CustomFieldsManager() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [entity, setEntity] = React.useState<EntityKey>("company");
  const list = useQuery(trpc.customFields.list.queryOptions({ entity }));
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [deleting, setDeleting] = React.useState<{ id: string; label: string } | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.customFields.list.queryKey({ entity }) });
    void queryClient.invalidateQueries(trpc.records.pathFilter());
  };
  const create = useMutation(trpc.customFields.create.mutationOptions());
  const update = useMutation(trpc.customFields.update.mutationOptions());
  const remove = useMutation(
    trpc.customFields.delete.mutationOptions({
      onSuccess: () => {
        setDeleting(null);
        toast.success(
          "Champ supprimé. Les valeurs déjà saisies restent dans l'export des données.",
        );
        refresh();
      },
    }),
  );
  const error = create.error ?? update.error;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const choices = draft.choices
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    const done = {
      onSuccess: () => {
        toast.success(
          draft.id
            ? "Champ modifié."
            : "Champ ajouté : rechargez la liste pour l'utiliser dans les colonnes.",
        );
        setDraft(null);
        refresh();
      },
    };
    if (draft.id)
      update.mutate({ id: draft.id, label: draft.label, choices, required: draft.required }, done);
    else
      create.mutate(
        { entity, label: draft.label, type: draft.type, choices, required: draft.required },
        done,
      );
  }

  return (
    <>
      <PageHeader
        title="Champs personnalisés"
        description="Ajoutez vos propres informations aux fiches : elles apparaissent dans les formulaires, les colonnes, les filtres, l'import et l'export."
        actions={
          <Button
            onClick={() => {
              create.reset();
              update.reset();
              setDraft({ label: "", type: "TEXT", choices: "", required: false });
            }}
          >
            <PlusIcon />
            Nouveau champ
          </Button>
        }
      />
      <Tabs value={entity} onValueChange={(v) => setEntity(v as EntityKey)}>
        <TabsList>
          {ENTITY_KEYS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {ENTITIES[k].labelPlural}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.isPending ? (
        <Skeleton className="h-32" />
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState
          icon={<ListPlusIcon />}
          title="Aucun champ personnalisé"
          description={`Par exemple pour les ${ENTITIES[entity].labelPlural.toLowerCase()} : « Code client », « Date de signature », « Secteur ».`}
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {list.data.map((f) => {
            const options = (f.options ?? {}) as { choices?: string[]; required?: boolean };
            return (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {f.label}
                    {options.required ? <Badge variant="warning">Obligatoire</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[f.type as FieldType]}
                    {options.choices?.length ? ` · ${options.choices.join(", ")}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Modifier ${f.label}`}
                  onClick={() =>
                    setDraft({
                      id: f.id,
                      label: f.label,
                      type: f.type as FieldType,
                      choices: (options.choices ?? []).join("\n"),
                      required: Boolean(options.required),
                    })
                  }
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Supprimer ${f.label}`}
                  onClick={() => setDeleting({ id: f.id, label: f.label })}
                >
                  <Trash2Icon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={draft !== null} onOpenChange={(open) => (open ? null : setDraft(null))}>
        <DialogContent>
          {draft ? (
            <form onSubmit={save} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>
                  {draft.id
                    ? "Modifier le champ"
                    : `Nouveau champ — ${ENTITIES[entity].labelPlural}`}
                </DialogTitle>
                <DialogDescription>
                  Le type ne peut plus changer après la création.
                </DialogDescription>
              </DialogHeader>
              {error ? <Callout variant="danger">{errorMessage(error)}</Callout> : null}
              <FormField id="cf-label" label="Nom du champ">
                <Input
                  id="cf-label"
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  autoFocus
                  maxLength={60}
                />
              </FormField>
              <FormField id="cf-type" label="Type">
                <Select
                  value={draft.type}
                  onValueChange={(v) => setDraft({ ...draft, type: v as FieldType })}
                  disabled={Boolean(draft.id)}
                >
                  <SelectTrigger id="cf-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as FieldType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              {draft.type === "SELECT" ? (
                <FormField id="cf-choices" label="Choix (un par ligne)">
                  <textarea
                    id="cf-choices"
                    value={draft.choices}
                    onChange={(e) => setDraft({ ...draft, choices: e.target.value })}
                    className="min-h-24 w-full rounded-md border border-input bg-card px-2.5 py-2 text-sm"
                  />
                </FormField>
              ) : null}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cf-required"
                  checked={draft.required}
                  onCheckedChange={(v) => setDraft({ ...draft, required: v === true })}
                />
                <Label htmlFor="cf-required" className="font-normal">
                  Obligatoire à la création
                </Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={draft.label.trim().length < 2 || create.isPending || update.isPending}
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? null : setDeleting(null))}
        title={`Supprimer le champ « ${deleting?.label ?? ""} » ?`}
        description="Il disparaît des fiches, colonnes et filtres. Les valeurs déjà saisies restent dans l'export des données de l'espace."
        confirmLabel="Supprimer"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })}
      />
    </>
  );
}
