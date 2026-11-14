"use client";

import { type ModuleKey, type PermissionMatrix, permissionMatrixSchema } from "@quercy/core";
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
import { Skeleton } from "@quercy/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@quercy/ui/components/table";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, EyeIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { PermissionMatrixEditor } from "./permission-matrix";

interface Draft {
  id?: string;
  name: string;
  description: string;
  permissions: PermissionMatrix;
  readOnly: boolean;
}

function parseMatrix(value: unknown): PermissionMatrix {
  const parsed = permissionMatrixSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function RolesManager({ activeModules }: { activeModules: ModuleKey[] }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const roles = useQuery(trpc.roles.list.queryOptions());
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [deleting, setDeleting] = React.useState<{ id: string; name: string } | null>(null);
  const create = useMutation(trpc.roles.create.mutationOptions());
  const update = useMutation(trpc.roles.update.mutationOptions());
  const remove = useMutation(
    trpc.roles.delete.mutationOptions({
      onSuccess: () => {
        setDeleting(null);
        toast.success("Rôle supprimé.");
        void queryClient.invalidateQueries({ queryKey: trpc.roles.list.queryKey() });
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  function open(next: Draft) {
    create.reset();
    update.reset();
    setDraft(next);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || draft.readOnly) return;
    const input = {
      name: draft.name,
      description: draft.description || undefined,
      permissions: draft.permissions,
    };
    const options = {
      onSuccess: () => {
        toast.success(draft.id ? "Rôle mis à jour." : "Rôle créé.");
        setDraft(null);
        void queryClient.invalidateQueries({ queryKey: trpc.roles.list.queryKey() });
      },
    };
    if (draft.id) update.mutate({ ...input, id: draft.id }, options);
    else create.mutate(input, options);
  }

  return (
    <>
      <PageHeader
        title="Rôles et permissions"
        description="Six rôles prédéfinis couvrent la plupart des besoins. Créez des rôles sur mesure pour régler chaque module, action par action."
        actions={
          <Button
            onClick={() =>
              open({
                name: "",
                description: "",
                permissions: { members: { view: "all" } },
                readOnly: false,
              })
            }
          >
            <PlusIcon />
            Nouveau rôle
          </Button>
        }
      />

      {roles.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : roles.isError ? (
        <p className="text-sm text-destructive">{errorMessage(roles.error)}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Rôle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Membres</TableHead>
              <TableHead className="w-40">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.data.map((role) => {
              const system = Boolean(role.systemKey);
              const matrix = parseMatrix(role.permissions);
              return (
                <TableRow key={role.id}>
                  <TableCell>
                    <p className="font-medium">{role.name}</p>
                    {role.description ? (
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {system ? (
                      <Badge>Prédéfini</Badge>
                    ) : (
                      <Badge variant="primary">Personnalisé</Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{role.memberCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={system ? `Voir ${role.name}` : `Modifier ${role.name}`}
                        onClick={() =>
                          open({
                            id: role.id,
                            name: role.name,
                            description: role.description ?? "",
                            permissions: matrix,
                            readOnly: system,
                          })
                        }
                      >
                        {system ? <EyeIcon /> : <PencilIcon />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Dupliquer ${role.name}`}
                        onClick={() =>
                          open({
                            name: `${role.name} (copie)`,
                            description: role.description ?? "",
                            permissions: matrix,
                            readOnly: false,
                          })
                        }
                      >
                        <CopyIcon />
                      </Button>
                      {system ? null : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Supprimer ${role.name}`}
                          onClick={() => setDeleting({ id: role.id, name: role.name })}
                        >
                          <Trash2Icon />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => (o ? null : setDraft(null))}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          {draft ? (
            <form onSubmit={save} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>
                  {draft.readOnly ? draft.name : draft.id ? "Modifier le rôle" : "Nouveau rôle"}
                </DialogTitle>
                <DialogDescription>
                  {draft.readOnly
                    ? "Rôle prédéfini, non modifiable. Dupliquez-le pour l'adapter."
                    : "« Les siens » : seulement les éléments dont la personne est responsable. « Son équipe » : ceux de ses équipes."}
                </DialogDescription>
              </DialogHeader>
              {saveError ? <Callout variant="danger">{errorMessage(saveError)}</Callout> : null}
              {draft.readOnly ? null : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="role-name" label="Nom">
                    <Input
                      id="role-name"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      maxLength={40}
                      autoFocus
                    />
                  </FormField>
                  <FormField id="role-description" label="Description (facultatif)">
                    <Input
                      id="role-description"
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      maxLength={200}
                    />
                  </FormField>
                </div>
              )}
              <PermissionMatrixEditor
                value={draft.permissions}
                onChange={(permissions) => setDraft({ ...draft, permissions })}
                readOnly={draft.readOnly}
                activeModules={activeModules}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  {draft.readOnly ? "Fermer" : "Annuler"}
                </Button>
                {draft.readOnly ? null : (
                  <Button type="submit" disabled={saving || draft.name.trim().length < 2}>
                    {saving ? "Enregistrement…" : "Enregistrer le rôle"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => (o ? null : setDeleting(null))}
        title={`Supprimer le rôle ${deleting?.name ?? ""} ?`}
        description="Impossible s'il est encore attribué à un membre ou à une invitation en attente."
        confirmLabel="Supprimer"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })}
      />
    </>
  );
}
