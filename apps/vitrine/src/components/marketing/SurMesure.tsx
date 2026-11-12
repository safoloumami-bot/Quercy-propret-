"use client";

import { useEffect, useState } from "react";
import { AppWindow, Check, Globe, IdCard, Palette, Send, Smartphone } from "lucide-react";
import type { SiteGenere } from "@/lib/generateur";
import { Bouton, cx } from "@/components/ui";
import { marque } from "@/config/marque";
import { Apparition } from "./Apparition";
import { AppliExemple, IdentiteExemple, siteExemple } from "./ExempleMarque";
import { TitreSection } from "./Sections";

// Services sur demande : réalisés par l'équipe, sur devis. Les visuels sont des illustrations.

export const servicesSurMesure = [
  {
    cle: "site",
    icone: Globe,
    titre: "Site web",
    texte: "Votre site vitrine ou boutique, conçu avec vous à partir de l'aperçu, puis hébergé et entretenu par notre équipe. Vous n'avez rien à gérer.",
    points: [
      "Textes, photos et couleurs ajustés avec vous",
      "Hébergement en Europe et certificat de sécurité",
      "Nom de domaine et emails professionnels",
      "Sauvegardes et mises à jour comprises",
    ],
  },
  {
    cle: "appli-web",
    icone: AppWindow,
    titre: "Applis web",
    texte: "Réservation, espace client, commande, suivi de chantier… Une appli qui s'installe sur le téléphone, reliée à votre logiciel.",
    points: ["Démonstration avant de valider", "Mise en ligne à votre adresse", "Installable sans magasin d'applications"],
  },
  {
    cle: "appli-store",
    icone: Smartphone,
    titre: "Applis App Store et Google Play",
    texte: "Votre appli à votre nom dans les magasins d'applications, avec notifications, appareil photo et mode hors réseau.",
    points: ["Comptes développeur et publication gérés", "Validation Apple et Google suivie", "Mises à jour comprises"],
  },
  {
    cle: "logo",
    icone: Palette,
    titre: "Logo et identité visuelle",
    texte: "Un logo qui vous ressemble, vos couleurs et vos typographies, réunis dans une charte simple à suivre.",
    points: ["Plusieurs pistes, puis retouches", "Fichiers pour l'écran et l'impression", "Appliqué à votre site et à vos devis"],
  },
  {
    cle: "supports",
    icone: IdCard,
    titre: "Supports de communication",
    texte: "Cartes de visite, flyers, signature d'email, visuels pour les réseaux sociaux et habillage de véhicule.",
    points: ["À vos couleurs, cohérents entre eux", "Prêts à imprimer", "Modifiables ensuite"],
  },
] as const;

const etapes = [
  ["Vous décrivez", "Votre besoin en quelques lignes : ce que vous faites, pour qui, ce que vous aimez."],
  ["On vous montre", "Une première proposition ou une démonstration, et un devis clair, sans engagement."],
  ["On livre", "Retouches comprises, puis mise en ligne, publication ou fichiers prêts à imprimer."],
] as const;

/** Visuel : l'identité et l'appli du restaurant d'exemple généré plus haut dans la page. */
function Visuel() {
  return (
    <div className="relative mx-auto w-full max-w-[500px] sm:pb-20">
      <IdentiteExemple site={siteExemple} className="w-full sm:w-[292px]" />
      {/* Téléphone : sous l'identité sur mobile, en surimpression à partir de la tablette. */}
      <AppliExemple site={siteExemple} className="mx-auto mt-8 sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:origin-bottom-right sm:scale-[0.88]" />
    </div>
  );
}

const EVENEMENT = "sebt:demande-site";

/** Depuis l'aperçu du créateur : préremplit la demande de devis avec le site généré. */
export function demanderSite(description: string, site: SiteGenere) {
  const message = [
    `Je voudrais un site à partir de cet aperçu : « ${site.nom} » (${site.secteur}${site.ville ? `, ${site.ville}` : ""}).`,
    description.trim() ? `Ma description : ${description.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: { message } }));
}

/** Demande de devis : prépare un email à l'équipe (rien n'est envoyé sans l'utilisateur). */
function Demande() {
  const [choix, setChoix] = useState<string[]>([]);
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const ecoute = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      setChoix((c) => (c.includes("site") ? c : ["site", ...c]));
      setMessage(detail.message);
    };
    window.addEventListener(EVENEMENT, ecoute);
    return () => window.removeEventListener(EVENEMENT, ecoute);
  }, []);
  const pret = choix.length > 0 && message.trim().length >= 10;

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!pret) return;
    const services = servicesSurMesure.filter((s) => choix.includes(s.cle)).map((s) => s.titre);
    const sujet = `Demande sur mesure : ${services.join(", ")}`;
    const corps = `Bonjour,\n\nJe souhaite un devis pour : ${services.join(", ")}.\n\n${message.trim()}\n\n${nom.trim()}`;
    window.location.href = `mailto:${marque.emailCommercial}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  }

  return (
    <form onSubmit={envoyer} className="rounded-2xl border border-creme/[0.08] bg-nuit-2 p-6 md:p-8">
      <p className="text-xl font-medium tracking-[-0.02em] text-creme">Demander un devis</p>
      <p className="mt-1 text-sm text-taupe">Gratuit et sans engagement.</p>
      <fieldset className="mt-6">
        <legend className="text-sm text-taupe">Ce qui vous intéresse</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {servicesSurMesure.map((s) => {
            const actif = choix.includes(s.cle);
            return (
              <button
                key={s.cle}
                type="button"
                aria-pressed={actif}
                onClick={() => setChoix((c) => (actif ? c.filter((x) => x !== s.cle) : [...c, s.cle]))}
                className={cx(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] ring-1 transition-colors",
                  actif ? "bg-lagon text-encre ring-lagon" : "text-creme ring-creme/12 hover:bg-creme/[0.06]",
                )}
              >
                {actif ? <Check className="size-3.5" aria-hidden /> : null}
                {s.titre}
              </button>
            );
          })}
        </div>
      </fieldset>
      <label htmlFor="sm-nom" className="mt-6 block text-sm text-taupe">Votre nom et votre entreprise</label>
      <input
        id="sm-nom"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        maxLength={120}
        className="mt-2 h-11 w-full rounded-xl border border-creme/10 bg-nuit px-4 text-[15px] text-creme outline-none placeholder:text-taupe-2 focus:border-lagon/50"
        placeholder="Ex. : Julie Martin, Atelier Martin"
      />
      <label htmlFor="sm-message" className="mt-4 block text-sm text-taupe">Votre besoin</label>
      <textarea
        id="sm-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        maxLength={2000}
        className="mt-2 w-full rounded-xl border border-creme/10 bg-nuit px-4 py-3 text-[15px] text-creme outline-none placeholder:text-taupe-2 focus:border-lagon/50"
        placeholder="Ex. : une appli pour que mes clients prennent rendez-vous, et un logo plus moderne."
      />
      <Bouton type="submit" variante="lagon" taille="lg" className="mt-5 w-full" disabled={!pret}>
        <Send className="size-4" /> Préparer ma demande
      </Bouton>
      <p className="mt-3 text-center text-xs text-taupe-2">Votre messagerie s&apos;ouvre avec la demande prête à envoyer à {marque.emailCommercial}.</p>
    </form>
  );
}

export function SurMesure() {
  return (
    <section id="sur-mesure" className="relative scroll-mt-20 overflow-hidden border-t border-creme/[0.06]">
      <div aria-hidden className="pointer-events-none absolute top-24 right-0 h-[520px] w-[620px] translate-x-1/4 rounded-full bg-[radial-gradient(closest-side,rgba(226,201,159,0.10),transparent)] blur-2xl" />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <TitreSection surtitre="Sur mesure" affirmation="Site, applis, logo." precision="Réalisés pour vous, sur devis." />
            <Apparition delai={80}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-taupe">
                Notre équipe réalise votre site à partir de l&apos;aperçu, votre appli à votre nom, un logo qui vous ressemble et des supports à vos couleurs. Chaque projet a son devis, avec une proposition avant de vous engager.
              </p>
            </Apparition>
          </div>
          <Apparition delai={120}>
            <Visuel />
          </Apparition>
        </div>

        <Apparition delai={60} className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servicesSurMesure.map(({ cle, icone: Icone, titre, texte, points }) => (
            <div
              key={cle}
              className={cx(
                "flex flex-col rounded-2xl border border-creme/[0.08] bg-nuit-2 p-5",
                cle === "site" && "border-lagon/25 sm:col-span-2 lg:col-span-2",
              )}
            >
              <Icone className="size-5 text-lagon" aria-hidden />
              <p className="mt-4 font-medium text-creme">{titre}</p>
              <p className="mt-1.5 text-sm text-taupe">{texte}</p>
              <ul className={cx("mt-4 gap-x-6 gap-y-1.5 text-[13px] text-taupe", cle === "site" ? "grid sm:grid-cols-2" : "space-y-1.5")}>
                {points.map((p) => (
                  <li key={p} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-lagon" aria-hidden /> {p}</li>
                ))}
              </ul>
              <p className="mt-auto pt-5 font-mono text-[12px] text-or">Sur devis</p>
            </div>
          ))}
        </Apparition>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <Apparition delai={60}>
            <p className="font-mono text-[12.5px] tracking-wide text-or uppercase">Comment ça se passe</p>
            <ol className="mt-6 space-y-6">
              {etapes.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-creme/[0.06] font-mono text-[13px] text-or ring-1 ring-creme/10">{i + 1}</span>
                  <div>
                    <p className="font-medium text-creme">{t}</p>
                    <p className="mt-0.5 text-sm text-taupe">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Apparition>
          <Apparition delai={120}>
            <Demande />
          </Apparition>
        </div>
      </div>
    </section>
  );
}
