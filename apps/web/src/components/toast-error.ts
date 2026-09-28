"use client";

import { toast } from "@quercy/ui/components/toaster";

import { errorMessage, isPlanLimitError } from "@/lib/trpc";

/** Affiche une erreur ; si elle vient d'une limite de l'offre, propose d'ouvrir la facturation. */
export function toastError(error: unknown) {
  toast.error(errorMessage(error), {
    ...(isPlanLimitError(error)
      ? {
          action: {
            label: "Voir les offres",
            onClick: () => window.location.assign("/reglages/facturation"),
          },
        }
      : {}),
  });
}
