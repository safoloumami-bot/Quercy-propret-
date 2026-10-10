"use client";

import { Button } from "@quercy/ui/components/button";
import { Checkbox } from "@quercy/ui/components/checkbox";
import { Label } from "@quercy/ui/components/label";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { ImageIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import * as React from "react";

import { prepareImage } from "@/lib/image-tools";

/** Vignette d'une image de fiche, sur fond transparent (damier discret pour le repérer). */
export function ImageThumb({
  src,
  alt,
  size = 40,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- images de fiche (data URL ou fichier du site)
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Choix d'une image : envoi, redimensionnement, fond retiré (facultatif), suppression. */
export function ImageEditor({
  label,
  value,
  onCommit,
  id,
}: {
  label: string;
  value: unknown;
  onCommit: (value: unknown) => void;
  id?: string;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [strip, setStrip] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const current = typeof value === "string" && value ? value : null;

  async function choose(file: File) {
    setBusy(true);
    try {
      onCommit(await prepareImage(file, strip));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image illisible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-16 items-center justify-center rounded-md border border-dashed border-border bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:12px_12px]">
        {current ? (
          <ImageThumb src={current} alt={label} size={56} />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="space-y-1.5">
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          aria-label={label}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void choose(file);
          }}
        />
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? (
              <Loader2Icon className="animate-spin" aria-hidden />
            ) : (
              <UploadIcon aria-hidden />
            )}
            {current ? "Changer" : "Choisir une image"}
          </Button>
          {current ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onCommit("")}
              aria-label={`Retirer ${label.toLowerCase()}`}
            >
              <Trash2Icon aria-hidden />
            </Button>
          ) : null}
        </div>
        <Label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          <Checkbox checked={strip} onCheckedChange={(v) => setStrip(v === true)} />
          Retirer le fond (fond uni)
        </Label>
      </div>
    </div>
  );
}
