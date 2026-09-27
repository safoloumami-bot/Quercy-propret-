"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@quercy/core";
import { Avatar, AvatarFallback, initials } from "@quercy/ui/components/avatar";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Input } from "@quercy/ui/components/input";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { FormField, fieldAria } from "@/components/form-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { SettingsSection } from "./section";

export function ProfileForm({
  name,
  email,
  emailVerified,
}: {
  name: string;
  email: string;
  emailVerified: boolean;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const update = useMutation(trpc.profile.update.mutationOptions());
  const [sending, setSending] = React.useState(false);
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  });
  const { errors, isDirty } = form.formState;

  function onSubmit(values: z.infer<typeof profileSchema>) {
    update.mutate(values, {
      onSuccess: () => {
        form.reset(values);
        router.refresh();
        toast.success("Profil enregistré.");
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  async function resendVerification() {
    setSending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/reglages/profil",
    });
    setSending(false);
    if (error) toast.error(authErrorMessage(error));
    else toast.success(`Email de confirmation envoyé à ${email}.`);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <SettingsSection
        id="profile"
        title="Informations"
        footer={
          <Button type="submit" disabled={!isDirty || update.isPending}>
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        }
      >
        <div className="flex gap-6">
          <Avatar className="size-14">
            <AvatarFallback className="text-base">
              {initials(form.watch("name") || name)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 gap-4">
            <FormField id="name" label="Prénom et nom" error={errors.name?.message}>
              <Input
                autoComplete="name"
                {...fieldAria("name", errors.name?.message)}
                {...form.register("name")}
              />
            </FormField>
            <FormField
              id="email"
              label="Adresse email"
              hint="L'adresse sert à vous connecter ; elle ne peut pas être modifiée ici."
            >
              <div className="flex items-center gap-3">
                <Input
                  id="email"
                  value={email}
                  readOnly
                  aria-describedby="email-hint"
                  className="bg-muted"
                />
                {emailVerified ? (
                  <Badge variant="success">Confirmée</Badge>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={resendVerification}
                    disabled={sending}
                  >
                    Confirmer l&apos;adresse
                  </Button>
                )}
              </div>
            </FormField>
          </div>
        </div>
      </SettingsSection>
    </form>
  );
}
