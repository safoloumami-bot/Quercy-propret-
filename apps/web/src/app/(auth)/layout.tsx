import Image from "next/image";
import type * as React from "react";

/** Écrans d'authentification : formulaire à gauche, présentation du produit à droite. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(480px,1fr)_1fr]">
      <main className="flex flex-col px-10 py-10">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/quercy-mark.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="text-base font-semibold tracking-tight">Quercy</span>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Vos données circulent chiffrées et restent isolées par entreprise.
        </p>
      </main>
      <aside className="relative hidden overflow-hidden border-l border-border bg-sidebar lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-md space-y-6">
          <p className="text-sm font-medium text-primary">
            Un seul logiciel pour toute l&apos;entreprise
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Clients, devis, factures, projets et équipe, enfin au même endroit.
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>• Activez seulement les modules dont vous avez besoin.</li>
            <li>• Invitez votre équipe avec des droits précis, par module.</li>
            <li>• Tout est tracé : qui a fait quoi, et quand.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
