import { CheckIcon } from "lucide-react";
import type * as React from "react";

/*
 * Écrans d'authentification : formulaire à gauche, présentation de sebt à droite.
 * Le panneau de droite reprend l'identité du site public (fond brun très foncé, sable) :
 * ses couleurs sont celles de la marque, pas des jetons de l'espace.
 */

const POINTS = [
  "Clients, devis, factures et équipe au même endroit",
  "Les modules dont vous avez besoin, rien de plus",
  "Facture électronique prête pour 2027",
  "Vos équipes reliées au bureau, même sur le terrain",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(480px,1fr)_1fr]">
      <main className="flex flex-col px-10 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo vectoriel de la marque */}
        <img
          src="/brand/sebt-logo-clair.svg"
          alt="sebt"
          width={78}
          height={31}
          className="h-[31px] w-auto self-start"
        />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Vos données circulent chiffrées et restent isolées par entreprise.
        </p>
      </main>

      <aside className="relative hidden overflow-hidden bg-[#110e0b] text-[#f5efe4] lg:flex lg:flex-col lg:justify-between lg:px-16 lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 h-[620px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(226,201,159,0.18),transparent)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(#f5efe4_1px,transparent_1px),linear-gradient(90deg,#f5efe4_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_70%_20%,black,transparent)] [background-size:56px_56px] opacity-[0.05]"
        />

        {/* eslint-disable-next-line @next/next/no-img-element -- icône de la marque */}
        <img
          src="/brand/sebt-mark.svg"
          alt=""
          width={44}
          height={44}
          className="relative size-11 rounded-xl"
        />

        <div className="relative max-w-md">
          <p className="font-mono text-[12.5px] tracking-wide text-[#e2c99f] uppercase">
            Logiciel de gestion
          </p>
          <h2 className="mt-4 text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.03em]">
            Toute votre entreprise, <span className="text-[#a89e8f]">en moins de temps.</span>
          </h2>
          <ul className="mt-8 space-y-3.5 text-[15px] text-[#a89e8f]">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#c9a97c]" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-4 rounded-2xl border border-[#f5efe4]/[0.08] bg-[#191511]/80 p-4 backdrop-blur">
          <span className="grid size-10 place-items-center rounded-full bg-[#e2c99f] text-sm font-semibold text-[#1f1b16]">
            €
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#f5efe4]">Facture FA-2026-0042 réglée</p>
            <p className="text-xs text-[#8e8477]">Syndic Delmas · rapprochée automatiquement</p>
          </div>
          <span className="rounded-md bg-[#7fd49b]/10 px-2 py-1 text-xs text-[#7fd49b]">
            +1 440 €
          </span>
        </div>
      </aside>
    </div>
  );
}
