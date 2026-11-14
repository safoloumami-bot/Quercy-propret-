"use client";

import { CHART_LABELS, ENTITIES, MODULES } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { MailIcon, PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { useTRPC } from "@/lib/trpc";

/** Écran des rapports : rapports enregistrés et modèles prêts à l'emploi. */
export function ReportList() {
  const trpc = useTRPC();
  const list = useQuery(trpc.reports.list.queryOptions());
  if (list.isPending) return <Skeleton className="h-64" />;
  const { presets, saved } = list.data ?? { presets: [], saved: [] };
  const modules = [...new Set(presets.map((p) => p.module))];

  return (
    <div className="space-y-8">
      <section aria-labelledby="saved-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="saved-title" className="text-base font-semibold">
            Rapports enregistrés
          </h2>
          <Button size="sm" asChild>
            <Link href="/rapports/nouveau">
              <PlusIcon />
              Nouveau rapport
            </Link>
          </Button>
        </div>
        {saved.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun rapport enregistré. Partez d&apos;un modèle ci-dessous ou créez le vôtre.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {saved.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/rapports/${r.id}`}
                  className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  <span className="font-medium">{r.name}</span>
                  {r.description ? (
                    <span className="text-sm text-muted-foreground">{r.description}</span>
                  ) : null}
                  <span className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline">{ENTITIES[r.definition.entity].labelPlural}</Badge>
                    <Badge variant="outline">{CHART_LABELS[r.definition.chart]}</Badge>
                    {r.shared ? (
                      <span className="inline-flex items-center gap-1">
                        <UsersIcon className="size-3" aria-hidden /> partagé
                      </span>
                    ) : null}
                    {r.schedule !== "none" ? (
                      <span className="inline-flex items-center gap-1">
                        <MailIcon className="size-3" aria-hidden />{" "}
                        {r.schedule === "weekly" ? "hebdomadaire" : "mensuel"}
                      </span>
                    ) : null}
                    {!r.mine ? <span>· par {r.owner}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modules.map((module) => (
        <section key={module} aria-labelledby={`presets-${module}`} className="space-y-3">
          <h2 id={`presets-${module}`} className="text-base font-semibold">
            Modèles — {MODULES[module].name}
          </h2>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
            {presets
              .filter((p) => p.module === module)
              .map((p) => (
                <li key={p.key}>
                  <Link
                    href={`/rapports/nouveau?modele=${p.key}`}
                    className="flex h-full flex-col gap-1 rounded-lg border border-dashed border-border p-4 text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ENTITIES[p.definition.entity].labelPlural} ·{" "}
                      {CHART_LABELS[p.definition.chart]}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
