"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Wand2, Server, Globe, Mail, Cpu, GitBranch, ShieldCheck, Gauge, Undo2, Leaf, Users,
  Check, Search, ArrowRight, Receipt, Activity, PiggyBank, Package, Plus, Minus, Terminal,
} from "lucide-react";
import { Bouton, LienBouton, cx } from "@/components/ui";
import { offresWeb, offresVps, inclusVps, extensionsDomaines, euros, type Periode } from "@/config/offres";
import { disponibiliteDomaine, nettoyerNomDomaine } from "@/lib/domaines";
import { marque } from "@/config/marque";
import { Apparition } from "./Apparition";
import { DonneesFaq } from "./DonneesStructurees";

/* ---------- Briques communes ---------- */

// Titre de section en deux tons : une affirmation, puis une précision en gris.
export function TitreSection({ surtitre, affirmation, precision, centre = false, niveau = 2 }: { surtitre?: string; affirmation: string; precision?: string; centre?: boolean; niveau?: 1 | 2 }) {
  const Balise = niveau === 1 ? "h1" : "h2";
  return (
    <Apparition className={cx("max-w-3xl", centre && "mx-auto text-center")}>
      {surtitre && <p className="font-mono text-[12.5px] tracking-wide text-or uppercase">{surtitre}</p>}
      <Balise className={cx("titre-pub mt-3 text-[2.1rem] leading-[1.08] text-creme md:text-[3.25rem]", niveau === 1 && "md:text-6xl")}>
        {affirmation} {precision && <span className="text-taupe">{precision}</span>}
      </Balise>
    </Apparition>
  );
}

export function Fragment({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-creme/[0.07] bg-nuit p-4 font-mono text-[12.5px] leading-relaxed text-taupe", className)}>{children}</div>;
}

const ok = <Check className="inline size-3.5 text-lagon" aria-hidden />;

/* ---------- Promesses (sous le hero) ---------- */

export function PromessesSites() {
  const items = [
    ["Aperçu gratuit", "avant tout devis"],
    ["Fait avec vous", "retouches comprises"],
    ["Tout est géré", "hébergement, domaine, emails"],
    ["Données en Europe", "conformes au RGPD"],
  ];
  return (
    <section aria-label="Nos engagements" className="border-y border-creme/[0.06]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
        {items.map(([a, b], i) => (
          <div key={a} className={cx("px-6 py-7", i > 0 && "md:border-l md:border-creme/[0.06]", i % 2 === 1 && "border-l border-creme/[0.06] md:border-l")}>
            <p className="text-[15px] font-medium text-creme">{a}</p>
            <p className="mt-0.5 font-mono text-[12.5px] text-taupe-2">{b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Services : grille bento avec de vrais fragments d'interface ---------- */

function CarteService({ icone: Icone, titre, texte, children, className, delai }: { icone: typeof Wand2; titre: string; texte: string; children: ReactNode; className?: string; delai: number }) {
  return (
    <Apparition delai={delai} className={cx("flex flex-col justify-between gap-6 rounded-2xl border border-creme/[0.08] bg-nuit-2 p-6 transition-colors hover:border-creme/15", className)}>
      <div>
        <Icone className="size-5 text-lagon" aria-hidden />
        <h3 className="mt-4 text-lg font-medium tracking-[-0.01em] text-creme">{titre}</h3>
        <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-taupe">{texte}</p>
      </div>
      {children}
    </Apparition>
  );
}

export function Services() {
  return (
    <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 md:py-32">
      <TitreSection surtitre="La plateforme" affirmation="Un seul compte pour exister en ligne." precision="Du premier site au serveur dédié." />
      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <CarteService delai={0} className="md:col-span-4" icone={Wand2} titre="Créateur de site IA" texte="Décrivez votre activité : textes, mise en page et images sont prêts en une minute. Ajustez ensuite par chat ou par glisser-déposer.">
          <Fragment className="space-y-2.5 font-sans text-[13.5px]">
            <div className="ml-auto w-fit rounded-xl bg-lagon px-3 py-2 text-nuit">Ajoute une page avec mes tarifs</div>
            <div className="w-fit max-w-[85%] rounded-xl bg-creme/[0.06] px-3 py-2 text-creme/90">
              Page « Tarifs » ajoutée au menu, avec 3 formules. Je l&apos;ai mise en préproduction : vous la publiez quand vous voulez.
            </div>
          </Fragment>
        </CarteService>

        <CarteService delai={80} className="md:col-span-2" icone={Server} titre="Hébergement et WordPress" texte="Serveurs NVMe, cache, CDN européen et WordPress en un clic.">
          <Fragment>
            <p>{ok} WordPress installé</p>
            <p>{ok} Certificat SSL actif</p>
            <p>{ok} Cache et CDN activés</p>
            <p className="text-creme">● En ligne</p>
          </Fragment>
        </CarteService>

        <CarteService delai={0} className="md:col-span-2" icone={Package} titre="Applications et conteneurs" texte="Node.js, Python, PHP ou Docker, déployés à chaque push Git.">
          <Fragment>
            <p className="text-creme">$ git push sebt main</p>
            <p>→ build node 22</p>
            <p>{ok} déployé sur app.{marque.domaine.replace(".cloud", ".site")}</p>
          </Fragment>
        </CarteService>

        <CarteService delai={80} className="md:col-span-2" icone={Globe} titre="Noms de domaine" texte="Plus de 300 extensions, DNS géré, protection WHOIS offerte.">
          <Fragment className="space-y-1.5">
            {extensionsDomaines.slice(0, 3).map((x) => (
              <p key={x.ext} className="flex justify-between">
                <span className="text-creme">atelier-mona{x.ext}</span>
                <span>{euros(x.prix)}/an</span>
              </p>
            ))}
          </Fragment>
        </CarteService>

        <CarteService delai={160} className="md:col-span-2" icone={Mail} titre="Emails professionnels" texte="Des adresses à votre nom, anti-spam et webmail inclus.">
          <Fragment>
            <p className="text-creme">contact@atelier-mona.fr</p>
            <p className="mt-1.5 flex gap-3">
              <span>{ok} SPF</span>
              <span>{ok} DKIM</span>
              <span>{ok} DMARC</span>
            </p>
          </Fragment>
        </CarteService>

        <CarteService delai={0} className="md:col-span-6 md:flex-row md:items-center" icone={Cpu} titre="Serveurs VPS" texte="Ressources dédiées, accès root, images prêtes (Docker, Coolify) et un terminal web où l'IA propose les commandes sans jamais les lancer seule.">
          <Fragment className="w-full md:max-w-md">
            <p className="text-creme">root@vps-paris:~# ? pourquoi le disque est plein</p>
            <p className="mt-1">Les journaux Docker occupent l&apos;essentiel de l&apos;espace. Commande proposée :</p>
            <p className="mt-1 text-or">docker system prune --volumes</p>
            <p className="mt-1">[Entrée] pour exécuter · [Échap] pour annuler</p>
          </Fragment>
        </CarteService>
      </div>
    </section>
  );
}

/* ---------- Recherche de domaine ---------- */

export function Domaines() {
  const [saisie, setSaisie] = useState("");
  const [resultats, setResultats] = useState<{ nom: string; dispo: boolean; prix: number }[]>([]);

  function chercher(e: React.FormEvent) {
    e.preventDefault();
    const base = nettoyerNomDomaine(saisie);
    if (!base) return;
    setResultats(extensionsDomaines.map((x) => ({ nom: base + x.ext, dispo: disponibiliteDomaine(base + x.ext), prix: x.prix })));
  }

  const lignes = resultats.length ? resultats : extensionsDomaines.slice(0, 6).map((x) => ({ nom: "votre-nom" + x.ext, dispo: true, prix: x.prix }));

  return (
    <section id="domaines" className="scroll-mt-20 border-t border-creme/[0.06]">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:py-32 lg:grid-cols-2">
        <div>
          <TitreSection surtitre="Noms de domaine" affirmation="Votre adresse sur le web." precision="Trouvée en deux secondes." />
          <Apparition delai={80}>
            <ul className="mt-8 space-y-3 text-[15px] text-taupe">
              {["Domaine offert la 1re année avec un hébergement annuel", "Transfert gratuit et sans coupure", "Redirections, sous-domaines et DNS en un clic"].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-lagon" aria-hidden /> {t}</li>
              ))}
            </ul>
          </Apparition>
        </div>
        <Apparition delai={120} className="rounded-2xl border border-creme/[0.08] bg-nuit-2 p-5 md:p-6">
          <form onSubmit={chercher} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-taupe-2" aria-hidden />
              <input
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder="monentreprise"
                aria-label="Nom de domaine recherché"
                className="h-12 w-full rounded-full border border-creme/10 bg-nuit pr-4 pl-11 text-[15px] text-creme outline-none placeholder:text-taupe-2 focus:border-lagon/50"
              />
            </div>
            <Bouton taille="lg" type="submit" variante="lagon">Rechercher</Bouton>
          </form>
          <div className="mt-4 divide-y divide-creme/[0.06]" aria-live="polite">
            {lignes.slice(0, 7).map((r) => (
              <div key={r.nom} className={cx("flex min-h-14 items-center justify-between gap-3 py-2", !resultats.length && "opacity-50")}>
                <span className="truncate font-mono text-[14px] text-creme">{r.nom}</span>
                {r.dispo ? (
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-taupe">{euros(r.prix)}/an</span>
                    {resultats.length > 0 && <LienBouton href="/inscription" taille="sm" variante="nuit" className="h-9">Choisir</LienBouton>}
                  </div>
                ) : (
                  <span className="shrink-0 font-mono text-[12.5px] text-taupe-2">déjà pris</span>
                )}
              </div>
            ))}
          </div>
        </Apparition>
      </div>
    </section>
  );
}

/* ---------- Pourquoi sebt ---------- */

const differences = [
  { icone: Receipt, titre: "Le même prix, toujours", texte: "Pas de −80 % la première année puis ×4 au renouvellement. Le prix affiché est celui que vous paierez." },
  { icone: PiggyBank, titre: "Sans engagement", texte: "Payez au mois, résiliez en un clic. L'annuel reste moins cher, mais rien ne vous y oblige." },
  { icone: GitBranch, titre: "Préproduction et aperçus", texte: "Une copie de test en un clic, et une URL d'aperçu pour chaque branche Git." },
  { icone: Activity, titre: "Surveillance incluse", texte: "Vérification chaque minute, alertes et une page de statut publique par site." },
  { icone: Package, titre: "Zéro verrouillage", texte: "Exportez tout (fichiers, bases, emails, DNS) en une archive standard, à tout moment." },
  { icone: ShieldCheck, titre: "Plafond de dépenses", texte: "Fixez un budget mensuel : rien ne peut le dépasser sans votre accord." },
  { icone: Users, titre: "Pensé pour les agences", texte: "Marque blanche, accès client, transfert de propriété et facturation intégrée." },
  { icone: Leaf, titre: "Empreinte affichée", texte: "Consommation et CO₂ estimés pour chaque site, avec des conseils pour les réduire." },
];

export function Pourquoi() {
  return (
    <section className="border-t border-creme/[0.06]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <TitreSection surtitre={`Pourquoi ${marque.nom}`} affirmation="Ce que les hébergeurs classiques ne font pas." />
          <Link href="/sites/tarifs" className="group inline-flex shrink-0 items-center gap-1.5 text-[15px] text-creme hover:text-or">
            Comparer les offres <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-creme/[0.08] bg-creme/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {differences.map((d, i) => (
            <Apparition key={d.titre} delai={(i % 4) * 60} className="bg-nuit p-6">
              <d.icone className="size-5 text-lagon" aria-hidden />
              <h3 className="mt-4 font-medium text-creme">{d.titre}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-taupe">{d.texte}</p>
            </Apparition>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Agent IA ---------- */

const conversation = [
  { qui: "vous", texte: "Mon site est lent depuis ce matin." },
  { qui: "agent", texte: "J'ai analysé boulangerie-martin.fr : le temps de réponse est passé de 180 ms à 1,9 s à 9 h 12. Cause : 14 images de plus de 3 Mo ajoutées à la galerie, et le cache est désactivé depuis la dernière mise à jour." },
  { qui: "agent", texte: "Je propose : 1) convertir les images en WebP, 2) réactiver le cache. Une sauvegarde est faite avant. On y va ?", action: true },
  { qui: "vous", texte: "Oui, vas-y." },
  { qui: "agent", texte: "Terminé en 38 s. Tout est annulable pendant 7 jours depuis l'historique.", fini: true },
];

export function Agent() {
  return (
    <section id="agent" className="relative scroll-mt-20 overflow-hidden border-t border-creme/[0.06]">
      <div aria-hidden className="pointer-events-none absolute top-1/2 right-0 h-[600px] w-[700px] -translate-y-1/2 translate-x-1/4 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,124,0.12),transparent)] blur-2xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:py-32 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <TitreSection surtitre="Agent IA" affirmation="Un administrateur qui ne dort jamais." precision="Et qui demande avant d'agir." />
          <Apparition delai={80}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-taupe">
              Il diagnostique, corrige, migre et optimise vos sites et serveurs. Chaque action est expliquée, précédée d&apos;une sauvegarde et annulable.
            </p>
            <div className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {[
                [Gauge, "Optimiser", "Images, cache, base de données, Core Web Vitals"],
                [ShieldCheck, "Sécuriser", "Mises à jour, malwares, failles connues"],
                [Undo2, "Réparer", "Erreurs 500, extensions cassées, retour arrière"],
                [Terminal, "Administrer", "VPS, Docker, DNS et emails"],
              ].map(([I, t, d]) => {
                const Icone = I as typeof Gauge;
                return (
                  <div key={t as string} className="flex gap-3">
                    <Icone className="mt-0.5 size-5 shrink-0 text-lagon" aria-hidden />
                    <div>
                      <p className="font-medium text-creme">{t as string}</p>
                      <p className="mt-0.5 text-sm text-taupe">{d as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Apparition>
        </div>
        <Apparition delai={120} className="rounded-2xl border border-creme/10 bg-nuit-2 p-5 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]">
          <div className="mb-4 flex items-center justify-between border-b border-creme/[0.08] pb-3">
            <span className="flex items-center gap-2 text-sm font-medium text-creme"><span className="size-2 rounded-full bg-lagon" aria-hidden /> Agent {marque.nom}</span>
            <span className="font-mono text-[12px] text-taupe-2">boulangerie-martin.fr</span>
          </div>
          <div className="space-y-3">
            {conversation.map((m, i) => (
              <div key={i} className={cx("flex", m.qui === "vous" ? "justify-end" : "justify-start")}>
                <div className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed", m.qui === "vous" ? "bg-lagon text-nuit" : "bg-creme/[0.06] text-creme/90")}>
                  {m.texte}
                  {m.action && (
                    <div className="mt-3 flex gap-2" aria-hidden>
                      <span className="rounded-full bg-lagon px-3 py-1 text-xs font-medium text-nuit">Appliquer</span>
                      <span className="rounded-full border border-creme/20 px-3 py-1 text-xs">Voir le détail</span>
                    </div>
                  )}
                  {m.fini && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-nuit/70 p-2"><p className="text-taupe">Avant</p><p className="text-base font-semibold text-creme">1,9 s</p></div>
                      <div className="rounded-lg bg-nuit/70 p-2"><p className="text-taupe">Après</p><p className="text-base font-semibold text-or">160 ms</p></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Apparition>
      </div>
    </section>
  );
}

/* ---------- Tarifs ---------- */

export function Tarifs({ titre = true }: { titre?: boolean }) {
  const [periode, setPeriode] = useState<Periode>("mensuel");
  const [onglet, setOnglet] = useState<"web" | "vps">("web");

  return (
    <section id="tarifs" className={cx("scroll-mt-20", titre && "border-t border-creme/[0.06]")}>
      <div className={cx("mx-auto max-w-6xl px-6", titre ? "py-24 md:py-32" : "pb-24")}>
        {titre && <TitreSection centre surtitre="Tarifs" affirmation="Des prix clairs." precision="Aujourd'hui et dans quatre ans." />}

        <div className="mt-10 flex flex-col items-center gap-5">
          <div role="group" aria-label="Type d'offre" className="inline-flex rounded-full border border-creme/10 bg-nuit-2 p-1">
            {(["web", "vps"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOnglet(o)}
                aria-pressed={onglet === o}
                className={cx("h-10 cursor-pointer rounded-full px-5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-lagon", onglet === o ? "bg-creme text-nuit" : "text-taupe hover:text-creme")}
              >
                {o === "web" ? <>Hébergement<span className="hidden sm:inline"> et créateur IA</span></> : "Serveurs VPS"}
              </button>
            ))}
          </div>
          {onglet === "web" && (
            <div className="flex items-center gap-3 text-sm">
              <button onClick={() => setPeriode("mensuel")} className={cx("cursor-pointer py-2", periode === "mensuel" ? "text-creme" : "text-taupe")}>Mensuel</button>
              <button
                role="switch"
                aria-checked={periode === "annuel"}
                onClick={() => setPeriode(periode === "mensuel" ? "annuel" : "mensuel")}
                className={cx("relative h-6 w-11 cursor-pointer rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagon", periode === "annuel" ? "bg-lagon" : "bg-creme/15")}
                aria-label="Paiement annuel"
              >
                <span className={cx("absolute top-0.5 size-5 rounded-full bg-creme shadow transition-all", periode === "annuel" ? "left-[22px]" : "left-0.5")} />
              </button>
              <button onClick={() => setPeriode("annuel")} className={cx("cursor-pointer py-2", periode === "annuel" ? "text-creme" : "text-taupe")}>Annuel</button>
              <span className="font-mono text-[12.5px] text-or">−20 % et domaine offert</span>
            </div>
          )}
        </div>

        {onglet === "web" ? (
          <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-3">
            {offresWeb.map((o, i) => {
              const prix = periode === "mensuel" ? o.prixMensuel : o.prixAnnuel;
              return (
                <Apparition
                  key={o.id}
                  delai={i * 80}
                  className={cx(
                    "relative flex flex-col rounded-2xl p-7",
                    o.misEnAvant
                      ? "border border-lagon/45 bg-nuit-2 shadow-[0_0_80px_-20px_rgba(201,169,124,0.35)]"
                      : "border border-creme/[0.08] bg-nuit-2/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-medium tracking-[-0.02em] text-creme">{o.nom}</h3>
                    {o.misEnAvant && <span className="rounded-full bg-lagon/15 px-2.5 py-1 text-[12px] font-medium text-or">Recommandé</span>}
                  </div>
                  <p className="mt-1.5 min-h-10 text-sm text-taupe">{o.pour}</p>
                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-5xl font-medium tracking-[-0.04em] text-creme">{prix.toFixed(2).replace(".", ",")} €</span>
                    <span className="text-taupe">/mois HT</span>
                  </div>
                  <p className="mt-1.5 font-mono text-[12.5px] text-taupe-2">
                    {periode === "annuel" ? `soit ${euros(prix * 12)} par an · même prix au renouvellement` : "sans engagement · même prix au renouvellement"}
                  </p>
                  <LienBouton href={`/inscription?offre=${o.id}`} variante={o.misEnAvant ? "lagon" : "nuit"} taille="lg" className="mt-7 w-full">
                    Choisir {o.nom}
                  </LienBouton>
                  <p className="mt-7 text-[13.5px] font-medium text-creme/85">{o.creditsIA.toLocaleString("fr-FR")} crédits IA par mois</p>
                  <ul className="mt-3 space-y-2.5">
                    {o.points.map((p) => (
                      <li key={p} className="flex gap-2.5 text-[14.5px] text-taupe">
                        <Check className="mt-0.5 size-4 shrink-0 text-lagon" aria-hidden /> {p}
                      </li>
                    ))}
                  </ul>
                </Apparition>
              );
            })}
          </div>
        ) : (
          <div id="vps" className="mt-12">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {offresVps.map((v) => (
                <div
                  key={v.id}
                  className={cx(
                    "relative flex flex-col rounded-2xl p-6",
                    v.misEnAvant ? "border border-lagon/45 bg-nuit-2 shadow-[0_0_80px_-20px_rgba(201,169,124,0.35)]" : "border border-creme/[0.08] bg-nuit-2/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-medium text-creme">{v.nom}</h3>
                    {v.misEnAvant && <span className="rounded-full bg-lagon/15 px-2.5 py-1 text-[12px] font-medium text-or">Populaire</span>}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-medium tracking-[-0.04em] text-creme">{v.prixMensuel.toFixed(2).replace(".", ",")} €</span>
                    <span className="text-taupe">/mois</span>
                  </div>
                  <dl className="mt-5 space-y-2 border-t border-creme/[0.08] pt-4 font-mono text-[13px]">
                    {[["vCPU", v.vcpu], ["RAM", `${v.ramGo} Go`], ["NVMe", `${v.disqueGo} Go`], ["Trafic", `${v.traficTo} To`]].map(([k, val]) => (
                      <div key={k as string} className="flex justify-between"><dt className="text-taupe-2">{k}</dt><dd className="text-creme">{val}</dd></div>
                    ))}
                  </dl>
                  <LienBouton href={`/inscription?vps=${v.id}`} variante={v.misEnAvant ? "lagon" : "nuit"} className="mt-6 h-11 w-full">Déployer</LienBouton>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2.5 rounded-2xl border border-creme/[0.08] p-5 sm:grid-cols-2 lg:grid-cols-3">
              {inclusVps.map((i) => (
                <p key={i} className="flex gap-2 text-sm text-taupe"><Check className="mt-0.5 size-4 shrink-0 text-lagon" aria-hidden />{i}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

const questions = [
  ["Combien coûte un site ?", "Chaque projet a son devis, gratuit et sans engagement : la création, puis un forfait mensuel qui comprend l'hébergement, le nom de domaine, les emails professionnels, les sauvegardes et les mises à jour. Vous savez exactement ce que vous paierez avant de commencer."],
  ["À quoi sert l'aperçu ?", "À voir en une minute une première idée de votre site, à partir de quelques mots. Il sert de point de départ : notre équipe reprend vos textes, vos photos et vos couleurs, et l'ajuste avec vous."],
  ["Dois-je m'occuper de quelque chose ?", "Non. Nous gérons l'hébergement, le nom de domaine, les adresses email, le certificat de sécurité et les sauvegardes. Vous nous envoyez vos demandes de modification, nous les faisons."],
  ["Où sont hébergées mes données ?", "Dans l'Union européenne, conformément au RGPD. Vos données ne servent ni à la publicité ni à entraîner des modèles d'IA."],
  ["Puis-je reprendre mon site existant ?", "Oui. Nous récupérons vos contenus et votre nom de domaine, puis basculons sans coupure."],
  ["Le site est-il relié au logiciel ?", "Il peut l'être : prise de rendez-vous branchée sur votre agenda, demandes de devis qui arrivent dans votre logiciel, prestations reprises de votre catalogue."],
  ["Que se passe-t-il si je pars ?", "Le site et le nom de domaine sont à vous. Nous vous remettons les fichiers et transférons le domaine, sans frais."],
];

export function Faq() {
  const [ouverte, setOuverte] = useState<number | null>(0);
  return (
    <section className="border-t border-creme/[0.06]">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:py-32 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <TitreSection surtitre="Questions fréquentes" affirmation="Tout ce que vous vous demandez." />
          <p className="mt-5 text-taupe">
            Une autre question ? <a href={`mailto:${marque.emailSupport}`} className="text-creme underline decoration-creme/30 underline-offset-4 hover:decoration-lagon">Écrivez-nous</a>.
          </p>
        </div>
        <DonneesFaq questions={questions} />
        <div className="divide-y divide-creme/[0.08] border-y border-creme/[0.08]">
          {questions.map(([q, r], i) => (
            <div key={q}>
              <h3>
                <button
                  onClick={() => setOuverte(ouverte === i ? null : i)}
                  className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 py-5 text-left focus-visible:outline-2 focus-visible:outline-lagon"
                  aria-expanded={ouverte === i}
                >
                  <span className="text-[17px] font-medium text-creme">{q}</span>
                  {ouverte === i ? <Minus className="size-4 shrink-0 text-taupe" aria-hidden /> : <Plus className="size-4 shrink-0 text-taupe" aria-hidden />}
                </button>
              </h3>
              {/* Réponse toujours présente dans la page (lisible par les moteurs de recherche), masquée tant que la question est fermée. */}
              <p hidden={ouverte !== i} className="animate-apparait pb-6 text-[15px] leading-relaxed text-taupe">{r}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Appel final ---------- */

export function AppelFinal() {
  return (
    <section className="relative overflow-hidden border-t border-creme/[0.06]">
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-[500px] w-[1000px] -translate-x-1/2 translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,124,0.25),transparent)] blur-2xl" />
      <div className="relative mx-auto max-w-6xl px-6 py-28 text-center md:py-40">
        <Apparition>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marque/sebt-icone-sombre.svg" alt="" width={56} height={56} className="mx-auto size-14 rounded-2xl" />
          <h2 className="titre-pub mx-auto mt-8 max-w-3xl text-[2.5rem] leading-[1.04] text-creme md:text-7xl">
            Le bon moment,<span className="block text-taupe">c&apos;est maintenant.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-taupe">L&apos;aperçu est gratuit. Le devis aussi.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <LienBouton href="/sites#createur" variante="lagon" taille="xl">
              Voir mon site en une minute <ArrowRight className="size-4" />
            </LienBouton>
            <LienBouton href="/sites#sur-mesure" variante="nuit" taille="xl">
              Demander un devis
            </LienBouton>
          </div>
        </Apparition>
      </div>
    </section>
  );
}
