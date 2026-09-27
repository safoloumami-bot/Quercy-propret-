"use client";

import { auditActionLabel } from "@quercy/core";
import { Avatar, AvatarFallback, initials } from "@quercy/ui/components/avatar";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { EmptyState } from "@quercy/ui/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ScrollTextIcon } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/page-header";
import { errorMessage, useTRPC } from "@/lib/trpc";

const ALL = "__all__";
const ENTITY_LABELS: Record<string, string> = {
  organization: "Espace",
  membership: "Membres",
  invitation: "Invitations",
  role: "Rôles",
  team: "Équipes",
};
const FIELD_LABELS: Record<string, string> = {
  name: "Nom",
  industry: "Secteur",
  size: "Taille",
  currency: "Devise",
  timezone: "Fuseau horaire",
  dateFormat: "Format de date",
  locale: "Langue",
  accentColor: "Couleur d'accent",
  modules: "Modules",
  role: "Rôle",
  description: "Description",
  permissions: "Permissions",
  leadUserId: "Responsable",
  members: "Membres",
  color: "Couleur",
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "vide";
  if (Array.isArray(value)) return value.length === 0 ? "aucun" : value.join(", ");
  if (typeof value === "object") return "matrice modifiée";
  return String(value);
}

function subject(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const value = metadata.email ?? metadata.member ?? metadata.name;
  return typeof value === "string" ? value : null;
}

export function AuditLogView({ canListMembers }: { canListMembers: boolean }) {
  const trpc = useTRPC();
  const [actorId, setActorId] = React.useState<string>(ALL);
  const [entityType, setEntityType] = React.useState<string>(ALL);
  const members = useQuery({ ...trpc.members.list.queryOptions(), enabled: canListMembers });
  const entityTypes = useQuery(trpc.audit.entityTypes.queryOptions());
  const filters = {
    actorId: actorId === ALL ? undefined : actorId,
    entityType: entityType === ALL ? undefined : entityType,
    limit: 50,
  };
  const log = useInfiniteQuery(
    trpc.audit.list.infiniteQueryOptions(filters, { getNextPageParam: (last) => last.nextCursor }),
  );
  const items = log.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Toutes les actions sensibles de l'espace : qui, quoi, quand, avec les valeurs avant et après."
      />
      <div className="flex gap-3">
        {canListMembers ? (
          <Select value={actorId} onValueChange={setActorId}>
            <SelectTrigger className="w-60" aria-label="Filtrer par personne">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les personnes</SelectItem>
              {(members.data ?? []).map((m) => (
                <SelectItem key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-52" aria-label="Filtrer par type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les types</SelectItem>
            {(entityTypes.data ?? []).map((t) => (
              <SelectItem key={t} value={t}>
                {ENTITY_LABELS[t] ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {log.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : log.isError ? (
        <p className="text-sm text-destructive">{errorMessage(log.error)}</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ScrollTextIcon />}
          title="Aucune entrée"
          description="Aucune action ne correspond à ces filtres."
        />
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((entry) => {
            const who = entry.actor?.name ?? "Système";
            const target = subject(entry.metadata);
            return (
              <li key={entry.id} className="flex gap-3 px-4 py-3">
                <Avatar className="mt-0.5">
                  <AvatarFallback>{initials(who)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{who}</span> {auditActionLabel(entry.action)}
                    {target ? <span className="text-muted-foreground"> — {target}</span> : null}
                    {entry.impersonated ? (
                      <Badge variant="warning" className="ml-2">
                        Accès support
                      </Badge>
                    ) : null}
                  </p>
                  {entry.changes && Object.keys(entry.changes).length > 0 ? (
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {Object.entries(entry.changes).map(([field, change]) => (
                        <li key={field}>
                          {FIELD_LABELS[field] ?? field} :{" "}
                          <span className="line-through">{show(change.before)}</span> →{" "}
                          <span className="text-foreground">{show(change.after)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {dateFormat.format(new Date(entry.createdAt))}
                    {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {log.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => log.fetchNextPage()}
            disabled={log.isFetchingNextPage}
          >
            {log.isFetchingNextPage ? "Chargement…" : "Afficher plus"}
          </Button>
        </div>
      ) : null}
    </>
  );
}
