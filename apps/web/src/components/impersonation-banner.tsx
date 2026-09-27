"use client";

import { Button } from "@quercy/ui/components/button";
import { toast } from "@quercy/ui/components/toaster";
import { UserCogIcon } from "lucide-react";
import * as React from "react";

import { authClient, authErrorMessage } from "@/lib/auth-client";

/** Bandeau permanent pendant une session d'assistance (« se connecter en tant que »). */
export function ImpersonationBanner({ userName }: { userName: string }) {
  const [pending, setPending] = React.useState(false);
  async function stop() {
    setPending(true);
    const { error } = await authClient.admin.stopImpersonating();
    if (error) {
      setPending(false);
      toast.error(authErrorMessage(error));
      return;
    }
    window.location.assign("/admin");
  }
  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-warning/40 bg-warning/15 px-6 py-2 text-sm"
    >
      <UserCogIcon className="size-4 shrink-0 text-warning" aria-hidden />
      <p className="flex-1">
        Session d&apos;assistance : vous êtes connecté en tant que <strong>{userName}</strong>. Vos
        actions sont tracées.
      </p>
      <Button size="sm" variant="secondary" onClick={stop} disabled={pending}>
        Terminer la session
      </Button>
    </div>
  );
}
