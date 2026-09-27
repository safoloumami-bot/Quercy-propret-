"use client";

import { ENTITIES, type EntityKey, type FieldDef } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@quercy/ui/components/tabs";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  LinkIcon,
  LoaderIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRecordTabs } from "@/components/shell/record-tabs";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { CommentsTab } from "./comments-tab";
import { FieldDisplay } from "./field-display";
import { FieldEditor } from "./field-editor";
import { FilesTab } from "./files-tab";
import { HistoryTab } from "./history-tab";
import { Presence } from "./presence";
import { RelatedContacts } from "./related-contacts";
import type { EntityPermissions } from "./types";
import { useRecordMutations } from "./use-record-mutations";

function FieldRow({
  field,
  row,
  canEdit,
  onSave,
}: {
  field: FieldDef;
  row: Parameters<typeof FieldDisplay>[0]["row"];
  canEdit: boolean;
  onSave: (key: string, value: unknown) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const editable = canEdit && field.editable;
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-1.5">
      <dt className="pt-1 text-sm text-muted-foreground">{field.label}</dt>
      <dd className="min-w-0">
        {editing ? (
          <FieldEditor
            field={field}
            value={row[field.key]}
            onCommit={(value) => {
              setEditing(false);
              onSave(field.key, value);
            }}
            onCancel={() => setEditing(false)}
            className="h-8"
          />
        ) : (
          <button
            type="button"
            disabled={!editable}
            onClick={() => setEditing(true)}
            className={cn(
              "flex min-h-8 w-full items-center rounded-md px-2 text-left text-sm",
              editable &&
                "hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
            )}
            aria-label={editable ? `Modifier ${field.label}` : undefined}
          >
            <FieldDisplay field={field} row={row} />
          </button>
        )}
      </dd>
    </div>
  );
}

/**
 * Fiche d'un enregistrement (panneau latéral ou page). Chaque champ se modifie en place et
 * s'enregistre aussitôt ; l'historique conserve chaque modification.
 */
export function RecordView({
  entity,
  id,
  fields,
  permissions,
  mode,
  meId,
  initialTab,
  onDeleted,
}: {
  entity: EntityKey;
  id: string;
  fields: FieldDef[];
  permissions: EntityPermissions;
  mode: "panel" | "page";
  meId: string;
  initialTab?: string;
  onDeleted?: () => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const def = ENTITIES[entity];
  const record = useQuery(trpc.records.get.queryOptions({ entity, id }));
  const { update, remove } = useRecordMutations(entity);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const { open: openTab } = useRecordTabs();
  const url = `/${def.module}/${def.slug}/${id}`;
  const title = record.data?.row.title;

  React.useEffect(() => {
    if (mode === "page" && title) openTab({ href: url, title, entity });
  }, [mode, title, url, entity, openTab]);

  if (record.isPending) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (record.isError) {
    return (
      <div className="p-6">
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {errorMessage(record.error)}
        </Callout>
      </div>
    );
  }

  const { row, canEdit } = record.data;
  const badges = fields.filter((f) => f.type === "select" && !f.custom && row[f.key]);
  const detailFields = fields.filter((f) => !["createdAt", "updatedAt"].includes(f.key));

  function save(key: string, value: unknown) {
    setSaveState("saving");
    update.mutate(
      { entity, id, values: { [key]: value } },
      {
        onSuccess: () => {
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        },
        onError: () => setSaveState("idle"),
      },
    );
  }

  const details = (
    <section aria-label="Informations" className="space-y-1">
      <dl>
        {detailFields.map((f) => (
          <FieldRow
            key={f.key}
            field={f}
            row={row}
            canEdit={canEdit && permissions.update}
            onSave={save}
          />
        ))}
      </dl>
      <p className="pt-2 text-xs text-muted-foreground">
        Création : {new Date(String(row.createdAt)).toLocaleDateString("fr-FR")} · dernière
        modification :{" "}
        {new Date(String(row.updatedAt)).toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </p>
    </section>
  );

  const tabs = (
    <Tabs defaultValue={initialTab ?? (entity === "company" ? "contacts" : "commentaires")}>
      <TabsList>
        {entity === "company" ? <TabsTrigger value="contacts">Contacts</TabsTrigger> : null}
        <TabsTrigger value="commentaires">Commentaires</TabsTrigger>
        <TabsTrigger value="fichiers">Fichiers</TabsTrigger>
        <TabsTrigger value="historique">Historique</TabsTrigger>
      </TabsList>
      {entity === "company" ? (
        <TabsContent value="contacts">
          <RelatedContacts companyId={id} />
        </TabsContent>
      ) : null}
      <TabsContent value="commentaires">
        <CommentsTab entity={entity} id={id} />
      </TabsContent>
      <TabsContent value="fichiers">
        <FilesTab entity={entity} id={id} canEdit={canEdit && permissions.update} />
      </TabsContent>
      <TabsContent value="historique">
        <HistoryTab entity={entity} id={id} fields={fields} />
      </TabsContent>
    </Tabs>
  );

  return (
    <div
      className={cn("flex min-h-0 flex-col", mode === "page" && "mx-auto w-full max-w-[1600px]")}
    >
      <header
        className={cn(
          "flex items-start justify-between gap-4 border-b border-border",
          mode === "panel" ? "px-6 pt-5 pr-14 pb-4" : "px-8 py-6",
        )}
      >
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{def.label}</p>
          <h1
            className={cn(
              "truncate font-semibold tracking-tight",
              mode === "page" ? "text-2xl" : "text-xl",
            )}
          >
            {row.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {badges.map((f) => (
              <FieldDisplay key={f.key} field={f} row={row} />
            ))}
            <Presence presenceKey={`${entity}:${id}`} meId={meId} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className="mr-2 flex items-center gap-1 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {saveState === "saving" ? (
              <>
                <LoaderIcon className="size-3.5 animate-spin" /> Enregistrement…
              </>
            ) : saveState === "saved" ? (
              <>
                <CheckIcon className="size-3.5 text-success" /> Enregistré
              </>
            ) : null}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copier le lien de la fiche"
            onClick={() =>
              navigator.clipboard
                .writeText(`${window.location.origin}${url}`)
                .then(() => toast.success("Lien copié."))
            }
          >
            <LinkIcon />
          </Button>
          {mode === "panel" ? (
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href={url} aria-label="Ouvrir la fiche en pleine page">
                <ExternalLinkIcon />
              </Link>
            </Button>
          ) : null}
          {permissions.delete && canEdit ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setConfirmDelete(true)}
              aria-label="Mettre à la corbeille"
            >
              <Trash2Icon />
            </Button>
          ) : null}
        </div>
      </header>

      {mode === "page" ? (
        <div className="grid grid-cols-1 gap-10 px-8 py-6 xl:grid-cols-[minmax(380px,2fr)_3fr]">
          {details}
          <div className="min-w-0">{tabs}</div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {details}
          {tabs}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Mettre « ${row.title} » à la corbeille ?`}
        description="La fiche reste restaurable pendant 30 jours."
        confirmLabel="Mettre à la corbeille"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(
            { entity, ids: [id] },
            {
              onSuccess: () => {
                setConfirmDelete(false);
                if (onDeleted) onDeleted();
                else router.push(`/${def.module}/${def.slug}`);
              },
            },
          )
        }
      />
    </div>
  );
}
