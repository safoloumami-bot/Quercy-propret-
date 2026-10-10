"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { passwordSchema } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Checkbox } from "@quercy/ui/components/checkbox";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField, fieldAria } from "@/components/form-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { SettingsSection } from "../section";

const changeSchema = z
  .object({
    current: z.string().min(1, { error: "Saisissez votre mot de passe actuel." }),
    next: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    error: "Les deux mots de passe ne correspondent pas.",
  });
const setSchema = z
  .object({ next: passwordSchema, confirm: z.string() })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    error: "Les deux mots de passe ne correspondent pas.",
  });

export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  return hasPassword ? <ChangePassword /> : <SetPassword />;
}

function ChangePassword() {
  const [revokeOthers, setRevokeOthers] = React.useState(true);
  const form = useForm<z.infer<typeof changeSchema>>({
    resolver: zodResolver(changeSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof changeSchema>) {
    const { error } = await authClient.changePassword({
      currentPassword: values.current,
      newPassword: values.next,
      revokeOtherSessions: revokeOthers,
    });
    if (error) return toast.error(authErrorMessage(error));
    form.reset();
    toast.success(
      revokeOthers
        ? "Mot de passe changé. Vos autres appareils ont été déconnectés."
        : "Mot de passe changé.",
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <SettingsSection
        id="password"
        title="Mot de passe"
        description="Choisissez une phrase longue plutôt qu'un mot compliqué."
        footer={
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : "Changer le mot de passe"}
          </Button>
        }
      >
        <div className="grid gap-4">
          <FormField id="current" label="Mot de passe actuel" error={errors.current?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              {...fieldAria("current", errors.current?.message)}
              {...form.register("current")}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField id="next" label="Nouveau mot de passe" error={errors.next?.message}>
              <Input
                type="password"
                autoComplete="new-password"
                {...fieldAria("next", errors.next?.message)}
                {...form.register("next")}
              />
            </FormField>
            <FormField id="confirm" label="Confirmation" error={errors.confirm?.message}>
              <Input
                type="password"
                autoComplete="new-password"
                {...fieldAria("confirm", errors.confirm?.message)}
                {...form.register("confirm")}
              />
            </FormField>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="revoke-others"
              checked={revokeOthers}
              onCheckedChange={(v) => setRevokeOthers(v === true)}
            />
            <Label htmlFor="revoke-others" className="font-normal">
              Déconnecter mes autres appareils
            </Label>
          </div>
        </div>
      </SettingsSection>
    </form>
  );
}

function SetPassword() {
  const trpc = useTRPC();
  const router = useRouter();
  const set = useMutation(trpc.profile.setPassword.mutationOptions());
  const form = useForm<z.infer<typeof setSchema>>({
    resolver: zodResolver(setSchema),
    defaultValues: { next: "", confirm: "" },
  });
  const { errors } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit((v) =>
        set.mutate(
          { newPassword: v.next },
          {
            onSuccess: () => {
              toast.success("Mot de passe défini.");
              router.refresh();
            },
            onError: (e) => toast.error(errorMessage(e)),
          },
        ),
      )}
      noValidate
    >
      <SettingsSection
        id="password"
        title="Mot de passe"
        description="Vous vous connectez aujourd'hui par lien magique ou via Google/Microsoft. Définissez un mot de passe pour pouvoir aussi vous connecter avec."
        footer={
          <Button type="submit" disabled={set.isPending}>
            Définir un mot de passe
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField id="next" label="Mot de passe" error={errors.next?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldAria("next", errors.next?.message)}
              {...form.register("next")}
            />
          </FormField>
          <FormField id="confirm" label="Confirmation" error={errors.confirm?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldAria("confirm", errors.confirm?.message)}
              {...form.register("confirm")}
            />
          </FormField>
        </div>
      </SettingsSection>
    </form>
  );
}
