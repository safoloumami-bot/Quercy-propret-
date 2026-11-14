import { cn } from "@quercy/ui/lib/utils";
import type * as React from "react";

/** Bloc de réglage : titre, description, contenu et pied d'actions facultatif. */
export function SettingsSection({
  title,
  description,
  children,
  footer,
  danger = false,
  id,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  danger?: boolean;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn("rounded-lg border border-border bg-card", danger && "border-destructive/40")}
    >
      <div className="space-y-1 px-5 pt-5">
        <h2 id={id ? `${id}-title` : undefined} className="text-sm font-semibold">
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="px-5 py-5">{children}</div> : <div className="h-5" />}
      {footer ? (
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
