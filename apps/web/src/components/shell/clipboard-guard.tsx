"use client";

import { toast } from "@quercy/ui/components/toaster";
import { useEffect } from "react";

/**
 * Le navigateur peut refuser l'accès au presse-papiers (réglage, fenêtre sans focus) : sans
 * ce garde, les boutons « Copier » ne montreraient rien.
 */
export function ClipboardGuard() {
  useEffect(() => {
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason as { name?: string; message?: string } | null;
      if (reason?.name === "NotAllowedError" && /clipboard/i.test(reason.message ?? "")) {
        event.preventDefault();
        toast.error(
          "Copie impossible : le navigateur l'a refusée. Sélectionnez le texte et copiez-le à la main.",
        );
      }
    }
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);
  return null;
}
