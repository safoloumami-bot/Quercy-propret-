"use client";

import type { EntityKey, FieldDef } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { CircleAlertIcon, DownloadIcon, FileUpIcon } from "lucide-react";
import * as React from "react";

import { errorMessage, useTRPC } from "@/lib/trpc";

import { useRecordMutations } from "./use-record-mutations";

type Step = "file" | "mapping" | "review" | "done";
const SKIP = "__skip__";
const MAX_ROWS = 5000;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Lit un CSV ou un fichier Excel côté navigateur : en-têtes + lignes de texte. */
async function readTable(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const sheet = await readSheet(file);
    const [headers = [], ...rows] = sheet.map((r) =>
      r.map((c) =>
        c === null || c === undefined
          ? ""
          : c instanceof Date
            ? c.toISOString().slice(0, 10)
            : String(c),
      ),
    );
    return { headers, rows };
  }
  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    delimiter: "",
  });
  const [headers = [], ...rows] = parsed.data;
  return { headers, rows };
}

/** Assistant d'import : fichier → correspondance des colonnes → vérification → import. */
export function ImportDialog({
  entity,
  fields,
  open,
  onOpenChange,
  labelPlural,
}: {
  entity: EntityKey;
  fields: FieldDef[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  labelPlural: string;
}) {
  const trpc = useTRPC();
  const { refresh } = useRecordMutations(entity);
  const importable = fields.filter((f) => f.editable);
  const [step, setStep] = React.useState<Step>("file");
  const [fileName, setFileName] = React.useState("");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<Record<number, string>>({});
  const [dragging, setDragging] = React.useState(false);
  const [readError, setReadError] = React.useState<string | null>(null);
  const run = useMutation(trpc.records.import.mutationOptions());

  React.useEffect(() => {
    if (!open) {
      setStep("file");
      setHeaders([]);
      setRows([]);
      setMapping({});
      setReadError(null);
      run.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function load(file: File) {
    setReadError(null);
    if (!/\.(csv|xlsx|txt)$/i.test(file.name))
      return setReadError("Formats acceptés : CSV ou Excel (.xlsx).");
    try {
      const table = await readTable(file);
      if (table.headers.length === 0 || table.rows.length === 0)
        return setReadError("Le fichier ne contient pas de lignes à importer.");
      if (table.rows.length > MAX_ROWS)
        return setReadError(
          `${MAX_ROWS.toLocaleString("fr-FR")} lignes maximum par import : découpez le fichier.`,
        );
      setFileName(file.name);
      setHeaders(table.headers);
      setRows(table.rows);
      // Correspondance automatique par libellé ou clé de champ.
      const auto: Record<number, string> = {};
      table.headers.forEach((h, i) => {
        const match = importable.find(
          (f) => normalize(f.label) === normalize(h) || normalize(f.key) === normalize(h),
        );
        if (match && !Object.values(auto).includes(match.key)) auto[i] = match.key;
      });
      setMapping(auto);
      setStep("mapping");
    } catch {
      setReadError(
        "Impossible de lire ce fichier. Vérifiez qu'il s'agit bien d'un CSV ou d'un fichier Excel.",
      );
    }
  }

  const mappedRows = () =>
    rows.map((r) =>
      Object.fromEntries(
        Object.entries(mapping)
          .filter(([, key]) => key !== SKIP)
          .map(([i, key]) => [key, (r[Number(i)] ?? "").trim()]),
      ),
    );

  function check() {
    run.mutate(
      { entity, rows: mappedRows(), dryRun: true },
      { onSuccess: () => setStep("review") },
    );
  }
  function execute() {
    run.mutate(
      { entity, rows: mappedRows(), dryRun: false },
      {
        onSuccess: (result) => {
          setStep("done");
          toast.success(
            `${result.imported} fiche${result.imported > 1 ? "s" : ""} importée${result.imported > 1 ? "s" : ""}.`,
          );
          void refresh();
        },
      },
    );
  }

  const template = `data:text/csv;charset=utf-8,${encodeURIComponent("\uFEFF" + importable.map((f) => f.label).join(";") + "\r\n")}`;
  const requiredMissing = importable.filter(
    (f) => f.required && !Object.values(mapping).includes(f.key),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importer des {labelPlural.toLowerCase()}</DialogTitle>
          <DialogDescription>
            {step === "file" &&
              "Fichier CSV ou Excel, une ligne par fiche, avec les en-têtes de colonnes en première ligne."}
            {step === "mapping" &&
              `${fileName} — ${rows.length.toLocaleString("fr-FR")} lignes. Associez chaque colonne à un champ.`}
            {step === "review" &&
              "Vérification terminée. Les lignes en erreur ne seront pas importées."}
            {step === "done" && "Import terminé."}
          </DialogDescription>
        </DialogHeader>

        {run.error ? (
          <Callout variant="danger" icon={<CircleAlertIcon />}>
            {errorMessage(run.error)}
          </Callout>
        ) : null}

        {step === "file" ? (
          <div className="space-y-3">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) void load(file);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-primary/50",
                dragging && "border-primary bg-primary/5",
              )}
            >
              <FileUpIcon className="size-6 text-primary" />
              <span className="text-sm font-medium">
                Glissez votre fichier ici ou cliquez pour le choisir
              </span>
              <span className="text-xs text-muted-foreground">
                CSV (séparateur « ; » ou « , ») ou Excel .xlsx — {MAX_ROWS.toLocaleString("fr-FR")}{" "}
                lignes maximum
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void load(file);
                }}
              />
            </label>
            {readError ? (
              <Callout variant="danger" icon={<CircleAlertIcon />}>
                {readError}
              </Callout>
            ) : null}
            <Button variant="link" asChild>
              <a href={template} download={`modele-${labelPlural.toLowerCase()}.csv`}>
                <DownloadIcon />
                Télécharger un modèle de fichier
              </a>
            </Button>
          </div>
        ) : null}

        {step === "mapping" ? (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {requiredMissing.length > 0 ? (
              <Callout variant="warning" icon={<CircleAlertIcon />}>
                Champ obligatoire non associé : {requiredMissing.map((f) => f.label).join(", ")}.
              </Callout>
            ) : null}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Colonne du fichier</th>
                  <th className="pb-2 font-medium">Exemple</th>
                  <th className="pb-2 font-medium">Champ Quercy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {headers.map((h, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3 font-medium">{h || `Colonne ${i + 1}`}</td>
                    <td className="max-w-48 truncate py-1.5 pr-3 text-muted-foreground">
                      {rows[0]?.[i] ?? ""}
                    </td>
                    <td className="py-1.5">
                      <Select
                        value={mapping[i] ?? SKIP}
                        onValueChange={(v) => setMapping((m) => ({ ...m, [i]: v }))}
                      >
                        <SelectTrigger className="h-7 w-56" aria-label={`Champ pour ${h}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP}>Ne pas importer</SelectItem>
                          {importable.map((f) => (
                            <SelectItem
                              key={f.key}
                              value={f.key}
                              disabled={Object.entries(mapping).some(
                                ([j, k]) => k === f.key && Number(j) !== i,
                              )}
                            >
                              {f.label}
                              {f.required ? " *" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">
              Responsable : email ou nom d&apos;un membre. Entreprise : nom exact d&apos;une
              entreprise existante. Étiquettes : séparées par des virgules.
            </p>
          </div>
        ) : null}

        {step === "review" && run.data ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="success">{run.data.valid} ligne(s) prête(s)</Badge>
              {run.data.errors.length > 0 ? (
                <Badge variant="danger">{run.data.errors.length} ligne(s) en erreur</Badge>
              ) : null}
            </div>
            {run.data.errors.length > 0 ? (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
                {run.data.errors.slice(0, 100).map((e) => (
                  <li key={e.row} className="px-3 py-1.5">
                    <span className="font-medium">Ligne {e.row + 1}</span> : {e.messages.join(" ")}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {step === "done" && run.data ? (
          <Callout variant="success">
            {run.data.imported} fiche(s) importée(s)
            {run.data.errors.length > 0
              ? `, ${run.data.errors.length} ligne(s) ignorée(s) car invalides.`
              : "."}
          </Callout>
        ) : null}

        <DialogFooter>
          {step === "mapping" ? (
            <>
              <Button variant="ghost" onClick={() => setStep("file")}>
                Changer de fichier
              </Button>
              <Button onClick={check} disabled={run.isPending || requiredMissing.length > 0}>
                {run.isPending ? "Vérification…" : "Vérifier les données"}
              </Button>
            </>
          ) : step === "review" ? (
            <>
              <Button variant="ghost" onClick={() => setStep("mapping")}>
                Revenir aux colonnes
              </Button>
              <Button
                onClick={execute}
                disabled={run.isPending || !run.data || run.data.valid === 0}
              >
                {run.isPending ? "Import…" : `Importer ${run.data?.valid ?? 0} ligne(s)`}
              </Button>
            </>
          ) : (
            <Button
              variant={step === "done" ? "primary" : "ghost"}
              onClick={() => onOpenChange(false)}
            >
              {step === "done" ? "Terminé" : "Annuler"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
