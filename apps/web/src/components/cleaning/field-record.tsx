"use client";

import { Badge } from "@quercy/ui/components/badge";
import { Callout } from "@quercy/ui/components/callout";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon, XIcon } from "lucide-react";
import Link from "next/link";

import { errorMessage, useTRPC } from "@/lib/trpc";

const time = (d: Date | string) =>
  new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayTime = (d: Date | string) =>
  new Date(d).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Relevé terrain d'une intervention, tel que l'agent l'a saisi dans l'application :
 * qui l'a faite, points de contrôle, photos, consommables, journal et anomalies.
 */
export function FieldRecord({ interventionId }: { interventionId: string }) {
  const trpc = useTRPC();
  const record = useQuery(trpc.fieldRecord.get.queryOptions({ interventionId }));
  if (record.isPending) return <Skeleton className="h-48" />;
  if (record.error) return <Callout variant="warning">{errorMessage(record.error)}</Callout>;
  const { agents, areas, consumables, photos, journal, anomalies } = record.data;
  const done = areas.flatMap((a) => a.tasks).filter((t) => t.done).length;
  const total = areas.flatMap((a) => a.tasks).length;
  const empty = total === 0 && photos.length === 0 && journal.length === 0;

  return (
    <div className="space-y-5 text-sm">
      <section className="flex flex-wrap gap-x-6 gap-y-1">
        <p>
          <span className="text-muted-foreground">Prévu : </span>
          {agents.planned ?? "—"}
        </p>
        {agents.replacement ? (
          <p>
            <span className="text-muted-foreground">Remplaçant : </span>
            {agents.replacement}
          </p>
        ) : null}
        <p>
          <span className="text-muted-foreground">Réalisé par : </span>
          {agents.actual ?? "—"}
        </p>
      </section>

      {empty ? (
        <p className="text-muted-foreground">
          Rien n&apos;a encore été saisi depuis l&apos;application terrain pour ce passage.
        </p>
      ) : null}

      {anomalies.length ? (
        <section>
          <h3 className="mb-1.5 font-medium">Anomalies ({anomalies.length})</h3>
          <ul className="space-y-1">
            {anomalies.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <CircleAlertIcon className="size-4 text-warning-text" aria-hidden />
                <Link href={`/nettoyage/anomalies?id=${a.id}`} className="hover:underline">
                  {a.typeLabel}
                  {a.location ? ` — ${a.location}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {total ? (
        <section>
          <h3 className="mb-1.5 font-medium">
            Contrôle{" "}
            <span className="font-normal text-muted-foreground tabular-nums">
              {done} / {total}
            </span>
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {areas.map((area) => (
              <div key={area.area} className="rounded-md border border-border">
                <p className="border-b border-border bg-muted/40 px-3 py-1.5 font-medium">
                  {area.area}
                </p>
                <ul className="divide-y">
                  {area.tasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-2 px-3 py-1.5">
                      {t.done ? (
                        <CheckIcon className="mt-0.5 size-4 text-success-text" aria-label="Fait" />
                      ) : (
                        <XIcon
                          className="mt-0.5 size-4 text-destructive-text"
                          aria-label="Non fait"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p>
                          {t.label}
                          {t.critical ? (
                            <Badge variant="warning" className="ml-1.5">
                              Critique
                            </Badge>
                          ) : null}
                        </p>
                        {t.reason ? <p className="text-muted-foreground">{t.reason}</p> : null}
                      </div>
                      {t.doneAt ? (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {time(t.doneAt)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {photos.length ? (
        <section>
          <h3 className="mb-1.5 font-medium">Photos ({photos.length})</h3>
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- lien signé et expirant */}
                <img
                  src={p.url}
                  alt={`${p.area ?? "Photo"} — ${p.type === "photo_after" ? "après" : "avant"}`}
                  className="size-24 rounded-md border border-border object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-background/85 px-1 text-xs">
                  {p.area ? `${p.area} · ` : ""}
                  {p.type === "photo_after" ? "après" : "avant"}
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {consumables.length ? (
        <section>
          <h3 className="mb-1.5 font-medium">Consommables posés</h3>
          <ul className="space-y-0.5">
            {consumables.map((c) => (
              <li key={c.label}>
                {c.label} : <span className="tabular-nums">{c.quantity}</span>
                {c.unit ? ` ${c.unit}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {journal.length ? (
        <section>
          <h3 className="mb-1.5 font-medium">Journal</h3>
          <ol className="space-y-0.5">
            {journal.map((j, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-28 shrink-0 text-muted-foreground tabular-nums">
                  {dayTime(j.at)}
                </span>
                <span>
                  {j.label}
                  {j.detail ? ` — ${j.detail}` : ""}
                  {j.by ? <span className="text-muted-foreground"> ({j.by})</span> : null}
                  {j.offline ? (
                    <Badge variant="neutral" className="ml-1.5">
                      hors réseau
                    </Badge>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
