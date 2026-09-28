import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "../lib/utils";

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-secondary-foreground",
        primary: "border-transparent bg-primary/12 text-primary",
        success: "border-transparent bg-success/14 text-success-text",
        warning: "border-transparent bg-warning/16 text-warning-text",
        danger: "border-transparent bg-destructive/12 text-destructive-text",
        info: "border-transparent bg-info/12 text-info-text",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
