"use client";

import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Checkbox } from "@quercy/ui/components/checkbox";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import { CircleAlertIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export function TwoFactorForm({ next }: { next: string }) {
  const [mode, setMode] = React.useState<"totp" | "backup">("totp");
  const [code, setCode] = React.useState("");
  const [trust, setTrust] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: err } =
      mode === "totp"
        ? await authClient.twoFactor.verifyTotp({
            code: code.replace(/\s/g, ""),
            trustDevice: trust,
          })
        : await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice: trust });
    if (err) {
      setPending(false);
      setError(authErrorMessage(err));
      return;
    }
    window.location.href = next;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <ShieldCheckIcon className="size-5" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Double authentification</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "totp"
            ? "Saisissez le code à 6 chiffres affiché par votre application d'authentification."
            : "Saisissez l'un des codes de secours obtenus lors de l'activation."}
        </p>
      </div>
      {error ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {error}
        </Callout>
      ) : null}
      <FormField id="code" label={mode === "totp" ? "Code" : "Code de secours"}>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoComplete="one-time-code"
          inputMode={mode === "totp" ? "numeric" : "text"}
          className="h-10 font-mono text-base tracking-[0.3em]"
          maxLength={mode === "totp" ? 7 : 32}
          required
        />
      </FormField>
      <div className="flex items-center gap-2">
        <Checkbox id="trust" checked={trust} onCheckedChange={(v) => setTrust(v === true)} />
        <Label htmlFor="trust" className="font-normal">
          Faire confiance à cet appareil pendant 30 jours
        </Label>
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || code.trim().length < 6}
      >
        {pending ? "Vérification…" : "Valider"}
      </Button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => {
            setMode(mode === "totp" ? "backup" : "totp");
            setCode("");
            setError(null);
          }}
        >
          {mode === "totp" ? "Utiliser un code de secours" : "Utiliser l'application"}
        </button>
        <Link href="/connexion" className="text-muted-foreground hover:text-foreground">
          Retour
        </Link>
      </div>
    </form>
  );
}
