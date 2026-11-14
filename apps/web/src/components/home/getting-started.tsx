"use client";

import { Button } from "@quercy/ui/components/button";
import { cn } from "@quercy/ui/lib/utils";
import { ArrowRightIcon, CheckIcon, HistoryIcon, RocketIcon, XIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import type { GettingStarted, StartStep } from "@/server/getting-started";

type Path = "fresh" | "switching";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la page seulement.
  }
}

/**
 * Premiers pas sur l'accueil. L'entreprise choisit son point de départ (« je démarre » ou
 * « je viens d'un autre logiciel ») ; chaque étape se coche d'elle-même quand c'est fait.
 */
export function GettingStartedCard({
  organizationId,
  data,
}: {
  organizationId: string;
  data: GettingStarted;
}) {
  const pathKey = `sebt:demarrage:${organizationId}`;
  const hiddenKey = `sebt:demarrage-masque:${organizationId}`;
  const [path, setPath] = React.useState<Path | null>(null);
  const [hidden, setHidden] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const saved = read(pathKey);
    setPath(
      saved === "fresh" || saved === "switching"
        ? saved
        : data.imported
          ? "switching"
          : data.hasData
            ? "fresh"
            : null,
    );
    setHidden(read(hiddenKey) === "1");
    setReady(true);
  }, [pathKey, hiddenKey, data.imported, data.hasData]);

  const choose = (p: Path | null) => {
    setPath(p);
    write(pathKey, p);
  };

  const steps: StartStep[] = path ? data[path] : [];
  const required = steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => s.done).length;
  const allDone = path !== null && doneCount === required.length;
  if (!ready || hidden || allDone) return null;
  const next = steps.find((s) => !s.done);

  return (
    <section
      aria-labelledby="demarrage-title"
      className="relative overflow-hidden rounded-xl border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          write(hiddenKey, "1");
        }}
        className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Masquer les premiers pas"
      >
        <XIcon className="size-4" />
      </button>

      {path === null ? (
        <div className="space-y-4 p-6">
          <div className="space-y-1 pr-8">
            <h2 id="demarrage-title" className="text-base font-semibold">
              Bien démarrer avec sebt
            </h2>
            <p className="text-sm text-muted-foreground">
              Dites-nous d&apos;où vous partez : on vous guide étape par étape.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => choose("fresh")}
              className="group flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <RocketIcon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">Je démarre mon activité</span>
                <span className="block text-sm text-muted-foreground">
                  sebt est mon premier outil : je fais tout à partir d&apos;ici.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => choose("switching")}
              className="group flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HistoryIcon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">Je viens d&apos;un autre outil</span>
                <span className="block text-sm text-muted-foreground">
                  Logiciel, Excel ou papier : je reprends mes clients et mes factures.
                </span>
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 pr-8">
            <div className="space-y-1">
              <h2 id="demarrage-title" className="text-base font-semibold">
                {path === "fresh" ? "Lancer votre activité avec sebt" : "Passer à sebt"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {doneCount} étape{doneCount > 1 ? "s" : ""} sur {required.length} ·{" "}
                <button
                  type="button"
                  onClick={() => choose(path === "fresh" ? "switching" : "fresh")}
                  className="underline-offset-2 hover:text-foreground hover:underline"
                >
                  {path === "fresh" ? "Vous venez d'un autre outil ?" : "Vous démarrez de zéro ?"}
                </button>
              </p>
            </div>
            {next ? (
              <Button size="sm" asChild>
                <Link href={next.href}>
                  {next.action}
                  <ArrowRightIcon />
                </Link>
              </Button>
            ) : null}
          </div>
          <div className="h-1.5 rounded-full bg-muted" aria-hidden>
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${(doneCount / Math.max(1, required.length)) * 100}%` }}
            />
          </div>
          <ol className="grid gap-2 lg:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className={cn(
                    "group flex h-full items-start gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-accent",
                    s.key === next?.key && "border-primary/40 bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                      s.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {s.done ? <CheckIcon className="size-3.5" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        s.done && "text-muted-foreground line-through decoration-1",
                      )}
                    >
                      {s.title}
                      {s.optional ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground no-underline">
                          facultatif
                        </span>
                      ) : null}
                    </span>
                    {s.done ? null : (
                      <span className="block text-sm text-muted-foreground">{s.description}</span>
                    )}
                  </span>
                  {s.done ? null : (
                    <ArrowRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
