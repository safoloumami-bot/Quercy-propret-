"use client";

import {
  DOCUMENT_ENTITY,
  DOCUMENT_TITLES,
  type DocumentKind,
  ENTITIES,
  type EntityKey,
  type FieldDef,
  PAYMENT_METHODS,
  computeTotals,
  entityPath,
  formatCents,
  recordPath,
} from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@quercy/ui/components/dropdown-menu";
import { Label } from "@quercy/ui/components/label";
import { Input } from "@quercy/ui/components/input";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@quercy/ui/components/tabs";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BanknoteIcon,
  CheckIcon,
  CircleAlertIcon,
  CopyIcon,
  FileDownIcon,
  LinkIcon,
  MailIcon,
  MoreHorizontalIcon,
  RepeatIcon,
  SaveIcon,
  SendIcon,
  StampIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { CommentsTab } from "@/components/records/comments-tab";
import { FieldDisplay } from "@/components/records/field-display";
import { FilesTab } from "@/components/records/files-tab";
import { HistoryTab } from "@/components/records/history-tab";
import { Presence } from "@/components/records/presence";
import { FieldRow } from "@/components/records/record-view";
import type { EntityPermissions } from "@/components/records/types";
import { useRecordTabs } from "@/components/shell/record-tabs";
import { useAssistantFocus } from "@/components/assistant/assistant-context";
import { OpenInWindowButton, PrintPdfButton } from "@/components/desktop-actions";
import { toastError } from "@/components/toast-error";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { PaymentDialog, RecurringDialog, SendDialog } from "./document-dialogs";
import { type EditableLine, LinesEditor, Totals, fromServer, toPayload } from "./lines-editor";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" });
const INTERNAL_FIELDS = new Set([
  "number",
  "status",
  "totalExclCents",
  "taxCents",
  "totalCents",
  "paidCents",
  "dueCents",
  "issueDate",
  "createdAt",
  "updatedAt",
]);

/** Écran d'un devis, d'une commande, d'une facture, d'un avoir ou d'un modèle récurrent. */
export function DocumentPage({
  entity,
  id,
  fields,
  permissions,
  meId,
}: {
  entity: EntityKey;
  id: string;
  fields: FieldDef[];
  permissions: EntityPermissions;
  meId: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  useAssistantFocus(entity, id);
  const def = ENTITIES[entity];
  const detail = useQuery(trpc.sales.document.queryOptions({ id }));
  const record = useQuery(trpc.records.get.queryOptions({ entity, id }));
  const { open: openTab } = useRecordTabs();

  const [lines, setLines] = React.useState<EditableLine[]>([]);
  const [dirty, setDirty] = React.useState(false);
  const [linesError, setLinesError] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [terms, setTerms] = React.useState("30");
  const [termsDirty, setTermsDirty] = React.useState(false);
  const [dialog, setDialog] = React.useState<
    null | "send" | "remind" | "payment" | "recurring" | "finalize" | "delete" | "credit"
  >(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const doc = detail.data?.doc;
  React.useEffect(() => {
    if (!doc) return;
    if (!dirty) setLines(fromServer(doc.lines));
    if (!termsDirty) {
      setNotes(doc.notes ?? "");
      setTerms(String(doc.paymentTermsDays));
    }
    // Resynchronisation à chaque version serveur, sauf saisie en cours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const title = record.data?.row.title;
  React.useEffect(() => {
    if (title) openTab({ href: recordPath(entity, id), title: `${def.label} ${title}`, entity });
  }, [title, entity, id, def.label, openTab]);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.sales.pathFilter()),
      queryClient.invalidateQueries(trpc.records.pathFilter()),
      queryClient.invalidateQueries(trpc.audit.pathFilter()),
    ]);
  const onError = (error: unknown) => {
    setActionError(errorMessage(error));
    toastError(error);
  };

  const saveLines = useMutation(trpc.sales.saveLines.mutationOptions({ onError }));
  const saveTerms = useMutation(trpc.sales.updateTerms.mutationOptions({ onError }));
  const finalize = useMutation(trpc.sales.finalize.mutationOptions({ onError }));
  const send = useMutation(
    trpc.sales.send.mutationOptions({ onError: (e) => setActionError(errorMessage(e)) }),
  );
  const setStatus = useMutation(trpc.sales.setStatus.mutationOptions({ onError }));
  const convert = useMutation(trpc.sales.convert.mutationOptions({ onError }));
  const creditNote = useMutation(trpc.sales.creditNote.mutationOptions({ onError }));
  const duplicate = useMutation(trpc.sales.duplicate.mutationOptions({ onError }));
  const makeRecurring = useMutation(trpc.sales.makeRecurring.mutationOptions({ onError }));
  const generateNow = useMutation(trpc.sales.generateNow.mutationOptions({ onError }));
  const addPayment = useMutation(
    trpc.sales.addPayment.mutationOptions({ onError: (e) => setActionError(errorMessage(e)) }),
  );
  const deletePayment = useMutation(trpc.sales.deletePayment.mutationOptions({ onError }));
  const remove = useMutation(trpc.records.delete.mutationOptions({ onError }));
  const update = useMutation(
    trpc.records.update.mutationOptions({ onError, onSuccess: () => void refresh() }),
  );

  if (detail.isPending || record.isPending) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (detail.isError || record.isError) {
    return (
      <div className="p-8">
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {errorMessage(detail.error ?? record.error)}
        </Callout>
      </div>
    );
  }

  const { canEdit, settings } = detail.data;
  const current = detail.data.doc;
  const row = record.data.row;
  const kind = current.kind as DocumentKind;
  const status = current.status;
  const draft = status === "draft";
  const editableContent = canEdit && (kind === "RECURRING" || draft);
  const locked = (kind === "INVOICE" || kind === "CREDIT_NOTE") && !draft;
  const statusField = fields.find((f) => f.key === "status");
  const recipient = current.contact?.email ?? current.company?.email ?? "";

  /** Enregistre les lignes et conditions en attente ; renvoie false si la saisie est invalide. */
  async function flush(): Promise<boolean> {
    if (dirty) {
      const payload = toPayload(lines);
      if ("error" in payload) {
        setLinesError(payload.error ?? null);
        return false;
      }
      setLinesError(null);
      await saveLines.mutateAsync({ id, lines: payload.lines });
      setDirty(false);
    }
    if (termsDirty) {
      const days = Number(terms);
      await saveTerms.mutateAsync({
        id,
        notes: notes.trim() || null,
        paymentTermsDays: Number.isInteger(days) && days >= 0 && days <= 120 ? days : 30,
      });
      setTermsDirty(false);
    }
    return true;
  }

  async function run<T>(fn: () => Promise<T>, success?: string): Promise<T | undefined> {
    setActionError(null);
    try {
      if (!(await flush())) return undefined;
      const result = await fn();
      await refresh();
      if (success) toast.success(success);
      return result;
    } catch {
      return undefined;
    }
  }

  const go = (result: { url: string } | undefined, message: string) => {
    if (!result) return;
    toast.success(message);
    router.push(result.url);
  };

  // Champs d'en-tête : modifiables sur un brouillon ; sur une facture émise, seuls le
  // responsable, les étiquettes et l'échéance restent modifiables.
  const headerFields = fields
    .filter((f) => !INTERNAL_FIELDS.has(f.key))
    .map((f) =>
      locked && !["ownerId", "tags", "dueDate"].includes(f.key)
        ? { ...f, editable: false }
        : !locked && !draft && kind !== "RECURRING" && !["ownerId", "tags"].includes(f.key)
          ? { ...f, editable: false }
          : f,
    );

  const primary: React.ReactNode[] = [];
  const secondary: React.ReactNode[] = [];
  if (canEdit) {
    if (draft && kind !== "RECURRING") {
      primary.push(
        <Button key="finalize" variant="secondary" onClick={() => setDialog("finalize")}>
          <StampIcon />
          Émettre
        </Button>,
      );
    }
    if (kind !== "RECURRING" && status !== "cancelled") {
      primary.push(
        <Button key="send" onClick={() => void flush().then((ok) => ok && setDialog("send"))}>
          <SendIcon />
          Envoyer
        </Button>,
      );
    }
    if (kind === "INVOICE" && ["sent", "partial", "overdue"].includes(status)) {
      primary.unshift(
        <Button key="pay" variant="secondary" onClick={() => setDialog("payment")}>
          <BanknoteIcon />
          Enregistrer un paiement
        </Button>,
      );
      secondary.push(
        <DropdownMenuItem key="remind" onSelect={() => setDialog("remind")}>
          <MailIcon />
          Relancer le client
        </DropdownMenuItem>,
      );
    }
    if (kind === "QUOTE" && ["sent", "expired"].includes(status)) {
      primary.unshift(
        <Button
          key="accept"
          variant="secondary"
          onClick={() =>
            void run(
              () => setStatus.mutateAsync({ id, status: "accepted" }),
              "Devis marqué accepté.",
            )
          }
        >
          <CheckIcon />
          Accepté
        </Button>,
      );
      secondary.push(
        <DropdownMenuItem
          key="decline"
          onSelect={() =>
            void run(
              () => setStatus.mutateAsync({ id, status: "declined" }),
              "Devis marqué refusé.",
            )
          }
        >
          <XIcon />
          Marquer refusé
        </DropdownMenuItem>,
      );
    }
    if (kind === "QUOTE" && ["sent", "accepted"].includes(status)) {
      primary.unshift(
        <Button
          key="to-invoice"
          variant="secondary"
          onClick={() =>
            void run(() => convert.mutateAsync({ id, to: "INVOICE" })).then((r) =>
              go(r, "Facture créée à partir du devis."),
            )
          }
        >
          Facturer
        </Button>,
      );
      secondary.push(
        <DropdownMenuItem
          key="to-order"
          onSelect={() =>
            void run(() => convert.mutateAsync({ id, to: "ORDER" })).then((r) =>
              go(r, "Commande créée à partir du devis."),
            )
          }
        >
          Transformer en commande
        </DropdownMenuItem>,
      );
    }
    if (kind === "ORDER" && ["confirmed", "delivered"].includes(status)) {
      primary.unshift(
        <Button
          key="order-invoice"
          variant="secondary"
          onClick={() =>
            void run(() => convert.mutateAsync({ id, to: "INVOICE" })).then((r) =>
              go(r, "Facture créée à partir de la commande."),
            )
          }
        >
          Facturer
        </Button>,
      );
      if (status === "confirmed")
        secondary.push(
          <DropdownMenuItem
            key="delivered"
            onSelect={() =>
              void run(() => setStatus.mutateAsync({ id, status: "delivered" }), "Commande livrée.")
            }
          >
            Marquer livrée
          </DropdownMenuItem>,
          <DropdownMenuItem
            key="cancel"
            onSelect={() =>
              void run(
                () => setStatus.mutateAsync({ id, status: "cancelled" }),
                "Commande annulée.",
              )
            }
          >
            Annuler la commande
          </DropdownMenuItem>,
        );
    }
    if (kind === "CREDIT_NOTE" && status === "issued")
      secondary.push(
        <DropdownMenuItem
          key="refunded"
          onSelect={() =>
            void run(
              () => setStatus.mutateAsync({ id, status: "refunded" }),
              "Avoir marqué remboursé.",
            )
          }
        >
          Marquer remboursé
        </DropdownMenuItem>,
      );
    if (kind === "RECURRING" && status === "active")
      primary.push(
        <Button
          key="generate"
          onClick={() =>
            void run(() => generateNow.mutateAsync({ id })).then((r) =>
              go(r, "Facture générée et émise."),
            )
          }
        >
          <RepeatIcon />
          Générer la facture maintenant
        </Button>,
      );
    if (kind === "INVOICE" && !draft && status !== "credited") {
      secondary.push(
        <DropdownMenuItem key="credit" onSelect={() => setDialog("credit")}>
          Créer un avoir
        </DropdownMenuItem>,
        <DropdownMenuItem key="recurring" onSelect={() => setDialog("recurring")}>
          <RepeatIcon />
          Facturer automatiquement…
        </DropdownMenuItem>,
      );
    }
  }
  if (permissions.create)
    secondary.push(
      <DropdownMenuItem
        key="duplicate"
        onSelect={() =>
          void run(() => duplicate.mutateAsync({ id })).then((r) =>
            go(r, "Copie créée (brouillon)."),
          )
        }
      >
        <CopyIcon />
        Dupliquer
      </DropdownMenuItem>,
    );
  if (!draft && kind !== "RECURRING")
    secondary.push(
      <DropdownMenuItem
        key="link"
        onSelect={() =>
          void navigator.clipboard
            .writeText(current.publicUrl)
            .then(() => toast.success("Lien client copié."))
        }
      >
        <LinkIcon />
        Copier le lien client
      </DropdownMenuItem>,
    );
  const deletable =
    permissions.delete && canEdit && (draft || (kind !== "INVOICE" && kind !== "CREDIT_NOTE"));

  const serverTotals = computeTotals(current.lines, { vatExempt: settings.vatExempt });
  const linked = [
    ...(current.source ? [{ ...current.source, label: "Origine" }] : []),
    ...current.derived.map((d) => ({
      ...d,
      label: kind === "RECURRING" ? "Facture générée" : "Document créé",
    })),
    ...current.creditNotes.map((c) => ({ ...c, kind: "CREDIT_NOTE", label: "Avoir" })),
    ...(current.creditedInvoice
      ? [{ ...current.creditedInvoice, kind: "INVOICE", label: "Facture d'origine" }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-8 py-6">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            <Link href={entityPath(entity)} className="hover:underline">
              {def.labelPlural}
            </Link>
          </p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {DOCUMENT_TITLES[kind]}{" "}
            {current.number ?? (kind === "RECURRING" ? (current.subject ?? "") : "— brouillon")}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {statusField ? <FieldDisplay field={statusField} row={row} /> : null}
            {row.labels.companyId ? <span>{row.labels.companyId}</span> : null}
            <span className="font-medium text-foreground tabular-nums">
              {formatCents(current.totalCents)} TTC
            </span>
            {current.sentAt ? (
              <span>· envoyé le {dateFmt.format(new Date(current.sentAt))}</span>
            ) : null}
            {current.reminderCount > 0 ? <span>· {current.reminderCount} relance(s)</span> : null}
            <Presence presenceKey={`${entity}:${id}`} meId={meId} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primary}
          <PrintPdfButton href={`/api/ventes/documents/${id}/pdf`} />
          <OpenInWindowButton path={recordPath(entity, id)} />
          <Button variant="secondary" asChild>
            <a href={`/api/ventes/documents/${id}/pdf`} target="_blank" rel="noreferrer">
              <FileDownIcon />
              PDF
            </a>
          </Button>
          {secondary.length || deletable ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Autres actions">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {secondary}
                {deletable ? (
                  <>
                    {secondary.length ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => setDialog("delete")}
                    >
                      <Trash2Icon />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </header>

      {!settings.configured && canEdit ? (
        <div className="px-8 pt-4">
          <Callout variant="warning" icon={<CircleAlertIcon />}>
            Complétez vos mentions légales (raison sociale, SIRET, adresse) dans les{" "}
            <Link href="/ventes/parametres" className="underline">
              paramètres de vente
            </Link>{" "}
            : elles figurent obligatoirement sur vos documents.
          </Callout>
        </div>
      ) : null}
      {actionError && !dialog ? (
        <div className="px-8 pt-4">
          <Callout variant="danger" icon={<CircleAlertIcon />}>
            {actionError}
          </Callout>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-10 px-8 py-6 2xl:grid-cols-[minmax(0,3fr)_minmax(380px,2fr)]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="lines-title" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="lines-title" className="text-base font-semibold">
                Lignes
              </h2>
              {editableContent && dirty ? (
                <Button
                  size="sm"
                  onClick={() => void run(() => Promise.resolve(), "Lignes enregistrées.")}
                  disabled={saveLines.isPending}
                >
                  <SaveIcon />
                  Enregistrer les lignes
                </Button>
              ) : null}
            </div>
            {editableContent ? (
              <LinesEditor
                lines={lines}
                vatExempt={settings.vatExempt}
                onChange={(next) => {
                  setLines(next);
                  setDirty(true);
                }}
              />
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Désignation</th>
                        <th className="px-3 py-2 text-right font-medium">Qté</th>
                        <th className="px-3 py-2 text-right font-medium">PU HT</th>
                        <th className="px-3 py-2 text-right font-medium">Remise</th>
                        <th className="px-3 py-2 text-right font-medium">TVA</th>
                        <th className="px-3 py-2 text-right font-medium">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.lines.map((l) => (
                        <tr key={l.id} className="border-t border-border align-top">
                          <td className="px-3 py-2 whitespace-pre-line">{l.description}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {String(l.quantity).replace(".", ",")}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatCents(l.unitPriceCents)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {l.discountPercent ? `${l.discountPercent} %` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {settings.vatExempt ? "—" : `${String(l.vatRate).replace(".", ",")} %`}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatCents(l.totalExclCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <Totals
                    totals={serverTotals}
                    vatExempt={settings.vatExempt}
                    paidCents={kind === "INVOICE" ? current.paidCents : undefined}
                    dueCents={kind === "INVOICE" ? current.dueCents : undefined}
                  />
                </div>
              </div>
            )}
            {linesError ? (
              <Callout variant="danger" icon={<CircleAlertIcon />}>
                {linesError}
              </Callout>
            ) : null}
          </section>

          <section aria-labelledby="terms-title" className="space-y-3">
            <h2 id="terms-title" className="text-base font-semibold">
              Conditions
            </h2>
            <div className="grid grid-cols-[1fr_180px] gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="doc-notes">Notes et conditions (imprimées sur le document)</Label>
                <Textarea
                  id="doc-notes"
                  value={notes}
                  disabled={!editableContent}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setTermsDirty(true);
                  }}
                  onBlur={() => termsDirty && void run(() => Promise.resolve())}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-terms">Délai de paiement (jours)</Label>
                <Input
                  id="doc-terms"
                  value={terms}
                  disabled={!editableContent || kind === "QUOTE"}
                  inputMode="numeric"
                  onChange={(e) => {
                    setTerms(e.target.value);
                    setTermsDirty(true);
                  }}
                  onBlur={() => termsDirty && void run(() => Promise.resolve())}
                />
              </div>
            </div>
          </section>

          {kind === "INVOICE" && !draft ? (
            <section aria-labelledby="payments-title" className="space-y-3">
              <h2 id="payments-title" className="text-base font-semibold">
                Paiements
              </h2>
              {current.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {current.payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-4 px-3 py-2 text-sm">
                      <span className="w-28 tabular-nums">{dateFmt.format(new Date(p.date))}</span>
                      <span className="flex-1">
                        {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}
                        {p.reference ? (
                          <span className="text-muted-foreground"> · {p.reference}</span>
                        ) : null}
                      </span>
                      <span className="font-medium tabular-nums">{formatCents(p.amountCents)}</span>
                      {canEdit ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Supprimer ce paiement"
                          onClick={() =>
                            void run(
                              () => deletePayment.mutateAsync({ paymentId: p.id }),
                              "Paiement supprimé.",
                            )
                          }
                        >
                          <Trash2Icon />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-8">
          <section aria-label="Informations">
            <dl>
              {headerFields.map((f) => (
                <FieldRow
                  key={f.key}
                  field={f}
                  row={row}
                  canEdit={canEdit}
                  onSave={(key, value) => update.mutate({ entity, id, values: { [key]: value } })}
                />
              ))}
            </dl>
            {current.issueDate ? (
              <p className="pt-2 text-xs text-muted-foreground">
                Émis le {dateFmt.format(new Date(current.issueDate))}
                {current.acceptedAt
                  ? ` · accepté le ${dateFmt.format(new Date(current.acceptedAt))}`
                  : ""}
                {current.paidAt ? ` · soldée le ${dateFmt.format(new Date(current.paidAt))}` : ""}
              </p>
            ) : null}
          </section>

          {linked.length ? (
            <section aria-labelledby="linked-title" className="space-y-2">
              <h2 id="linked-title" className="text-sm font-semibold">
                Documents liés
              </h2>
              <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                {linked.map((l) => {
                  const target = DOCUMENT_ENTITY[l.kind as DocumentKind];
                  return (
                    <li key={l.id}>
                      <Link
                        href={recordPath(target, l.id)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-accent"
                      >
                        <span className="text-muted-foreground">{l.label}</span>
                        <span className="flex-1 truncate font-medium">
                          {DOCUMENT_TITLES[l.kind as DocumentKind]} {l.number ?? "brouillon"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <Tabs defaultValue="commentaires">
            <TabsList>
              <TabsTrigger value="commentaires">Commentaires</TabsTrigger>
              <TabsTrigger value="fichiers">Fichiers</TabsTrigger>
              <TabsTrigger value="historique">Historique</TabsTrigger>
            </TabsList>
            <TabsContent value="commentaires">
              <CommentsTab entity={entity} id={id} />
            </TabsContent>
            <TabsContent value="fichiers">
              <FilesTab entity={entity} id={id} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="historique">
              <HistoryTab entity={entity} id={id} fields={fields} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === "finalize"}
        onOpenChange={(open) => setDialog(open ? "finalize" : null)}
        title={`Émettre ${kind === "QUOTE" ? "le devis" : kind === "ORDER" ? "la commande" : kind === "CREDIT_NOTE" ? "l'avoir" : "la facture"} ?`}
        description={
          kind === "INVOICE" || kind === "CREDIT_NOTE"
            ? "Un numéro définitif est attribué et le document ne pourra plus être modifié ni supprimé (une erreur se corrige par un avoir)."
            : "Un numéro définitif est attribué et le document n'est plus modifiable (il reste duplicable)."
        }
        confirmLabel="Émettre"
        pending={finalize.isPending}
        onConfirm={() =>
          void run(() => finalize.mutateAsync({ id }), "Document émis.").then(() => setDialog(null))
        }
      />
      <ConfirmDialog
        open={dialog === "credit"}
        onOpenChange={(open) => setDialog(open ? "credit" : null)}
        title="Créer un avoir ?"
        description="L'avoir reprend les lignes de la facture ; ajustez-les pour un avoir partiel, puis émettez-le. Le reste dû de la facture diminue d'autant."
        confirmLabel="Créer l'avoir"
        pending={creditNote.isPending}
        onConfirm={() =>
          void run(() => creditNote.mutateAsync({ id })).then((r) => {
            setDialog(null);
            go(r, "Avoir créé (brouillon).");
          })
        }
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title="Supprimer ce document ?"
        description="Il est mis à la corbeille et reste restaurable pendant 30 jours."
        confirmLabel="Supprimer"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(
            { entity, ids: [id] },
            {
              onSuccess: () => {
                setDialog(null);
                void refresh();
                router.push(entityPath(entity));
              },
            },
          )
        }
      />
      <SendDialog
        open={dialog === "send" || dialog === "remind"}
        onOpenChange={(open) => (open ? null : setDialog(null))}
        defaultTo={recipient}
        reminder={dialog === "remind"}
        title={`${DOCUMENT_TITLES[kind]} ${current.number ?? ""}`.trim()}
        pending={send.isPending}
        error={actionError}
        onSend={({ to, message }) =>
          void run(
            () =>
              send.mutateAsync({
                id,
                to,
                message: message || undefined,
                reminder: dialog === "remind",
              }),
            dialog === "remind" ? "Relance envoyée." : `Envoyé à ${to}.`,
          ).then((r) => r && setDialog(null))
        }
      />
      <PaymentDialog
        open={dialog === "payment"}
        onOpenChange={(open) => (open ? null : setDialog(null))}
        dueCents={current.dueCents}
        pending={addPayment.isPending}
        error={actionError}
        onSubmit={(input) =>
          void run(() => addPayment.mutateAsync({ id, ...input }), "Paiement enregistré.").then(
            (r) => r && setDialog(null),
          )
        }
      />
      <RecurringDialog
        open={dialog === "recurring"}
        onOpenChange={(open) => (open ? null : setDialog(null))}
        pending={makeRecurring.isPending}
        onSubmit={(interval) =>
          void run(() => makeRecurring.mutateAsync({ id, interval })).then((r) => {
            setDialog(null);
            go(r, "Modèle récurrent créé.");
          })
        }
      />
    </div>
  );
}
