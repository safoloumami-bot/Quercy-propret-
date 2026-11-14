"use client";

import type { EntityKey } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DownloadIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import * as React from "react";

import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} Mo`;
  return `${(bytes / 1024 ** 3).toFixed(2).replace(".", ",")} Go`;
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return FileImageIcon;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileTextIcon;
  return FileIcon;
}

/** Pièces jointes : glisser-déposer, aperçu, téléchargement (liens signés), suppression. */
export function FilesTab({
  entity,
  id,
  canEdit,
}: {
  entity: EntityKey;
  id: string;
  canEdit: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const files = useQuery(trpc.files.list.queryOptions({ entity, id }));
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(0);
  const input = React.useRef<HTMLInputElement>(null);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.files.list.queryKey({ entity, id }) });
  const remove = useMutation(
    trpc.files.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Fichier supprimé.");
        void invalidate();
      },
      onError: toastError,
    }),
  );

  async function upload(list: FileList | File[]) {
    const all = [...list];
    setUploading((n) => n + all.length);
    for (const file of all) {
      const form = new FormData();
      form.set("file", file);
      form.set("entity", entity);
      form.set("entityId", id);
      try {
        const response = await fetch("/api/files", { method: "POST", body: form });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) toast.error(`${file.name} : ${body.error ?? "envoi impossible."}`);
      } catch {
        toast.error(`${file.name} : connexion interrompue, réessayez.`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    void invalidate();
  }

  return (
    <div
      className="space-y-3"
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDragging(false);
        void upload(e.dataTransfer.files);
      }}
    >
      {canEdit ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={cn(
            "flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border px-4 py-6 text-center text-sm transition-colors hover:border-primary/50",
            dragging && "border-primary bg-primary/5",
          )}
        >
          <UploadIcon className="size-5 text-primary" />
          <span className="font-medium">
            {uploading > 0
              ? `Envoi de ${uploading} fichier(s)…`
              : "Déposez des fichiers ou cliquez pour ajouter"}
          </span>
          <span className="text-xs text-muted-foreground">
            Images, PDF, documents bureautiques, CSV, ZIP — 25 Mo maximum
          </span>
          <input
            ref={input}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => e.target.files && void upload(e.target.files)}
          />
        </button>
      ) : null}
      {files.isPending ? (
        <Skeleton className="h-16" />
      ) : files.data && files.data.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {files.data.map((f) => {
            const Icon = iconFor(f.mimeType);
            return (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {f.name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(f.size)} · {f.uploadedBy} · {dateFmt.format(new Date(f.createdAt))}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a href={f.downloadUrl} aria-label={`Télécharger ${f.name}`}>
                    <DownloadIcon />
                  </a>
                </Button>
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove.mutate({ fileId: f.id })}
                    aria-label={`Supprimer ${f.name}`}
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun fichier.</p>
      )}
    </div>
  );
}
