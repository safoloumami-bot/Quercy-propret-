"use client";

import { type EntityKey, type FieldDef, auditActionLabel } from "@quercy/core";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/lib/trpc";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function show(field: FieldDef | undefined, value: unknown): string {
  if (value === null || value === undefined || value === "") return "vide";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "vide";
  if (field?.type === "select")
    return field.options?.find((o) => o.value === value)?.label ?? String(value);
  if (field?.type === "user" || field?.type === "relation") return "modifié";
  if (field?.type === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return dateFmt.format(new Date(value));
  return String(value);
}

/** Historique de la fiche : qui a changé quoi, quand, avec l'ancienne et la nouvelle valeur. */
export function HistoryTab({
  entity,
  id,
  fields,
}: {
  entity: EntityKey;
  id: string;
  fields: FieldDef[];
}) {
  const trpc = useTRPC();
  const history = useQuery(trpc.audit.forRecord.queryOptions({ entity, id }));
  const byKey = new Map(fields.map((f) => [f.key, f]));
  if (history.isPending) return <Skeleton className="h-24" />;
  if (!history.data || history.data.length === 0)
    return <p className="text-sm text-muted-foreground">Aucun historique.</p>;
  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {history.data.map((entry) => (
        <li key={entry.id} className="space-y-1">
          <span
            className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-background bg-muted-foreground/40"
            aria-hidden
          />
          <p className="text-sm">
            <span className="font-medium">{entry.actor?.name ?? "Système"}</span>{" "}
            {auditActionLabel(entry.action)}
            {entry.impersonated ? (
              <span className="text-xs text-warning"> (assistance)</span>
            ) : null}
          </p>
          {entry.changes ? (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {Object.entries(entry.changes).map(([key, change]) => {
                const field = byKey.get(key);
                return (
                  <li key={key}>
                    {field?.label ?? key} :{" "}
                    <span className="line-through">{show(field, change.before)}</span> →{" "}
                    <span className="text-foreground">{show(field, change.after)}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {dateFmt.format(new Date(entry.createdAt))}
          </p>
        </li>
      ))}
    </ol>
  );
}
