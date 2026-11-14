"use client";

import { Avatar, AvatarFallback, AvatarImage, initials } from "@quercy/ui/components/avatar";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@quercy/ui/components/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
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
import {
  MailIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  UserMinusIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { CopyLinkButton, InviteDialog } from "./invite-dialog";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export function MembersManager({
  organizationName,
  isOwner,
  canInvite,
  canAdmin,
  canRemove,
}: {
  organizationName: string;
  isOwner: boolean;
  canInvite: boolean;
  canAdmin: boolean;
  canRemove: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const members = useQuery(trpc.members.list.queryOptions());
  const roles = useQuery(trpc.roles.list.queryOptions());
  const invitations = useQuery(trpc.invitations.list.queryOptions());
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<{ id: string; name: string } | null>(null);
  const [resent, setResent] = React.useState<Record<string, string>>({});

  const membersKey = trpc.members.list.queryKey();
  const updateRole = useMutation(
    trpc.members.updateRole.mutationOptions({
      // Mise à jour optimiste : le rôle change immédiatement à l'écran.
      onMutate: async ({ membershipId, roleId }) => {
        await queryClient.cancelQueries({ queryKey: membersKey });
        const previous = queryClient.getQueryData(membersKey);
        const role = roles.data?.find((r) => r.id === roleId);
        if (role) {
          queryClient.setQueryData(membersKey, (old) =>
            old?.map((m) =>
              m.id === membershipId
                ? { ...m, role: { id: role.id, name: role.name, systemKey: role.systemKey } }
                : m,
            ),
          );
        }
        return { previous };
      },
      onError: (error, _vars, context) => {
        if (context?.previous) queryClient.setQueryData(membersKey, context.previous);
        toast.error(errorMessage(error));
      },
      onSuccess: () => toast.success("Rôle mis à jour."),
      onSettled: () => queryClient.invalidateQueries({ queryKey: membersKey }),
    }),
  );
  const remove = useMutation(
    trpc.members.remove.mutationOptions({
      onSuccess: () => {
        setRemoving(null);
        toast.success("Membre retiré de l'espace.");
        void queryClient.invalidateQueries({ queryKey: membersKey });
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const revoke = useMutation(
    trpc.invitations.revoke.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation annulée.");
        void queryClient.invalidateQueries({ queryKey: trpc.invitations.list.queryKey() });
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const resend = useMutation(
    trpc.invitations.resend.mutationOptions({
      onSuccess: (result, vars) => {
        if (result?.url) setResent((r) => ({ ...r, [vars.id]: result.url! }));
        toast.success("Invitation renvoyée avec un nouveau lien.");
        void queryClient.invalidateQueries({ queryKey: trpc.invitations.list.queryKey() });
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  const assignableRoles = (roles.data ?? []).filter((r) => isOwner || r.systemKey !== "owner");

  return (
    <>
      <PageHeader
        title="Membres"
        description={`Les personnes qui ont accès à ${organizationName}.`}
        actions={
          canInvite ? (
            <Button onClick={() => setInviteOpen(true)} disabled={!roles.data}>
              <UserPlusIcon />
              Inviter
            </Button>
          ) : null
        }
      />

      {members.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : members.isError ? (
        <p className="text-sm text-destructive">{errorMessage(members.error)}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Personne</TableHead>
              <TableHead>Équipes</TableHead>
              <TableHead className="w-56">Rôle</TableHead>
              <TableHead>Depuis</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.data.map((m) => {
              const lockedOwner = m.role.systemKey === "owner" && !isOwner;
              const editable = canAdmin && !m.isMe && !lockedOwner;
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {m.user.image ? <AvatarImage src={m.user.image} alt="" /> : null}
                        <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          {m.user.name}
                          {m.isMe ? <Badge>Vous</Badge> : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.teams.length > 0 ? (
                        m.teams.map((t) => (
                          <Badge key={t.id} variant="outline">
                            {t.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editable ? (
                      <Select
                        value={m.role.id}
                        onValueChange={(roleId) =>
                          updateRole.mutate({ membershipId: m.id, roleId })
                        }
                      >
                        <SelectTrigger aria-label={`Rôle de ${m.user.name}`} className="h-7">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{m.role.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFormat.format(new Date(m.joinedAt))}
                  </TableCell>
                  <TableCell>
                    {canRemove && !m.isMe && !lockedOwner ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions pour ${m.user.name}`}
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setRemoving({ id: m.id, name: m.user.name })}
                          >
                            <UserMinusIcon />
                            Retirer de l&apos;espace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {invitations.data && invitations.data.length > 0 ? (
        <section aria-labelledby="pending-title" className="space-y-3">
          <h2 id="pending-title" className="text-base font-semibold">
            Invitations en attente ({invitations.data.length})
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {invitations.data.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-2.5">
                <MailIcon className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.role.name} · invité par {inv.invitedBy.name} · expire le{" "}
                    {dateFormat.format(new Date(inv.expiresAt))}
                  </p>
                </div>
                {resent[inv.id] ? <CopyLinkButton url={resent[inv.id]!} /> : null}
                {canInvite ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resend.mutate({ id: inv.id })}
                    disabled={resend.isPending}
                  >
                    <RefreshCwIcon />
                    Renvoyer
                  </Button>
                ) : null}
                {canRemove ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke.mutate({ id: inv.id })}
                    disabled={revoke.isPending}
                  >
                    <XIcon />
                    Annuler
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} roles={roles.data ?? []} />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => (o ? null : setRemoving(null))}
        title={`Retirer ${removing?.name ?? ""} ?`}
        description="La personne perd immédiatement l'accès à l'espace. Son historique reste dans le journal d'audit."
        confirmLabel="Retirer"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate({ membershipId: removing.id })}
      />
    </>
  );
}
