"use client";

import { EMPTY_CONDITIONS } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Switch } from "@quercy/ui/components/switch";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon, WorkflowIcon } from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

import { AutomationEditor, type EditableAutomation } from "./automation-editor";

const NEW: EditableAutomation = {
  name: "",
  entity: "invoice",
  trigger: "updated",
  conditions: EMPTY_CONDITIONS,
  actions: [{ type: "notify", to: "owner", message: "« {{titre}} » demande votre attention." }],
  active: true,
};

export function AutomationsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const list = useQuery(trpc.automations.list.queryOptions());
  const [editing, setEditing] = React.useState<EditableAutomation | null>(null);
  const [removing, setRemoving] = React.useState<{ id: string; name: string } | null>(null);
  const refresh = () => queryClient.invalidateQueries(trpc.automations.pathFilter());
  const save = useMutation(
    trpc.automations.save.mutationOptions({
      onSuccess: () => {
        toast.success("Automatisation enregistrée.");
        setEditing(null);
        void refresh();
      },
      onError: toastError,
    }),
  );
  const setActive = useMutation(
    trpc.automations.setActive.mutationOptions({
      onSuccess: () => void refresh(),
      onError: toastError,
    }),
  );
  const remove = useMutation(
    trpc.automations.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Automatisation supprimée.");
        setRemoving(null);
        void refresh();
      },
      onError: toastError,
    }),
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-8 py-8">
      <PageHeader
        title="Automatisations"
        description="Quand une fiche est créée, modifiée ou supprimée et qu'elle remplit vos conditions : notifier, modifier un champ, envoyer un email ou créer une tâche."
        actions={
          <Button onClick={() => setEditing(NEW)}>
            <PlusIcon />
            Nouvelle automatisation
          </Button>
        }
      />
      {list.data?.length === 0 ? (
        <EmptyState
          icon={<WorkflowIcon />}
          title="Aucune automatisation"
          description="Exemple : quand une facture passe « En retard », créer une tâche de relance pour son responsable."
          action={<Button onClick={() => setEditing(NEW)}>Créer une automatisation</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {list.data?.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <Switch
                checked={a.active}
                onCheckedChange={(active) => setActive.mutate({ id: a.id, active })}
                aria-label={`Activer « ${a.name} »`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-sm text-muted-foreground">
                  {a.entityLabel} · {a.triggerLabel} → {a.summary}
                </p>
                {a.lastError ? (
                  <p className="text-xs text-destructive">Dernière erreur : {a.lastError}</p>
                ) : null}
              </div>
              <Badge>
                {a.runCount} exécution{a.runCount > 1 ? "s" : ""}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Modifier « ${a.name} »`}
                onClick={() =>
                  setEditing({
                    id: a.id,
                    name: a.name,
                    entity: a.entity as EditableAutomation["entity"],
                    trigger: a.trigger as EditableAutomation["trigger"],
                    conditions: a.conditions as unknown as EditableAutomation["conditions"],
                    actions: a.actions as unknown as EditableAutomation["actions"],
                    active: a.active,
                  })
                }
              >
                <PencilIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Supprimer « ${a.name} »`}
                onClick={() => setRemoving({ id: a.id, name: a.name })}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <AutomationEditor
          value={editing}
          open
          onOpenChange={(open) => (open ? null : setEditing(null))}
          onSave={(value) => save.mutate(value)}
          pending={save.isPending}
        />
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? null : setRemoving(null))}
        title="Supprimer l'automatisation ?"
        description={`« ${removing?.name ?? ""} » ne s'exécutera plus.`}
        confirmLabel="Supprimer"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate({ id: removing.id })}
      />
    </div>
  );
}
