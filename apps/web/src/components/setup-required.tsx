import { DatabaseIcon } from "lucide-react";

/** Affiché quand la base ne contient encore aucun espace (installation neuve). */
export function SetupRequired() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DatabaseIcon className="size-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Aucun espace n&apos;existe encore</h1>
          <p className="text-sm text-muted-foreground">
            La base de données est vide. Appliquez les migrations puis créez l&apos;espace de
            démonstration :
          </p>
        </div>
        <pre className="rounded-md bg-muted px-4 py-3 font-mono text-xs">
          pnpm db:migrate{"\n"}pnpm seed
        </pre>
        <p className="text-sm text-muted-foreground">Rechargez ensuite cette page.</p>
      </div>
    </main>
  );
}
