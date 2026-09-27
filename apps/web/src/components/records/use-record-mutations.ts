"use client";

import type { EntityKey } from "@quercy/core";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

import type { Row } from "./types";

type Cached = { pages?: { rows: Row[] }[]; row?: Row } | undefined;

/** Applique un correctif à une ligne dans toutes les listes et fiches en cache. */
function patchCaches(data: Cached, id: string, patch: Partial<Row>): Cached {
  if (!data) return data;
  if (data.pages) {
    return {
      ...data,
      pages: data.pages.map((p) => ({
        ...p,
        rows: p.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),
    };
  }
  if (data.row && data.row.id === id) return { ...data, row: { ...data.row, ...patch } };
  return data;
}

/** Mutations des fiches, avec mise à jour optimiste et annulation des suppressions. */
export function useRecordMutations(entity: EntityKey) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const filter = trpc.records.pathFilter();
  const refresh = () => queryClient.invalidateQueries(filter);

  const update = useMutation(
    trpc.records.update.mutationOptions({
      onMutate: async ({ id, values }) => {
        await queryClient.cancelQueries(filter);
        const snapshot = queryClient.getQueriesData<Cached>(filter);
        queryClient.setQueriesData<Cached>(filter, (data) =>
          patchCaches(data, id, values as Partial<Row>),
        );
        return { snapshot };
      },
      onError: (error, _vars, context) => {
        for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
        toastError(error);
      },
      onSuccess: (row) => {
        queryClient.setQueriesData<Cached>(filter, (data) => patchCaches(data, row.id, row as Row));
      },
      onSettled: () => void refresh(),
    }),
  );

  const restore = useMutation(
    trpc.records.restore.mutationOptions({
      onSuccess: ({ count }) => {
        toast.success(count > 1 ? `${count} fiches restaurées.` : "Fiche restaurée.");
        void refresh();
      },
      onError: toastError,
    }),
  );

  const remove = useMutation(
    trpc.records.delete.mutationOptions({
      onSuccess: ({ count }, { ids }) => {
        toast(count > 1 ? `${count} fiches mises à la corbeille.` : "Fiche mise à la corbeille.", {
          description: "Restaurable pendant 30 jours.",
          action: { label: "Annuler", onClick: () => restore.mutate({ entity, ids }) },
        });
        void refresh();
      },
      onError: toastError,
    }),
  );

  const bulkUpdate = useMutation(
    trpc.records.bulkUpdate.mutationOptions({
      onSuccess: ({ count }) => {
        toast.success(`${count} fiche${count > 1 ? "s" : ""} modifiée${count > 1 ? "s" : ""}.`);
        void refresh();
      },
      onError: toastError,
    }),
  );

  const create = useMutation(
    trpc.records.create.mutationOptions({
      onSuccess: () => void refresh(),
    }),
  );

  return { update, remove, restore, bulkUpdate, create, refresh };
}
