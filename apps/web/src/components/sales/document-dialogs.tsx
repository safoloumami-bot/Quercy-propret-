"use client";

import { PAYMENT_METHODS, RECURRING_INTERVALS, formatCents } from "@quercy/core";
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
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Textarea } from "@quercy/ui/components/textarea";
import { CircleAlertIcon, PaperclipIcon } from "lucide-react";
import * as React from "react";

import { toNumber } from "./lines-editor";

export function SendDialog({
  open,
  onOpenChange,
  defaultTo,
  reminder,
  title,
  pending,
  error,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo: string;
  reminder: boolean;
  title: string;
  pending: boolean;
  error: string | null;
  onSend: (input: { to: string; message: string }) => void;
}) {
  const [to, setTo] = React.useState(defaultTo);
  const [message, setMessage] = React.useState("");
  React.useEffect(() => {
    if (open) {
      setTo(defaultTo);
      setMessage("");
    }
  }, [open, defaultTo]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reminder ? "Relancer le client" : "Envoyer par email"}</DialogTitle>
          <DialogDescription>
            {title} est joint au format PDF
            {reminder ? ", avec le rappel du montant restant dû." : "."} Un brouillon est
            d&apos;abord émis (numéro définitif).
          </DialogDescription>
        </DialogHeader>
        <form
          id="send-document"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSend({ to, message });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="send-to">Destinataire</Label>
            <Input
              id="send-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="send-message">Message (facultatif)</Label>
            <Textarea
              id="send-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Laissez vide pour utiliser le message standard."
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PaperclipIcon className="size-3.5" aria-hidden />
            PDF joint (Factur-X pour les factures et avoirs) et lien de consultation en ligne.
          </p>
          {error ? (
            <Callout variant="danger" icon={<CircleAlertIcon />}>
              {error}
            </Callout>
          ) : null}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="send-document" disabled={pending}>
            {pending ? "Envoi…" : reminder ? "Envoyer la relance" : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentDialog({
  open,
  onOpenChange,
  dueCents,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueCents: number;
  pending: boolean;
  error: string | null;
  onSubmit: (input: {
    amountCents: number;
    date: string;
    method: string;
    reference?: string;
  }) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [method, setMethod] = React.useState("transfer");
  const [reference, setReference] = React.useState("");
  const [local, setLocal] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setAmount((dueCents / 100).toFixed(2).replace(".", ","));
      setDate(today);
      setMethod("transfer");
      setReference("");
      setLocal(null);
    }
  }, [open, dueCents, today]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>Reste dû : {formatCents(dueCents)}.</DialogDescription>
        </DialogHeader>
        <form
          id="payment-form"
          className="grid grid-cols-2 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const value = toNumber(amount);
            if (!Number.isFinite(value) || value <= 0) {
              setLocal("Montant invalide.");
              return;
            }
            setLocal(null);
            onSubmit({
              amountCents: Math.round(value * 100),
              date,
              method,
              reference: reference || undefined,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Montant (€)</Label>
            <Input
              id="pay-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="text-right tabular-nums"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Date</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-method">Moyen de paiement</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="pay-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-ref">Référence (facultatif)</Label>
            <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          {local || error ? (
            <div className="col-span-2">
              <Callout variant="danger" icon={<CircleAlertIcon />}>
                {local ?? error}
              </Callout>
            </div>
          ) : null}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="payment-form" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecurringDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (interval: string) => void;
}) {
  const [interval, setInterval] = React.useState("monthly");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Facturer automatiquement</DialogTitle>
          <DialogDescription>
            Un modèle récurrent reprend le client et les lignes de cette facture ; chaque échéance
            émet une nouvelle facture (et l&apos;envoie si vous activez l&apos;envoi automatique).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-interval">Fréquence</Label>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger id="recurring-interval">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECURRING_INTERVALS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => onSubmit(interval)} disabled={pending}>
            Créer le modèle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
