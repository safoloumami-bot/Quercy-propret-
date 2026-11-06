"use client";

import type { EntityKey } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlayIcon, ReceiptIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAccess } from "@/components/shell/access-context";
import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

/** Actions propres à certaines entités, affichées dans l'en-tête de la fiche. */
export function EntityActions({ entity, id }: { entity: EntityKey; id: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { allows } = useAccess();
  const start = useMutation(
    trpc.timer.start.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.timer.pathFilter());
        toast.success("Chronomètre démarré.");
      },
      onError: toastError,
    }),
  );
  const invoice = useMutation(
    trpc.sales.invoiceTime.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          `Facture brouillon créée (${r.entries} saisie${r.entries > 1 ? "s" : ""} de temps).`,
        );
        router.push(r.url);
      },
      onError: toastError,
    }),
  );

  if (entity === "task" && allows("projects", "create"))
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => start.mutate({ taskId: id })}
        disabled={start.isPending}
      >
        <PlayIcon />
        Chronomètre
      </Button>
    );
  if (entity === "project" && allows("sales", "create"))
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => invoice.mutate({ projectId: id })}
        disabled={invoice.isPending}
      >
        <ReceiptIcon />
        Facturer le temps
      </Button>
    );
  return null;
}
