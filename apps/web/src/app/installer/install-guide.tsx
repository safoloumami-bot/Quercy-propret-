"use client";

import { Button } from "@quercy/ui/components/button";
import { cn } from "@quercy/ui/lib/utils";
import {
  CheckIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  ShareIcon,
  SquarePlusIcon,
} from "lucide-react";
import * as React from "react";

type Device = "iphone" | "android" | "ordinateur";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detect(): Device {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1))
    return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "ordinateur";
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {n}
      </span>
      <span className="pt-0.5 text-[15px] leading-6">{children}</span>
    </li>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 align-middle text-sm font-medium [&_svg]:size-4">
      {children}
    </span>
  );
}

export function InstallGuide({
  name,
  path,
  apk,
  icon,
}: {
  name: string;
  path: string;
  apk: string;
  icon: string;
}) {
  const [device, setDevice] = React.useState<Device | null>(null);
  const [prompt, setPrompt] = React.useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [url, setUrl] = React.useState(path);

  React.useEffect(() => {
    setDevice(detect());
    setUrl(new URL(path, window.location.origin).toString());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [path]);

  const tabs: { key: Device; label: string }[] = [
    { key: "iphone", label: "iPhone" },
    { key: "android", label: "Samsung / Android" },
    { key: "ordinateur", label: "Ordinateur" },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- icône de l'application */}
        <img src={icon} alt="" width={64} height={64} className="size-16 rounded-2xl shadow-sm" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Installer {name}</h1>
          <p className="text-sm text-muted-foreground">
            Une icône sur votre téléphone, l&apos;application en plein écran, les mises à jour
            automatiques.
          </p>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Appareil"
        className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={device === t.key}
            onClick={() => setDevice(t.key)}
            className={cn(
              "rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors",
              device === t.key && "bg-background text-foreground shadow-xs",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {installed ? (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm">
          <CheckIcon className="size-4 text-primary" /> Application installée : retrouvez-la sur
          votre écran d&apos;accueil.
        </p>
      ) : null}

      {device === "iphone" ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Sur iPhone (avec Safari)</h2>
          <ol className="space-y-4">
            <Step n={1}>
              Ouvrez cette adresse dans <strong>Safari</strong> (pas dans une autre application) :{" "}
              <span className="break-all text-primary">{url}</span>
            </Step>
            <Step n={2}>
              Appuyez sur le bouton{" "}
              <Key>
                <ShareIcon /> Partager
              </Key>{" "}
              en bas de l&apos;écran (ou en haut sur iPad).
            </Step>
            <Step n={3}>
              Faites défiler et choisissez{" "}
              <Key>
                <SquarePlusIcon /> Sur l&apos;écran d&apos;accueil
              </Key>
              .
            </Step>
            <Step n={4}>
              Appuyez sur <Key>Ajouter</Key> : l&apos;icône {name} apparaît sur votre écran
              d&apos;accueil.
            </Step>
          </ol>
          <Button asChild className="w-full">
            <a href={path}>
              <ExternalLinkIcon /> Ouvrir {name}
            </a>
          </Button>
        </section>
      ) : null}

      {device === "android" ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Sur Samsung et Android</h2>
          {prompt ? (
            <Button
              className="w-full"
              size="lg"
              onClick={async () => {
                await prompt.prompt();
                const choice = await prompt.userChoice;
                if (choice.outcome === "accepted") setInstalled(true);
                setPrompt(null);
              }}
            >
              <DownloadIcon /> Installer {name}
            </Button>
          ) : null}
          <p className="text-sm font-medium">Avec Chrome ou Samsung Internet :</p>
          <ol className="space-y-4">
            <Step n={1}>
              Ouvrez cette adresse : <span className="break-all text-primary">{url}</span>
            </Step>
            <Step n={2}>
              Appuyez sur le menu{" "}
              <Key>
                <EllipsisVerticalIcon />
              </Key>{" "}
              (ou <Key>≡</Key> dans Samsung Internet).
            </Step>
            <Step n={3}>
              Choisissez <Key>Installer l&apos;application</Key> ou{" "}
              <Key>
                <SquarePlusIcon /> Ajouter à l&apos;écran d&apos;accueil
              </Key>
              , puis confirmez.
            </Step>
          </ol>
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Ou avec le fichier d&apos;installation (APK) :</p>
            <Button
              asChild
              variant="secondary"
              className="h-auto min-h-9 w-full py-2 whitespace-normal"
            >
              <a href={apk}>
                <DownloadIcon /> Télécharger {name} pour Android
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Ouvrez le fichier téléchargé. Si le téléphone le demande, autorisez « Installer des
              applications inconnues » pour votre navigateur, puis appuyez sur Installer.
            </p>
          </div>
        </section>
      ) : null}

      {device === "ordinateur" ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Sur ordinateur</h2>
          <ol className="space-y-4">
            <Step n={1}>
              Ouvrez <span className="break-all text-primary">{url}</span> dans Chrome ou Edge.
            </Step>
            <Step n={2}>
              Cliquez sur l&apos;icône d&apos;installation à droite de la barre d&apos;adresse, ou
              sur le menu puis <Key>Installer {name}</Key>.
            </Step>
          </ol>
          {prompt ? (
            <Button
              className="w-full"
              onClick={async () => {
                await prompt.prompt();
                setPrompt(null);
              }}
            >
              <DownloadIcon /> Installer {name}
            </Button>
          ) : (
            <Button asChild variant="secondary" className="w-full">
              <a href={path}>
                <ExternalLinkIcon /> Ouvrir {name}
              </a>
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            Pour un téléphone, ouvrez cette page directement sur le téléphone.
          </p>
        </section>
      ) : null}
    </main>
  );
}
