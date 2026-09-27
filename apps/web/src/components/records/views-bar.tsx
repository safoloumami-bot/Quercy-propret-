"use client";

import type { EntityKey, ViewConfig } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Checkbox } from "@quercy/ui/components/checkbox";
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
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, PlusIcon, SaveIcon, Trash2Icon, UsersIcon } from "lucide-react";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";

/** Onglets de vues enregistrées : « Toutes », mes vues, vues partagées. */
export function ViewsBar({
  entity,
  config,
  viewId,
  labelPlural,
  onApply,
  onReset,
}: {
  entity: EntityKey;
  config: ViewConfig;
  viewId: string | null;
  labelPlural: string;
  onApply: (config: ViewConfig, id: string | null) => void;
  onReset: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const views = useQuery(trpc.views.list.queryOptions({ entity }));
  const [dialog, setDialog] = React.useState(false);
  const [name, setName] = React.useState("");
  const [shared, setShared] = React.useState(false);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.views.list.queryKey({ entity }) });
  const create = useMutation(trpc.views.create.mutationOptions());
  const update = useMutation(trpc.views.update.mutationOptions());
  const remove = useMutation(trpc.views.delete.mutationOptions());
  const current = views.data?.find((v) => v.id === viewId) ?? null;
  const dirty = current?.config ? JSON.stringify(current.config) !== JSON.stringify(config) : false;

  function save(event: React.FormEvent) {
    event.preventDefault();
    create.mutate(
      { entity, name, shared, config },
      {
        onSuccess: ({ id }) => {
          setDialog(false);
          setName("");
          toast.success(shared ? "Vue enregistrée et partagée avec l'équipe." : "Vue enregistrée.");
          void invalidate();
          onApply(config, id);
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  const tabClass = (active: boolean) =>
    cn(
      "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm whitespace-nowrap transition-colors hover:bg-accent",
      active ? "bg-accent font-medium text-foreground" : "text-muted-foreground",
    );

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto"
      role="tablist"
      aria-label="Vues enregistrées"
    >
      <button
        type="button"
        role="tab"
        aria-selected={viewId === null}
        className={tabClass(viewId === null)}
        onClick={onReset}
      >
        {labelPlural} — toutes
      </button>
      {(views.data ?? []).map((v) => (
        <div key={v.id} className="flex items-center">
          <button
            type="button"
            role="tab"
            aria-selected={v.id === viewId}
            className={tabClass(v.id === viewId)}
            onClick={() => v.config && onApply(v.config, v.id)}
            title={v.shared ? `Partagée par ${v.ownerName}` : "Vue personnelle"}
          >
            {v.shared ? <UsersIcon className="size-3.5" aria-label="Partagée" /> : null}
            {v.name}
            {v.id === viewId && dirty ? (
              <span className="size-1.5 rounded-full bg-warning" aria-label="Modifiée" />
            ) : null}
          </button>
          {v.id === viewId && v.mine ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Options de la vue ${v.name}`}>
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  disabled={!dirty}
                  onSelect={() =>
                    update.mutate(
                      { id: v.id, config },
                      {
                        onSuccess: () => {
                          toast.success("Vue mise à jour.");
                          void invalidate();
                        },
                      },
                    )
                  }
                >
                  <SaveIcon />
                  Enregistrer les modifications
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    update.mutate(
                      { id: v.id, shared: !v.shared },
                      {
                        onSuccess: () => {
                          toast.success(
                            v.shared ? "Vue redevenue personnelle." : "Vue partagée avec l'équipe.",
                          );
                          void invalidate();
                        },
                      },
                    )
                  }
                >
                  <UsersIcon />
                  {v.shared ? "Ne plus partager" : "Partager avec l'équipe"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() =>
                    remove.mutate(
                      { id: v.id },
                      {
                        onSuccess: () => {
                          toast.success("Vue supprimée.");
                          void invalidate();
                          onReset();
                        },
                      },
                    )
                  }
                >
                  <Trash2Icon />
                  Supprimer la vue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setDialog(true)}
      >
        <PlusIcon />
        Enregistrer la vue
      </Button>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <form onSubmit={save} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Enregistrer la vue</DialogTitle>
              <DialogDescription>
                Filtres, tris, colonnes et regroupement actuels seront retrouvés en un clic.
              </DialogDescription>
            </DialogHeader>
            <FormField id="view-name" label="Nom">
              <Input
                id="view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={60}
                placeholder="Ex. : Clients de Cahors"
              />
            </FormField>
            <div className="flex items-center gap-2">
              <Checkbox
                id="view-shared"
                checked={shared}
                onCheckedChange={(v) => setShared(v === true)}
              />
              <Label htmlFor="view-shared" className="font-normal">
                Partager avec toute l&apos;équipe
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={!name.trim() || create.isPending}>
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
