"use client";

import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { errorMessage, useTRPC } from "@/lib/trpc";

/** Bascule d'espace : la session mémorise l'espace actif, puis toute la page se recharge. */
export function useSwitchWorkspace() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workspace.switch.mutationOptions({
      onSuccess: (data) => {
        queryClient.clear();
        router.push("/");
        router.refresh();
        toast.success(`Vous êtes dans l'espace ${data.name}.`);
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  );
}
