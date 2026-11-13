"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo, LienBouton, cx } from "@/components/ui";
import { navigation, navigationSites, marque, liensLogiciel } from "@/config/marque";

// « logiciel » : site principal (logiciel de gestion) ; « sites » : création et hébergement de sites.
export function Entete({ espace = "logiciel" }: { espace?: "logiciel" | "sites" }) {
  const liens = espace === "sites" ? navigationSites : navigation;
  const connexion = liensLogiciel.connexion;
  const commencer = espace === "sites" ? "/sites#sur-mesure" : liensLogiciel.essai;
  const libelle = espace === "sites" ? "Demander un devis" : "Essai gratuit";
  const [ouvert, setOuvert] = useState(false);
  const [defile, setDefile] = useState(false);

  useEffect(() => {
    const f = () => setDefile(window.scrollY > 8);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <header
      className={cx(
        "sticky top-0 z-40 transition-colors duration-300",
        defile || ouvert ? "border-b border-creme/[0.08] bg-nuit/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href="/" aria-label={`${marque.nom}, accueil`} className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lagon">
            <Logo clair className="h-6" />
          </Link>
          <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
            {liens.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-[10px] px-3 py-2 text-sm text-taupe transition hover:text-creme focus-visible:outline-2 focus-visible:outline-lagon"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href={connexion} className="rounded-[10px] px-3 py-2 text-sm text-taupe transition hover:text-creme focus-visible:outline-2 focus-visible:outline-lagon">
            Connexion
          </Link>
          <LienBouton href={commencer} variante="lagon" className="h-9 !px-4 !text-[13.5px]">
            {libelle}
          </LienBouton>
        </div>
        <button
          className="grid size-11 cursor-pointer place-items-center rounded-full text-creme lg:hidden"
          onClick={() => setOuvert(!ouvert)}
          aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={ouvert}
        >
          {ouvert ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {ouvert && (
        <div className="border-t border-creme/[0.08] px-6 pb-6 lg:hidden">
          {liens.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOuvert(false)} className="block border-b border-creme/[0.06] py-3.5 text-[15px] text-creme/90">
              {n.label}
            </Link>
          ))}
          <div className="mt-5 flex gap-2">
            <LienBouton href={connexion} variante="nuit" taille="lg" className="flex-1">Connexion</LienBouton>
            <LienBouton href={commencer} variante="lagon" taille="lg" className="flex-1">{libelle}</LienBouton>
          </div>
        </div>
      )}
    </header>
  );
}
