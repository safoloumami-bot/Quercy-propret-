"use client";

import { Button } from "@quercy/ui/components/button";
import { TriangleAlertIcon } from "lucide-react";
import * as React from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <TriangleAlertIcon className="size-6" />
      </div>
      <div className="max-w-md space-y-1">
        <h1 className="text-lg font-semibold">Cet écran n&apos;a pas pu s&apos;afficher</h1>
        <p className="text-sm text-muted-foreground">
          Le serveur n&apos;a pas répondu correctement. Vos données ne sont pas perdues : réessayez
          dans un instant.
          {error.digest ? ` (référence : ${error.digest})` : null}
        </p>
      </div>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
