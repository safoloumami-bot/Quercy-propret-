"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Check, Lock, RotateCcw } from "lucide-react";
import { genererSite, exemplesPrompts, type SiteGenere } from "@/lib/generateur";
import { demanderSite } from "./SurMesure";
import { ApercuSite } from "@/components/ApercuSite";
import { Bouton } from "@/components/ui";
import { marque } from "@/config/marque";

const etapesGeneration = ["Analyse de votre activité", "Choix de la structure", "Rédaction des textes", "Palette et typographie", "Mise en page responsive"];

function slugDomaine(nom: string) {
  return nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function Hero() {
  const exemple = useMemo(() => genererSite(exemplesPrompts[0] ?? ""), []);
  const [prompt, setPrompt] = useState("");
  const [etape, setEtape] = useState(-1);
  const [site, setSite] = useState<SiteGenere | null>(null);
  const zone = useRef<HTMLDivElement>(null);

  async function lancer(texte = prompt) {
    if (!texte.trim() || etape >= 0) return;
    setPrompt(texte);
    setSite(null);
    setTimeout(() => zone.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    for (let i = 0; i < etapesGeneration.length; i++) {
      setEtape(i);
      await new Promise((r) => setTimeout(r, 420));
    }
    setSite(genererSite(texte));
    setEtape(-1);
  }

  const affiche = site ?? exemple;

  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-24">
        <Link href="/sites#sur-mesure" className="group inline-flex items-center gap-2 text-[14px] text-taupe transition-colors hover:text-creme">
          <span className="text-or">Gratuit</span>
          <span aria-hidden className="h-3 w-px bg-creme/20" />
          Votre aperçu en une minute, réalisé ensuite par notre équipe
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <h1 className="titre-pub mt-7 max-w-4xl text-[2.6rem] leading-[1.02] text-creme sm:text-6xl md:text-[4.5rem]">
          Décrivez votre projet.<span className="block text-taupe">On le réalise pour vous</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-taupe">
          Voyez en une minute à quoi pourrait ressembler votre site, gratuitement. Notre équipe le finalise avec vous, puis s&apos;occupe de tout :
          hébergement en Europe, nom de domaine, emails et mises à jour.
        </p>

        {/* Le produit lui-même : le créateur IA */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lancer();
          }}
          className="mt-10 max-w-2xl rounded-2xl border border-creme/12 bg-nuit-2/90 p-2 shadow-[0_0_0_1px_rgba(201,169,124,0.06),0_30px_80px_-20px_rgba(0,0,0,0.7),0_0_60px_-10px_rgba(201,169,124,0.18)] transition focus-within:border-lagon/50"
        >
          <label htmlFor="prompt" className="sr-only">Décrivez le site que vous voulez créer</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                lancer();
              }
            }}
            rows={2}
            placeholder="Ex. : un site pour mon salon de coiffure « Atelier Mona » à Lyon, avec les tarifs et la prise de rendez-vous"
            className="w-full resize-none bg-transparent px-4 pt-3 text-[15px] text-creme outline-none placeholder:text-taupe-2"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="hidden font-mono text-[12px] text-taupe-2 sm:inline">Gratuit · sans inscription</span><span className="sm:hidden" />
            <Bouton type="submit" variante="lagon" className="h-11 !px-5" disabled={etape >= 0 || !prompt.trim()}>
              Générer mon site <ArrowUp className="size-4" />
            </Bouton>
          </div>
        </form>

        <div className="mt-4 flex max-w-2xl flex-wrap gap-2">
          <span className="py-1.5 text-[13px] text-taupe-2">Essayez :</span>
          {exemplesPrompts.slice(1, 4).map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => lancer(p)}
              title={p}
              className="cursor-pointer rounded-md border border-creme/10 px-3 py-1.5 text-[13px] text-taupe transition hover:border-creme/25 hover:text-creme focus-visible:outline-2 focus-visible:outline-lagon"
            >
              {["Plombier à Toulouse", "Céramiques faites main", "Chambres d'hôtes"][i]}
            </button>
          ))}
        </div>

        {/* Aperçu : un vrai site généré, éclairé comme un objet */}
        <div ref={zone} className="relative mt-16 scroll-mt-24">
          <p className="mb-3 font-mono text-[12px] text-taupe-2">
            {etape >= 0 ? "Génération en cours…" : site ? "Votre site, généré à l'instant" : `Exemple généré à partir de : « ${exemplesPrompts[0]} »`}
          </p>
          <div className="overflow-hidden rounded-2xl border border-creme/10 bg-nuit-2 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85)]">
            <div className="flex items-center gap-3 border-b border-creme/[0.08] px-4 py-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-creme/15" />
                <span className="size-2.5 rounded-full bg-creme/15" />
                <span className="size-2.5 rounded-full bg-creme/15" />
              </div>
              <div className="flex flex-1 items-center gap-1.5 rounded-md bg-creme/[0.05] px-3 py-1 font-mono text-[12px] text-taupe">
                <Lock className="size-3 text-lagon" />
                {etape >= 0 ? "…" : `${slugDomaine(affiche.nom)}.sebt.site`}
              </div>
            </div>
            {etape >= 0 ? (
              <div className="grid h-[460px] place-items-center bg-nuit-2" role="status" aria-live="polite">
                <ul className="space-y-3">
                  {etapesGeneration.map((e, i) => (
                    <li key={e} className={`flex items-center gap-3 text-sm transition ${i <= etape ? "text-creme" : "text-creme/30"}`}>
                      {i < etape ? (
                        <Check className="size-4 text-lagon" />
                      ) : i === etape ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-lagon border-t-transparent" />
                      ) : (
                        <span className="size-4 rounded-full border-2 border-creme/15" />
                      )}
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={`relative ${site ? "defile max-h-[680px] overflow-y-auto" : "max-h-[600px] overflow-hidden"}`}>
                <ApercuSite site={affiche} />
                {!site && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-nuit-2 to-transparent" />}
              </div>
            )}
          </div>
          {site && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Bouton taille="lg" variante="lagon" onClick={() => {
                  demanderSite(prompt, site);
                  document.getElementById("sur-mesure")?.scrollIntoView({ behavior: "smooth" });
                }}>
                Je veux ce site <ArrowRight className="size-4" />
              </Bouton>
              <Bouton taille="lg" variante="nuit" onClick={() => lancer()}>
                <RotateCcw className="size-4" /> Générer une autre version
              </Bouton>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
