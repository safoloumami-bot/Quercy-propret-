"use client";

import type { EntityKey, FieldDef } from "@quercy/core";
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
import { Label } from "@quercy/ui/components/label";
import { toast } from "@quercy/ui/components/toaster";
import * as React from "react";

import { errorMessage, isPlanLimitError } from "@/lib/trpc";

import { FieldEditor } from "./field-editor";
import type { Row } from "./types";
import { useRecordMutations } from "./use-record-mutations";

/** Création rapide : champs obligatoires et principaux ; le reste se complète sur la fiche. */
export function CreateRecordDialog({
  entity,
  fields,
  open,
  onOpenChange,
  labels,
  onCreated,
  openAfterCreate = false,
  defaults,
}: {
  entity: EntityKey;
  fields: FieldDef[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: { singular: string; feminine: boolean };
  onCreated: (row: Row) => void;
  /** Ouvre la fiche aussitôt créée (documents : les lignes se saisissent sur leur écran). */
  openAfterCreate?: boolean;
  defaults?: Record<string, unknown>;
}) {
  const { create } = useRecordMutations(entity);
  // Valeurs par défaut du registre (statut, priorité…), puis celles du contexte (colonne, date).
  const initial = React.useCallback(
    () => ({
      ...Object.fromEntries(
        fields
          .filter((f) => f.defaultValue !== undefined)
          .map((f) => [
            f.key,
            f.defaultValue === "today" ? new Date().toISOString().slice(0, 10) : f.defaultValue,
          ]),
      ),
      ...defaults,
    }),
    [fields, defaults],
  );
  const [values, setValues] = React.useState<Record<string, unknown>>(initial);
  const [formKey, setFormKey] = React.useState(0);
  const shown = fields.filter(
    (f) => f.editable && (f.required || f.defaultVisible) && f.key !== "ownerId",
  );
  const fieldErrors =
    (create.error as { data?: { fieldErrors?: Record<string, string> | null } } | null)?.data
      ?.fieldErrors ?? {};

  React.useEffect(() => {
    if (open) {
      setValues(initial());
      setFormKey((k) => k + 1);
      create.reset();
    }
    // Réinitialisation à chaque ouverture seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    create.mutate(
      { entity, values },
      {
        onSuccess: (row) => {
          onOpenChange(false);
          if (openAfterCreate) {
            onCreated(row as Row);
            return;
          }
          toast.success(
            `${labels.singular} « ${row.title} » ${labels.feminine ? "créée" : "créé"}.`,
            {
              action: { label: "Ouvrir", onClick: () => onCreated(row as Row) },
            },
          );
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form key={formKey} onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>
              {labels.feminine ? "Nouvelle" : "Nouveau"} {labels.singular.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              Les autres informations se complètent ensuite sur la fiche.
            </DialogDescription>
          </DialogHeader>
          {create.error && Object.keys(fieldErrors).length === 0 ? (
            <Callout variant="danger">
              {errorMessage(create.error)}
              {isPlanLimitError(create.error)
                ? " Voir la page Facturation pour changer d'offre."
                : ""}
            </Callout>
          ) : null}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {shown.map((field, index) => (
              <div
                key={field.key}
                className={
                  field.type === "longtext" || field.type === "relation"
                    ? "col-span-2 space-y-1.5"
                    : "space-y-1.5"
                }
              >
                <Label htmlFor={`create-${field.key}`}>
                  {field.label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>
                <FieldEditor
                  id={`create-${field.key}`}
                  field={field}
                  value={values[field.key] ?? null}
                  autoFocus={index === 0}
                  onCommit={(value) => setValues((v) => ({ ...v, [field.key]: value }))}
                  className="h-8"
                />
                {fieldErrors[field.key] ? (
                  <p className="text-xs text-destructive" role="alert">
                    {fieldErrors[field.key]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
