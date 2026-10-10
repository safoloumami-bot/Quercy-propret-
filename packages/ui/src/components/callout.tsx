import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "../lib/utils";

const calloutVariants = cva(
  "flex gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-info/30 bg-info/8 [&>svg]:text-info",
        success: "border-success/30 bg-success/8 [&>svg]:text-success",
        warning: "border-warning/40 bg-warning/10 [&>svg]:text-warning",
        danger: "border-destructive/30 bg-destructive/8 [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

/** Encadré d'information contextuelle (jamais bloquant sans explication). */
export function Callout({
  className,
  variant,
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof calloutVariants> & { icon?: React.ReactNode }) {
  return (
    <div role="status" className={cn(calloutVariants({ variant }), className)} {...props}>
      {icon}
      <div className="min-w-0 flex-1 space-y-1">{children}</div>
    </div>
  );
}
