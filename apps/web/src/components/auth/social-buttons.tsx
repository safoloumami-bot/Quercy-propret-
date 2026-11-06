"use client";

import { Button } from "@quercy/ui/components/button";
import { toast } from "@quercy/ui/components/toaster";
import * as React from "react";

import { authClient, authErrorMessage } from "@/lib/auth-client";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2Z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.4 9.1 5.4 12 5.4Z"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

/** Boutons de connexion Google / Microsoft (affichés seulement si configurés côté serveur). */
export function SocialButtons({
  providers,
  callbackURL,
}: {
  providers: { google: boolean; microsoft: boolean };
  callbackURL: string;
}) {
  const [pending, setPending] = React.useState<string | null>(null);
  if (!providers.google && !providers.microsoft) return null;

  async function go(provider: "google" | "microsoft") {
    setPending(provider);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL,
      newUserCallbackURL: "/bienvenue",
    });
    if (error) {
      toast.error(authErrorMessage(error));
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {providers.google ? (
          <Button
            variant="secondary"
            size="lg"
            disabled={pending !== null}
            onClick={() => go("google")}
          >
            <GoogleMark />
            Continuer avec Google
          </Button>
        ) : null}
        {providers.microsoft ? (
          <Button
            variant="secondary"
            size="lg"
            disabled={pending !== null}
            onClick={() => go("microsoft")}
          >
            <MicrosoftMark />
            Continuer avec Microsoft
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
