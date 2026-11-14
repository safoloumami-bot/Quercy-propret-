"use client";

import type { EntityKey } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { RotateCcwIcon } from "lucide-react";

import { useTRPC } from "@/lib/trpc";

import { useRecordMutations } from "./use-record-mutations";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

/** Corbeille : restauration pendant 30 jours, puis suppression définitive automatique. */
export function TrashDialog({
  entity,
  open,
  onOpenChange,
  labelPlural,
}: {
  entity: EntityKey;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  labelPlural: string;
}) {
  const trpc = useTRPC();
  const trash = useQuery({ ...trpc.records.trash.queryOptions({ entity }), enabled: open });
  const { restore } = useRecordMutations(entity);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Corbeille — {labelPlural}</DialogTitle>
          <DialogDescription>
            Les fiches supprimées sont conservées 30 jours, puis effacées définitivement.
          </DialogDescription>
        </DialogHeader>
        {trash.isPending ? (
          <Skeleton className="h-32" />
        ) : !trash.data || trash.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">La corbeille est vide.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {trash.data.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Supprimée le {dateFmt.format(new Date(item.deletedAt))} · effacement définitif
                    le {dateFmt.format(new Date(item.purgeAt))}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={restore.isPending}
                  onClick={() =>
                    restore.mutate(
                      { entity, ids: [item.id] },
                      { onSuccess: () => void trash.refetch() },
                    )
                  }
                >
                  <RotateCcwIcon />
                  Restaurer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
