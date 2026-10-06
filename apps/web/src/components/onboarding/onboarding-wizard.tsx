"use client";

import {
  COMPANY_SIZES,
  DEFAULT_ACCENT,
  INDUSTRIES,
  MODULES,
  MODULE_CATEGORY_LABELS,
  MODULE_KEYS,
  type ModuleKey,
  SYSTEM_ROLE_LABELS,
  accentPalette,
  createOrganizationSchema,
  emailSchema,
} from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Checkbox } from "@quercy/ui/components/checkbox";
import { Input } from "@quercy/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon, PlusIcon, XIcon } from "lucide-react";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";

const STEPS = ["Entreprise", "Modules", "Apparence", "Équipe"] as const;
const ACCENTS = [
  "#0F6E5E",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#475569",
];
type InviteRole = "admin" | "manager" | "member" | "viewer" | "accountant" | "worker";
const INVITE_ROLES: InviteRole[] = ["admin", "manager", "member", "worker", "viewer", "accountant"];

export function OnboardingWizard({ firstName }: { firstName: string }) {
  const trpc = useTRPC();
  const create = useMutation(trpc.workspace.create.mutationOptions());
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [industry, setIndustry] = React.useState<string>("");
  const [size, setSize] = React.useState<string>("");
  const [modules, setModules] = React.useState<ModuleKey[]>([]);
  const [accent, setAccent] = React.useState(DEFAULT_ACCENT);
  const [invites, setInvites] = React.useState<{ email: string; systemRole: InviteRole }[]>([]);
  const [draftEmail, setDraftEmail] = React.useState("");
  const [draftRole, setDraftRole] = React.useState<InviteRole>("member");
  const [error, setError] = React.useState<string | null>(null);

  function chooseIndustry(value: string) {
    setIndustry(value);
    const preset = INDUSTRIES.find((i) => i.value === value);
    if (preset && modules.length === 0) setModules([...preset.modules]);
  }

  function toggleModule(key: ModuleKey) {
    setModules((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }

  function addInvite() {
    const parsed = emailSchema.safeParse(draftEmail);
    if (!parsed.success) return setError("Adresse email invalide.");
    if (invites.some((i) => i.email === parsed.data))
      return setError("Cette adresse est déjà dans la liste.");
    setError(null);
    setInvites([...invites, { email: parsed.data, systemRole: draftRole }]);
    setDraftEmail("");
  }

  const stepValid = [
    name.trim().length >= 2 && industry !== "" && size !== "",
    modules.length > 0,
    true,
    true,
  ][step];

  async function finish() {
    setError(null);
    const input = createOrganizationSchema.safeParse({
      name,
      industry,
      size,
      modules,
      accentColor: accent,
      invitations: invites,
    });
    if (!input.success)
      return setError(input.error.issues[0]?.message ?? "Informations incomplètes.");
    create.mutate(input.data, {
      onSuccess: () => {
        window.location.href = "/";
      },
      onError: (e) => setError(errorMessage(e)),
    });
  }

  const palette = accentPalette(accent);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-primary">Bienvenue {firstName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Créons votre espace en quelques minutes
        </h1>
        <p className="text-sm text-muted-foreground">
          Vous profitez de 14 jours d&apos;essai de l&apos;offre Business. Tout reste modifiable
          ensuite dans les réglages.
        </p>
      </div>

      <ol className="grid grid-cols-4 gap-2" aria-label="Étapes">
        {STEPS.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined} className="space-y-2">
            <div className={cn("h-1 rounded-full bg-border", index <= step && "bg-primary")} />
            <p
              className={cn(
                "text-xs",
                index === step ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {index + 1}. {label}
            </p>
          </li>
        ))}
      </ol>

      <section className="space-y-6 rounded-xl border border-border bg-card p-8 shadow-xs">
        {error ? (
          <Callout variant="danger" icon={<CircleAlertIcon />}>
            {error}
          </Callout>
        ) : null}

        {step === 0 ? (
          <div className="grid gap-5">
            <FormField id="org-name" label="Nom de l'entreprise">
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Ex. : Dupont & Fils"
                maxLength={80}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="org-industry" label="Secteur d'activité">
                <Select value={industry} onValueChange={chooseIndustry}>
                  <SelectTrigger id="org-industry">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="org-size" label="Taille">
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger id="org-size">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Quels modules voulez-vous utiliser ?</h2>
              <p className="text-sm text-muted-foreground">
                Nous avons présélectionné les modules courants pour votre secteur. Vous pourrez en
                ajouter à tout moment.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MODULE_KEYS.map((key) => {
                const m = MODULES[key];
                const checked = modules.includes(key);
                return (
                  <label
                    key={key}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent",
                      checked && "border-primary bg-primary/5",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleModule(key)}
                      aria-label={m.name}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{m.name}</span>
                      <span className="block text-xs text-muted-foreground">{m.description}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {MODULE_CATEGORY_LABELS[m.category]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold">La couleur de votre entreprise</h2>
              <p className="text-sm text-muted-foreground">
                Elle colore les boutons et éléments actifs de l&apos;espace, pour toute
                l&apos;équipe.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Couleur d'accent">
              {ACCENTS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  role="radio"
                  aria-checked={accent === hex}
                  aria-label={hex}
                  onClick={() => setAccent(hex)}
                  className="flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 aria-checked:ring-2 aria-checked:ring-foreground"
                  style={{ backgroundColor: hex }}
                >
                  {accent === hex ? (
                    <CheckIcon
                      className="size-4"
                      style={{ color: accentPalette(hex).light.foreground }}
                    />
                  ) : null}
                </button>
              ))}
            </div>
            <div
              aria-hidden
              className="flex items-center gap-3 rounded-lg border border-border p-4"
              style={
                {
                  "--primary": palette.light.primary,
                  "--primary-foreground": palette.light.foreground,
                } as React.CSSProperties
              }
            >
              <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                Nouveau devis
              </span>
              <span className="text-sm text-primary underline underline-offset-4">
                Voir la fiche client
              </span>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold">Invitez votre équipe</h2>
              <p className="text-sm text-muted-foreground">
                Facultatif : chacun reçoit un email et choisit son mot de passe. Vous pourrez aussi
                inviter plus tard.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField id="invite-email" label="Adresse email">
                  <Input
                    id="invite-email"
                    type="email"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInvite();
                      }
                    }}
                    placeholder="prenom@entreprise.fr"
                  />
                </FormField>
              </div>
              <div className="w-48">
                <FormField id="invite-role" label="Rôle">
                  <Select value={draftRole} onValueChange={(v) => setDraftRole(v as InviteRole)}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVITE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {SYSTEM_ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <Button variant="secondary" onClick={addInvite}>
                <PlusIcon />
                Ajouter
              </Button>
            </div>
            {invites.length > 0 ? (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {invites.map((invite) => (
                  <li
                    key={invite.email}
                    className="flex h-11 items-center justify-between px-3 text-sm"
                  >
                    <span>{invite.email}</span>
                    <span className="flex items-center gap-3 text-muted-foreground">
                      {SYSTEM_ROLE_LABELS[invite.systemRole]}
                      <button
                        type="button"
                        aria-label={`Retirer ${invite.email}`}
                        onClick={() => setInvites(invites.filter((i) => i.email !== invite.email))}
                        className="rounded-sm p-1 hover:bg-accent hover:text-foreground"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep(step - 1)}
          disabled={step === 0 || create.isPending}
        >
          Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!stepValid}>
            Continuer
          </Button>
        ) : (
          <Button onClick={finish} disabled={create.isPending}>
            {create.isPending
              ? "Création de l'espace…"
              : invites.length > 0
                ? "Créer l'espace et inviter"
                : "Créer l'espace"}
          </Button>
        )}
      </div>
    </div>
  );
}
