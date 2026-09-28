"use client";

import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";
import { Input } from "@quercy/ui/components/input";
import { toast } from "@quercy/ui/components/toaster";
import { CopyIcon, DownloadIcon, ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";

import { SettingsSection } from "../section";

type Step =
  | { kind: "idle" }
  | { kind: "password"; purpose: "enable" | "disable" | "codes" }
  | { kind: "scan"; qr: string; secret: string; backupCodes: string[] }
  | { kind: "codes"; backupCodes: string[] };

function BackupCodes({ codes }: { codes: string[] }) {
  const text = codes.join("\n");
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-muted p-3 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            navigator.clipboard.writeText(text).then(() => toast.success("Codes copiés."))
          }
        >
          <CopyIcon />
          Copier
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
            download="quercy-codes-de-secours.txt"
          >
            <DownloadIcon />
            Télécharger
          </a>
        </Button>
      </div>
    </div>
  );
}

export function TwoFactorSection({
  enabled,
  hasPassword,
}: {
  enabled: boolean;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>({ kind: "idle" });
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function close() {
    setStep({ kind: "idle" });
    setPassword("");
    setCode("");
    setError(null);
  }

  async function submitPassword() {
    if (step.kind !== "password") return;
    setPending(true);
    setError(null);
    if (step.purpose === "enable") {
      const { data, error: err } = await authClient.twoFactor.enable({ password });
      setPending(false);
      if (err || !data || data.method !== "totp") return setError(authErrorMessage(err));
      const qr = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 200 });
      const secret = new URL(data.totpURI).searchParams.get("secret") ?? "";
      setStep({ kind: "scan", qr, secret, backupCodes: data.backupCodes });
    } else if (step.purpose === "disable") {
      const { error: err } = await authClient.twoFactor.disable({ password });
      setPending(false);
      if (err) return setError(authErrorMessage(err));
      close();
      toast.success("Double authentification désactivée.");
      router.refresh();
    } else {
      const { data, error: err } = await authClient.twoFactor.generateBackupCodes({ password });
      setPending(false);
      if (err || !data) return setError(authErrorMessage(err));
      setStep({ kind: "codes", backupCodes: data.backupCodes });
    }
    setPassword("");
  }

  async function verify() {
    setPending(true);
    setError(null);
    const { error: err } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, "") });
    setPending(false);
    if (err) return setError(authErrorMessage(err));
    close();
    toast.success("Double authentification activée.");
    router.refresh();
  }

  return (
    <>
      <SettingsSection
        id="two-factor"
        title="Double authentification"
        description="Un code à 6 chiffres, généré par une application (Google Authenticator, 1Password, Authy…), est demandé à chaque connexion sur un nouvel appareil."
        footer={
          !hasPassword ? null : enabled ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep({ kind: "password", purpose: "codes" })}
              >
                Nouveaux codes de secours
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStep({ kind: "password", purpose: "disable" })}
              >
                Désactiver
              </Button>
            </>
          ) : (
            <Button onClick={() => setStep({ kind: "password", purpose: "enable" })}>
              Activer
            </Button>
          )
        }
      >
        <div className="flex items-center gap-3">
          <ShieldCheckIcon
            className={enabled ? "size-5 text-success" : "size-5 text-muted-foreground"}
          />
          <span className="text-sm">{enabled ? "Activée sur votre compte." : "Non activée."}</span>
          {enabled ? <Badge variant="success">Protégé</Badge> : null}
        </div>
        {!hasPassword ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Définissez d&apos;abord un mot de passe pour activer la double authentification.
          </p>
        ) : null}
      </SettingsSection>

      <Dialog open={step.kind !== "idle"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent>
          {step.kind === "password" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitPassword();
              }}
              className="grid gap-4"
            >
              <DialogHeader>
                <DialogTitle>Confirmez votre mot de passe</DialogTitle>
                <DialogDescription>
                  Par sécurité, cette action demande votre mot de passe.
                </DialogDescription>
              </DialogHeader>
              {error ? <Callout variant="danger">{error}</Callout> : null}
              <FormField id="2fa-password" label="Mot de passe">
                <Input
                  id="2fa-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </FormField>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={close}>
                  Annuler
                </Button>
                <Button type="submit" disabled={pending || !password}>
                  Continuer
                </Button>
              </DialogFooter>
            </form>
          ) : null}

          {step.kind === "scan" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void verify();
              }}
              className="grid gap-4"
            >
              <DialogHeader>
                <DialogTitle>Scannez le QR code</DialogTitle>
                <DialogDescription>
                  Avec votre application d&apos;authentification, puis saisissez le code affiché.
                </DialogDescription>
              </DialogHeader>
              {error ? <Callout variant="danger">{error}</Callout> : null}
              <div className="flex items-start gap-5">
                {/* QR code généré localement (data URL) : next/image n'apporte rien ici. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step.qr}
                  alt="QR code de la double authentification"
                  width={160}
                  height={160}
                  className="rounded-md border border-border bg-white p-1"
                />
                <div className="min-w-0 space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Impossible de scanner ? Saisissez cette clé :
                  </p>
                  <code className="block rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-all">
                    {step.secret}
                  </code>
                </div>
              </div>
              <FormField id="totp" label="Code à 6 chiffres">
                <Input
                  id="totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono tracking-[0.3em]"
                  maxLength={7}
                  autoFocus
                />
              </FormField>
              <div className="space-y-2">
                <p className="text-sm font-medium">Codes de secours</p>
                <p className="text-sm text-muted-foreground">
                  Gardez-les en lieu sûr : chacun permet une connexion si vous perdez votre
                  téléphone.
                </p>
                <BackupCodes codes={step.backupCodes} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={close}>
                  Annuler
                </Button>
                <Button type="submit" disabled={pending || code.replace(/\s/g, "").length !== 6}>
                  Activer
                </Button>
              </DialogFooter>
            </form>
          ) : null}

          {step.kind === "codes" ? (
            <div className="grid gap-4">
              <DialogHeader>
                <DialogTitle>Nouveaux codes de secours</DialogTitle>
                <DialogDescription>Les anciens codes ne fonctionnent plus.</DialogDescription>
              </DialogHeader>
              <BackupCodes codes={step.backupCodes} />
              <DialogFooter>
                <Button onClick={close}>J&apos;ai conservé mes codes</Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
