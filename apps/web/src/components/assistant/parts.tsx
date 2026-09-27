"use client";

import { formatCents } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { toast } from "@quercy/ui/components/toaster";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleSlashIcon,
  ClipboardCopyIcon,
  FileTextIcon,
  InfoIcon,
  Loader2Icon,
  SearchIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";

import { ReportChart, unitOf } from "@/components/dashboard/charts";
import type { AiPart } from "@/lib/ai-types";

import { Markdown } from "./markdown";

export type ActionState =
  | { status: "pending" }
  | { status: "confirmed"; result: { message: string; url?: string } | null }
  | { status: "rejected" }
  | { status: "failed"; error: string | null };

export interface PartHandlers {
  actions: Record<string, ActionState>;
  busyAction: string | null;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  /** Le tour est en cours : les outils affichés sont encore en exécution. */
  live: boolean;
}

export function Part({
  part,
  handlers,
  last,
}: {
  part: AiPart;
  handlers: PartHandlers;
  last: boolean;
}) {
  switch (part.type) {
    case "text":
      return <Markdown text={part.text} />;
    case "tool":
      return (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {handlers.live && last ? (
            <Loader2Icon className="size-3 animate-spin" aria-hidden />
          ) : (
            <SearchIcon className="size-3" aria-hidden />
          )}
          {part.label}
        </p>
      );
    case "table":
      return <TablePart part={part} />;
    case "chart":
      return <ChartPart part={part} />;
    case "action":
      return <ActionCard part={part} handlers={handlers} />;
    case "extraction":
      return <ExtractionCard part={part} />;
    case "notice":
      return (
        <Callout
          variant={part.tone}
          icon={part.tone === "info" ? <InfoIcon /> : <AlertTriangleIcon />}
        >
          <p>{part.text}</p>
        </Callout>
      );
  }
}

function TablePart({ part }: { part: Extract<AiPart, { type: "table" }> }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border">
      <figcaption className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-medium">
        {part.title}
      </figcaption>
      {part.rows.length > 0 ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background">
              <tr>
                {part.columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="px-3 py-1.5 text-left font-medium text-muted-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {part.rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  {row.cells.map((cell, i) => (
                    <td key={i} className="px-3 py-1.5 whitespace-nowrap tabular-nums">
                      {i === 0 ? (
                        <Link href={row.href} className="font-medium hover:underline">
                          {cell || "—"}
                        </Link>
                      ) : (
                        cell || "—"
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-3 py-3 text-xs text-muted-foreground">Aucune fiche ne correspond.</p>
      )}
      <div className="border-t border-border px-3 py-1.5 text-xs">
        <Link href={part.href} className="font-medium text-primary hover:underline">
          Ouvrir la liste filtrée ({part.total})
        </Link>
      </div>
    </figure>
  );
}

function ChartPart({ part }: { part: Extract<AiPart, { type: "chart" }> }) {
  const unit = unitOf(part.measureField);
  const reportHref = `/rapports/nouveau?definition=${encodeURIComponent(JSON.stringify(part.definition))}`;
  const compact = part.chart === "number";
  return (
    <figure className="rounded-lg border border-border p-3">
      <figcaption className="mb-2 text-xs font-medium">{part.title}</figcaption>
      <div className={compact ? "h-20" : "h-56"}>
        <ReportChart
          chart={part.chart}
          points={part.points}
          unit={unit}
          total={part.total}
          caption={part.title}
        />
      </div>
      <div className="mt-2 flex gap-4 text-xs">
        <Link href={part.href} className="font-medium text-primary hover:underline">
          Voir les fiches
        </Link>
        <Link href={reportHref} className="font-medium text-primary hover:underline">
          Ouvrir dans les rapports
        </Link>
      </div>
    </figure>
  );
}

function ActionCard({
  part,
  handlers,
}: {
  part: Extract<AiPart, { type: "action" }>;
  handlers: PartHandlers;
}) {
  const state = handlers.actions[part.actionId] ?? { status: "pending" };
  const [title, ...details] = part.summary.split("\n");
  const busy = handlers.busyAction === part.actionId;
  return (
    <section
      aria-label={`Action proposée : ${title}`}
      className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <ActionBadge state={state} />
      </div>
      {details.length > 0 ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      ) : null}
      {state.status === "pending" ? (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => handlers.onConfirm(part.actionId)} disabled={busy}>
            {busy ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
            Confirmer
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handlers.onReject(part.actionId)}
            disabled={busy}
          >
            Annuler
          </Button>
        </div>
      ) : null}
      {state.status === "confirmed" && state.result ? (
        <p className="text-xs">
          {state.result.message}{" "}
          {state.result.url ? (
            <Link href={state.result.url} className="font-medium text-primary hover:underline">
              Ouvrir
            </Link>
          ) : null}
        </p>
      ) : null}
      {state.status === "failed" ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </section>
  );
}

function ActionBadge({ state }: { state: ActionState }) {
  switch (state.status) {
    case "pending":
      return <Badge variant="warning">À confirmer</Badge>;
    case "confirmed":
      return (
        <Badge variant="success">
          <CheckCircle2Icon aria-hidden /> Exécutée
        </Badge>
      );
    case "rejected":
      return (
        <Badge>
          <CircleSlashIcon aria-hidden /> Annulée
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="danger">
          <XCircleIcon aria-hidden /> Échec
        </Badge>
      );
  }
}

const TYPES = {
  invoice: "Facture",
  credit_note: "Avoir",
  receipt: "Ticket / reçu",
  quote: "Devis",
  other: "Document",
} as const;

const money = (value: number | null) =>
  value === null ? "—" : formatCents(Math.round(value * 100));
const date = (value: string | null) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").reverse().join("/")
    : (value ?? "—");

/** Texte brut des données lues (copie vers la comptabilité ou un tableur). */
export function extractionText(part: Extract<AiPart, { type: "extraction" }>): string {
  const d = part.data;
  return [
    `${TYPES[d.documentType]} ${d.documentNumber ?? ""}`.trim(),
    `Fournisseur : ${d.supplierName ?? "—"}`,
    d.supplierSiret ? `SIRET : ${d.supplierSiret}` : null,
    d.supplierVatNumber ? `TVA intracom. : ${d.supplierVatNumber}` : null,
    `Date : ${date(d.issueDate)}`,
    d.dueDate ? `Échéance : ${date(d.dueDate)}` : null,
    `Total HT : ${money(d.totalExcludingTax)}`,
    ...d.vatLines.map((v) => `TVA ${v.rate} % : ${money(v.amount)} (base ${money(v.base)})`),
    `Total TVA : ${money(d.totalTax)}`,
    `Total TTC : ${money(d.totalIncludingTax)}`,
    d.paymentMethod ? `Règlement : ${d.paymentMethod}` : null,
    d.iban ? `IBAN : ${d.iban}` : null,
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/[\u00a0\u202f]/g, " ");
}

function ExtractionCard({ part }: { part: Extract<AiPart, { type: "extraction" }> }) {
  const d = part.data;
  const rows: [string, string][] = [
    ["Type", TYPES[d.documentType]],
    ["Fournisseur", d.supplierName ?? "—"],
    ["Numéro", d.documentNumber ?? "—"],
    ["Date", date(d.issueDate)],
    ["Échéance", date(d.dueDate)],
    ["Total HT", money(d.totalExcludingTax)],
    ["TVA", money(d.totalTax)],
    ["Total TTC", money(d.totalIncludingTax)],
  ];
  if (d.supplierSiret) rows.splice(2, 0, ["SIRET", d.supplierSiret]);
  return (
    <section
      aria-label={`Données lues : ${part.fileName}`}
      className="space-y-2 rounded-lg border border-border p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{part.fileName}</span>
        </p>
        {part.consistent === true ? (
          <Badge variant="success">Totaux cohérents</Badge>
        ) : part.consistent === false ? (
          <Badge variant="danger">Totaux incohérents</Badge>
        ) : (
          <Badge variant="warning">Totaux incomplets</Badge>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {d.vatLines.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {d.vatLines.map((v) => `TVA ${v.rate} % : ${money(v.amount)}`).join(" · ")}
        </p>
      ) : null}
      {d.notes ? <p className="text-xs text-warning">{d.notes}</p> : null}
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          navigator.clipboard
            .writeText(extractionText(part))
            .then(() => toast.success("Données copiées."))
            .catch(() => toast.error("Copie impossible : autorisez l'accès au presse-papiers."))
        }
      >
        <ClipboardCopyIcon aria-hidden />
        Copier les données
      </Button>
    </section>
  );
}
