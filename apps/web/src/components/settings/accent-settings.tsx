"use client";

import { DEFAULT_ACCENT, accentPalette, hexColorSchema } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button, buttonVariants } from "@quercy/ui/components/button";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import { toast } from "@quercy/ui/components/toaster";
import { CheckIcon } from "lucide-react";
import * as React from "react";

import { updateAccentColor } from "@/app/(app)/actions";

const PRESETS = [
  { name: "Vert Quercy", hex: DEFAULT_ACCENT },
  { name: "Bleu", hex: "#2563EB" },
  { name: "Indigo", hex: "#4F46E5" },
  { name: "Violet", hex: "#7C3AED" },
  { name: "Framboise", hex: "#DB2777" },
  { name: "Rouge", hex: "#DC2626" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Ambre", hex: "#D97706" },
  { name: "Ardoise", hex: "#475569" },
] as const;

/** Aperçu isolé : on redéfinit les jetons d'accent sur ce bloc uniquement. */
function AccentPreview({ color, dark }: { color: string; dark: boolean }) {
  const palette = accentPalette(color);
  const style = {
    "--brand": palette.light.primary,
    "--brand-foreground": palette.light.foreground,
    "--brand-dark": palette.dark.primary,
    "--brand-dark-foreground": palette.dark.foreground,
  } as React.CSSProperties;

  return (
    <div style={style} className={dark ? "dark" : "light"} aria-hidden>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 text-foreground">
        <span className={buttonVariants({ size: "sm" })}>Enregistrer</span>
        <span className={buttonVariants({ size: "sm", variant: "secondary" })}>Annuler</span>
        <Badge variant="primary">Actif</Badge>
        <span className="text-sm text-primary underline underline-offset-4">Lien</span>
        <span className="ml-auto text-xs text-muted-foreground">{dark ? "Sombre" : "Clair"}</span>
      </div>
    </div>
  );
}

export function AccentSettings({
  initialColor,
  canEdit,
}: {
  initialColor: string;
  canEdit: boolean;
}) {
  const [saved, setSaved] = React.useState(initialColor.toUpperCase());
  const [draft, setDraft] = React.useState(initialColor.toUpperCase());
  const [text, setText] = React.useState(initialColor.toUpperCase());
  const [pending, startTransition] = React.useTransition();

  const valid = hexColorSchema.safeParse(text).success;
  const dirty = draft !== saved;

  function choose(hex: string) {
    setDraft(hex.toUpperCase());
    setText(hex.toUpperCase());
  }

  function save(color: string, previous: string) {
    startTransition(async () => {
      const result = await updateAccentColor(color);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(color);
      choose(color);
      toast.success("Couleur d'accent enregistrée.", {
        action: { label: "Annuler", onClick: () => save(previous, color) },
      });
    });
  }

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-5">
      <fieldset disabled={!canEdit || pending} className="space-y-5">
        <legend className="sr-only">Couleur d&apos;accent</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Couleurs proposées">
          {PRESETS.map((preset) => {
            const selected = draft === preset.hex;
            return (
              <button
                key={preset.hex}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={preset.name}
                title={preset.name}
                onClick={() => choose(preset.hex)}
                className="flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:opacity-50 aria-checked:ring-2 aria-checked:ring-foreground"
                style={{ backgroundColor: preset.hex }}
              >
                {selected ? (
                  <CheckIcon
                    className="size-4"
                    style={{ color: accentPalette(preset.hex).light.foreground }}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="accent-hex">Couleur personnalisée</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Sélecteur de couleur"
                value={valid ? text.toLowerCase() : draft.toLowerCase()}
                onChange={(e) => choose(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded-md border border-input bg-card p-0.5"
              />
              <Input
                id="accent-hex"
                value={text}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setText(value);
                  if (hexColorSchema.safeParse(value).success) setDraft(value);
                }}
                aria-invalid={!valid}
                aria-describedby="accent-hex-help"
                className="w-32 font-mono uppercase"
                maxLength={7}
              />
            </div>
            <p id="accent-hex-help" className="text-xs text-muted-foreground">
              {valid ? "Format #RRGGBB." : "Couleur invalide : utilisez le format #RRGGBB."}
            </p>
          </div>
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <AccentPreview color={draft} dark={false} />
        <AccentPreview color={draft} dark />
      </div>

      {canEdit ? (
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" disabled={!dirty || pending} onClick={() => choose(saved)}>
            Rétablir
          </Button>
          <Button disabled={!dirty || !valid || pending} onClick={() => save(draft, saved)}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      ) : (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">
          Seuls les administrateurs de l&apos;espace peuvent changer la couleur d&apos;accent.
        </p>
      )}
    </div>
  );
}
