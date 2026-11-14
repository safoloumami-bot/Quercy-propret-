"use client";

import {
  type HistoryFieldKey,
  type HistoryKind,
  type SalesExtraction,
  extractionToHistoryRow,
  formatCents,
  guessHistoryMapping,
  historyFields,
  normalizeHistoryRows,
} from "@quercy/core";
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
import {
  CircleAlertIcon,
  DownloadIcon,
  FileUpIcon,
  HistoryIcon,
  LoaderCircleIcon,
  SparklesIcon,
} from "lucide-react";
import * as React from "react";

import { readTable } from "@/components/records/import-dialog";
import { useRecordMutations } from "@/components/records/use-record-mutations";
import { errorMessage, useTRPC } from "@/lib/trpc";

type Step = "file" | "mapping" | "review" | "done";
const SKIP = "__skip__";
const MAX_ROWS = 5000;
const MAX_PDFS = 30;
const PDF_TYPES = /\.(pdf|jpe?g|png|webp|gif)$/i;
/** Ordre des colonnes d'un lot de PDF lus par l'IA (une colonne par champ). */
const PDF_COLUMNS: HistoryFieldKey[] = [
  "number",
  "issueDate",
  "dueDate",
  "client",
  "subject",
  "totalExcl",
  "tax",
  "total",
  "vatRate",
  "paid",
  "invoiceNumber",
];
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" });

const COPY: Record<HistoryKind, { plural: string; one: string; feminine: boolean }> = {
  INVOICE: { plural: "factures", one: "facture", feminine: true },
  CREDIT_NOTE: { plural: "avoirs", one: "avoir", feminine: false },
  QUOTE: { plural: "devis", one: "devis", feminine: false },
};

const TEMPLATE: Record<HistoryKind, string> = {
  INVOICE: "Numéro;Date;Échéance;Client;Objet;Montant HT;Montant TVA;Montant TTC;Déjà payé",
  CREDIT_NOTE: "Numéro;Date;Client;Facture d'origine;Objet;Montant HT;Montant TVA;Montant TTC",
  QUOTE: "Numéro;Date;Validité;Client;Objet;Montant HT;Montant TVA;Montant TTC;Statut",
};

/**
 * Reprise de l'historique depuis un autre logiciel (Sellsy, Axonaut, Pennylane, EBP, Excel…) :
 * export CSV ou Excel → colonnes reconnues automatiquement → aperçu chiffré → import. Les
 * documents arrivent déjà émis, avec leur numéro et leur date d'origine.
 */
export function HistoryImportDialog({
  kind,
  open,
  onOpenChange,
}: {
  kind: HistoryKind;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const trpc = useTRPC();
  const entity = kind === "INVOICE" ? "invoice" : kind === "CREDIT_NOTE" ? "creditNote" : "quote";
  const { refresh } = useRecordMutations(entity);
  const fields = historyFields(kind);
  const copy = COPY[kind];
  const [step, setStep] = React.useState<Step>("file");
  const [fileName, setFileName] = React.useState("");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<Record<number, string>>({});
  const [dragging, setDragging] = React.useState(false);
  const [readError, setReadError] = React.useState<string | null>(null);
  /** Lecture des PDF en cours : fichiers lus sur total. */
  const [reading, setReading] = React.useState<{ done: number; total: number } | null>(null);
  const [notes, setNotes] = React.useState<string[]>([]);
  const run = useMutation(trpc.sales.importHistory.mutationOptions());

  React.useEffect(() => {
    if (!open) {
      setStep("file");
      setHeaders([]);
      setRows([]);
      setMapping({});
      setReadError(null);
      setNotes([]);
      setReading(null);
      run.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** PDF ou photos : chaque document est lu par l'IA, puis passe par le même aperçu. */
  async function loadPdfs(files: File[]) {
    if (files.length > MAX_PDFS)
      return setReadError(
        `${MAX_PDFS} documents au plus par lot. Pour un gros historique, l'export CSV ou Excel de votre ancien logiciel est plus rapide.`,
      );
    const fieldsHere = new Set(fields.map((f) => f.key));
    const columns = PDF_COLUMNS.filter((k) => fieldsHere.has(k));
    const table: string[][] = [];
    const found: string[] = [];
    setReading({ done: 0, total: files.length });
    for (const [i, file] of files.entries()) {
      const body = new FormData();
      body.set("file", file);
      try {
        const response = await fetch("/api/ventes/reprise", { method: "POST", body });
        const json = (await response.json().catch(() => ({}))) as {
          data?: SalesExtraction;
          error?: string;
        };
        if (!response.ok || !json.data) {
          found.push(`${file.name} : ${json.error ?? "lecture impossible."}`);
          // Plus de crédits ou service coupé : inutile d'insister sur les fichiers suivants.
          if ([402, 403, 503].includes(response.status)) break;
        } else {
          const row = extractionToHistoryRow(json.data);
          table.push(columns.map((k) => row[k] ?? ""));
          if (json.data.notes) found.push(`${file.name} : ${json.data.notes}`);
        }
      } catch {
        found.push(`${file.name} : connexion interrompue.`);
      }
      setReading({ done: i + 1, total: files.length });
    }
    setReading(null);
    setNotes(found);
    if (table.length === 0) return setReadError(found[0] ?? "Aucun document n'a pu être lu.");
    setFileName(
      `${table.length} document${table.length > 1 ? "s" : ""} lu${table.length > 1 ? "s" : ""}`,
    );
    setHeaders(columns.map((k) => fields.find((f) => f.key === k)?.label ?? k));
    setRows(table);
    setMapping(Object.fromEntries(columns.map((k, i) => [i, k])));
    setStep("mapping");
  }

  function pick(list: FileList | null | undefined) {
    const files = [...(list ?? [])];
    if (files.length === 0) return;
    if (files.every((f) => PDF_TYPES.test(f.name))) return void loadPdfs(files);
    if (files.length > 1)
      return setReadError("Un seul fichier CSV ou Excel à la fois (ou plusieurs PDF).");
    void load(files[0]!);
  }

  async function load(file: File) {
    setReadError(null);
    if (!/\.(csv|xlsx|txt)$/i.test(file.name))
      return setReadError(
        "Formats acceptés : CSV, Excel (.xlsx), PDF ou photos. Depuis votre ancien logiciel, cherchez « Exporter » dans la liste des factures.",
      );
    try {
      const table = await readTable(file);
      if (table.headers.length === 0 || table.rows.length === 0)
        return setReadError("Le fichier ne contient pas de lignes à importer.");
      if (table.rows.length > MAX_ROWS)
        return setReadError(
          `${MAX_ROWS.toLocaleString("fr-FR")} lignes maximum par import : découpez le fichier par année.`,
        );
      setFileName(file.name);
      setHeaders(table.headers);
      setRows(table.rows);
      setMapping(guessHistoryMapping(table.headers, kind));
      setStep("mapping");
    } catch {
      setReadError(
        "Impossible de lire ce fichier. Vérifiez qu'il s'agit bien d'un CSV ou d'un fichier Excel.",
      );
    }
  }

  const parsed = React.useMemo(() => {
    const mapped = rows.map(
      (r) =>
        Object.fromEntries(
          Object.entries(mapping)
            .filter(([, key]) => key !== SKIP)
            .map(([i, key]) => [key, r[Number(i)] ?? ""]),
        ) as Partial<Record<HistoryFieldKey, string>>,
    );
    return normalizeHistoryRows(kind, mapped);
  }, [rows, mapping, kind]);

  const mapped = new Set(Object.values(mapping));
  const missing = fields.filter((f) => f.required && !mapped.has(f.key));
  const amounts = ["totalExcl", "tax", "total", "vatRate"].filter((k) => mapped.has(k)).length;
  const amountsMissing = amounts < 2;
  const totals = parsed.rows.reduce(
    (acc, r) => ({ ht: acc.ht + r.totalExclCents, ttc: acc.ttc + r.totalCents }),
    { ht: 0, ttc: 0 },
  );

  const payload = () => parsed.rows.map(({ line: _line, ...r }) => r);

  function check() {
    run.mutate(
      { kind, rows: payload(), dryRun: true, filename: fileName },
      { onSuccess: () => setStep("review") },
    );
  }
  function execute() {
    run.mutate(
      { kind, rows: payload(), dryRun: false, filename: fileName },
      {
        onSuccess: (result) => {
          setStep("done");
          toast.success(
            `${result.imported} ${result.imported > 1 ? copy.plural : copy.one} repris${copy.feminine ? (result.imported > 1 ? "es" : "e") : ""}.`,
          );
          void refresh();
        },
      },
    );
  }

  const template = `data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + TEMPLATE[kind] + "\r\n")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Reprendre vos {copy.plural} existant{copy.feminine ? "e" : ""}s
          </DialogTitle>
          <DialogDescription>
            {step === "file" &&
              `Importez l'export de votre ancien logiciel ou votre tableau Excel : vos ${copy.plural} arrivent avec leur numéro, leur date et leur client d'origine.`}
            {step === "mapping" &&
              `${fileName} — ${rows.length.toLocaleString("fr-FR")} lignes. Les colonnes reconnues sont déjà associées : vérifiez puis continuez.`}
            {step === "review" && "Dernière vérification avant l'import."}
            {step === "done" && "Reprise terminée."}
          </DialogDescription>
        </DialogHeader>

        {run.error ? (
          <Callout variant="danger" icon={<CircleAlertIcon />}>
            {errorMessage(run.error)}
          </Callout>
        ) : null}

        {step === "file" ? (
          <div className="space-y-4">
            {reading ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-10 text-center">
                <LoaderCircleIcon className="size-6 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  Lecture des documents : {reading.done} sur {reading.total}
                </span>
                <span className="h-1.5 w-48 rounded-full bg-muted">
                  <span
                    className="block h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${(reading.done / reading.total) * 100}%` }}
                  />
                </span>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pick(e.dataTransfer.files);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary/50",
                  dragging && "border-primary bg-primary/5",
                )}
              >
                <FileUpIcon className="size-6 text-primary" />
                <span className="text-sm font-medium">
                  Glissez votre fichier ici ou cliquez pour le choisir
                </span>
                <span className="text-xs text-muted-foreground">
                  Export CSV ou Excel (jusqu&apos;à {MAX_ROWS.toLocaleString("fr-FR")} lignes), ou
                  jusqu&apos;à {MAX_PDFS} PDF et photos lus automatiquement
                </span>
                <input
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.txt,.pdf,.jpg,.jpeg,.png,.webp,.gif,text/csv,application/pdf,image/*,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={(e) => pick(e.target.files)}
                />
              </label>
            )}
            {readError ? (
              <Callout variant="danger" icon={<CircleAlertIcon />}>
                {readError}
              </Callout>
            ) : null}
            <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <li className="rounded-md bg-muted/50 p-3">
                <span className="mb-1 block font-medium text-foreground">
                  <SparklesIcon className="mr-1 inline size-3 text-primary" />
                  Tout est reconnu
                </span>
                Exports Sellsy, Axonaut, Pennylane, EBP, Henrri, Tiime, Excel… ou simples PDF, lus
                par l&apos;IA (3 crédits par document).
              </li>
              <li className="rounded-md bg-muted/50 p-3">
                <span className="mb-1 block font-medium text-foreground">Rien en double</span>
                Un numéro déjà présent est ignoré : vous pouvez relancer l&apos;import sans risque.
              </li>
              <li className="rounded-md bg-muted/50 p-3">
                <span className="mb-1 block font-medium text-foreground">Aucun envoi</span>
                Pas de relance ni d&apos;e-mail aux clients, et pas de doublon dans l&apos;export
                comptable.
              </li>
            </ul>
            <Button variant="link" asChild className="px-0">
              <a href={template} download={`modele-reprise-${copy.plural}.csv`}>
                <DownloadIcon />
                Télécharger un modèle de fichier
              </a>
            </Button>
          </div>
        ) : null}

        {step === "mapping" ? (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto">
            {notes.length > 0 ? (
              <Callout variant="warning" icon={<CircleAlertIcon />}>
                <p className="font-medium">À vérifier :</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                  {notes.slice(0, 10).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </Callout>
            ) : null}
            {missing.length > 0 ? (
              <Callout variant="warning" icon={<CircleAlertIcon />}>
                À associer : {missing.map((f) => f.label).join(", ")}.
              </Callout>
            ) : amountsMissing ? (
              <Callout variant="warning" icon={<CircleAlertIcon />}>
                Associez au moins deux colonnes parmi Montant HT, Montant TVA, Montant TTC et Taux
                de TVA : sebt calcule la troisième.
              </Callout>
            ) : null}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Colonne du fichier</th>
                  <th className="pb-2 font-medium">Exemple</th>
                  <th className="pb-2 font-medium">Champ sebt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {headers.map((h, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3 font-medium">{h || `Colonne ${i + 1}`}</td>
                    <td className="max-w-48 truncate py-1.5 pr-3 text-muted-foreground">
                      {rows.find((r) => r[i])?.[i] ?? ""}
                    </td>
                    <td className="py-1.5">
                      <Select
                        value={mapping[i] ?? SKIP}
                        onValueChange={(v) => setMapping((m) => ({ ...m, [i]: v }))}
                      >
                        <SelectTrigger className="h-7 w-52" aria-label={`Champ pour ${h}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP}>Ne pas importer</SelectItem>
                          {fields.map((f) => (
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

            {missing.length === 0 && !amountsMissing && parsed.rows.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Aperçu</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Numéro</th>
                        <th className="px-3 py-1.5 font-medium">Date</th>
                        <th className="px-3 py-1.5 font-medium">Client</th>
                        <th className="px-3 py-1.5 text-right font-medium">HT</th>
                        <th className="px-3 py-1.5 text-right font-medium">TTC</th>
                        {kind === "INVOICE" ? (
                          <th className="px-3 py-1.5 text-right font-medium">Payé</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsed.rows.slice(0, 4).map((r) => (
                        <tr key={r.number}>
                          <td className="px-3 py-1.5 font-medium">{r.number}</td>
                          <td className="px-3 py-1.5">
                            {dateFormat.format(new Date(r.issueDate))}
                          </td>
                          <td className="max-w-40 truncate px-3 py-1.5">{r.client}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatCents(r.totalExclCents)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatCents(r.totalCents)}
                          </td>
                          {kind === "INVOICE" ? (
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {formatCents(r.paidCents)}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "review" && run.data ? (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">À importer</p>
                <p className="text-lg font-semibold tabular-nums">{run.data.imported}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Total HT</p>
                <p className="text-lg font-semibold tabular-nums">{formatCents(totals.ht)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Total TTC</p>
                <p className="text-lg font-semibold tabular-nums">{formatCents(totals.ttc)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {run.data.newClients.length > 0 ? (
                <Badge variant="info">
                  {run.data.newClients.length} client{run.data.newClients.length > 1 ? "s" : ""} à
                  créer
                </Badge>
              ) : null}
              {run.data.duplicates.length > 0 ? (
                <Badge variant="neutral">
                  {run.data.duplicates.length} déjà présent
                  {run.data.duplicates.length > 1 ? "s" : ""} (ignoré
                  {run.data.duplicates.length > 1 ? "s" : ""})
                </Badge>
              ) : null}
              {run.data.unlinked.length > 0 ? (
                <Badge variant="warning">
                  {run.data.unlinked.length} sans facture d&apos;origine retrouvée
                </Badge>
              ) : null}
              {parsed.errors.length > 0 ? (
                <Badge variant="danger">
                  {parsed.errors.length} ligne{parsed.errors.length > 1 ? "s" : ""} en erreur
                </Badge>
              ) : null}
            </div>
            {run.data.newClients.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Nouveaux clients : {run.data.newClients.slice(0, 8).join(", ")}
                {run.data.newClients.length > 8 ? "…" : ""}
              </p>
            ) : null}
            {parsed.errors.length > 0 ? (
              <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
                {parsed.errors.slice(0, 100).map((e) => (
                  <li key={e.row} className="px-3 py-1.5">
                    <span className="font-medium">Ligne {e.row + 2}</span> : {e.messages.join(" ")}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Les documents arrivent émis, étiquetés « reprise ». Ils ne déclenchent ni relance ni
              e-mail et ne sont pas repris dans l&apos;export FEC (ils sont déjà dans votre
              comptabilité).
            </p>
          </div>
        ) : null}

        {step === "done" && run.data ? (
          <Callout variant="success" icon={<HistoryIcon />}>
            {run.data.imported} document{run.data.imported > 1 ? "s" : ""} repris
            {run.data.newClients.length > 0
              ? `, ${run.data.newClients.length} client${run.data.newClients.length > 1 ? "s" : ""} créé${run.data.newClients.length > 1 ? "s" : ""}`
              : ""}
            {parsed.errors.length > 0
              ? `, ${parsed.errors.length} ligne${parsed.errors.length > 1 ? "s" : ""} ignorée${parsed.errors.length > 1 ? "s" : ""} car invalide${parsed.errors.length > 1 ? "s" : ""}.`
              : "."}
          </Callout>
        ) : null}

        <DialogFooter>
          {step === "mapping" ? (
            <>
              <Button variant="ghost" onClick={() => setStep("file")}>
                Changer de fichier
              </Button>
              <Button
                onClick={check}
                disabled={
                  run.isPending || missing.length > 0 || amountsMissing || parsed.rows.length === 0
                }
              >
                {run.isPending
                  ? "Vérification…"
                  : `Vérifier ${parsed.rows.length.toLocaleString("fr-FR")} ligne${parsed.rows.length > 1 ? "s" : ""}`}
              </Button>
            </>
          ) : step === "review" ? (
            <>
              <Button variant="ghost" onClick={() => setStep("mapping")}>
                Revenir aux colonnes
              </Button>
              <Button
                onClick={execute}
                disabled={run.isPending || !run.data || run.data.imported === 0}
              >
                {run.isPending
                  ? "Import…"
                  : `Importer ${run.data?.imported ?? 0} document${(run.data?.imported ?? 0) > 1 ? "s" : ""}`}
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
