import * as React from "react";

import { cn } from "../lib/utils";

/** Bloc de chargement : on affiche la forme du contenu, jamais un écran blanc. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
