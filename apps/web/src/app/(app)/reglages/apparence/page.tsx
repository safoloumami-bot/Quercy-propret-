import { can } from "@quercy/core";
import type { Metadata } from "next";

import { AccentSettings } from "@/components/settings/accent-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Apparence" };

export default async function AppearancePage() {
  const { organization, role } = await requireWorkspaceContext();
  const canEdit = can(role.permissions, "settings", "update");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 px-8 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Apparence</h1>
        <p className="text-sm text-muted-foreground">
          Le thème est propre à chaque personne ; la couleur d&apos;accent s&apos;applique à tout
          l&apos;espace {organization.name}.
        </p>
      </header>

      <section aria-labelledby="theme-title" className="space-y-4">
        <div>
          <h2 id="theme-title" className="text-base font-semibold">
            Thème
          </h2>
          <p className="text-sm text-muted-foreground">
            « Automatique » suit le réglage clair ou sombre de votre ordinateur.
          </p>
        </div>
        <ThemeSettings />
      </section>

      <section aria-labelledby="accent-title" className="space-y-4">
        <div>
          <h2 id="accent-title" className="text-base font-semibold">
            Couleur d&apos;accent de l&apos;espace
          </h2>
          <p className="text-sm text-muted-foreground">
            Boutons, liens et éléments actifs. Le contraste du texte est ajusté automatiquement pour
            rester lisible, en clair comme en sombre.
          </p>
        </div>
        <AccentSettings initialColor={organization.preferences.accentColor} canEdit={canEdit} />
      </section>
    </div>
  );
}
