import { LockIcon } from "lucide-react";

/** Écran affiché quand le rôle ne donne pas accès à une page. */
export function Forbidden({ what }: { what: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <LockIcon className="size-5" />
      </div>
      <div className="max-w-sm space-y-1">
        <h1 className="text-base font-semibold">Accès réservé</h1>
        <p className="text-sm text-muted-foreground">
          Votre rôle ne donne pas accès à {what}. Demandez à un administrateur de l&apos;espace si
          vous en avez besoin.
        </p>
      </div>
    </div>
  );
}
