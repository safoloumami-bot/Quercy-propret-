"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  COMPANY_SIZES,
  CURRENCIES,
  DATE_FORMATS,
  INDUSTRIES,
  updateOrganizationSchema,
} from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Input } from "@quercy/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { FormField, fieldAria } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { SettingsSection } from "../section";

type Values = z.infer<typeof updateOrganizationSchema>;

const CURRENCY_LABELS: Record<(typeof CURRENCIES)[number], string> = {
  EUR: "Euro (€)",
  USD: "Dollar américain ($)",
  GBP: "Livre sterling (£)",
  CHF: "Franc suisse (CHF)",
  CAD: "Dollar canadien ($ CA)",
};

function timezones(): string[] {
  const all =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return all.length > 0 ? all : ["Europe/Paris"];
}

export function WorkspaceGeneralForm({
  defaults,
  canEdit,
}: {
  defaults: Values;
  canEdit: boolean;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const update = useMutation(trpc.workspace.update.mutationOptions());
  const form = useForm<Values>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: defaults,
  });
  const { errors, isDirty } = form.formState;
  const zones = React.useMemo(timezones, []);
  const example = new Intl.DateTimeFormat("fr-FR", {
    timeZone: form.watch("timezone") || "Europe/Paris",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  function onSubmit(values: Values) {
    update.mutate(values, {
      onSuccess: () => {
        form.reset(values);
        router.refresh();
        toast.success("Réglages de l'espace enregistrés.");
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <SettingsSection
        id="general"
        title="Entreprise"
        footer={
          canEdit ? (
            <Button type="submit" disabled={!isDirty || update.isPending}>
              {update.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Seuls les administrateurs peuvent modifier ces réglages.
            </p>
          )
        }
      >
        <fieldset disabled={!canEdit} className="grid gap-4">
          <FormField id="name" label="Nom de l'entreprise" error={errors.name?.message}>
            <Input {...fieldAria("name", errors.name?.message)} {...form.register("name")} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField id="industry" label="Secteur d'activité">
              <Controller
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={!canEdit}
                  >
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Non renseigné" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField id="size" label="Taille">
              <Controller
                control={form.control}
                name="size"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={!canEdit}
                  >
                    <SelectTrigger id="size">
                      <SelectValue placeholder="Non renseigné" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField id="currency" label="Devise">
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CURRENCY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField id="timezone" label="Fuseau horaire">
              <Controller
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {zones.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField id="dateFormat" label="Format de date">
              <Controller
                control={form.control}
                name="dateFormat"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                    <SelectTrigger id="dateFormat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d.replace("dd", "JJ").replace("MM", "MM").replace("yyyy", "AAAA")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground first-letter:uppercase">
            Heure de l&apos;espace : {example}
          </p>
        </fieldset>
      </SettingsSection>
    </form>
  );
}
