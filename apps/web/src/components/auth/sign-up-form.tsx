"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema, passwordSchema, personNameSchema } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Input } from "@quercy/ui/components/input";
import { CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField, fieldAria } from "@/components/form-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";

import { SocialButtons } from "./social-buttons";

const schema = z.object({ name: personNameSchema, email: emailSchema, password: passwordSchema });

export function SignUpForm({
  next,
  defaultEmail,
  providers,
}: {
  next: string;
  defaultEmail: string;
  providers: { google: boolean; microsoft: boolean };
}) {
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: defaultEmail, password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const signInHref = `/connexion?next=${encodeURIComponent(next)}`;

  async function onSubmit(values: z.infer<typeof schema>) {
    setError(null);
    const { error: err } = await authClient.signUp.email({ ...values, callbackURL: next });
    if (err) return setError(authErrorMessage(err));
    window.location.href = next;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Créer votre compte</h1>
        <p className="text-sm text-muted-foreground">
          Essai gratuit de 14 jours de l&apos;offre Business, sans carte bancaire. Déjà inscrit ?{" "}
          <Link href={signInHref} className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
      {error ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {error}
        </Callout>
      ) : null}
      <SocialButtons providers={providers} callbackURL={next} />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id="name" label="Prénom et nom" error={errors.name?.message}>
          <Input
            autoComplete="name"
            autoFocus
            {...fieldAria("name", errors.name?.message)}
            {...form.register("name")}
          />
        </FormField>
        <FormField id="email" label="Adresse email professionnelle" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            {...fieldAria("email", errors.email?.message)}
            {...form.register("email")}
          />
        </FormField>
        <FormField
          id="password"
          label="Mot de passe"
          error={errors.password?.message}
          hint="10 caractères minimum. Une phrase facile à retenir fait un excellent mot de passe."
        >
          <Input
            type="password"
            autoComplete="new-password"
            {...fieldAria("password", errors.password?.message, true)}
            {...form.register("password")}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Création du compte…" : "Créer mon compte"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          En créant un compte, vous acceptez les conditions d&apos;utilisation et la politique de
          confidentialité.
        </p>
      </form>
    </div>
  );
}
