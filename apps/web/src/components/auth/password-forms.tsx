"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema, passwordSchema } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Input } from "@quercy/ui/components/input";
import { CircleAlertIcon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField, fieldAria } from "@/components/form-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";

const forgotSchema = z.object({ email: emailSchema });

export function ForgotPasswordForm({ mailReady = true }: { mailReady?: boolean }) {
  const [sent, setSent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: z.infer<typeof forgotSchema>) {
    setError(null);
    const { error: err } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reinitialiser",
    });
    if (err) return setError(authErrorMessage(err));
    setSent(email);
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MailCheckIcon className="size-5" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Vérifiez votre boîte mail</h1>
          <p className="text-sm text-muted-foreground">
            Si un compte existe pour <strong className="text-foreground">{sent}</strong>, vous allez
            recevoir un lien pour choisir un nouveau mot de passe. Il est valable une heure.
          </p>
        </div>
        <Link href="/connexion" className="text-sm font-medium text-primary hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <p className="text-sm text-muted-foreground">
          Indiquez votre adresse : nous vous envoyons un lien de réinitialisation.
        </p>
      </div>
      {!mailReady ? (
        <Callout variant="warning" icon={<CircleAlertIcon />}>
          L&apos;envoi d&apos;e-mails n&apos;est pas encore configuré sur ce site : aucun lien ne
          pourra vous être envoyé. Demandez à l&apos;administrateur de réinitialiser votre accès.
        </Callout>
      ) : null}
      {error ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {error}
        </Callout>
      ) : null}
      <FormField id="email" label="Adresse email" error={form.formState.errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          autoFocus
          {...fieldAria("email", form.formState.errors.email?.message)}
          {...form.register("email")}
        />
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Envoi…" : "Envoyer le lien"}
      </Button>
      <Link
        href="/connexion"
        className="block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Retour à la connexion
      </Link>
    </form>
  );
}

const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    error: "Les deux mots de passe ne correspondent pas.",
  });

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  if (!token) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Lien expiré</h1>
        <p className="text-sm text-muted-foreground">
          Ce lien de réinitialisation n&apos;est plus valable. Demandez-en un nouveau : il reste
          valable une heure.
        </p>
        <Button asChild>
          <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
        </Button>
      </div>
    );
  }

  async function onSubmit({ password }: z.infer<typeof resetSchema>) {
    setError(null);
    const { error: err } = await authClient.resetPassword({ newPassword: password, token: token! });
    if (err) return setError(authErrorMessage(err));
    window.location.href = "/connexion?reinitialise=1";
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
        <p className="text-sm text-muted-foreground">
          Vos autres sessions seront déconnectées par sécurité.
        </p>
      </div>
      {error ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {error}
        </Callout>
      ) : null}
      <FormField
        id="password"
        label="Nouveau mot de passe"
        error={errors.password?.message}
        hint="10 caractères minimum."
      >
        <Input
          type="password"
          autoComplete="new-password"
          autoFocus
          {...fieldAria("password", errors.password?.message, true)}
          {...form.register("password")}
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
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </Button>
    </form>
  );
}
