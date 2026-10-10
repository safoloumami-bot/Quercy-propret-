"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_LATE_PENALTY_TEXT,
  type SalesSettingsInput,
  salesSettingsSchema,
} from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Input } from "@quercy/ui/components/input";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Switch } from "@quercy/ui/components/switch";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, CopyIcon } from "lucide-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField, fieldAria } from "@/components/form-field";
import { SettingsSection } from "@/components/settings/section";
import { errorMessage, useTRPC } from "@/lib/trpc";

type Output = z.output<typeof salesSettingsSchema>;

/** Saisie en euros d'un montant stocké en centimes (vide = aucun). */
function EuroInput({
  id,
  cents,
  onChange,
  disabled,
}: {
  id: string;
  cents: number | null;
  onChange: (cents: number | null) => void;
  disabled: boolean;
}) {
  const [text, setText] = React.useState(cents === null ? "" : String(cents / 100));
  return (
    <Input
      id={id}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d.,]/g, "");
        setText(v);
        onChange(v.trim() ? Math.round(Number(v.replace(",", ".")) * 100) || 0 : null);
      }}
    />
  );
}

function Form({ defaults, canEdit }: { defaults: SalesSettingsInput; canEdit: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const save = useMutation(trpc.sales.updateSettings.mutationOptions());
  const form = useForm<SalesSettingsInput, unknown, Output>({
    resolver: zodResolver(salesSettingsSchema),
    defaultValues: defaults,
  });
  const { errors, isDirty } = form.formState;
  const [reminderText, setReminderText] = React.useState((defaults.reminderDays ?? []).join(", "));

  function onSubmit(values: Output) {
    save.mutate(values, {
      onSuccess: () => {
        form.reset(form.getValues());
        void queryClient.invalidateQueries(trpc.sales.pathFilter());
        toast.success("Paramètres de vente enregistrés.");
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  const text = (
    name: keyof SalesSettingsInput,
    label: string,
    hint?: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <FormField id={`s-${name}`} label={label} error={errors[name]?.message} hint={hint}>
      <Input
        {...fieldAria(`s-${name}`, errors[name]?.message, Boolean(hint))}
        {...form.register(name)}
        disabled={!canEdit}
        {...props}
      />
    </FormField>
  );
  const number = (name: "paymentTermsDays" | "quoteValidityDays", label: string) => (
    <FormField id={`s-${name}`} label={label} error={errors[name]?.message}>
      <Input
        {...fieldAria(`s-${name}`, errors[name]?.message)}
        type="number"
        {...form.register(name, { valueAsNumber: true })}
        disabled={!canEdit}
      />
    </FormField>
  );
  const footer = canEdit ? (
    <Button type="submit" disabled={!isDirty || save.isPending}>
      {save.isPending ? "Enregistrement…" : "Enregistrer"}
    </Button>
  ) : null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <SettingsSection
        id="legal"
        title="Identité et mentions légales"
        description="Imprimées sur les devis, commandes, factures et avoirs (obligatoires sur une facture)."
        footer={footer}
      >
        <div className="grid grid-cols-2 gap-4">
          {text("legalName", "Raison sociale")}
          {text("siret", "SIRET", "14 chiffres.")}
          {text("address", "Adresse")}
          {text("postalCode", "Code postal")}
          {text("city", "Ville")}
          {text("country", "Pays")}
          {text("vatNumber", "N° de TVA intracommunautaire")}
          {text("email", "Email de facturation", "Adresse de réponse aux clients.", {
            type: "email",
          })}
          {text("phone", "Téléphone")}
          <FormField
            id="s-vatExempt"
            label="Franchise en base de TVA"
            hint="Mention « TVA non applicable, art. 293 B du CGI » et TVA à 0 %."
          >
            <Controller
              control={form.control}
              name="vatExempt"
              render={({ field }) => (
                <Switch
                  id="s-vatExempt"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canEdit}
                />
              )}
            />
          </FormField>
        </div>
      </SettingsSection>

      <SettingsSection
        id="estimates"
        title="Chiffrage"
        description="Sous la marge minimale, un chiffrage doit aussi être validé par le patron. Les coûts sont proposés à chaque nouveau chiffrage."
        footer={footer}
      >
        <div className="grid grid-cols-3 gap-4">
          <FormField
            id="s-minMarginPct"
            label="Marge minimale (%)"
            error={errors.minMarginPct?.message}
          >
            <Input
              {...fieldAria("s-minMarginPct", errors.minMarginPct?.message)}
              type="number"
              step="0.5"
              {...form.register("minMarginPct", { valueAsNumber: true })}
              disabled={!canEdit}
            />
          </FormField>
          {(
            [
              ["defaultHourlyCostCents", "Coût horaire réel (€/h)"],
              ["defaultKmCostCents", "Coût au kilomètre (€/km)"],
            ] as const
          ).map(([name, label]) => (
            <FormField key={name} id={`s-${name}`} label={label}>
              <Controller
                control={form.control}
                name={name}
                render={({ field }) => (
                  <EuroInput
                    id={`s-${name}`}
                    cents={field.value ?? null}
                    onChange={field.onChange}
                    disabled={!canEdit}
                  />
                )}
              />
            </FormField>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        id="payment"
        title="Règlement"
        description="Coordonnées bancaires et conditions par défaut."
        footer={footer}
      >
        <div className="grid grid-cols-2 gap-4">
          {text("iban", "IBAN")}
          {text("bic", "BIC")}
          {number("paymentTermsDays", "Délai de paiement (jours)")}
          {number("quoteValidityDays", "Validité des devis (jours)")}
          <div className="col-span-2">
            <FormField
              id="s-latePenaltyText"
              label="Pénalités de retard"
              hint="Laissez vide pour la mention légale standard."
              error={errors.latePenaltyText?.message}
            >
              <Textarea
                {...fieldAria("s-latePenaltyText", errors.latePenaltyText?.message, true)}
                {...form.register("latePenaltyText")}
                placeholder={DEFAULT_LATE_PENALTY_TEXT}
                rows={3}
                disabled={!canEdit}
              />
            </FormField>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="numbering"
        title="Numérotation"
        description="Numéros continus par type et par année (ex. FA-2026-0001), attribués à l'émission."
        footer={footer}
      >
        <div className="grid grid-cols-4 gap-4">
          {text("quotePrefix", "Devis")}
          {text("orderPrefix", "Commandes")}
          {text("invoicePrefix", "Factures")}
          {text("creditNotePrefix", "Avoirs")}
          <div className="col-span-4">
            <FormField
              id="s-footer"
              label="Pied de page"
              hint="Forme juridique, capital, RCS…"
              error={errors.footer?.message}
            >
              <Input
                {...fieldAria("s-footer", errors.footer?.message, true)}
                {...form.register("footer")}
                disabled={!canEdit}
              />
            </FormField>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="reminders"
        title="Relances automatiques"
        description="Un email de relance part pour chaque facture impayée, aux paliers indiqués après l'échéance."
        footer={footer}
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField id="s-remindersEnabled" label="Relances activées">
            <Controller
              control={form.control}
              name="remindersEnabled"
              render={({ field }) => (
                <Switch
                  id="s-remindersEnabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canEdit}
                />
              )}
            />
          </FormField>
          <FormField
            id="s-reminderDays"
            label="Paliers (jours après l'échéance)"
            hint="Ex. 7, 15, 30"
            error={errors.reminderDays?.message}
          >
            <Input
              {...fieldAria("s-reminderDays", errors.reminderDays?.message, true)}
              value={reminderText}
              disabled={!canEdit}
              onChange={(e) => {
                setReminderText(e.target.value);
                const days = e.target.value
                  .split(/[,;\s]+/)
                  .filter(Boolean)
                  .map(Number);
                form.setValue("reminderDays", days, { shouldDirty: true, shouldValidate: true });
              }}
            />
          </FormField>
        </div>
      </SettingsSection>
    </form>
  );
}

function StripeSection({
  stripe,
  canEdit,
}: {
  stripe: { secretKey: string | null; webhookConfigured: boolean; webhookUrl: string };
  canEdit: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [secretKey, setSecretKey] = React.useState("");
  const [webhookSecret, setWebhookSecret] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const refresh = () => queryClient.invalidateQueries(trpc.sales.pathFilter());
  const set = useMutation(
    trpc.sales.setStripe.mutationOptions({
      onSuccess: () => {
        setSecretKey("");
        setWebhookSecret("");
        void refresh();
        toast.success("Paiement en ligne activé.");
      },
    }),
  );
  const remove = useMutation(
    trpc.sales.removeStripe.mutationOptions({
      onSuccess: () => {
        setConfirm(false);
        void refresh();
        toast.success("Paiement en ligne désactivé.");
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  return (
    <SettingsSection
      id="stripe"
      title="Paiement en ligne des factures"
      description="Vos clients règlent par carte depuis le lien de la facture ; le paiement est encaissé sur votre propre compte Stripe et rapproché automatiquement."
    >
      <div className="space-y-4">
        {stripe.secretKey ? (
          <Callout variant="success" icon={<CheckCircle2Icon />}>
            Activé avec la clé {stripe.secretKey}.
          </Callout>
        ) : null}
        <div className="space-y-1.5 text-sm">
          <p className="font-medium">1. Dans Stripe, créez un webhook vers cette adresse</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
              {stripe.webhookUrl}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Copier l'adresse du webhook"
              onClick={() =>
                void navigator.clipboard
                  .writeText(stripe.webhookUrl)
                  .then(() => toast.success("Adresse copiée."))
              }
            >
              <CopyIcon />
            </Button>
          </div>
          <p className="text-muted-foreground">
            Événements : <code>checkout.session.completed</code> et{" "}
            <code>checkout.session.async_payment_succeeded</code>.
          </p>
        </div>
        {canEdit ? (
          <form
            className="grid grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              set.mutate({ secretKey, webhookSecret });
            }}
          >
            <p className="col-span-2 text-sm font-medium">
              2. Collez vos clés (chiffrées avant stockage)
            </p>
            <FormField id="stripe-key" label="Clé secrète (sk_… ou clé restreinte rk_…)">
              <Input
                id="stripe-key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                autoComplete="off"
                required
              />
            </FormField>
            <FormField id="stripe-whsec" label="Secret de signature du webhook (whsec_…)">
              <Input
                id="stripe-whsec"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                autoComplete="off"
                required
              />
            </FormField>
            {set.error ? (
              <div className="col-span-2">
                <Callout variant="danger" icon={<CircleAlertIcon />}>
                  {errorMessage(set.error)}
                </Callout>
              </div>
            ) : null}
            <div className="col-span-2 flex justify-end gap-2">
              {stripe.secretKey ? (
                <Button type="button" variant="ghost" onClick={() => setConfirm(true)}>
                  Désactiver
                </Button>
              ) : null}
              <Button type="submit" disabled={set.isPending}>
                {stripe.secretKey ? "Remplacer les clés" : "Activer le paiement en ligne"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Désactiver le paiement en ligne ?"
        description="Les liens de facture n'afficheront plus le bouton de paiement par carte. Les clés sont effacées."
        confirmLabel="Désactiver"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </SettingsSection>
  );
}

/** Paramètres de vente de l'espace. */
export function SalesSettingsForm() {
  const trpc = useTRPC();
  const settings = useQuery(trpc.sales.settings.queryOptions());
  if (settings.isPending) return <Skeleton className="h-96" />;
  if (settings.isError)
    return (
      <Callout variant="danger" icon={<CircleAlertIcon />}>
        {errorMessage(settings.error)}
      </Callout>
    );
  const s = settings.data;
  return (
    <>
      {!s.canEdit ? (
        <Callout icon={<CircleAlertIcon />}>
          Consultation seule : seuls les administrateurs des ventes modifient ces paramètres.
        </Callout>
      ) : null}
      <Form
        canEdit={s.canEdit}
        defaults={{
          legalName: s.legalName ?? "",
          address: s.address ?? "",
          postalCode: s.postalCode ?? "",
          city: s.city ?? "",
          country: s.country,
          siret: s.siret ?? "",
          vatNumber: s.vatNumber ?? "",
          email: s.email ?? "",
          phone: s.phone ?? "",
          iban: s.iban ?? "",
          bic: s.bic ?? "",
          vatExempt: s.vatExempt,
          quotePrefix: s.quotePrefix,
          orderPrefix: s.orderPrefix,
          invoicePrefix: s.invoicePrefix,
          creditNotePrefix: s.creditNotePrefix,
          paymentTermsDays: s.paymentTermsDays,
          quoteValidityDays: s.quoteValidityDays,
          footer: s.footer ?? "",
          latePenaltyText: s.latePenaltyText ?? "",
          remindersEnabled: s.remindersEnabled,
          reminderDays: s.reminderDays,
          minMarginPct: s.minMarginPct,
          defaultHourlyCostCents: s.defaultHourlyCostCents,
          defaultKmCostCents: s.defaultKmCostCents,
        }}
      />
      <StripeSection stripe={s.stripe} canEdit={s.canEdit} />
    </>
  );
}
