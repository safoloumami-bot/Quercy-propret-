"use client";

import { ENTITIES, type EntityKey, type RelatedList as RelatedDef, recordPath } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useAccess } from "@/components/shell/access-context";
import { useTRPC } from "@/lib/trpc";

import { CreateRecordDialog } from "./create-dialog";
import { FieldDisplay } from "./field-display";
import type { Row } from "./types";

/** Onglets de listes liées visibles (module actif et droit de lecture). */
export function useRelatedLists(entity: EntityKey): RelatedDef[] {
  const { allows } = useAccess();
  return (ENTITIES[entity].related ?? []).filter((r) => allows(ENTITIES[r.entity].module, "view"));
}

/**
 * Fiches liées à l'enregistrement courant (vue 360° : contacts, opportunités, factures…),
 * avec création rapide déjà rattachée.
 */
export function RelatedList({ related, id }: { related: RelatedDef; id: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const { allows } = useAccess();
  const def = ENTITIES[related.entity];
  const [creating, setCreating] = React.useState(false);
  const input = {
    entity: related.entity,
    filter: { combinator: "and" as const, rules: [] },
    and: { field: related.field, operator: "in" as const, value: [id] },
    sort: [],
    limit: 100,
  };
  const list = useQuery(trpc.records.list.queryOptions(input));
  // Colonnes résumées : champs visibles par défaut, hors titre et hors lien vers la fiche.
  const columns = def.fields
    .filter((f) => f.defaultVisible && !def.titleFields.includes(f.key) && f.key !== related.field)
    .slice(0, 3);
  const canCreate = allows(def.module, "create");
  const noun = def.labelPlural.toLowerCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {list.data
            ? `${list.data.total} ${list.data.total > 1 ? noun : def.label.toLowerCase()}`
            : " "}
        </p>
        {canCreate ? (
          <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
            <PlusIcon />
            {def.feminine ? "Nouvelle" : "Nouveau"} {def.label.toLowerCase()}
          </Button>
        ) : null}
      </div>
      {list.isPending ? (
        <Skeleton className="h-16" />
      ) : (list.data?.rows.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          {def.feminine ? "Aucune" : "Aucun"} {def.label.toLowerCase()} pour le moment.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {(list.data?.rows as Row[]).map((row) => (
            <li key={row.id}>
              <Link
                href={recordPath(related.entity, row.id)}
                className="grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] items-center gap-3 px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="truncate font-medium">{row.title}</span>
                {columns.map((f) => (
                  <span key={f.key} className="min-w-0 truncate text-muted-foreground">
                    <FieldDisplay field={f} row={row} />
                  </span>
                ))}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CreateRecordDialog
        entity={related.entity}
        fields={def.fields}
        open={creating}
        onOpenChange={setCreating}
        labels={{ singular: def.label, feminine: def.feminine }}
        defaults={{ [related.field]: id }}
        openAfterCreate={Boolean(def.customPage)}
        onCreated={(row) => {
          if (def.customPage) router.push(recordPath(related.entity, row.id));
        }}
      />
    </div>
  );
}
