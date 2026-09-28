"use client";

import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Input } from "@quercy/ui/components/input";
import { useMutation } from "@tanstack/react-query";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { authClient } from "@/lib/auth-client";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { SettingsSection } from "../section";

export function DeleteAccountSection({
  email,
  hasPassword,
}: {
  email: string;
  hasPassword: boolean;
}) {
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);
  const [confirmEmail, setConfirmEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const remove = useMutation(
    trpc.profile.deleteAccount.mutationOptions({
      onSuccess: async () => {
        await authClient.signOut().catch(() => undefined);
        window.location.href = "/connexion";
      },
    }),
  );

  return (
    <>
      <SettingsSection
        id="delete-account"
        danger
        title="Supprimer mon compte"
        description="Vos données personnelles sont effacées définitivement. Les espaces dont vous êtes le seul membre partent en corbeille (30 jours). Si vous êtes le seul propriétaire d'un espace partagé, transmettez d'abord ce rôle."
        footer={
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Supprimer mon compte
          </Button>
        }
      />
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) remove.reset();
        }}
        title="Supprimer définitivement votre compte ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer mon compte"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate({ confirmEmail, password: hasPassword ? password : undefined })
        }
      >
        <div className="grid gap-4">
          {remove.error ? <Callout variant="danger">{errorMessage(remove.error)}</Callout> : null}
          <FormField id="confirm-email" label={`Saisissez ${email} pour confirmer`}>
            <Input
              id="confirm-email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              autoComplete="off"
            />
          </FormField>
          {hasPassword ? (
            <FormField id="delete-password" label="Mot de passe">
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
          ) : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
