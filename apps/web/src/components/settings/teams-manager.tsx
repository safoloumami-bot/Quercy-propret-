"use client";

import { Avatar, AvatarFallback, initials } from "@quercy/ui/components/avatar";
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
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon, UsersRoundIcon } from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { errorMessage, useTRPC } from "@/lib/trpc";

interface TeamDraft {
  id?: string;
  name: string;
  leadUserId: string | null;
  memberIds: string[];
}

const NO_LEAD = "__none__";

export function TeamsManager({ canEdit }: { canEdit: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const teams = useQuery(trpc.teams.list.queryOptions());
  const members = useQuery(trpc.members.list.queryOptions());
  const [draft, setDraft] = React.useState<TeamDraft | null>(null);
  const [deleting, setDeleting] = React.useState<{ id: string; name: string } | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.teams.list.queryKey() });

  const create = useMutation(trpc.teams.create.mutationOptions());
  const update = useMutation(trpc.teams.update.mutationOptions());
  const remove = useMutation(
    trpc.teams.delete.mutationOptions({
      onSuccess: () => {
        setDeleting(null);
        toast.success("Équipe supprimée.");
        void invalidate();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const input = { name: draft.name, leadUserId: draft.leadUserId, memberIds: draft.memberIds };
    const options = {
      onSuccess: () => {
        toast.success(draft.id ? "Équipe mise à jour." : "Équipe créée.");
        setDraft(null);
        void invalidate();
        void queryClient.invalidateQueries({ queryKey: trpc.members.list.queryKey() });
      },
    };
    if (draft.id) update.mutate({ ...input, id: draft.id }, options);
    else create.mutate(input, options);
  }

  function open(next: TeamDraft) {
    create.reset();
    update.reset();
    setDraft(next);
  }

  const people = (members.data ?? []).map((m) => m.user);
  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.name;

  return (
    <>
      <PageHeader
        title="Équipes"
        description="Regroupez les membres par service (Commercial, Support, Atelier…). Les droits « de son équipe » s'appuient sur ces groupes."
        actions={
          canEdit ? (
            <Button onClick={() => open({ name: "", leadUserId: null, memberIds: [] })}>
              <PlusIcon />
              Nouvelle équipe
            </Button>
          ) : null
        }
      />

      {teams.isPending ? (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : teams.isError ? (
        <p className="text-sm text-destructive">{errorMessage(teams.error)}</p>
      ) : teams.data.length === 0 ? (
        <EmptyState
          icon={<UsersRoundIcon />}
          title="Aucune équipe pour l'instant"
          description="Créez une équipe pour chaque service : les managers verront et géreront les éléments de leur équipe."
          action={
            canEdit ? (
              <Button size="sm" onClick={() => open({ name: "", leadUserId: null, memberIds: [] })}>
                <PlusIcon />
                Créer une équipe
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {teams.data.map((team) => (
            <li key={team.id} className="space-y-4 rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{team.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {team.members.length} membre{team.members.length > 1 ? "s" : ""}
                    {team.leadUserId && nameOf(team.leadUserId)
                      ? ` · responsable : ${nameOf(team.leadUserId)}`
                      : ""}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Modifier ${team.name}`}
                      onClick={() =>
                        open({
                          id: team.id,
                          name: team.name,
                          leadUserId: team.leadUserId,
                          memberIds: team.members.map((m) => m.id),
                        })
                      }
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Supprimer ${team.name}`}
                      onClick={() => setDeleting({ id: team.id, name: team.name })}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {team.members.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Aucun membre.</span>
                ) : (
                  team.members.map((m) => (
                    <span
                      key={m.id}
                      className="flex items-center gap-1.5 rounded-full border border-border py-0.5 pr-2.5 pl-0.5 text-xs"
                    >
                      <Avatar className="size-5">
                        <AvatarFallback className="text-[9px]">{initials(m.name)}</AvatarFallback>
                      </Avatar>
                      {m.name}
                      {m.id === team.leadUserId ? <Badge variant="primary">Resp.</Badge> : null}
                    </span>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => (o ? null : setDraft(null))}>
        <DialogContent className="max-w-lg">
          {draft ? (
            <form onSubmit={save} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Modifier l'équipe" : "Nouvelle équipe"}</DialogTitle>
                <DialogDescription>
                  Le responsable fait automatiquement partie de l&apos;équipe.
                </DialogDescription>
              </DialogHeader>
              {saveError ? <Callout variant="danger">{errorMessage(saveError)}</Callout> : null}
              <FormField id="team-name" label="Nom">
                <Input
                  id="team-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  autoFocus
                  maxLength={40}
                />
              </FormField>
              <FormField id="team-lead" label="Responsable">
                <Select
                  value={draft.leadUserId ?? NO_LEAD}
                  onValueChange={(v) =>
                    setDraft({ ...draft, leadUserId: v === NO_LEAD ? null : v })
                  }
                >
                  <SelectTrigger id="team-lead">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LEAD}>Aucun</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Membres</legend>
                <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {people.map((p) => {
                    const checked = draft.memberIds.includes(p.id) || draft.leadUserId === p.id;
                    return (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent">
                          <Checkbox
                            checked={checked}
                            disabled={draft.leadUserId === p.id}
                            onCheckedChange={(v) =>
                              setDraft({
                                ...draft,
                                memberIds: v
                                  ? [...draft.memberIds, p.id]
                                  : draft.memberIds.filter((id) => id !== p.id),
                              })
                            }
                          />
                          <span className="flex-1">{p.name}</span>
                          <span className="text-xs text-muted-foreground">{p.email}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saving || draft.name.trim().length < 2}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => (o ? null : setDeleting(null))}
        title={`Supprimer l'équipe ${deleting?.name ?? ""} ?`}
        description="Les membres restent dans l'espace ; seul le regroupement disparaît."
        confirmLabel="Supprimer"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })}
      />
    </>
  );
}
