"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight, Bell, Building2, CalendarDays, Camera, Check, ChevronDown, CircleAlert, Code, Download, FileText, FolderKanban,
  Fingerprint, History, KeyRound, Landmark, LayoutDashboard, LifeBuoy, Lock, Minus, Monitor, Package, Plug, Plus,
  QrCode, Receipt, Search, ShieldCheck, ShoppingCart, Smartphone, Sparkles, SprayCan, UserRound, Users, WifiOff, Workflow,
} from "lucide-react";
import { LienBouton, cx } from "@/components/ui";
import { DonneesFaq } from "@/components/marketing/DonneesStructurees";
import { AppliExemple, SiteExemple, siteExemple } from "@/components/marketing/ExempleMarque";
import { marque, liensLogiciel } from "@/config/marque";
import { categories, comparatifLogiciel, joursEssai, metiersLogiciel, modules, offresLogiciel, prixParMois, reconnaitreMetier, type CategorieModule } from "@/config/logiciel";
import { Apparition } from "./Apparition";
import { Fragment, TitreSection } from "./Sections";

// Les écrans présentés ici sont des illustrations du logiciel, avec des données fictives.

const icones: Record<string, typeof Users> = {
  crm: Users, sales: Receipt, purchases: ShoppingCart, inventory: Package, projects: FolderKanban, cleaning: SprayCan,
  calendar: CalendarDays, support: LifeBuoy, hr: UserRound, treasury: Landmark, documents: FileText, automations: Workflow, integrations: Plug,
};

const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0 });

/* ---------- Premier écran ---------- */

function Statut({ ton, children }: { ton: "ok" | "attente" | "retard"; children: ReactNode }) {
  const c = { ok: "bg-[#e3efe6] text-[#2d6a3e]", attente: "bg-[#f3ead8] text-[#7a5a1c]", retard: "bg-[#f6e0db] text-[#a3361f]" }[ton];
  return <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", c)}>{children}</span>;
}

/** Aperçu de l'application de gestion (illustration, données fictives). */
function ApercuApplication() {
  const menu = [
    [LayoutDashboard, "Tableau de bord", true], [Users, "Contacts & CRM"], [Receipt, "Ventes"], [SprayCan, "Interventions"],
    [FolderKanban, "Projets"], [Package, "Stocks"], [Landmark, "Trésorerie"], [UserRound, "Équipe"],
  ] as const;
  const barres = [42, 55, 48, 62, 58, 71, 66, 80, 74, 88, 83, 95];
  return (
    <div className="overflow-hidden rounded-2xl border border-creme/10 bg-[#fbf8f2] text-[#1f1b16] shadow-[0_50px_140px_-30px_rgba(0,0,0,0.9)]" aria-hidden>
      <div className="flex">
        <aside className="hidden w-[210px] shrink-0 border-r border-[#e7decf] bg-[#f5efe4] p-4 md:block">
          <div className="flex items-center gap-2 px-2 pb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marque/sebt-logo-clair.svg" alt="" className="h-5 w-auto" />
          </div>
          <div className="space-y-0.5">
            {menu.map(([I, l, actif]) => (
              <div key={l} className={cx("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px]", actif ? "bg-white font-medium shadow-sm" : "text-[#6b6257]")}>
                <I className="size-4" /> {l}
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 border-b border-[#e7decf] px-5 py-3">
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-[12px] text-[#8a8175] ring-1 ring-[#e7decf]">
              <Search className="size-3.5" /> <span className="truncate">Rechercher un client, une facture…</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-lg bg-[#1f1b16] px-2.5 py-1.5 text-[11.5px] text-[#f5efe4] sm:flex">
                <Sparkles className="size-3.5 text-[#c9a97c]" /> Assistant <span className="opacity-60">Ctrl J</span>
              </span>
              <Bell className="size-4 text-[#6b6257]" />
              <span className="grid size-7 place-items-center rounded-full bg-[#c9a97c] text-[11px] font-semibold">CM</span>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Chiffre d'affaires du mois", "48 260 €", "+12 % vs septembre"],
                ["Reste à encaisser", "9 840 €", "3 factures en retard"],
                ["Interventions aujourd'hui", "27", "24 agents sur site"],
                ["Devis en attente", "6", "21 400 € potentiels"],
              ].map(([t, v, s]) => (
                <div key={t} className="rounded-xl bg-white p-3.5 ring-1 ring-[#e7decf]">
                  <p className="text-[11px] text-[#6b6257]">{t}</p>
                  <p className="mt-1 text-[20px] font-semibold tracking-tight">{v}</p>
                  <p className="mt-0.5 text-[11px] text-[#82623a]">{s}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-xl bg-white p-4 ring-1 ring-[#e7decf]">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium">Chiffre d&apos;affaires sur 12 mois</span>
                  <span className="text-[#6b6257]">2026</span>
                </div>
                <div className="mt-4 flex h-[120px] items-end gap-1.5">
                  {barres.map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-[3px]" style={{ height: `${h}%`, background: i === barres.length - 1 ? "#c9a97c" : "#e7dccb" }} />
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-[#e7decf]">
                <p className="text-[12px] font-medium">Dernières factures</p>
                <div className="mt-2 divide-y divide-[#efe8dc] text-[12px]">
                  {[
                    ["FA-2026-0142", "Résidence Les Tilleuls", "1 280 €", <Statut key="a" ton="ok">Payée</Statut>],
                    ["FA-2026-0141", "Cabinet Delmas", "640 €", <Statut key="b" ton="attente">Envoyée</Statut>],
                    ["FA-2026-0139", "Garage du Lot", "2 150 €", <Statut key="c" ton="retard">En retard</Statut>],
                    ["FA-2026-0138", "Boulangerie Martin", "395 €", <Statut key="d" ton="ok">Payée</Statut>],
                  ].map(([n, c, m, s]) => (
                    <div key={n as string} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c}</span>
                        <span className="text-[11px] text-[#8a8175]">{n}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">{m}{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroLogiciel() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="grille-fine pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <div aria-hidden className="pointer-events-none absolute top-[420px] left-1/2 h-[620px] w-[1100px] animate-halo rounded-full bg-[radial-gradient(closest-side,rgba(201,169,124,0.22),transparent)] blur-2xl" />
      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-24">
        <Link
          href="/#terrain"
          className="group inline-flex items-center gap-2 rounded-full border border-creme/10 bg-creme/[0.04] py-1.5 pr-3 pl-1.5 text-[13px] text-taupe transition hover:border-creme/20 hover:text-creme"
        >
          <span className="rounded-full bg-lagon/15 px-2 py-0.5 text-[12px] font-medium text-or">Nouveau</span>
          L&apos;application terrain, avec pointage par QR code
          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
        </Link>
        <h1 className="titre-pub mt-7 max-w-4xl text-[2.6rem] leading-[1.02] text-creme sm:text-6xl md:text-[4.5rem]">
          Toute votre entreprise
          <span className="block text-taupe">Un seul logiciel</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-taupe">
          Clients, devis, factures, plannings, interventions, stocks et trésorerie : {marque.nom} réunit tout ce qui fait tourner une TPE ou une PME, et vous
          n&apos;activez que les modules dont vous avez besoin.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <LienBouton href={liensLogiciel.essai} variante="lagon" taille="xl">
            Essayer gratuitement <ArrowRight className="size-4" />
          </LienBouton>
          <LienBouton href="/tarifs" variante="nuit" taille="xl">
            Voir les tarifs
          </LienBouton>
        </div>
        <p className="mt-4 font-mono text-[12.5px] text-taupe-2">Offre gratuite pour toujours · Business offert {joursEssai} jours, sans carte bancaire</p>

        <div className="relative mt-16">
          <ApercuApplication />
        </div>
      </div>
    </section>
  );
}

export function PromessesLogiciel() {
  const items = [
    ["13 modules", "activez ceux qu'il vous faut"],
    ["Facture électronique", "prête pour septembre 2027"],
    ["9 métiers préréglés", "catalogue, devis, assistant"],
    ["Application terrain", "pour vos équipes, même hors réseau"],
  ];
  return (
    <section aria-label="L'essentiel" className="border-y border-creme/[0.06]">
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

/* ---------- Modules ---------- */

function Carte({ icone: Icone, titre, texte, children, className, delai = 0 }: { icone: typeof Users; titre: string; texte: string; children: ReactNode; className?: string; delai?: number }) {
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

const ok = <Check className="inline size-3.5 text-lagon" aria-hidden />;

export function Modules() {
  const [filtre, setFiltre] = useState<CategorieModule | "tous">("tous");
  const visibles = modules.filter((m) => filtre === "tous" || m.categorie === filtre);
  return (
    <section id="modules" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 md:py-32">
      <TitreSection surtitre="Les modules" affirmation="Tout ce qu'il faut pour gérer." precision="Rien de ce qui ne vous sert pas." />

      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <Carte className="md:col-span-4" icone={Receipt} titre="Devis et factures" texte="Du devis accepté en ligne à la facture Factur-X envoyée par email, avec relances automatiques et paiement en ligne.">
          <Fragment className="grid gap-2 font-sans text-[13.5px] sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-creme">Devis DE-2026-0087 · Résidence Les Tilleuls</p>
              <p className="mt-0.5">Entretien des parties communes · 12 mois</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-creme">1 280,00 € HT</span>
              <span className="rounded-full bg-lagon/15 px-2 py-0.5 text-[11.5px] text-or">Accepté en ligne</span>
            </div>
          </Fragment>
        </Carte>
        <Carte delai={80} className="md:col-span-2" icone={Users} titre="CRM" texte="Contacts, entreprises et pipeline de ventes.">
          <Fragment className="grid grid-cols-3 gap-2 text-[11.5px]">
            {[["Prospect", 4], ["Devis", 3], ["Gagné", 2]].map(([c, n]) => (
              <div key={c as string}>
                <p className="mb-1.5">{c}</p>
                {Array.from({ length: n as number }).map((_, i) => (
                  <div key={i} className="mb-1 h-4 rounded bg-creme/[0.07]" />
                ))}
              </div>
            ))}
          </Fragment>
        </Carte>
        <Carte className="md:col-span-2" icone={SprayCan} titre="Interventions et planning" texte="Contrats, planning des agents, pointage et contrôles qualité.">
          <Fragment>
            <p className="text-creme">Lundi · 27 passages</p>
            <p>{ok} 07:30 Résidence Les Tilleuls</p>
            <p>{ok} 09:00 Cabinet Delmas</p>
            <p className="text-or">● 11:15 Garage du Lot</p>
          </Fragment>
        </Carte>
        <Carte delai={80} className="md:col-span-2" icone={Package} titre="Stocks" texte="Articles, entrepôts, mouvements et alertes.">
          <Fragment className="space-y-1.5">
            <p className="flex justify-between"><span className="text-creme">Microfibres</span><span>412</span></p>
            <p className="flex justify-between"><span className="text-creme">Détergent 5 L</span><span className="text-or">8 · à commander</span></p>
            <p className="flex justify-between"><span className="text-creme">Sacs 100 L</span><span>1 250</span></p>
          </Fragment>
        </Carte>
        <Carte delai={160} className="md:col-span-2" icone={Landmark} titre="Trésorerie" texte="Encaissements, rapprochement bancaire et export FEC.">
          <Fragment>
            <p className="flex justify-between"><span>Solde</span><span className="text-creme">32 480 €</span></p>
            <p className="flex justify-between"><span>À encaisser</span><span className="text-creme">9 840 €</span></p>
            <p className="flex justify-between"><span>Prévision à 30 j</span><span className="text-or">+6 120 €</span></p>
          </Fragment>
        </Carte>
      </div>

      <Apparition className="mt-16">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h3 className="text-2xl font-medium tracking-[-0.02em] text-creme">Les 13 modules</h3>
            <p className="mt-2 text-taupe">Activez-en deux gratuitement, six avec Pro, tous avec Business.</p>
          </div>
          <div role="group" aria-label="Filtrer par catégorie" className="flex flex-wrap gap-1.5">
            {(["tous", ...Object.keys(categories)] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFiltre(c as CategorieModule | "tous")}
                aria-pressed={filtre === c}
                className={cx(
                  "h-9 cursor-pointer rounded-full px-3.5 text-[13px] transition focus-visible:outline-2 focus-visible:outline-lagon",
                  filtre === c ? "bg-creme text-nuit" : "border border-creme/10 text-taupe hover:text-creme",
                )}
              >
                {c === "tous" ? "Tous" : categories[c as CategorieModule]}
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-8 grid overflow-hidden rounded-2xl border border-creme/[0.08] sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((m) => {
            const I = icones[m.cle] ?? Plug;
            return (
              <li key={m.cle} className="flex gap-4 p-5 outline outline-1 outline-creme/[0.08]">
                <I className="mt-0.5 size-5 shrink-0 text-lagon" aria-hidden />
                <div>
                  <p className="font-medium text-creme">{m.nom}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-taupe">{m.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[14px] text-taupe-2">Dans tous les modules : tableau, Kanban, calendrier, Gantt, champs personnalisés, vues enregistrées, import et export, historique, commentaires, fichiers et recherche.</p>
      </Apparition>
    </section>
  );
}

/* ---------- Assistant IA ---------- */

export function Assistant() {
  return (
    <section id="assistant" className="relative scroll-mt-20 overflow-hidden border-t border-creme/[0.06]">
      <div aria-hidden className="pointer-events-none absolute top-1/2 right-0 h-[600px] w-[700px] -translate-y-1/2 translate-x-1/4 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,124,0.12),transparent)] blur-2xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:py-32 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <TitreSection surtitre="Assistant IA" affirmation="Posez une question à vos chiffres." precision="Il répond, et n'agit qu'avec votre accord." />
          <Apparition delai={80}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-taupe">
              Depuis n&apos;importe quel écran, Ctrl + J ouvre l&apos;assistant. Il interroge vos données, rédige, résume et lit vos factures fournisseurs.
            </p>
            <ul className="mt-8 space-y-3 text-[15px] text-taupe">
              {[
                "Réponses avec tableaux et graphiques, tirés de vos propres données",
                "Actions proposées (créer, modifier, envoyer) toujours soumises à confirmation",
                "Devis express : décrivez le chantier en une phrase, le devis est prêt avec vos prix",
                "Rédaction de relances et de comptes rendus",
                "Lecture des factures fournisseurs : montants, TVA, échéance",
              ].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-lagon" aria-hidden /> {t}</li>
              ))}
            </ul>
          </Apparition>
        </div>
        <Apparition delai={120} className="rounded-2xl border border-creme/10 bg-nuit-2 p-5 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]">
          <div className="mb-4 flex items-center justify-between border-b border-creme/[0.08] pb-3">
            <span className="flex items-center gap-2 text-sm font-medium text-creme"><Sparkles className="size-4 text-lagon" aria-hidden /> Assistant {marque.nom}</span>
            <span className="font-mono text-[12px] text-taupe-2">Ctrl J</span>
          </div>
          <div className="space-y-3 text-[14.5px] leading-relaxed">
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl bg-lagon px-4 py-2.5 text-nuit">Quels clients ont des factures en retard ?</p>
            </div>
            <div className="max-w-[92%] rounded-2xl bg-creme/[0.06] px-4 py-3 text-creme/90">
              Trois clients, pour 9 840 € au total :
              <table className="mt-3 w-full font-mono text-[12.5px]">
                <tbody>
                  {[["Garage du Lot", "2 150 €", "32 j"], ["SCI Les Allées", "4 870 €", "18 j"], ["Hôtel du Parc", "2 820 €", "9 j"]].map(([c, m, r]) => (
                    <tr key={c} className="border-t border-creme/[0.08]">
                      <td className="py-1.5 text-creme">{c}</td>
                      <td className="py-1.5 text-right">{m}</td>
                      <td className="py-1.5 text-right text-or">{r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl bg-lagon px-4 py-2.5 text-nuit">Prépare une relance pour chacun.</p>
            </div>
            <div className="max-w-[92%] rounded-2xl bg-creme/[0.06] px-4 py-3 text-creme/90">
              Trois relances sont prêtes, avec la facture en pièce jointe. Je les envoie ?
              <div className="mt-3 flex gap-2" aria-hidden>
                <span className="rounded-full bg-lagon px-3 py-1 text-xs font-medium text-nuit">Envoyer les 3</span>
                <span className="rounded-full border border-creme/20 px-3 py-1 text-xs">Relire d&apos;abord</span>
              </div>
            </div>
          </div>
        </Apparition>
      </div>
    </section>
  );
}

/* ---------- Application terrain ---------- */

/** Courbe lissée (Catmull-Rom → Bézier) passant par les points donnés. */
function courbe(points: [number, number][]) {
  let d = `M${points[0]![0]},${points[0]![1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i - 1] ?? points[i]!;
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[i + 1]!;
    const [x3, y3] = points[i + 2] ?? points[i + 1]!;
    d += ` C${x1 + (x2 - x0) / 6},${y1 + (y2 - y0) / 6} ${x2 - (x3 - x1) / 6},${y2 - (y3 - y1) / 6} ${x2},${y2}`;
  }
  return d;
}

/** Écran du bureau : suivi des passages de la journée, en direct. */
function EcranSuivi() {
  // Passages réalisés, de 7 h à 15 h 30, par demi-heure (données fictives).
  const faits = [0, 2, 5, 7, 8, 11, 13, 14, 17, 19, 22, 24, 25, 28, 31, 33, 35, 38];
  const prevus = 48;
  const L = 560, H = 190, pas = L / 20;
  const pts = faits.map((v, i) => [i * pas, H - 8 - (v / prevus) * (H - 24)] as [number, number]);
  const ligne = courbe(pts);
  const dernier = pts.at(-1)!;
  const agents = [
    ["SM", "Sophie M.", "Résidence Les Tilleuls", "Sur place", "ok"],
    ["KB", "Karim B.", "Cabinet Delmas", "En route", "attente"],
    ["LR", "Léa R.", "Garage du Lot", "Retard 12 min", "retard"],
  ] as const;
  return (
    <div className="rounded-[30px] bg-black p-2.5 shadow-[0_60px_160px_-40px_rgba(0,0,0,0.95)] ring-1 ring-creme/10">
      <div className="flex overflow-hidden rounded-[22px] bg-[linear-gradient(160deg,#1d1813_0%,#120f0c_45%,#0d0b09_100%)]">
        <aside className="w-[200px] shrink-0 border-r border-creme/[0.06] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marque/sebt-logo-sombre.svg" alt="" className="mb-6 ml-2 h-5 w-auto" />
          {[
            [LayoutDashboard, "Suivi terrain", true],
            [CalendarDays, "Planning"],
            [Users, "Équipe"],
            [Building2, "Sites"],
            [CircleAlert, "Anomalies"],
          ].map(([I, l, actif]) => {
            const Icone = I as typeof Users;
            return (
              <div key={l as string} className={cx("mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]", actif ? "bg-creme/[0.06] text-or" : "text-taupe")}>
                <Icone className="size-4" /> {l as string}
              </div>
            );
          })}
        </aside>
        <div className="min-w-0 flex-1 p-5">
          <div className="rounded-2xl border border-creme/[0.06] bg-black/40 p-5">
            <p className="flex items-center gap-1.5 text-[15px] text-creme">Passages du jour <ChevronDown className="size-4 text-taupe" /></p>
            <p className="mt-3 text-[11.5px] text-taupe-2">Lundi 2 novembre · 15:30</p>
            <p className="mt-1 text-[34px] font-medium tracking-[-0.03em] text-creme tabular-nums">
              38 <span className="text-taupe-2">/ {prevus}</span>
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11.5px] tabular-nums">
              <span className="text-[#7fd49b]">+6 depuis 14 h</span>
              <span className="rounded-md bg-[#7fd49b]/10 px-1.5 py-0.5 text-[#7fd49b]">79 % de la journée</span>
            </div>
            <svg viewBox={`0 0 ${L} ${H}`} className="mt-4 h-[150px] w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="terrain-aire" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e2c99f" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#e2c99f" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1="0" x2={L} y1={H * f} y2={H * f} stroke="#f5efe4" strokeOpacity="0.05" />
              ))}
              <line x1={dernier[0]} x2={L} y1={8 + 0} y2={8} stroke="#e2c99f" strokeOpacity="0.35" strokeDasharray="3 5" />
              <path d={`${ligne} L${dernier[0]},${H} L0,${H} Z`} fill="url(#terrain-aire)" />
              <path d={ligne} fill="none" stroke="#e2c99f" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-taupe-2">
              {["07h", "09h", "11h", "13h", "15h", "17h"].map((h) => <span key={h}>{h}</span>)}
            </div>
            <div className="mt-4 flex gap-1.5 text-[11.5px] text-taupe">
              {["Jour", "7J", "1M", "1A", "Tout"].map((t, i) => (
                <span key={t} className={cx("rounded-full px-3 py-1", i === 0 && "bg-creme/10 text-creme")}>{t}</span>
              ))}
            </div>
          </div>
          <p className="mt-5 px-1 text-[13px] text-taupe">Agents en tournée</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {agents.map(([ini, nom, site, etat, ton]) => (
              <div key={nom} className="rounded-xl border border-creme/[0.06] bg-black/30 p-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-creme/10 text-[10.5px] text-or">{ini}</span>
                  <span className="text-[12.5px] text-creme">{nom}</span>
                </div>
                <p className="mt-2 truncate text-[11.5px] text-taupe">{site}</p>
                <p className={cx("mt-1 text-[11px]", ton === "ok" ? "text-[#7fd49b]" : ton === "retard" ? "text-[#f08a6f]" : "text-or")}>{etat}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Téléphone de l'agent : pointage de l'arrivée sur le site. */
function TelephoneAgent() {
  return (
    <div className="w-[300px] rounded-[48px] bg-black p-2.5 shadow-[0_50px_120px_-20px_rgba(0,0,0,0.95)] ring-1 ring-creme/12">
      <div className="overflow-hidden rounded-[40px] bg-[linear-gradient(180deg,#16120e_0%,#0d0b09_100%)] pb-6">
        <div className="mx-auto mt-3 h-6 w-24 rounded-full bg-black" />
        <div className="mt-4 flex justify-center">
          <span className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[14px] text-creme">
            <span className="grid size-8 place-items-center rounded-full bg-or text-[#1f1b16]"><Building2 className="size-4" /></span>
            Les Tilleuls
            <ChevronDown className="size-4 text-taupe" />
          </span>
        </div>
        <div className="mx-5 mt-4 h-px bg-creme/[0.07]" />
        <p className="mt-9 text-center text-[11px] tracking-[0.18em] text-taupe-2 uppercase">Arrivée</p>
        <p className="mt-1 text-center text-[58px] leading-none font-light tracking-[-0.04em] text-creme tabular-nums">
          07:58<span className="text-taupe-2/70">:12</span>
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[#7fd49b]">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#7fd49b] opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-[#7fd49b]" /></span>
          Sur le site · 2 min d&apos;avance
        </p>
        <div className="mx-5 mt-8 flex items-center justify-between text-[13px]">
          <span className="text-taupe">Bâtiment B · Halls 1 à 4</span>
          <span className="text-creme tabular-nums">2 h 30</span>
        </div>
        <div className="mx-5 mt-3 grid grid-cols-4 gap-1.5 text-center text-[11px] text-creme">
          {["Photo", "Signer", "Anomalie", "Note"].map((t) => (
            <span key={t} className="rounded-full bg-creme/[0.07] py-2">{t}</span>
          ))}
        </div>
        <div className="mx-5 mt-5 flex h-13 items-center justify-center gap-2 rounded-full bg-or text-[14px] font-medium text-[#1f1b16]">
          <QrCode className="size-4" /> Pointer l&apos;arrivée
        </div>
        <div className="mx-5 mt-5 space-y-2">
          {[["09:00", "Cabinet Delmas"], ["11:15", "Garage du Lot"]].map(([h, l]) => (
            <div key={l} className="flex items-center gap-3 rounded-2xl bg-creme/[0.04] px-4 py-3 text-[12.5px]">
              <span className="font-mono text-taupe-2">{h}</span>
              <span className="text-creme">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Terrain() {
  return (
    <section id="terrain" className="relative scroll-mt-20 overflow-hidden border-t border-creme/[0.06]">
      <div className="mx-auto max-w-6xl px-6 pt-24 md:pt-32">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <TitreSection surtitre="Application terrain" affirmation="Vos équipes sur le terrain, enfin reliées au bureau." />
          <Apparition delai={80}>
            <p className="max-w-lg text-lg leading-relaxed text-taupe">
              Chaque agent a sa tournée sur son téléphone. Ce qu&apos;il fait sur place arrive au bureau à la seconde.
            </p>
          </Apparition>
        </div>
      </div>

      <Apparition delai={120}>
        <div className="relative mx-auto mt-12 max-w-6xl px-6 md:mt-16" aria-hidden>
          <div className="pointer-events-none absolute -top-24 left-[20%] h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(226,201,159,0.16),transparent)] blur-2xl" />
          <div className="relative h-[640px] [mask-image:linear-gradient(to_bottom,black_78%,transparent)] max-md:h-[540px]">
            <div className="absolute top-0 left-[17%] hidden w-[900px] md:block">
              <EcranSuivi />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 md:top-[150px] md:left-0 md:translate-x-0">
              <TelephoneAgent />
            </div>
          </div>
        </div>
      </Apparition>

      <div className="mx-auto max-w-6xl px-6 pt-4 pb-24 md:pb-32">
        <Apparition delai={60}>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [QrCode, "Pointage", "Arrivée et départ par QR code, sur chaque site"],
              [Camera, "Preuves", "Photos, signatures et anomalies, rattachées au passage"],
              [CalendarDays, "Absences", "Congés demandés depuis le téléphone, remplaçant proposé"],
              [WifiOff, "Hors réseau", "La tournée reste consultable, les saisies partent au retour du réseau"],
              [Bell, "Alertes", "Retard d'arrivée, départ oublié, rappel de la veille"],
              [Smartphone, "S'installe comme une appli", "Sans passer par un magasin d'applications"],
            ].map(([I, t, d]) => {
              const Icone = I as typeof QrCode;
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
    </section>
  );
}

/* ---------- Facture électronique ---------- */

export function FactureElectronique() {
  const etapes = [
    ["Déposée", "2 nov. · 09:14", true],
    ["Mise à disposition", "2 nov. · 09:15", true],
    ["Approuvée", "4 nov. · 16:02", true],
    ["Encaissée", "En attente du règlement", false],
  ] as const;
  return (
    <section id="facture-electronique" className="relative scroll-mt-20 overflow-hidden border-t border-creme/[0.06]">
      <div aria-hidden className="pointer-events-none absolute top-1/3 left-0 h-[520px] w-[620px] -translate-x-1/4 rounded-full bg-[radial-gradient(closest-side,rgba(226,201,159,0.10),transparent)] blur-2xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:py-32 lg:grid-cols-[1fr_1fr]">
        <div>
          <TitreSection surtitre="Facture électronique" affirmation="L'obligation de 2027, déjà réglée." precision="Sans changer vos habitudes." />
          <Apparition delai={80}>
            <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
              {[
                ["1er sept. 2026", "Toutes les entreprises doivent pouvoir recevoir des factures électroniques."],
                ["1er sept. 2027", "Les PME doivent aussi les émettre, via une plateforme agréée."],
              ].map(([d, t]) => (
                <div key={d} className="rounded-2xl border border-creme/[0.08] bg-nuit-2 p-4">
                  <p className="font-mono text-[13px] text-or">{d}</p>
                  <p className="mt-1.5 text-sm text-taupe">{t}</p>
                </div>
              ))}
            </div>
            <ul className="mt-8 space-y-3 text-[15px] text-taupe">
              {[
                "Vos factures partent au format Factur-X dès que vous les émettez",
                "Le statut suit chaque facture : déposée, approuvée, encaissée",
                "Les factures fournisseurs reçues sont lues sans ressaisie, fournisseur compris",
                "Relances graduées et lien de paiement en ligne pour être payé plus vite",
              ].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-lagon" aria-hidden /> {t}</li>
              ))}
            </ul>
          </Apparition>
        </div>
        <Apparition delai={120} className="flex justify-center lg:justify-end">
          <div className="w-full max-w-[440px] rounded-[26px] bg-black p-2 shadow-[0_50px_140px_-40px_rgba(0,0,0,0.95)] ring-1 ring-creme/10" aria-hidden>
            <div className="rounded-[20px] bg-[linear-gradient(160deg,#1d1813_0%,#110e0b_60%)] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] text-taupe-2">Facture FA-2026-0042</p>
                  <p className="mt-1 text-[15px] text-creme">Syndic Delmas</p>
                </div>
                <span className="rounded-md bg-[#7fd49b]/10 px-2 py-1 text-[11.5px] text-[#7fd49b]">Approuvée</span>
              </div>
              <p className="mt-5 text-[40px] leading-none font-light tracking-[-0.03em] text-creme tabular-nums">
                1 440<span className="text-taupe-2">,00 €</span>
              </p>
              <p className="mt-2 text-[12px] text-taupe">TTC · échéance 2 déc. · Factur-X</p>
              <ol className="mt-7 space-y-0">
                {etapes.map(([l, d, fait], i) => (
                  <li key={l} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < etapes.length - 1 ? (
                      <span className={cx("absolute top-4 left-[7px] h-full w-px", fait && etapes[i + 1]![2] ? "bg-or/60" : "bg-creme/10")} />
                    ) : null}
                    <span className={cx("relative mt-1 grid size-[15px] shrink-0 place-items-center rounded-full", fait ? "bg-or" : "border border-creme/20 bg-nuit")}>
                      {fait ? <Check className="size-2.5 text-[#1f1b16]" strokeWidth={3} /> : null}
                    </span>
                    <div>
                      <p className={cx("text-[14px]", fait ? "text-creme" : "text-taupe")}>{l}</p>
                      <p className="font-mono text-[11.5px] text-taupe-2">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-creme/[0.05] px-4 py-3 text-[12.5px]">
                <span className="text-taupe">Relance courtoise si impayée</span>
                <span className="font-mono text-or">J+7</span>
              </div>
            </div>
          </div>
        </Apparition>
      </div>
    </section>
  );
}

/* ---------- Corps de métier ---------- */

export function CorpsDeMetier() {
  const [choix, setChoix] = useState(metiersLogiciel[0]!.cle);
  const [phrase, setPhrase] = useState("");
  const reconnu = phrase.trim().length >= 3 ? reconnaitreMetier(phrase) : null;
  const m = metiersLogiciel.find((x) => x.cle === choix) ?? metiersLogiciel[0]!;
  const prepare = [
    "Les modules utiles à votre métier, déjà activés",
    "Un catalogue de prestations types, prix et TVA à ajuster",
    ...(m.decennale ? ["La mention de votre assurance décennale sur les devis et factures"] : []),
    ...(m.tvaTravaux ? ["La mention de TVA réduite des travaux, ajoutée quand une ligne est à 10 % ou 5,5 %"] : []),
  ];
  return (
    <section id="metiers" className="scroll-mt-20 border-t border-creme/[0.06]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <TitreSection surtitre="Corps de métier" affirmation="Dites-nous votre métier." precision="Le logiciel se prépare pour vous." />
        <Apparition delai={60}>
          <div className="mt-10 max-w-xl">
            <label htmlFor="activite" className="text-sm text-taupe">Décrivez votre activité en quelques mots :</label>
            <input
              id="activite"
              value={phrase}
              onChange={(e) => {
                setPhrase(e.target.value);
                const m = reconnaitreMetier(e.target.value);
                if (m) setChoix(m);
              }}
              placeholder="Ex. : plombier chauffagiste à Toulouse"
              className="mt-2 h-12 w-full rounded-full border border-creme/10 bg-nuit-2 px-5 text-[15px] text-creme outline-none placeholder:text-taupe-2 focus:border-lagon/50"
            />
            <p className="mt-2 min-h-5 font-mono text-[12.5px] text-or" aria-live="polite">
              {reconnu ? `Reconnu : ${metiersLogiciel.find((x) => x.cle === reconnu)?.nom}` : phrase.trim().length >= 3 ? "Pas encore reconnu : essayez « plombier », « électricien », « nettoyage », « paysagiste »…" : `Exemple : ${metiersLogiciel.find((x) => x.cle === choix)?.nom}`}
            </p>
          </div>
        </Apparition>
        <Apparition delai={120} className="mt-8 grid gap-4 md:grid-cols-[1fr_1.1fr]">
          <div className="rounded-2xl border border-creme/[0.08] bg-nuit-2 p-6">
            <p className="text-xl font-medium tracking-[-0.02em] text-creme">{m.nom}</p>
            <p className="mt-1 text-sm text-taupe">{m.exemple}</p>
            <ul className="mt-6 space-y-3 text-[15px] text-taupe">
              {prepare.map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-lagon" aria-hidden /> {t}</li>
              ))}
              <li className="flex gap-3"><Sparkles className="mt-0.5 size-4 shrink-0 text-lagon" aria-hidden /> Un assistant IA qui connaît votre métier. {m.assistant}</li>
            </ul>
          </div>
          <Fragment className="p-5">
            <p className="mb-3 font-sans text-[13px] text-creme">Catalogue préparé · extrait</p>
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11.5px] text-taupe-2">
                  <th className="pb-2 font-normal">Prestation</th>
                  <th className="pb-2 text-right font-normal">Prix HT</th>
                  <th className="pb-2 text-right font-normal">TVA</th>
                </tr>
              </thead>
              <tbody>
                {m.prestations.map((p) => (
                  <tr key={p.nom} className="border-t border-creme/[0.07]">
                    <td className="py-2.5 pr-3 text-creme">{p.nom}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">{p.prix}</td>
                    <td className={cx("py-2.5 pl-3 text-right whitespace-nowrap", p.tva !== "20 %" && "text-or")}>{p.tva}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 font-sans text-[12.5px] leading-relaxed">Prix indicatifs, modifiables. Vous pouvez changer de métier à tout moment dans les réglages.</p>
          </Fragment>
        </Apparition>
      </div>
    </section>
  );
}

/* ---------- Partout, et sécurité ---------- */

export function Partout() {
  const items = [
    [Monitor, "Navigateur", "Optimisé pour ordinateur, rien à installer."],
    [Download, "Application de bureau", "Windows, macOS et Linux, notifications et mises à jour automatiques."],
    [WifiOff, "Hors ligne partiel", "Les écrans déjà consultés restent lisibles, les créations partent au retour de la connexion."],
    [Code, "API publique", "API REST documentée (OpenAPI) avec clés en lecture ou en écriture."],
    [Workflow, "Webhooks", "Signés, avec nouvelles tentatives et historique des livraisons."],
    [CalendarDays, "Agenda synchronisé", "Abonnement Google Agenda, Outlook ou Apple Calendrier."],
  ] as const;
  return (
    <section id="partout" className="scroll-mt-20 border-t border-creme/[0.06]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <TitreSection surtitre="Partout" affirmation="Au bureau, en déplacement, sans réseau." precision="Et relié à vos autres outils." />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-creme/[0.08] bg-creme/[0.08] sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([I, t, d], i) => (
            <Apparition key={t} delai={(i % 3) * 60} className="bg-nuit p-6">
              <I className="size-5 text-lagon" aria-hidden />
              <h3 className="mt-4 font-medium text-creme">{t}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-taupe">{d}</p>
            </Apparition>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Securite() {
  const items = [
    [Lock, "Données isolées", "Chaque entreprise est cloisonnée jusque dans la base de données, et c'est testé."],
    [Fingerprint, "Connexion protégée", "Mot de passe, lien magique, Google, Microsoft et double authentification."],
    [KeyRound, "Rôles et permissions", "Propriétaire, manager, membre, comptable externe, lecteur : chacun voit ce qui le concerne."],
    [History, "Journal d'audit", "Qui a fait quoi, et quand. Rien ne disparaît sans trace."],
    [ShieldCheck, "RGPD", "Export complet de vos données à tout moment."],
    [Building2, "Plusieurs entreprises", "Un seul compte pour gérer plusieurs espaces, avec invitations et équipes."],
  ] as const;
  return (
    <section id="securite" className="scroll-mt-20 border-t border-creme/[0.06]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <TitreSection surtitre="Sécurité" affirmation="Vos données restent les vôtres." />
        <div className="mt-14 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([I, t, d], i) => (
            <Apparition key={t} delai={(i % 3) * 60} className="border-t border-creme/[0.08] pt-6">
              <I className="size-5 text-lagon" aria-hidden />
              <h3 className="mt-4 font-medium text-creme">{t}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-taupe">{d}</p>
            </Apparition>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Tarifs ---------- */

export function TarifsLogiciel({ titre = true, comparatif = false }: { titre?: boolean; comparatif?: boolean }) {
  const [annuel, setAnnuel] = useState(false);
  return (
    <section id="tarifs" className={cx("scroll-mt-20", titre && "border-t border-creme/[0.06]")}>
      <div className={cx("mx-auto max-w-6xl px-6", titre ? "py-24 md:py-32" : "pb-24")}>
        {titre && <TitreSection centre surtitre="Tarifs" affirmation="Un prix par utilisateur." precision="Gratuit pour démarrer." />}
        <div className="mt-10 flex items-center justify-center gap-3 text-sm">
          <button onClick={() => setAnnuel(false)} className={cx("cursor-pointer py-2", !annuel ? "text-creme" : "text-taupe")}>Mensuel</button>
          <button
            role="switch"
            aria-checked={annuel}
            aria-label="Paiement annuel"
            onClick={() => setAnnuel(!annuel)}
            className={cx("relative h-6 w-11 cursor-pointer rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagon", annuel ? "bg-lagon" : "bg-creme/15")}
          >
            <span className={cx("absolute top-0.5 size-5 rounded-full bg-creme shadow transition-all", annuel ? "left-[22px]" : "left-0.5")} />
          </button>
          <button onClick={() => setAnnuel(true)} className={cx("cursor-pointer py-2", annuel ? "text-creme" : "text-taupe")}>Annuel</button>
          <span className="font-mono text-[12.5px] text-or">−20 %</span>
        </div>

        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
          {offresLogiciel.map((o, i) => {
            const prix = prixParMois(o, annuel);
            const lien = o.cle === "entreprise" ? liensLogiciel.contact : `${liensLogiciel.essai}?offre=${o.cle}`;
            return (
              <Apparition
                key={o.cle}
                delai={i * 70}
                className={cx(
                  "relative flex flex-col rounded-2xl p-6",
                  o.misEnAvant ? "border border-lagon/45 bg-nuit-2 shadow-[0_0_80px_-20px_rgba(201,169,124,0.35)]" : "border border-creme/[0.08] bg-nuit-2/60",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-medium tracking-[-0.02em] text-creme">{o.nom}</h3>
                  {o.misEnAvant && <span className="rounded-full bg-lagon/15 px-2.5 py-1 text-[12px] font-medium text-or">Recommandé</span>}
                </div>
                <p className="mt-1.5 min-h-10 text-sm text-taupe">{o.accroche}</p>
                <div className="mt-6 min-h-[64px]">
                  {prix === null ? (
                    <span className="text-[2rem] font-medium tracking-[-0.03em] text-creme">Sur devis</span>
                  ) : (
                    <>
                      <span className="text-[2.6rem] font-medium tracking-[-0.04em] text-creme">{euros(prix)}</span>
                      {prix > 0 && <span className="ml-1 text-taupe">/utilisateur/mois</span>}
                      <p className="mt-0.5 font-mono text-[12px] text-taupe-2">{prix > 0 ? `HT${annuel ? ", facturé à l'année" : ", sans engagement"}` : "pour toujours"}</p>
                    </>
                  )}
                </div>
                <LienBouton href={lien} variante={o.misEnAvant ? "lagon" : "nuit"} taille="lg" className="mt-6 w-full">
                  {o.bouton}
                </LienBouton>
                <ul className="mt-6 space-y-2.5">
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
        <p className="mt-6 text-center text-[14px] text-taupe-2">
          L&apos;offre Business s&apos;essaie {joursEssai} jours, sans carte bancaire. Les crédits IA se partagent entre les membres de l&apos;espace.
        </p>

        {comparatif && (
          <div className="mt-20">
            <h2 className="titre-pub text-3xl text-creme md:text-4xl">Comparatif détaillé</h2>
            <div className="defile-sombre mt-8 overflow-x-auto rounded-2xl border border-creme/[0.08] bg-nuit-2/60">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-nuit-2">
                  <tr className="border-b border-creme/[0.08]">
                    <th className="w-[28%] px-5 py-4 text-left font-medium text-taupe">Fonction</th>
                    {offresLogiciel.map((o) => (
                      <th key={o.cle} className="px-5 py-4 text-center text-lg font-medium text-creme">{o.nom}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparatifLogiciel.map((l) => (
                    <tr key={l.label} className="border-t border-creme/[0.06]">
                      <td className="px-5 py-3 text-taupe">{l.label}</td>
                      {l.valeurs.map((v, i) => (
                        <td key={i} className="px-5 py-3 text-center text-creme">
                          {v === "Oui" ? <Check className="mx-auto size-4 text-lagon" aria-label="Oui" /> : v === "—" ? <Minus className="mx-auto size-4 text-creme/25" aria-label="Non" /> : v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-taupe-2">Prix hors taxes, par utilisateur et par mois. Paiement annuel : −20 %.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Offre complémentaire : sites web ---------- */

export function SitesWeb() {
  const services = [
    ["Site web", "Réalisé avec vous, hébergé, avec votre nom de domaine et vos emails."],
    ["Appli pour vos clients", "Commande, réservation, fidélité : à votre nom, sur leur téléphone, reliée au logiciel."],
    ["Logo et supports", "Une identité qui raconte votre métier, déclinée sur tous vos supports."],
  ] as const;
  return (
    <section id="sites" className="relative scroll-mt-20 overflow-hidden border-t border-creme/[0.06]">
      <div aria-hidden className="pointer-events-none absolute top-1/3 right-0 h-[520px] w-[720px] translate-x-1/4 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,124,0.16),transparent)] blur-2xl" />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr]">
          <TitreSection surtitre={`Aussi chez ${marque.nom}`} affirmation="Votre site, votre appli, votre logo." precision="Faits pour vous, par notre équipe." />
          <Apparition>
            <p className="max-w-lg text-lg leading-relaxed text-taupe">
              Voyez votre site en une minute, gratuitement. Notre équipe le réalise ensuite avec vous, avec l&apos;appli et l&apos;identité qui vont avec. Tout est relié à votre logiciel : une demande de devis arrive directement dans vos ventes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LienBouton href="/sites" variante="nuit" taille="lg">
                Voir mon site en une minute <ArrowRight className="size-4" />
              </LienBouton>
              <LienBouton href="/sites#sur-mesure" variante="fantomeNuit" taille="lg">
                Appli et logo sur devis
              </LienBouton>
            </div>
          </Apparition>
        </div>

        <Apparition className="relative mt-14 sm:pr-28 lg:pr-56">
          <SiteExemple site={siteExemple} />
          {/* Téléphone : sous le site sur mobile, en surimpression à partir de la tablette. */}
          <AppliExemple site={siteExemple} className="mx-auto mt-8 sm:absolute sm:right-0 sm:-bottom-8 sm:mt-0 lg:right-2" />
          <p className="mt-6 font-mono text-[12px] text-taupe-2 sm:mt-14">Un exemple : le site généré en une minute pour un restaurant, et l&apos;appli de ses clients qui va avec.</p>
        </Apparition>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-creme/[0.08] bg-creme/[0.06] sm:grid-cols-3">
          {services.map(([t, d]) => (
            <div key={t} className="bg-nuit p-6">
              <p className="flex items-center gap-2.5 font-medium text-creme"><Check className="size-4 text-lagon" aria-hidden /> {t}</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-taupe">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ et appel final ---------- */

const questions = [
  ["Puis-je n'utiliser que certains modules ?", "Oui. Vous activez les modules dont vous avez besoin : deux avec l'offre gratuite, six avec Pro, tous avec Business. Vous pouvez en changer à tout moment."],
  ["Suis-je prêt pour la facture électronique ?", "Oui. Vos factures sont produites au format Factur-X et transmises à votre plateforme agréée dès leur émission, avec leur statut suivi jusqu'à l'encaissement. Les factures de vos fournisseurs sont lues sans ressaisie. Les PME devront émettre leurs factures électroniques à partir du 1er septembre 2027."],
  ["Comment se passent les relances ?", "Automatiquement, aux paliers que vous choisissez : un rappel courtois, une relance ferme, puis une dernière relance avant recouvrement, avec chaque fois le lien de paiement en ligne. Vous êtes prévenu quand la dernière part."],
  ["Mes données sont-elles protégées ?", "Chaque entreprise est isolée jusque dans la base de données. Connexion avec double authentification, rôles et permissions, journal d'audit et export complet de vos données."],
  ["Le logiciel fonctionne-t-il sans connexion ?", "En partie : les écrans déjà consultés restent lisibles et vos créations sont envoyées au retour de la connexion. L'application terrain garde la tournée du jour sans réseau."],
  ["Comment fonctionne l'assistant IA ?", "Ctrl + J l'ouvre depuis n'importe quel écran. Une question consomme 1 crédit, la lecture d'un document 3 crédits, sur le quota mensuel de votre offre. Il n'exécute aucune action sans votre confirmation."],
  ["Puis-je reprendre mes données existantes ?", "Oui, par import de fichiers. Et vous pouvez tout exporter à tout moment en PDF, Excel ou CSV."],
  ["Comment essayer ?", `L'offre gratuite n'a pas de limite de durée. L'offre Business s'essaie ${joursEssai} jours, sans carte bancaire.`],
];

export function FaqLogiciel() {
  const [ouverte, setOuverte] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 border-t border-creme/[0.06]">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:py-32 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <TitreSection surtitre="Questions fréquentes" affirmation="Avant de vous lancer." />
          <p className="mt-5 text-taupe">
            Une autre question ?{" "}
            <a href={liensLogiciel.contact} className="text-creme underline decoration-creme/30 underline-offset-4 hover:decoration-lagon">Écrivez-nous</a>.
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

export function AppelLogiciel() {
  return (
    <section className="relative overflow-hidden border-t border-creme/[0.06]">
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-[500px] w-[1000px] -translate-x-1/2 translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,124,0.25),transparent)] blur-2xl" />
      <div className="relative mx-auto max-w-6xl px-6 py-28 text-center md:py-40">
        <Apparition>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marque/sebt-icone-sombre.svg" alt="" width={56} height={56} className="mx-auto size-14 rounded-2xl" />
          <h2 className="titre-pub mx-auto mt-8 max-w-3xl text-[2.5rem] leading-[1.04] text-creme md:text-7xl">
            Gagnez du temps,
            <span className="block text-taupe">dès cette semaine</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-taupe">Gratuit pour démarrer. Business offert {joursEssai} jours, sans carte bancaire.</p>
          <LienBouton href={liensLogiciel.essai} variante="lagon" taille="xl" className="mt-10">
            Essayer gratuitement <ArrowRight className="size-4" />
          </LienBouton>
        </Apparition>
      </div>
    </section>
  );
}
