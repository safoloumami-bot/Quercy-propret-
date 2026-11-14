import { CheckIcon, type LucideIcon } from "lucide-react";
import type * as React from "react";

/*
 * Écrans d'authentification : formulaire à gauche, panneau sombre à droite.
 * Le panneau reprend l'identité du site public (fond brun très foncé, sable) : ses couleurs
 * sont celles de la marque, pas des jetons de l'espace. Connexion et inscription y présentent
 * sebt ; les écrans de mot de passe y donnent une aide utile (HelpPanel).
 */

const POINTS = [
  "Clients, devis, factures et équipe au même endroit",
  "Les modules dont vous avez besoin, rien de plus",
  "Facture électronique prête pour 2027",
  "Vos équipes reliées au bureau, même sur le terrain",
];

export function AuthShell({
  children,
  aside = <Showcase />,
}: {
  children: React.ReactNode;
  /** Contenu du panneau de droite (par défaut : la présentation de sebt). */
  aside?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(480px,1fr)_1fr]">
      <main className="relative isolate flex flex-col overflow-hidden px-10 py-10">
        {/* Halo sable discret derrière le formulaire : relie les deux moitiés de l'écran. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,124,0.16),transparent)]"
        />
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
      <DarkPanel>{aside}</DarkPanel>
    </div>
  );
}

/** Fond du panneau : brun très foncé, halo sable et trame discrète. */
function DarkPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden lg:block lg:p-3">
      <aside className="relative flex h-full items-center overflow-hidden rounded-[28px] bg-[linear-gradient(155deg,#43321f_0%,#33261a_45%,#261c13_100%)] px-16 py-14 text-[#f5efe4] shadow-[0_30px_80px_-30px_rgba(90,60,25,0.5)] ring-1 ring-[#c9a97c]/10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 h-[620px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(226,201,159,0.22),transparent)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(#f5efe4_1px,transparent_1px),linear-gradient(90deg,#f5efe4_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_70%_20%,black,transparent)] [background-size:56px_56px] opacity-[0.05]"
        />
        {/* Une seule colonne centrée : marque, message, encart, sans vide entre les blocs. */}
        <div className="relative mx-auto flex w-full max-w-lg flex-col gap-12">
          {/* eslint-disable-next-line @next/next/no-img-element -- icône de la marque */}
          <img
            src="/brand/sebt-mark.svg"
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-xl"
          />
          {children}
        </div>
      </aside>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[12.5px] tracking-wide text-[#e2c99f] uppercase">{children}</p>
  );
}

function Showcase() {
  return (
    <>
      <div className="relative">
        <Kicker>Logiciel de gestion</Kicker>
        <h2 className="mt-4 max-w-md text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
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
      <div className="relative flex items-center gap-4 rounded-2xl border border-[#f5efe4]/[0.08] bg-[#2a2016]/70 p-4 backdrop-blur">
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
    </>
  );
}

export interface HelpItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

/** Panneau d'aide : ce qu'il faut savoir à cette étape, puis le contact du support. */
export function HelpPanel({
  kicker,
  title,
  accent,
  items,
}: {
  kicker: string;
  title: string;
  accent: string;
  items: HelpItem[];
}) {
  return (
    <>
      <div className="relative">
        <Kicker>{kicker}</Kicker>
        <h2 className="mt-4 max-w-md text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
          {title} <span className="text-[#a89e8f]">{accent}</span>
        </h2>
        <ul className="mt-9 space-y-6">
          {items.map(({ icon: Icon, title: t, text }) => (
            <li key={t} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#f5efe4]/[0.08] bg-[#3a2c1e]/70 text-[#e2c99f]">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <div className="pt-0.5">
                <p className="text-[15px] font-medium text-[#f5efe4]">{t}</p>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-pretty text-[#a89e8f]">
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative flex items-center gap-4 rounded-2xl border border-[#f5efe4]/[0.08] bg-[#2a2016]/70 p-4 backdrop-blur">
        <span className="grid size-10 place-items-center rounded-full bg-[#e2c99f] text-sm font-semibold text-[#1f1b16]">
          ?
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#f5efe4]">Toujours bloqué ?</p>
          <p className="text-xs text-[#8e8477]">Notre équipe vous répond sous 24 h ouvrées</p>
        </div>
        <a
          href="mailto:bonjour@sebt.cloud"
          className="rounded-md bg-[#e2c99f]/10 px-2.5 py-1.5 text-xs text-[#e2c99f] hover:bg-[#e2c99f]/20"
        >
          bonjour@sebt.cloud
        </a>
      </div>
    </>
  );
}
