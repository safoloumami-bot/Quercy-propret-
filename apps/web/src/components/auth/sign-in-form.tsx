"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema } from "@quercy/core";
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

import { SocialButtons } from "./social-buttons";

const passwordForm = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Saisissez votre mot de passe." }),
});
const magicForm = z.object({ email: emailSchema });

export function SignInForm({
  next,
  defaultEmail,
  providers,
  linkError,
}: {
  next: string;
  defaultEmail: string;
  providers: { google: boolean; microsoft: boolean };
  linkError?: string;
}) {
  const [mode, setMode] = React.useState<"password" | "magic">("password");
  const [error, setError] = React.useState<string | null>(linkError ?? null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const suffix = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  const pwd = useForm<z.infer<typeof passwordForm>>({
    resolver: zodResolver(passwordForm),
    defaultValues: { email: defaultEmail, password: "" },
  });
  const magic = useForm<z.infer<typeof magicForm>>({
    resolver: zodResolver(magicForm),
    defaultValues: { email: defaultEmail },
  });

  async function onPassword(values: z.infer<typeof passwordForm>) {
    setError(null);
    const { data, error: err } = await authClient.signIn.email({ ...values, callbackURL: next });
    if (err) return setError(authErrorMessage(err));
    // Avec la double authentification, le client redirige lui-même vers la saisie du code.
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return;
    window.location.href = next;
  }

  async function onMagic(values: z.infer<typeof magicForm>) {
    setError(null);
    const { error: err } = await authClient.signIn.magicLink({
      email: values.email,
      callbackURL: next,
      newUserCallbackURL: "/bienvenue",
      errorCallbackURL: `/connexion${suffix}`,
    });
    if (err) return setError(authErrorMessage(err));
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <div className="space-y-6">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MailCheckIcon className="size-5" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Vérifiez votre boîte mail</h1>
          <p className="text-sm text-muted-foreground">
            Un lien de connexion a été envoyé à{" "}
            <strong className="text-foreground">{sentTo}</strong>. Il est valable 10 minutes.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setSentTo(null)}>
          Utiliser une autre adresse
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href={`/inscription${suffix}`} className="font-medium text-primary hover:underline">
            Créer un compte gratuitement
          </Link>
        </p>
      </div>

      {error ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {error}
        </Callout>
      ) : null}

      <SocialButtons providers={providers} callbackURL={next} />

      {mode === "password" ? (
        <form onSubmit={pwd.handleSubmit(onPassword)} className="space-y-4" noValidate>
          <FormField id="email" label="Adresse email" error={pwd.formState.errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              autoFocus
              {...fieldAria("email", pwd.formState.errors.email?.message)}
              {...pwd.register("email")}
            />
          </FormField>
          <FormField
            id="password"
            label="Mot de passe"
            error={pwd.formState.errors.password?.message}
            action={
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Mot de passe oublié ?
              </Link>
            }
          >
            <Input
              type="password"
              autoComplete="current-password"
              {...fieldAria("password", pwd.formState.errors.password?.message)}
              {...pwd.register("password")}
            />
          </FormField>
          <Button type="submit" size="lg" className="w-full" disabled={pwd.formState.isSubmitting}>
            {pwd.formState.isSubmitting ? "Connexion…" : "Se connecter"}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={() => setMode("magic")}>
            Recevoir plutôt un lien de connexion par email
          </Button>
        </form>
      ) : (
        <form onSubmit={magic.handleSubmit(onMagic)} className="space-y-4" noValidate>
          <FormField
            id="magic-email"
            label="Adresse email"
            error={magic.formState.errors.email?.message}
            hint="Nous vous envoyons un lien : aucun mot de passe à retenir."
          >
            <Input
              type="email"
              autoComplete="email"
              autoFocus
              {...fieldAria("magic-email", magic.formState.errors.email?.message, true)}
              {...magic.register("email")}
            />
          </FormField>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={magic.formState.isSubmitting}
          >
            {magic.formState.isSubmitting ? "Envoi…" : "Recevoir le lien"}
          </Button>
          <Button
            type="button"
            variant="link"
            className="w-full"
            onClick={() => setMode("password")}
          >
            Se connecter avec un mot de passe
          </Button>
        </form>
      )}
    </div>
  );
}
