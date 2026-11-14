"use client";

import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@quercy/ui/components/tabs";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyCheckIcon, MergeIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

type Entity = "company" | "contact";
const PATH: Record<Entity, string> = { company: "/crm/entreprises", contact: "/crm/contacts" };

function PairList({ entity }: { entity: Entity }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const pairs = useQuery(trpc.crm.duplicates.queryOptions({ entity }));
  const [confirm, setConfirm] = React.useState<{
    keepId: string;
    mergeId: string;
    keep: string;
    merged: string;
  } | null>(null);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.crm.pathFilter()),
      queryClient.invalidateQueries(trpc.records.pathFilter()),
    ]);
  const merge = useMutation(
    trpc.crm.merge.mutationOptions({
      onSuccess: ({ moved }) => {
        setConfirm(null);
        void refresh();
        const total = Object.values(moved).reduce((a, b) => a + b, 0);
        toast.success(
          `Fiches fusionnées (${total} élément${total > 1 ? "s" : ""} rattaché${total > 1 ? "s" : ""}).`,
        );
      },
      onError: toastError,
    }),
  );
  const dismiss = useMutation(
    trpc.crm.dismiss.mutationOptions({
      onSuccess: () => {
        void refresh();
        toast.success("Paire écartée : elle ne sera plus proposée.");
      },
      onError: toastError,
    }),
  );

  if (pairs.isPending) return <Skeleton className="h-48" />;
  if ((pairs.data ?? []).length === 0)
    return (
      <EmptyState
        icon={<CopyCheckIcon />}
        title="Aucun doublon détecté"
        description="Les fiches sont analysées à chaque ouverture de cet écran."
      />
    );

  return (
    <>
      <ul className="space-y-3">
        {pairs.data!.map((pair) => (
          <li
            key={`${pair.firstId}-${pair.secondId}`}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {pair.reasons.map((r) => (
                <Badge key={r} variant="warning">
                  {r}
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground">
                Similarité {Math.round(pair.score * 100)} %
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => dismiss.mutate({ entity, ids: [pair.firstId, pair.secondId] })}
              >
                Ce ne sont pas des doublons
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[pair.first, pair.second].map((card, index) => {
                const other = index === 0 ? pair.second : pair.first;
                return (
                  <div
                    key={card.id}
                    className="flex flex-col gap-2 rounded-md border border-border p-3"
                  >
                    <Link
                      href={`${PATH[entity]}/${card.id}`}
                      className="font-medium hover:underline"
                    >
                      {card.title}
                    </Link>
                    <ul className="text-sm text-muted-foreground">
                      {card.details.map((d) => (
                        <li key={d} className="truncate">
                          {d}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Modifiée le {new Date(card.updatedAt).toLocaleDateString("fr-FR")}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-auto self-start"
                      onClick={() =>
                        setConfirm({
                          keepId: card.id,
                          mergeId: other.id,
                          keep: card.title,
                          merged: other.title,
                        })
                      }
                    >
                      <MergeIcon />
                      Conserver celle-ci
                    </Button>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => (open ? null : setConfirm(null))}
        title={`Fusionner dans « ${confirm?.keep ?? ""} » ?`}
        description={`Les informations manquantes, étiquettes, fiches liées, commentaires et fichiers de « ${confirm?.merged ?? ""} » sont rattachés à la fiche conservée ; « ${confirm?.merged ?? ""} » part à la corbeille (restaurable 30 jours).`}
        confirmLabel="Fusionner"
        pending={merge.isPending}
        onConfirm={() =>
          confirm && merge.mutate({ entity, keepId: confirm.keepId, mergeId: confirm.mergeId })
        }
      />
    </>
  );
}

export function DuplicatesManager() {
  return (
    <Tabs defaultValue="company">
      <TabsList>
        <TabsTrigger value="company">Entreprises</TabsTrigger>
        <TabsTrigger value="contact">Contacts</TabsTrigger>
      </TabsList>
      <TabsContent value="company">
        <PairList entity="company" />
      </TabsContent>
      <TabsContent value="contact">
        <PairList entity="contact" />
      </TabsContent>
    </Tabs>
  );
}
