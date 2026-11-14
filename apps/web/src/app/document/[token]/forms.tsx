"use client";

import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Checkbox } from "@quercy/ui/components/checkbox";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import { CircleAlertIcon, CreditCardIcon } from "lucide-react";
import * as React from "react";

import { type ActionState, acceptQuote, payInvoice } from "./actions";

export function AcceptQuoteForm({ token }: { token: string }) {
  const [state, action, pending] = React.useActionState<ActionState, FormData>(acceptQuote, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="signataire">Nom et prénom du signataire</Label>
        <Input id="signataire" name="name" autoComplete="name" required minLength={2} />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="accord" name="agree" required />
        <Label htmlFor="accord" className="leading-snug font-normal">
          Bon pour accord : j&apos;accepte ce devis et ses conditions, et je suis habilité(e) à
          engager mon organisation.
        </Label>
      </div>
      {state.error ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {state.error}
        </Callout>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Accepter le devis"}
      </Button>
    </form>
  );
}

export function PayInvoiceForm({ token, label }: { token: string; label: string }) {
  const [state, action, pending] = React.useActionState<ActionState, FormData>(payInvoice, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state.error ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {state.error}
        </Callout>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        <CreditCardIcon />
        {pending ? "Redirection…" : label}
      </Button>
    </form>
  );
}
