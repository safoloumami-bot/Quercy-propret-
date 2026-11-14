import type { Metadata } from "next";
import Link from "next/link";
import { Entete } from "@/components/marketing/Entete";
import { Pied } from "@/components/marketing/Pied";
import { Apparition } from "@/components/marketing/Apparition";
import { TarifsLogiciel, FaqLogiciel, AppelLogiciel } from "@/components/marketing/Logiciel";

export const metadata: Metadata = { title: "Tarifs" };

export default function PageTarifs() {
  return (
    <div className="min-h-screen bg-nuit text-creme">
      <Entete />
      <main>
        <Apparition className="mx-auto max-w-3xl px-6 pt-20 text-center md:pt-28">
          <p className="font-mono text-[12.5px] tracking-wide text-or uppercase">Tarifs</p>
          <h1 className="titre-pub mt-3 text-[2.6rem] leading-[1.04] md:text-[4.25rem]">
            Un prix par utilisateur. <span className="text-taupe">Gratuit pour démarrer</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-taupe">
            Sans engagement, ou 20 % de moins à l&apos;année. Vous payez pour les personnes qui utilisent le logiciel, pas pour des options cachées.
          </p>
        </Apparition>
        <TarifsLogiciel titre={false} comparatif />
        <section className="mx-auto max-w-6xl px-6 pb-8">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-creme/[0.08] p-6 md:flex-row md:items-center">
            <p className="text-taupe">
              <span className="text-creme">Vous cherchez les tarifs des sites web et de l&apos;hébergement ?</span> Ils ont leur propre page.
            </p>
            <Link href="/sites/tarifs" className="shrink-0 text-creme underline decoration-creme/30 underline-offset-4 hover:decoration-lagon">
              Tarifs des sites web
            </Link>
          </div>
        </section>
        <FaqLogiciel />
        <AppelLogiciel />
      </main>
      <Pied />
    </div>
  );
}
