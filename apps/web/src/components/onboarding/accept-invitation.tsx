"use client";

import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { useMutation } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { signOut } from "@/components/shell/sign-out";
import { errorMessage, useTRPC } from "@/lib/trpc";

export function AcceptInvitation({
  token,
  sessionEmail,
  invitedEmail,
}: {
  token: string;
  sessionEmail: string;
  invitedEmail: string;
}) {
  const trpc = useTRPC();
  const accept = useMutation(
    trpc.invitations.accept.mutationOptions({
      onSuccess: () => {
        window.location.href = "/";
      },
    }),
  );
  const mismatch = sessionEmail.toLowerCase() !== invitedEmail.toLowerCase();

  if (mismatch) {
    return (
      <div className="space-y-4">
        <Callout variant="warning" icon={<CircleAlertIcon />}>
          Vous êtes connecté avec <strong>{sessionEmail}</strong>. Pour accepter, connectez-vous
          avec {invitedEmail}.
        </Callout>
        <Button variant="secondary" onClick={() => void signOut()}>
          Changer de compte
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accept.error ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {errorMessage(accept.error)}
        </Callout>
      ) : null}
      <Button
        size="lg"
        className="w-full"
        disabled={accept.isPending}
        onClick={() => accept.mutate({ token })}
      >
        {accept.isPending ? "Un instant…" : "Rejoindre l'espace"}
      </Button>
    </div>
  );
}
