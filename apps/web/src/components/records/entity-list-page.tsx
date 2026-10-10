"use client";

import { ENTITIES, type EntityKey, type FieldDef, entityPath, recordPath } from "@quercy/core";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@quercy/ui/components/sheet";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CreateRecordDialog } from "./create-dialog";
import { DataTable } from "./data-table";
import { ImportDialog } from "./import-dialog";
import { RecordView } from "./record-view";
import { TrashDialog } from "./trash-dialog";
import type { EntityPermissions, Row } from "./types";

/** Écran de liste d'une entité : tableau, panneau de détail, création, import, corbeille. */
export function EntityListPage({
  entity,
  fields,
  permissions,
  meId,
}: {
  entity: EntityKey;
  fields: FieldDef[];
  permissions: EntityPermissions;
  meId: string;
}) {
  const def = ENTITIES[entity];
  const router = useRouter();
  const [panelId, setPanelId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [createDefaults, setCreateDefaults] = React.useState<Record<string, unknown>>({});
  const [importing, setImporting] = React.useState(false);
  const [trash, setTrash] = React.useState(false);
  const base = entityPath(entity);
  const labels = { singular: def.label, plural: def.labelPlural, feminine: def.feminine };

  // Les documents commerciaux s'ouvrent sur leur écran dédié (lignes, totaux, actions).
  const openPanel = React.useCallback(
    (row: Row) => (def.customPage ? router.push(recordPath(entity, row.id)) : setPanelId(row.id)),
    [def.customPage, router, entity],
  );
  const openPage = React.useCallback(
    (row: Row) => router.push(`${base}/${row.id}`),
    [router, base],
  );
  const create = React.useCallback((defaults?: Record<string, unknown>) => {
    setCreateDefaults(defaults ?? {});
    setCreating(true);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-end justify-between px-6 pt-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{def.labelPlural}</h1>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <DataTable
          entity={entity}
          fields={fields}
          permissions={permissions}
          labels={labels}
          onOpen={openPanel}
          onOpenPage={openPage}
          onCreate={create}
          onImport={def.customPage ? undefined : () => setImporting(true)}
          onTrash={() => setTrash(true)}
        />
      </div>

      <Sheet open={panelId !== null} onOpenChange={(open) => (open ? null : setPanelId(null))}>
        <SheetContent aria-describedby={undefined}>
          <SheetTitle className="sr-only">{def.label}</SheetTitle>
          <SheetDescription className="sr-only">Détail de la fiche sélectionnée</SheetDescription>
          {panelId ? (
            <RecordView
              key={panelId}
              entity={entity}
              id={panelId}
              fields={fields}
              permissions={permissions}
              mode="panel"
              meId={meId}
              onDeleted={() => setPanelId(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <CreateRecordDialog
        entity={entity}
        fields={fields}
        open={creating}
        onOpenChange={setCreating}
        labels={labels}
        defaults={createDefaults}
        openAfterCreate={Boolean(def.customPage)}
        onCreated={(row) =>
          def.customPage ? router.push(recordPath(entity, row.id)) : setPanelId(row.id)
        }
      />
      <ImportDialog
        entity={entity}
        fields={fields}
        open={importing}
        onOpenChange={setImporting}
        labelPlural={def.labelPlural}
      />
      <TrashDialog
        entity={entity}
        open={trash}
        onOpenChange={setTrash}
        labelPlural={def.labelPlural}
      />
    </div>
  );
}
